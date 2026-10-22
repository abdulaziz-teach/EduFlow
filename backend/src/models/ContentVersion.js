import mongoose from 'mongoose';

const contentVersionSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ['Course', 'Lesson', 'Quiz', 'FlashcardDeck'],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    changeSummary: {
      type: String,
      trim: true,
      default: 'Version updated',
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    restoredFromVersion: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

contentVersionSchema.index({ entityType: 1, entityId: 1, versionNumber: -1 }, { unique: true });
contentVersionSchema.index({ entityId: 1, createdAt: -1 });

const ContentVersion = mongoose.model('ContentVersion', contentVersionSchema);

export default ContentVersion;
