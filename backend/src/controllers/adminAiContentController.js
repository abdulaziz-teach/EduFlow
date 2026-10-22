import AIContentGeneration from '../models/AIContentGeneration.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Quiz from '../models/Quiz.js';
import FlashcardDeck from '../models/FlashcardDeck.js';
import aiContentService from '../services/aiContentGeneratorService.js';
import validationPipeline from '../services/contentValidationPipeline.js';
import duplicateDetection from '../services/duplicateDetectionService.js';
import versioningService from '../services/contentVersioningService.js';
import { logAdminAction } from '../services/auditService.js';

/**
 * Generate a complete draft course curriculum
 * POST /api/admin/content/ai/course
 */
export async function generateCourse(req, res, next) {
  try {
    const { subject, title, targetLevel, language, objectives, approximateModules } = req.body;

    if (!subject || typeof subject !== 'string') {
      return res.status(400).json({ success: false, error: 'Subject is required' });
    }

    const generated = await aiContentService.generateCourseStructureAI({
      subject,
      title,
      targetLevel,
      language,
      objectives,
      approximateModules,
    });

    const validation = validationPipeline.validateCourseStructure(generated);
    const duplicateCheck = await duplicateDetection.checkCourseDuplicates({
      title: generated.title,
    });

    const generationRecord = await AIContentGeneration.create({
      requestedBy: req.user._id,
      contentType: 'course',
      subject,
      topic: generated.topics?.[0] || subject,
      targetLevel: targetLevel || 'beginner',
      language: language || 'en',
      sourceType: 'admin_prompt',
      generatedContent: generated,
      validationResults: { ...validation, duplicateCheck },
      reviewStatus: 'pending_review',
    });

    await logAdminAction({
      adminUserId: req.user._id,
      action: 'ai_course_generated',
      targetType: 'AIContentGeneration',
      targetId: String(generationRecord._id),
      metadata: { subject, title: generated.title, isValid: validation.isValid },
    });

    res.status(201).json({
      success: true,
      generationId: generationRecord._id,
      course: generated,
      validation,
      duplicateCheck,
      reviewStatus: 'pending_review',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Generate structured lesson draft
 * POST /api/admin/content/ai/lesson
 */
export async function generateLesson(req, res, next) {
  try {
    const { courseId, title, topic, targetLevel, language, objectives, groundingContent } = req.body;

    if (!topic && !title) {
      return res.status(400).json({ success: false, error: 'Either title or topic is required' });
    }

    let sourceContext = groundingContent || '';
    if (courseId && !sourceContext) {
      const course = await Course.findById(courseId).lean();
      if (course) {
        sourceContext = 'Course: ' + course.title + '\nDescription: ' + course.description;
      }
    }

    const generated = await aiContentService.generateDraftLessonAI({
      title,
      topic: topic || title,
      targetLevel,
      language,
      objectives,
      groundingContent: sourceContext,
    });

    const validation = validationPipeline.validateStructuredLesson(generated);
    const duplicateCheck = await duplicateDetection.checkLessonDuplicates({
      courseId,
      title: generated.title,
    });

    const generationRecord = await AIContentGeneration.create({
      requestedBy: req.user._id,
      contentType: 'lesson',
      subject: topic || 'General',
      topic: generated.topics?.[0] || topic || title,
      targetLevel: targetLevel || 'beginner',
      language: language || 'en',
      sourceType: courseId ? 'approved_course_content' : 'admin_prompt',
      sourceContentIds: courseId ? [courseId] : [],
      generatedContent: generated,
      validationResults: { ...validation, duplicateCheck },
      reviewStatus: 'pending_review',
    });

    await logAdminAction({
      adminUserId: req.user._id,
      action: 'ai_lesson_generated',
      targetType: 'AIContentGeneration',
      targetId: String(generationRecord._id),
      metadata: { title: generated.title, courseId, isValid: validation.isValid },
    });

    res.status(201).json({
      success: true,
      generationId: generationRecord._id,
      lesson: generated,
      validation,
      duplicateCheck,
      reviewStatus: 'pending_review',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Generate draft quiz questions
 * POST /api/admin/content/ai/quiz
 */
export async function generateQuiz(req, res, next) {
  try {
    const { lessonId, topic, difficulty, count, groundingContent } = req.body;

    let sourceContext = groundingContent || '';
    let targetTopic = topic || 'General';

    if (lessonId && !sourceContext) {
      const lesson = await Lesson.findById(lessonId).lean();
      if (lesson) {
        sourceContext = (lesson.title || '') + '\n' + (lesson.description || '') + '\n' + (lesson.content || '');
        targetTopic = lesson.topics?.[0] || lesson.title;
      }
    }

    const generated = await aiContentService.generateDraftQuizAI({
      title: targetTopic + ' Assessment',
      topic: targetTopic,
      difficulty: difficulty || 'medium',
      count: count || 3,
      groundingContent: sourceContext,
    });

    const validation = validationPipeline.validateQuizQuestions(generated.questions);
    const duplicateCheck = await duplicateDetection.checkQuizDuplicates({
      lessonId,
      questions: generated.questions,
    });

    const generationRecord = await AIContentGeneration.create({
      requestedBy: req.user._id,
      contentType: 'quiz',
      subject: targetTopic,
      topic: targetTopic,
      targetLevel: difficulty || 'medium',
      sourceType: lessonId ? 'approved_course_content' : 'admin_prompt',
      sourceContentIds: lessonId ? [lessonId] : [],
      generatedContent: generated,
      validationResults: { ...validation, duplicateCheck },
      reviewStatus: 'pending_review',
    });

    await logAdminAction({
      adminUserId: req.user._id,
      action: 'ai_quiz_generated',
      targetType: 'AIContentGeneration',
      targetId: String(generationRecord._id),
      metadata: { topic: targetTopic, count: generated.questions.length },
    });

    res.status(201).json({
      success: true,
      generationId: generationRecord._id,
      quiz: generated,
      validation,
      duplicateCheck,
      reviewStatus: 'pending_review',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Generate draft flashcards from approved lesson material
 * POST /api/admin/content/ai/flashcards
 */
export async function generateFlashcards(req, res, next) {
  try {
    const { lessonId, topic, count, groundingContent } = req.body;

    let sourceContext = groundingContent || '';
    let targetTopic = topic || 'General';

    if (lessonId && !sourceContext) {
      const lesson = await Lesson.findById(lessonId).lean();
      if (lesson) {
        sourceContext = (lesson.title || '') + '\n' + (lesson.description || '') + '\n' + (lesson.content || '');
        targetTopic = lesson.topics?.[0] || lesson.title;
      }
    }

    const generated = await aiContentService.generateDraftFlashcardsAI({
      topic: targetTopic,
      count: count || 5,
      groundingContent: sourceContext,
    });

    const validation = validationPipeline.validateFlashcards(generated.cards);

    const generationRecord = await AIContentGeneration.create({
      requestedBy: req.user._id,
      contentType: 'flashcards',
      subject: targetTopic,
      topic: targetTopic,
      sourceType: lessonId ? 'approved_course_content' : 'admin_prompt',
      sourceContentIds: lessonId ? [lessonId] : [],
      generatedContent: generated,
      validationResults: validation,
      reviewStatus: 'pending_review',
    });

    await logAdminAction({
      adminUserId: req.user._id,
      action: 'ai_flashcards_generated',
      targetType: 'AIContentGeneration',
      targetId: String(generationRecord._id),
      metadata: { topic: targetTopic, count: generated.cards.length },
    });

    res.status(201).json({
      success: true,
      generationId: generationRecord._id,
      deck: generated,
      validation,
      reviewStatus: 'pending_review',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Regenerate fine-grained section
 * POST /api/admin/content/ai/regenerate
 */
export async function regenerateSection(req, res, next) {
  try {
    const { sectionName, instruction, currentContent, topic } = req.body;

    if (!sectionName) {
      return res.status(400).json({ success: false, error: 'Section name is required' });
    }

    const result = await aiContentService.regenerateSectionAI({
      sectionName,
      instruction: instruction || 'improve_clarity',
      currentContent: currentContent || '',
      topic: topic || 'General',
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Validate draft content
 * POST /api/admin/content/ai/validate
 */
export async function validateDraftContent(req, res, next) {
  try {
    const { type, content } = req.body;
    let validation = { isValid: false, qualityScore: 0, issues: [] };

    if (type === 'course') {
      validation = validationPipeline.validateCourseStructure(content);
    } else if (type === 'lesson') {
      validation = validationPipeline.validateStructuredLesson(content);
    } else if (type === 'quiz') {
      validation = validationPipeline.validateQuizQuestions(content.questions || content);
    } else if (type === 'flashcards') {
      validation = validationPipeline.validateFlashcards(content.cards || content);
    }

    res.json({
      success: true,
      validation,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Approve AI Content Generation and commit to production entity in DRAFT state
 * POST /api/admin/content/ai/generations/:id/approve
 */
export async function approveGeneration(req, res, next) {
  try {
    const { id } = req.params;
    const { editedContent } = req.body;

    const record = await AIContentGeneration.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Generation record not found' });
    }

    const contentToSave = editedContent || record.generatedContent;
    let createdEntity = null;

    if (record.contentType === 'course') {
      const cleanSlug = (contentToSave.title || record.subject)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Date.now();

      createdEntity = await Course.create({
        title: contentToSave.title,
        slug: cleanSlug,
        description: contentToSave.description || '',
        category: contentToSave.category || record.subject,
        level: contentToSave.level || record.targetLevel,
        language: contentToSave.language || record.language,
        topics: contentToSave.topics || [record.subject],
        prerequisites: contentToSave.prerequisites || [],
        status: 'draft',
        instructorId: req.user._id,
        generationId: record._id,
        version: 1,
      });

      // Save version 1 snapshot
      await versioningService.createVersionSnapshot({
        entityType: 'Course',
        entityId: createdEntity._id,
        snapshot: contentToSave,
        changeSummary: 'Initial AI-generated draft approved',
        authorId: req.user._id,
      });

      record.targetEntityId = createdEntity._id;
      record.targetEntityType = 'Course';
    } else if (record.contentType === 'lesson') {
      const courseId = req.body.courseId || record.sourceContentIds?.[0];
      if (!courseId) {
        return res.status(400).json({ success: false, error: 'Course ID required to attach lesson' });
      }

      const existingCount = await Lesson.countDocuments({ courseId });
      const cleanSlug = (contentToSave.title || 'lesson')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Date.now();

      createdEntity = await Lesson.create({
        courseId,
        title: contentToSave.title,
        slug: cleanSlug,
        description: contentToSave.description || '',
        content: contentToSave.explanation || contentToSave.content || '',
        duration: contentToSave.duration || 600,
        order: existingCount + 1,
        status: 'draft',
        isPublished: false,
        topics: contentToSave.topics || [record.topic || record.subject],
        generationId: record._id,
        version: 1,
      });

      await versioningService.createVersionSnapshot({
        entityType: 'Lesson',
        entityId: createdEntity._id,
        snapshot: contentToSave,
        changeSummary: 'Initial AI-generated lesson approved',
        authorId: req.user._id,
      });

      record.targetEntityId = createdEntity._id;
      record.targetEntityType = 'Lesson';
    } else if (record.contentType === 'quiz') {
      const lessonId = req.body.lessonId || record.sourceContentIds?.[0];
      if (!lessonId) {
        return res.status(400).json({ success: false, error: 'Lesson ID required to attach quiz' });
      }

      createdEntity = await Quiz.create({
        lessonId,
        title: contentToSave.title || 'Lesson Quiz',
        description: contentToSave.description || '',
        questions: contentToSave.questions || [],
        passingScore: contentToSave.passingScore || 70,
        status: 'draft',
        generationId: record._id,
        version: 1,
      });

      await versioningService.createVersionSnapshot({
        entityType: 'Quiz',
        entityId: createdEntity._id,
        snapshot: contentToSave,
        changeSummary: 'Initial AI-generated quiz approved',
        authorId: req.user._id,
      });

      record.targetEntityId = createdEntity._id;
      record.targetEntityType = 'Quiz';
    } else if (record.contentType === 'flashcards') {
      createdEntity = await FlashcardDeck.create({
        userId: req.user._id,
        title: contentToSave.title || (record.subject + ' Deck'),
        description: contentToSave.description || '',
        subject: contentToSave.subject || record.subject,
        cards: contentToSave.cards || [],
        status: 'draft',
        isPublic: false,
        generationId: record._id,
        version: 1,
      });

      await versioningService.createVersionSnapshot({
        entityType: 'FlashcardDeck',
        entityId: createdEntity._id,
        snapshot: contentToSave,
        changeSummary: 'Initial AI-generated flashcards approved',
        authorId: req.user._id,
      });

      record.targetEntityId = createdEntity._id;
      record.targetEntityType = 'FlashcardDeck';
    }

    record.reviewStatus = 'approved';
    record.reviewedBy = req.user._id;
    record.reviewedAt = new Date();
    await record.save();

    await logAdminAction({
      adminUserId: req.user._id,
      action: 'ai_generation_approved',
      targetType: record.targetEntityType,
      targetId: String(record.targetEntityId),
      metadata: { generationId: record._id },
    });

    res.json({
      success: true,
      message: 'Content approved and saved as draft in production schema',
      entity: createdEntity,
      generation: record,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Reject AI Generation
 * POST /api/admin/content/ai/generations/:id/reject
 */
export async function rejectGeneration(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const record = await AIContentGeneration.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Generation record not found' });
    }

    record.reviewStatus = 'rejected';
    record.reviewedBy = req.user._id;
    record.reviewedAt = new Date();
    record.errorMessage = reason || 'Rejected during human review';
    await record.save();

    await logAdminAction({
      adminUserId: req.user._id,
      action: 'ai_generation_rejected',
      targetType: 'AIContentGeneration',
      targetId: String(record._id),
      metadata: { reason: record.errorMessage },
    });

    res.json({
      success: true,
      message: 'Generation rejected',
      generation: record,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Publish approved content
 * POST /api/admin/content/:entityType/:id/publish
 */
export async function publishContent(req, res, next) {
  try {
    const { entityType, id } = req.params;

    let updated = null;
    if (entityType === 'course') {
      updated = await Course.findByIdAndUpdate(
        id,
        { status: 'published', publishedAt: new Date(), lastEditedBy: req.user._id },
        { new: true }
      );
    } else if (entityType === 'lesson') {
      updated = await Lesson.findByIdAndUpdate(
        id,
        { status: 'published', isPublished: true, lastEditedBy: req.user._id },
        { new: true }
      );
    } else if (entityType === 'quiz') {
      updated = await Quiz.findByIdAndUpdate(
        id,
        { status: 'published', lastEditedBy: req.user._id },
        { new: true }
      );
    } else if (entityType === 'flashcards') {
      updated = await FlashcardDeck.findByIdAndUpdate(
        id,
        { status: 'published', isPublic: true, lastEditedBy: req.user._id },
        { new: true }
      );
    } else {
      return res.status(400).json({ success: false, error: 'Invalid entity type' });
    }

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Entity not found' });
    }

    await logAdminAction({
      adminUserId: req.user._id,
      action: 'content_published',
      targetType: entityType,
      targetId: String(id),
      metadata: { title: updated.title },
    });

    res.json({
      success: true,
      message: entityType + ' published successfully',
      item: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Version History
 * GET /api/admin/content/:entityType/:id/versions
 */
export async function getVersions(req, res, next) {
  try {
    const { entityType, id } = req.params;
    const formattedType =
      entityType === 'course' ? 'Course' :
      entityType === 'lesson' ? 'Lesson' :
      entityType === 'quiz' ? 'Quiz' : 'FlashcardDeck';

    const versions = await versioningService.getVersionHistory({
      entityType: formattedType,
      entityId: id,
    });

    res.json({
      success: true,
      versions,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Rollback to specific version
 * POST /api/admin/content/:entityType/:id/rollback
 */
export async function rollbackContent(req, res, next) {
  try {
    const { entityType, id } = req.params;
    const { targetVersionNumber } = req.body;

    if (!targetVersionNumber) {
      return res.status(400).json({ success: false, error: 'targetVersionNumber is required' });
    }

    const formattedType =
      entityType === 'course' ? 'Course' :
      entityType === 'lesson' ? 'Lesson' :
      entityType === 'quiz' ? 'Quiz' : 'FlashcardDeck';

    const result = await versioningService.rollbackToVersion({
      entityType: formattedType,
      entityId: id,
      targetVersionNumber: Number(targetVersionNumber),
      adminUserId: req.user._id,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  generateCourse,
  generateLesson,
  generateQuiz,
  generateFlashcards,
  regenerateSection,
  validateDraftContent,
  approveGeneration,
  rejectGeneration,
  publishContent,
  getVersions,
  rollbackContent,
};
