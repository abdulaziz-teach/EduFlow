import mongoose from 'mongoose';

const rewardSchema = new mongoose.Schema({
  currency: {
    type: String,
    enum: ['coins', 'gems', 'tickets'],
    default: 'coins',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Reward amount cannot be negative'],
  },
});

const achievementSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Achievement name is required'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    icon: {
      type: String,
      default: 'trophy',
    },
    conditionType: {
      type: String,
      required: true,
      enum: ['study_session', 'practice_questions', 'streak', 'course_completion', 'quiz_passed', 'custom'],
    },
    conditionValue: {
      type: Number,
      required: true,
      min: [1, 'Condition value must be at least 1'],
    },
    reward: {
      type: rewardSchema,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

achievementSchema.index({ active: 1, conditionType: 1 });

const Achievement = mongoose.model('Achievement', achievementSchema);

export default Achievement;
