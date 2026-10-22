import mongoose from 'mongoose';

const aiFeedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    helpful: {
      type: Boolean,
      required: true,
    },
    reason: {
      type: String,
      enum: ['very_clear', 'too_complex', 'confusing', 'incorrect', 'off_topic', 'other', null],
      default: null,
    },
    comment: {
      type: String,
      maxlength: 500,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

aiFeedbackSchema.index({ userId: 1, messageId: 1 }, { unique: true });

const AIFeedback = mongoose.model('AIFeedback', aiFeedbackSchema);

export default AIFeedback;
