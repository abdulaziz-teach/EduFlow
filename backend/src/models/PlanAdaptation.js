import mongoose from 'mongoose';

const planAdaptationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyPlan',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['catch_up', 'reduce_load', 'reorder', 'extend', 'on_track'],
    },
    reason: {
      type: String,
      required: true,
    },
    changes: [
      {
        taskId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        action: {
          type: String,
          required: true,
          enum: ['move', 'reschedule', 'priority_change', 'no_change'],
        },
        fromDate: {
          type: Date,
          required: true,
        },
        toDate: {
          type: Date,
          required: true,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for finding adaptations for a plan sorted by time
planAdaptationSchema.index({ planId: 1, createdAt: -1 });

const PlanAdaptation = mongoose.model('PlanAdaptation', planAdaptationSchema);

export default PlanAdaptation;
