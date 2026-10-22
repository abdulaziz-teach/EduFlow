import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    thumbnail: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all_levels'],
      default: 'beginner',
    },
    language: {
      type: String,
      default: 'en',
    },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    topics: {
      type: [String],
      default: [],
      index: true,
    },
    prerequisites: {
      type: [String],
      default: [],
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
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
courseSchema.index({ status: 1, category: 1 });
courseSchema.index({ instructorId: 1, createdAt: -1 });
courseSchema.index({ createdAt: -1 });
courseSchema.index({ status: 1, deletedAt: 1, category: 1, level: 1 });
courseSchema.index({ status: 1, deletedAt: 1, createdAt: -1 });
courseSchema.index(
  {
    title: 'text',
    description: 'text',
    category: 'text',
    tags: 'text',
    topics: 'text',
  },
  {
    weights: {
      title: 10,
      topics: 6,
      tags: 5,
      category: 4,
      description: 2,
    },
    name: 'CourseTextIndex',
    default_language: 'none',
    language_override: 'none',
  }
);

const Course = mongoose.model('Course', courseSchema);

export default Course;
