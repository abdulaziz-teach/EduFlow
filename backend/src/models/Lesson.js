import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Lesson slug is required'],
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    content: {
      type: String,
      default: '',
    },
    videoUrl: {
      type: String,
      default: '',
    },
    order: {
      type: Number,
      required: [true, 'Lesson order is required'],
      min: [1, 'Order must be positive'],
    },
    duration: {
      type: Number, // duration in seconds
      default: 0,
      min: [0, 'Duration cannot be negative'],
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    topics: {
      type: [String],
      default: [],
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    generationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AIContentGeneration',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
lessonSchema.index({ courseId: 1, order: 1 }, { unique: true });
lessonSchema.index({ courseId: 1, slug: 1 }, { unique: true });
lessonSchema.index({ courseId: 1, isPublished: 1 });
lessonSchema.index({ status: 1, isPublished: 1, courseId: 1 });
lessonSchema.index(
  {
    title: 'text',
    description: 'text',
    content: 'text',
    topics: 'text',
  },
  {
    weights: {
      title: 10,
      topics: 6,
      description: 3,
      content: 1,
    },
    name: 'LessonTextIndex',
    default_language: 'none',
    language_override: 'none',
  }
);

const Lesson = mongoose.model('Lesson', lessonSchema);

export default Lesson;
