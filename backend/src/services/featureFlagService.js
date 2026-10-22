import crypto from 'crypto';
import FeatureFlag from '../models/FeatureFlag.js';
import { logAdminAction } from './auditService.js';

// In-memory cache for fast, sub-millisecond evaluation
let flagsCache = null;
let lastCacheUpdate = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

// Default standard flags
export const DEFAULT_FLAGS = [
  {
    key: 'ai_mentor_v2',
    name: 'AI Mentor 2.0',
    description: 'Enables advanced Socratic and explanation modes in AI Mentor',
    isEnabled: true,
    rolloutPercentage: 100,
    environment: 'all',
  },
  {
    key: 'adaptive_learning',
    name: 'Adaptive Learning Engine',
    description: 'Knowledge tracking, prerequisite verification, and next-best-action intelligence',
    isEnabled: true,
    rolloutPercentage: 100,
    environment: 'all',
  },
  {
    key: 'ai_course_builder',
    name: 'AI Course Builder',
    description: 'Curriculum generation and active-recall flashcard synthesis',
    isEnabled: true,
    rolloutPercentage: 100,
    environment: 'all',
  },
  {
    key: 'advanced_search',
    name: 'Global Search & Discovery',
    description: 'Multi-entity search, autocomplete, and typo tolerance',
    isEnabled: true,
    rolloutPercentage: 100,
    environment: 'all',
  },
  {
    key: 'premium_billing',
    name: 'Monetization & Billing Engine',
    description: 'Pro subscription tiers, payments, and checkout processing',
    isEnabled: true,
    rolloutPercentage: 100,
    environment: 'all',
  },
  {
    key: 'new_dashboard',
    name: 'Modern Dashboard UI',
    description: 'Enhanced student dashboard with rich learning analytics and widgets',
    isEnabled: true,
    rolloutPercentage: 100,
    environment: 'all',
  },
  {
    key: 'experimental_features',
    name: 'Experimental Lab Features',
    description: 'Opt-in experimental beta capabilities',
    isEnabled: false,
    rolloutPercentage: 0,
    environment: 'all',
  },
  // Operational Emergency Flags
  {
    key: 'emergency_pause_ai',
    name: 'Emergency: Pause AI Services',
    description: 'Immediately disables OpenAI mentor and content generation calls',
    isEnabled: false,
    rolloutPercentage: 0,
    environment: 'all',
  },
  {
    key: 'emergency_maintenance_mode',
    name: 'Emergency: Maintenance Mode',
    description: 'Places user platform in maintenance mode while preserving admin operations',
    isEnabled: false,
    rolloutPercentage: 0,
    environment: 'all',
  },
  {
    key: 'emergency_pause_notifications',
    name: 'Emergency: Pause Notifications',
    description: 'Suspends delivery of non-urgent automated notification sweeps',
    isEnabled: false,
    rolloutPercentage: 0,
    environment: 'all',
  },
];

/**
 * Seed default flags if database is empty
 */
const ensureDefaultFlags = async () => {
  const count = await FeatureFlag.countDocuments();
  if (count === 0) {
    for (const flag of DEFAULT_FLAGS) {
      await FeatureFlag.create(flag).catch(() => {});
    }
  }
};

/**
 * Invalidate in-memory cache
 */
export const invalidateFlagCache = () => {
  flagsCache = null;
  lastCacheUpdate = 0;
};

/**
 * Fetch all flags from DB or cache
 */
export const fetchAllFlags = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && flagsCache && now - lastCacheUpdate < CACHE_TTL_MS) {
    return flagsCache;
  }

  await ensureDefaultFlags();
  const flags = await FeatureFlag.find({}).lean();
  flagsCache = {};
  for (const f of flags) {
    flagsCache[f.key] = f;
  }
  lastCacheUpdate = now;
  return flagsCache;
};

/**
 * Deterministic hash bucketing for gradual rollout (0-100)
 */
export const calculateRolloutBucket = (userId, flagKey) => {
  if (!userId) return 100; // Default to excluded if percentage < 100
  const hash = crypto
    .createHash('md5')
    .update(`${String(userId)}:${flagKey}`)
    .digest('hex');
  // First 4 bytes to integer mod 100
  const intVal = parseInt(hash.substring(0, 8), 16);
  return intVal % 100;
};

/**
 * Evaluate if a specific feature flag is active for a given user context
 */
