import mongoose from 'mongoose';

const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    // Legacy category flags (preserved for backward compatibility)
    taskReminders: {
      type: Boolean,
      default: true,
    },
    reviewRecommendations: {
      type: Boolean,
      default: true,
    },
    practiceRecommendations: {
      type: Boolean,
      default: true,
    },
    streakNotifications: {
      type: Boolean,
      default: true,
    },
    achievementNotifications: {
      type: Boolean,
      default: true,
    },
    studyPlanNotifications: {
      type: Boolean,
      default: true,
    },
    // Phase 22 Standard Category Toggles
    dailyPlan: {
      type: Boolean,
      default: true,
    },
    streaks: {
      type: Boolean,
      default: true,
    },
    quizReminders: {
      type: Boolean,
      default: true,
    },
    flashcardReminders: {
      type: Boolean,
      default: true,
    },
    achievements: {
      type: Boolean,
      default: true,
    },
    recommendations: {
      type: Boolean,
      default: true,
    },
    aiInsights: {
      type: Boolean,
      default: true,
    },
    courseProgress: {
      type: Boolean,
      default: true,
    },
    // Channel toggles
    channels: {
      inApp: {
        type: Boolean,
        default: true,
      },
      email: {
        type: Boolean,
        default: false,
      },
      push: {
        type: Boolean,
        default: false,
      },
      telegram: {
        type: Boolean,
        default: false,
      },
    },
    // Quiet hours configuration
    quietHours: {
      enabled: {
        type: Boolean,
        default: false,
      },
      start: {
        type: String,
        default: '22:00', // 24-hour format HH:mm
      },
      end: {
        type: String,
        default: '08:00', // 24-hour format HH:mm
      },
      timezone: {
        type: String,
        default: 'UTC',
      },
    },
    // Frequency cap and cooldown
    frequencyCap: {
      maxDailyReminders: {
        type: Number,
        default: 5,
      },
      reminderCooldownMinutes: {
        type: Number,
        default: 60,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Bidirectional sync between legacy keys and new category keys
notificationPreferenceSchema.pre('save', function (next) {
  // Sync new -> legacy
  if (this.isModified('dailyPlan')) this.studyPlanNotifications = this.dailyPlan;
  if (this.isModified('streaks')) this.streakNotifications = this.streaks;
  if (this.isModified('achievements')) this.achievementNotifications = this.achievements;
  if (this.isModified('recommendations')) {
    this.reviewRecommendations = this.recommendations;
    this.practiceRecommendations = this.recommendations;
  }
  if (this.isModified('quizReminders') || this.isModified('flashcardReminders')) {
    this.taskReminders = Boolean(this.quizReminders || this.flashcardReminders);
  }

  // Sync legacy -> new (if legacy was modified and new wasn't)
  if (this.isModified('studyPlanNotifications') && !this.isModified('dailyPlan')) {
    this.dailyPlan = this.studyPlanNotifications;
  }
  if (this.isModified('streakNotifications') && !this.isModified('streaks')) {
    this.streaks = this.streakNotifications;
  }
  if (this.isModified('achievementNotifications') && !this.isModified('achievements')) {
    this.achievements = this.achievementNotifications;
  }
  if ((this.isModified('reviewRecommendations') || this.isModified('practiceRecommendations')) && !this.isModified('recommendations')) {
    this.recommendations = Boolean(this.reviewRecommendations || this.practiceRecommendations);
  }
  if (this.isModified('taskReminders') && !this.isModified('quizReminders') && !this.isModified('flashcardReminders')) {
    this.quizReminders = this.taskReminders;
    this.flashcardReminders = this.taskReminders;
  }

  next();
});

const NotificationPreference = mongoose.model('NotificationPreference', notificationPreferenceSchema);

export default NotificationPreference;
