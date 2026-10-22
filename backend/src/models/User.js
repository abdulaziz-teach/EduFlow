import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const onboardingDraftSchema = new mongoose.Schema(
  {
    step: { type: Number, min: 0, max: 7, default: 0 },
    goalType: { type: String, default: '' },
    goalDescription: { type: String, maxlength: 200, default: '' },
    subjects: { type: [String], default: [] },
    level: { type: String, default: 'intermediate' },
    weakTopics: { type: [String], default: [] },
    dailyStudyMinutes: { type: Number, min: 5, max: 720, default: null },
    learningStyle: { type: String, default: 'mixed' },
    targetDate: { type: String, default: '' },
    preferredDays: { type: [String], default: [] },
    preferredTime: { type: String, default: 'anytime' },
    preferredLanguage: { type: String, default: 'en' },
    age: { type: Number, min: 5, max: 100, default: null },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens'],
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters'],
    },
    // FIND-05: 'name' is retained and bidirectionally synchronized with 'displayName'
    // for zero-disruption compatibility across validators, seeders, and client payloads.
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    avatar: {
      type: String,
      default: '',
    },
    age: {
      type: Number,
      min: 5,
      max: 100,
      default: null,
    },
    // FIND-05: 'passwordHash' stores bcrypt hash (salt 12) with select: false
    passwordHash: {
      type: String,
      select: false,
    },
    // FIND-05: 'password' is kept in sync with 'passwordHash' (stores bcrypt hash, NEVER plaintext)
    // with select: false. Stripped from queries and public serialization.
    password: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'super_admin', 'content_manager', 'moderator', 'support', 'analyst'],
      default: undefined,
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    // Preserved fields for existing EduFlow features (adaptive study, streak, etc.)
    subjects: {
      type: [String],
      default: [],
    },
    goal: {
      type: {
        type: String,
      },
      description: String,
      targetDate: Date,
    },
    dailyStudyMinutes: {
      type: Number,
      min: [0, 'Daily study minutes cannot be negative'],
      default: null,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'revision'],
      default: 'intermediate',
    },
    learningStyle: {
      type: String,
      enum: ['practice', 'theory', 'flashcards', 'mixed'],
      default: 'mixed',
    },
    weakTopics: {
      type: [String],
      default: [],
    },
    studySchedule: {
      preferredDays: {
        type: [{ type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }],
        default: [],
      },
      preferredTime: {
        type: String,
        enum: ['morning', 'afternoon', 'evening', 'anytime'],
        default: 'anytime',
      },
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'ru', 'uz'],
      default: 'en',
    },
    onboardingComplete: {
      type: Boolean,
      default: false,
    },
    onboardingDraft: {
      type: onboardingDraftSchema,
      default: null,
    },
    onboardingDraftUpdatedAt: {
      type: Date,
      default: null,
    },
    streak: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastStudyDate: {
      type: Date,
      default: null,
    },
    timezone: {
      type: String,
      default: 'UTC',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ role: 1, status: 1 });
userSchema.index({ deletedAt: 1 });

// Pre-save hook: Normalize fields, sync name/displayName, hash password
userSchema.pre('save', async function (next) {
  // Sync name & displayName
  if (this.name && !this.displayName) {
    this.displayName = this.name;
  } else if (this.displayName && !this.name) {
    this.name = this.displayName;
  }

  // Normalize email
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }

  // Password hashing: Check if either password or passwordHash was modified
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.password, salt);
    this.password = this.passwordHash;
  } else if (this.isModified('passwordHash') && this.passwordHash) {
    if (!this.passwordHash.startsWith('$2')) {
      const salt = await bcrypt.genSalt(12);
      this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    }
    this.password = this.passwordHash;
  }

  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  const hash = this.passwordHash || this.password;
  if (!hash) return false;
  return bcrypt.compare(candidatePassword, hash);
};

// Return safe user object (never exposes password or passwordHash)
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    _id: this._id,
    email: this.email,
    username: this.username || null,
    displayName: this.displayName || this.name,
    name: this.name || this.displayName,
    avatar: this.avatar || '',
    age: this.age ?? null,
    role: this.role || 'user',
    status: this.status || 'active',
    emailVerified: this.emailVerified || false,
    lastLoginAt: this.lastLoginAt,
    subjects: this.subjects || [],
    goal: this.goal || null,
    dailyStudyMinutes: this.dailyStudyMinutes,
    level: this.level || 'intermediate',
    learningStyle: this.learningStyle || 'mixed',
    weakTopics: this.weakTopics || [],
    studySchedule: this.studySchedule || { preferredDays: [], preferredTime: 'anytime' },
    preferredLanguage: this.preferredLanguage || 'en',
    onboardingComplete: this.onboardingComplete || Boolean(
      this.subjects?.length && this.goal?.type &&
      Number.isFinite(this.dailyStudyMinutes) && this.dailyStudyMinutes > 0
    ),
    onboardingDraft: this.onboardingDraft || null,
    onboardingDraftUpdatedAt: this.onboardingDraftUpdatedAt,
    streak: this.streak || 0,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const User = mongoose.model('User', userSchema);

export default User;
