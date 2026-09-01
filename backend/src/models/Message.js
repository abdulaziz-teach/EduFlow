import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['user', 'assistant'],
    },
    content: {
      type: String,
      required: true,
    },
  },
  {
    // Only createdAt is needed for message ordering
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index for loading messages for a conversation ordered by time, and verifying user ownership
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ userId: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
