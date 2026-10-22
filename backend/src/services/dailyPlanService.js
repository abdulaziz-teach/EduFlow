import DailyLearningPlan from '../models/DailyLearningPlan.js';
import User from '../models/User.js';
import { getLearnerProfile } from './learnerProfileService.js';
import Enrollment from '../models/Enrollment.js';
import Lesson from '../models/Lesson.js';
import Progress from '../models/Progress.js';

/**
 * Get or generate today's personalized daily learning plan
 */
export async function getOrCreateDailyPlan(userId, forceRegenerate = false) {
  const todayStr = new Date().toISOString().split('T')[0];

  if (!forceRegenerate) {
    const existing = await DailyLearningPlan.findOne({ userId, dateStr: todayStr });
    if (existing) {
      return existing;
    }
  }

  const user = await User.findById(userId);
  const profile = await getLearnerProfile(userId);

  const availableMinutes = user.dailyStudyMinutes || 45;
  const tasks = [];
  let allocatedMinutes = 0;

  // 1. Spaced Repetition Flashcards Task (if cards are due)
  if (profile.flashcardStats?.dueCount > 0) {
    const flashcardMins = Math.min(15, Math.max(5, Math.round(profile.flashcardStats.dueCount * 1.5)));
    tasks.push({
      id: `task_flashcards_${Date.now()}`,
      title: `Review ${profile.flashcardStats.dueCount} Due Flashcards`,
      type: 'flashcard_review',
      estimatedMinutes: flashcardMins,
      completed: false,
      metadata: {
        topic: 'Spaced Repetition',
        subject: 'All Subjects',
      },
    });
    allocatedMinutes += flashcardMins;
  }

  // 2. Active Course Continuation Task
  const enrollments = await Enrollment.find({ userId, status: 'active' }).populate('courseId');
  if (enrollments.length > 0 && enrollments[0].courseId) {
    const course = enrollments[0].courseId;
    const completedProgress = await Progress.find({ userId, courseId: course._id, completed: true }).select('lessonId');
    const completedSet = new Set(completedProgress.map((p) => p.lessonId.toString()));
    const nextLesson = await Lesson.findOne({
      courseId: course._id,
      isPublished: true,
      _id: { $nin: Array.from(completedSet) },
    }).sort({ order: 1 });

    if (nextLesson) {
      const lessonMins = Math.min(25, Math.max(10, Math.round((nextLesson.duration || 600) / 60) || 15));
      tasks.push({
        id: `task_lesson_${nextLesson._id}`,
        title: `Complete Lesson: "${nextLesson.title}" (${course.title})`,
        type: 'lesson_continue',
        estimatedMinutes: lessonMins,
        completed: false,
        metadata: {
          courseId: course._id,
          lessonId: nextLesson._id,
          subject: course.category,
        },
      });
      allocatedMinutes += lessonMins;
    }
  }

  // 3. Weak Topic Practice (if detected)
  if (profile.weakTopics && profile.weakTopics.length > 0 && allocatedMinutes + 10 <= availableMinutes) {
    const weakTopic = profile.weakTopics[0];
    const practiceMins = 10;
    tasks.push({
      id: `task_weakness_${Date.now()}`,
      title: `Practice 5 Questions on "${weakTopic.topic}"`,
      type: 'practice_weak_topic',
      estimatedMinutes: practiceMins,
      completed: false,
      metadata: {
        topic: weakTopic.topic,
        subject: weakTopic.subject,
      },
    });
    allocatedMinutes += practiceMins;
  }

  // 4. Quick Concept Revision if remaining time is ample
  if (tasks.length === 0 || allocatedMinutes + 10 <= availableMinutes) {
    const revisionTopic = profile.strongTopics?.[0]?.topic || user.subjects?.[0] || 'Core Principles';
    const revMins = Math.max(5, Math.min(15, availableMinutes - allocatedMinutes));
    tasks.push({
      id: `task_revision_${Date.now()}`,
      title: `10-Minute Concept Review: ${revisionTopic}`,
      type: 'revision',
      estimatedMinutes: revMins,
      completed: false,
      metadata: {
        topic: revisionTopic,
        subject: user.subjects?.[0] || 'General',
      },
    });
    allocatedMinutes += revMins;
  }

  const totalMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

  const plan = await DailyLearningPlan.findOneAndUpdate(
    { userId, dateStr: todayStr },
    {
      $set: {
        tasks,
        totalEstimatedMinutes: totalMinutes,
        completedTasksCount: 0,
        isCompleted: false,
        generatedBy: 'system',
      },
    },
    { upsert: true, new: true }
  );

  return plan;
}

/**
 * Toggle task completion in today's daily learning plan
 */
export async function toggleDailyTask(userId, taskId, completed = true) {
  const todayStr = new Date().toISOString().split('T')[0];
  const plan = await DailyLearningPlan.findOne({ userId, dateStr: todayStr });

  if (!plan) throw new Error('Daily plan not found for today');

  const task = plan.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error('Task not found in daily plan');

  task.completed = completed;
  task.completedAt = completed ? new Date() : null;

  plan.completedTasksCount = plan.tasks.filter((t) => t.completed).length;
  plan.isCompleted = plan.completedTasksCount === plan.tasks.length && plan.tasks.length > 0;

  await plan.save();
  return plan;
}

export default {
  getOrCreateDailyPlan,
  toggleDailyTask,
};