export const isFeatureEnabled = async (flagKey, userContext = null) => {
  const flags = await fetchAllFlags();
  const flag = flags[flagKey];

  if (!flag) return false;
  if (!flag.isEnabled) return false;

  // Binary flags (e.g. emergency switches or global toggles with 0% gradual rollout and no targets)
  const hasTargeting =
    (flag.targetRoles && flag.targetRoles.length > 0) ||
    (flag.targetUserIds && flag.targetUserIds.length > 0) ||
    flag.rolloutPercentage > 0;
  if (!hasTargeting) {
    return true;
  }

  // If globally enabled with 100% rollout, return true
  if (flag.rolloutPercentage >= 100) return true;

  // If no user context and rollout < 100%, return false
  if (!userContext) {
    return flag.rolloutPercentage > 0;
  }

  const userId = userContext._id || userContext.id;
  const userRole = userContext.role || 'user';

  // Specific user targeted?
  if (flag.targetUserIds?.length > 0 && userId) {
    const isTargetedUser = flag.targetUserIds.some((id) => String(id) === String(userId));
    if (isTargetedUser) return true;
  }

  // Specific role targeted?
  if (flag.targetRoles?.length > 0 && userRole) {
    if (flag.targetRoles.includes(userRole)) return true;
  }

  // Deterministic percentage rollout
  if (flag.rolloutPercentage > 0 && userId) {
    const bucket = calculateRolloutBucket(userId, flagKey);
    return bucket < flag.rolloutPercentage;
  }

  return false;
};

/**
 * Evaluate all flags for a given user context (for frontend hydration)
 */
export const evaluateUserFeatureFlags = async (userContext = null) => {
  const flags = await fetchAllFlags();
  const result = {};

  for (const [key, flag] of Object.entries(flags)) {
    result[key] = await isFeatureEnabled(key, userContext);
  }

  return result;
};

/**
 * Check active emergency controls
 */
export const getEmergencyStatus = async () => {
  const flags = await fetchAllFlags();
  return {
    isAiPaused: flags['emergency_pause_ai']?.isEnabled || false,
    isMaintenanceMode: flags['emergency_maintenance_mode']?.isEnabled || false,
    isNotificationsPaused: flags['emergency_pause_notifications']?.isEnabled || false,
  };
};

/**
 * Update or create a feature flag with full audit logging
 */
export const upsertFeatureFlag = async (flagKey, updateData, actorUser) => {
  const allowedFields = [
    'name',
    'description',
    'isEnabled',
    'rolloutPercentage',
    'targetRoles',
    'targetUserIds',
    'environment',
    'metadata',
  ];

  const sanitizedUpdate = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      sanitizedUpdate[field] = updateData[field];
    }
  }

  const flag = await FeatureFlag.findOneAndUpdate(
    { key: flagKey.toLowerCase().trim() },
    {
      $set: {
        ...sanitizedUpdate,
        owner: actorUser?._id || actorUser?.id,
      },
      $setOnInsert: {
        key: flagKey.toLowerCase().trim(),
        name: updateData.name || flagKey,
      },
    },
    { new: true, upsert: true }
  );

  invalidateFlagCache();

  await logAdminAction({
    actorId: actorUser?._id || actorUser?.id,
    actorRole: actorUser?.role || 'admin',
    action: 'feature_flag.update',
    resourceType: 'feature_flag',
    resourceId: flag.key,
    metadata: {
      key: flag.key,
      isEnabled: flag.isEnabled,
      rolloutPercentage: flag.rolloutPercentage,
    },
  });

  return flag;
};

/**
 * Quick toggle for emergency controls with required operational reason
 */
export const toggleEmergencyControl = async (controlKey, isEnabled, reason, actorUser) => {
  const validEmergencyKeys = [
    'emergency_pause_ai',
    'emergency_maintenance_mode',
    'emergency_pause_notifications',
  ];

  if (!validEmergencyKeys.includes(controlKey)) {
    throw new Error(`Invalid emergency control key: ${controlKey}`);
  }

  const flag = await FeatureFlag.findOneAndUpdate(
    { key: controlKey },
    {
      $set: {
        isEnabled: Boolean(isEnabled),
        metadata: { reason, triggeredAt: new Date(), triggeredBy: actorUser?.email },
      },
    },
    { new: true, upsert: true }
  );

  invalidateFlagCache();

  await logAdminAction({
    actorId: actorUser?._id || actorUser?.id,
    actorRole: actorUser?.role || 'admin',
    action: isEnabled ? 'emergency.activate' : 'emergency.deactivate',
    resourceType: 'emergency_control',
    resourceId: controlKey,
    metadata: {
      controlKey,
      isEnabled,
      reason,
    },
  });

  return flag;
};

export default {
  isFeatureEnabled,
  evaluateUserFeatureFlags,
  fetchAllFlags,
  upsertFeatureFlag,
  toggleEmergencyControl,
  getEmergencyStatus,
  invalidateFlagCache,
};
