import mongoose from 'mongoose';

const knowledgeEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeTopic',
      required: true,
      index: true,
    },
    source: {
      type: String,
      required: true,
      enum: ['task', 'mentor', 'study_session', 'review'],
    },
    type: {
      type: String,
      required: true,
      enum: ['practice', 'completed', 'correct', 'incorrect', 'asked_help'],
    },
    metadata: {
      type: Object,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // Managed manually via createdAt
  }
);

const KnowledgeEvent = mongoose.model('KnowledgeEvent', knowledgeEventSchema);

export default KnowledgeEvent;
