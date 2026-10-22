import ContentVersion from '../models/ContentVersion.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Quiz from '../models/Quiz.js';
import FlashcardDeck from '../models/FlashcardDeck.js';
import { logAdminAction } from './auditService.js';

/**
 * Create a new immutable version snapshot for an entity
 */
export async function createVersionSnapshot({
  entityType,
  entityId,
  snapshot,
  changeSummary = 'Content updated',
  authorId,
}) {
  // Find highest current version
  const latest = await ContentVersion.findOne({ entityType, entityId })
    .sort({ versionNumber: -1 })
    .select('versionNumber')
    .lean();

  const nextVersion = (latest?.versionNumber || 0) + 1;

  const versionDoc = await ContentVersion.create({
    entityType,
    entityId,
    versionNumber: nextVersion,
    title: snapshot.title || '',
    snapshot,
    changeSummary,
    authorId,
  });

  // Update version counter on the target model
  if (entityType === 'Course') {
    await Course.findByIdAndUpdate(entityId, { version: nextVersion, lastEditedBy: authorId });
  } else if (entityType === 'Lesson') {
    await Lesson.findByIdAndUpdate(entityId, { version: nextVersion, lastEditedBy: authorId });
  } else if (entityType === 'Quiz') {
    await Quiz.findByIdAndUpdate(entityId, { version: nextVersion, lastEditedBy: authorId });
  } else if (entityType === 'FlashcardDeck') {
    await FlashcardDeck.findByIdAndUpdate(entityId, { version: nextVersion, lastEditedBy: authorId });
  }

  await logAdminAction({
    adminUserId: authorId,
    action: 'content_version_created',
    targetType: entityType,
    targetId: String(entityId),
    metadata: { versionNumber: nextVersion, changeSummary },
  });

  return versionDoc;
}

/**
 * Get all historical versions for an entity
 */
export async function getVersionHistory({ entityType, entityId }) {
  return await ContentVersion.find({ entityType, entityId })
    .populate('authorId', 'name email role')
    .sort({ versionNumber: -1 })
    .lean();
}

/**
 * Non-destructive rollback to a specific version
 * Reapplies historical content payload to existing ID without breaking
 * learner enrollments, quiz attempts, or progress records.
 */
export async function rollbackToVersion({
  entityType,
  entityId,
  targetVersionNumber,
  adminUserId,
}) {
  const targetVersion = await ContentVersion.findOne({
    entityType,
    entityId,
    versionNumber: targetVersionNumber,
  }).lean();

  if (!targetVersion) {
    const err = new Error('Version ' + targetVersionNumber + ' not found for ' + entityType);
    err.statusCode = 404;
    throw err;
  }

  const { snapshot } = targetVersion;

  if (entityType === 'Course') {
    await Course.findByIdAndUpdate(entityId, {
      title: snapshot.title,
      description: snapshot.description,
      category: snapshot.category,
      level: snapshot.level,
      tags: snapshot.tags,
      topics: snapshot.topics,
      lastEditedBy: adminUserId,
    });
  } else if (entityType === 'Lesson') {
    await Lesson.findByIdAndUpdate(entityId, {
      title: snapshot.title,
      description: snapshot.description,
      content: snapshot.content,
      duration: snapshot.duration,
      topics: snapshot.topics,
      lastEditedBy: adminUserId,
    });
  } else if (entityType === 'Quiz') {
    await Quiz.findByIdAndUpdate(entityId, {
      title: snapshot.title,
      description: snapshot.description,
      questions: snapshot.questions,
      passingScore: snapshot.passingScore,
      lastEditedBy: adminUserId,
    });
  } else if (entityType === 'FlashcardDeck') {
    await FlashcardDeck.findByIdAndUpdate(entityId, {
      title: snapshot.title,
      description: snapshot.description,
      cards: snapshot.cards,
      lastEditedBy: adminUserId,
    });
  }

  // Create a new snapshot representing the rollback state
  const restoredVersion = await createVersionSnapshot({
    entityType,
    entityId,
    snapshot,
    changeSummary: 'Rollback to version ' + targetVersionNumber,
    authorId: adminUserId,
  });

  restoredVersion.restoredFromVersion = targetVersionNumber;
  await restoredVersion.save();

  await logAdminAction({
    adminUserId,
    action: 'content_version_rollback',
    targetType: entityType,
    targetId: String(entityId),
    metadata: {
      targetVersionNumber,
      newVersionNumber: restoredVersion.versionNumber,
    },
  });

  return {
    success: true,
    message: 'Successfully rolled back ' + entityType + ' to version ' + targetVersionNumber,
    restoredVersion,
  };
}

export default {
  createVersionSnapshot,
  getVersionHistory,
  rollbackToVersion,
};
