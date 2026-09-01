import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    type: {
      type: String,
      required: true,
      enum: ['learning', 'practice', 'revision', 'quiz'],
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const daySchema = new mongoose.Schema(
  {
    dayNumber: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    focus: {
      type: String,
      required: true,
    },
    tasks: [taskSchema],
  },
  { _id: true }
);

const studyPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    goal: {
      type: {
        type: String,
        required: true,
      },
      description: {
        type: String,
      },
    },
    dailyMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    days: {
      type: [daySchema],
      required: true,
    },
    adaptation: {
      enabled: {
        type: Boolean,
        default: true,
      },
      lastAdaptedAt: {
        type: Date,
        default: null,
      },
      adaptationCount: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for totalDays to avoid storing it in DB but keep it accessible for the frontend
studyPlanSchema.virtual('totalDays').get(function () {
  return this.days ? this.days.length : 0;
});

// Ensure virtual fields are serialized
studyPlanSchema.set('toJSON', { virtuals: true });
studyPlanSchema.set('toObject', { virtuals: true });

const StudyPlan = mongoose.model('StudyPlan', studyPlanSchema);

export default StudyPlan;
