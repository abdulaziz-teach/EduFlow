import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
      index: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: [true, 'Lesson ID is required'],
      index: true,
    },
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    watchTime: {
      type: Number, // In seconds
      default: 0,
      min: [0, 'Watch time cannot be negative'],
    },
    lastPosition: {
      type: Number, // In seconds
      default: 0,
      min: [0, 'Last position cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// One progress document per user + lesson
progressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
progressSchema.index({ userId: 1, courseId: 1 });

const Progress = mongoose.model('Progress', progressSchema);

export default Progress;
