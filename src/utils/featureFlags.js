/**
 * EduFlow Client Feature Flags
 *
 * Lightweight, safe client-side feature flag evaluation.
 * Safe defaults ensure stable production behavior.
 */
export const DEFAULT_FLAGS = {
  enableAiMentor: true,
  enableSmartNotes: true,
  enableFocusRoom: true,
  enableLeaderboard: true,
  enableSpacedRepetition: true,
  enableEconomyShop: false, // Beta: off by default until enabled in environment
};

export function isFeatureEnabled(flagName) {
  if (typeof window !== 'undefined' && window.__EDUFLOW_FLAGS__ && window.__EDUFLOW_FLAGS__[flagName] !== undefined) {
    return Boolean(window.__EDUFLOW_FLAGS__[flagName]);
  }
  return DEFAULT_FLAGS[flagName] ?? false;
}

export default {
  isFeatureEnabled,
  DEFAULT_FLAGS,
};
