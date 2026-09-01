import StudySession from '../models/StudySession.js';
import * as studyPlanService from '../services/studyPlanService.js';
import * as knowledgeService from '../services/knowledgeService.js';
import * as achievementService from '../services/achievementService.js';
import * as notificationService from '../services/notificationService.js';
import * as progressService from '../services/progressService.js';

/**
 * @desc    Start a new study session
 * @route   POST /api/study-sessions/start
 * @access  Private
 */
export const startSession = async (req, res, next) => {
  try {
    const { planId, taskId } = req.body;
    const userId = req.user._id;

    if (!planId || !taskId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID and Task ID are required to start a session.',
      });
    }

    // 1. Verify that user owns the plan
    const plan = await studyPlanService.getPlanById(planId, userId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Study plan not found or access denied.',
      });
    }

    // 2. Verify that task belongs to the plan
    let foundTask = null;
    for (const day of plan.days) {
      const task = day.tasks.id(taskId);
      if (task) {
        foundTask = task;
        break;
      }
    }

    if (!foundTask) {
      return res.status(400).json({
        success: false,
        message: 'Task not found in the selected study plan.',
      });
    }

    // 3. Prevent duplicate active sessions (if any active session already exists, close it or return it)
    const existingActive = await StudySession.findOne({ userId, completedAt: null });
    if (existingActive) {
      return res.status(200).json({
        success: true,
        message: 'Reconnected to currently active session.',
        session: {
          id: existingActive._id,
          startedAt: existingActive.startedAt,
        },
      });
    }

    // 4. Create new study session
    const session = await StudySession.create({
      userId,
      taskId,
      planId,
      subject: foundTask.subject,
      durationMinutes: 0,
      startedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      session: {
        id: session._id,
        startedAt: session.startedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Complete a study session
 * @route   PATCH /api/study-sessions/:id/complete
 * @access  Private
 */
export const completeSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user._id;

    // 1. Fetch session and verify ownership
    const session = await StudySession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Study session not found or access denied.',
      });
    }

    // 2. Guard: Check if already completed
    if (session.completedAt) {
      return res.status(400).json({
        success: false,
        message: 'This study session has already been completed.',
      });
    }

    // 3. Calculate duration
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - session.startedAt.getTime();
    if (durationMs < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid study session duration.',
      });
    }

    // Calculate duration in minutes (round up to nearest 1, or standard round)
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    // Guard: Prevent abnormally long session (e.g. > 12 hours)
    if (durationMinutes > 720) {
      return res.status(400).json({
        success: false,
        message: 'Study session duration exceeds the maximum limit of 12 hours.',
      });
    }

    // 4. Update session
    session.completedAt = completedAt;
    session.durationMinutes = durationMinutes;
    await session.save();

    // Log study session event in background
    try {
      const plan = await studyPlanService.getPlanById(session.planId, userId);
      let taskTitle = 'General';
      if (plan) {
        for (const day of plan.days) {
          const task = day.tasks.id(session.taskId);
          if (task) {
            taskTitle = task.title;
            break;
          }
        }
      }
      const extractedTopic = knowledgeService.extractTopicFromTitle(taskTitle);
      await knowledgeService.logEvent(userId, session.subject, extractedTopic, 'study_session', 'practice');
    } catch (err) {
      console.error('Error logging study session knowledge event:', err.message);
    }

    // 5. Update user's lastStudyDate in database and update active user's streak
    req.user.lastStudyDate = completedAt;
    await req.user.save();

    // Trigger achievements and streak notifications in background (non-blocking)
    try {
      await achievementService.checkAndUnlock(userId, 'first_study_session');
      
      const streaks = await progressService.calculateStreaks(userId);
      if (streaks && streaks.currentStreak >= 7) {
        await achievementService.checkAndUnlock(userId, '7_day_streak');
      }

      if (streaks && streaks.currentStreak > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        await notificationService.createNotification(userId, {
          type: 'streak',
          title: 'Study Streak Active! 🔥',
          message: `Nice work! You've completed your study session today and kept your ${streaks.currentStreak}-day streak alive!`,
          link: '/dashboard',
          metadata: {
            uniqueKey: `streak:${todayStr}`,
            currentStreak: streaks.currentStreak,
          },
        });
      }
    } catch (actErr) {
      console.error('Study session achievements/streak trigger failed:', actErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Study session completed successfully.',
      session: {
        id: session._id,
        durationMinutes: session.durationMinutes,
        completedAt: session.completedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently active study session for user
 * @route   GET /api/study-sessions/active
 * @access  Private
 */
export const getActiveSession = async (req, res, next) => {
  try {
    const session = await StudySession.findOne({
      userId: req.user._id,
      completedAt: null,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      session: session
        ? {
            id: session._id,
            planId: session.planId,
            taskId: session.taskId,
            startedAt: session.startedAt,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
};
