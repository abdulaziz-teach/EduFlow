import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
  },
  options: {
    type: [String],
    required: [true, 'Options are required'],
    validate: [(val) => val.length >= 2, 'Question must have at least 2 options'],
  },
  correctAnswer: {
    type: String,
    required: [true, 'Correct answer is required'],
    select: false, // Hidden by default from queries unless explicitly selected
  },
  explanation: {
    type: String,
    default: '',
    select: false, // Hidden by default before attempt completion
  },
  points: {
    type: Number,
    default: 1,
    min: [1, 'Points must be at least 1'],
  },
});

const quizSchema = new mongoose.Schema(
  {
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: [true, 'Lesson ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    questions: [questionSchema],
    passingScore: {
      type: Number, // Percentage (e.g. 70)
      default: 70,
      min: [0, 'Passing score cannot be negative'],
      max: [100, 'Passing score cannot exceed 100'],
    },
    timeLimit: {
      type: Number, // In minutes (0 = unlimited)
      default: 0,
      min: [0, 'Time limit cannot be negative'],
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
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

quizSchema.index({ lessonId: 1, status: 1 });
quizSchema.index(
  {
    title: 'text',
    description: 'text',
  },
  {
    weights: {
      title: 10,
      description: 3,
    },
    name: 'QuizTextIndex',
    default_language: 'none',
    language_override: 'none',
  }
);

/**
 * Strips correctAnswer and explanation from questions for student view
 */
quizSchema.methods.toStudentView = function () {
  const obj = this.toObject();
  obj.questions = obj.questions.map((q) => ({
    id: q._id,
    _id: q._id,
    question: q.question,
    options: q.options,
    points: q.points,
  }));
  return obj;
};

const Quiz = mongoose.model('Quiz', quizSchema);

export default Quiz;
