import * as studyPlanService from '../services/studyPlanService.js';
import * as dailyStudyService from '../services/dailyStudyService.js';
import * as adaptiveStudyService from '../services/adaptiveStudyService.js';
import PlanAdaptation from '../models/PlanAdaptation.js';

/**
 * @desc    Generate a new AI study plan
 * @route   POST /api/study-plans/generate
 * @access  Private
 */
export const generatePlan = async (req, res, next) => {
  try {
    const user = req.user;

    // Validate user profile completeness
    const hasSubjects = Array.isArray(user.subjects) && user.subjects.length > 0;
    const hasGoal = user.goal && user.goal.type;
    const hasDailyMinutes = user.dailyStudyMinutes && user.dailyStudyMinutes > 0;
    const needsTargetDate = user.goal?.type === 'exam';
    const hasTargetDate = user.goal?.targetDate;

    if (!hasSubjects || !hasGoal || !hasDailyMinutes || (needsTargetDate && !hasTargetDate)) {
      return res.status(400).json({
        success: false,
        message: 'Please complete your study profile before creating a study plan.',
      });
    }

    // Check for existing active plan
    const existing = await studyPlanService.getCurrentPlan(user._id);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active study plan.',
        planId: existing._id,
      });
    }

    // Generate via AI
    const plan = await studyPlanService.generatePlan(user, {
      startDate: req.body.startDate,
    });

    res.status(201).json({
      success: true,
      message: 'Study plan created successfully',
      plan,
    });
  } catch (error) {
    if (error.message === 'AI_GENERATION_FAILED' || error.message === 'AI_VALIDATION_FAILED') {
      return res.status(503).json({
        success: false,
        message: "We couldn't create your study plan right now. Please try again later.",
      });
    }
    next(error);
  }
};

/**
 * @desc    Get current user's active study plan
 * @route   GET /api/study-plans/current
 * @access  Private
 */
export const getCurrentPlan = async (req, res, next) => {
  try {
    const plan = await studyPlanService.getCurrentPlan(req.user._id);

    res.json({
      success: true,
      plan: plan || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get study plan by ID
 * @route   GET /api/study-plans/:id
 * @access  Private (owner only)
 */
export const getPlanById = async (req, res, next) => {
  try {
    // Ownership check directly in the query: uses both plan._id and req.user._id
    const plan = await studyPlanService.getPlanById(req.params.id, req.user._id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Study plan not found',
      });
    }

    res.json({
      success: true,
      plan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle task completion
 * @route   PATCH /api/study-plans/:planId/tasks/:taskId/complete
 * @access  Private (owner only)
 */
export const completeTask = async (req, res, next) => {
  try {
    const { planId, taskId } = req.params;

    // Ownership check directly in the query
    const plan = await studyPlanService.getPlanById(planId, req.user._id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Study plan not found',
      });
    }

    const updated = await studyPlanService.toggleTaskCompletion(plan, taskId);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    res.json({
      success: true,
      message: 'Task updated',
      plan: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get today's tasks from the active study plan
 * @route   GET /api/study-plans/today
 * @access  Private
 */
export const getTodayTasks = async (req, res, next) => {
  try {
    const todayStr = dailyStudyService.formatDateString(new Date());
    const { plan, todayDay } = await dailyStudyService.getTodayDayInfo(req.user._id, todayStr);

    res.status(200).json({
      success: true,
      date: todayStr,
      day: todayDay
        ? {
            dayNumber: todayDay.dayNumber,
            focus: todayDay.focus,
            tasks: todayDay.tasks.map((t) => ({
              id: t._id,
              title: t.title,
              subject: t.subject,
              duration: t.duration,
              type: t.type,
              completed: t.completed,
            })),
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get adaptive recommendations
 * @route   GET /api/study-plans/recommendation
 * @access  Private
 */
export const getStudyRecommendation = async (req, res, next) => {
  try {
    const todayStr = dailyStudyService.formatDateString(new Date());
    const recommendation = await adaptiveStudyService.getStudyRecommendation(req.user._id, todayStr);

    res.status(200).json({
      success: true,
      recommendation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get AI daily coaching message
 * @route   POST /api/study-plans/daily-coach
 * @access  Private
 */
export const getDailyCoach = async (req, res, next) => {
  try {
    const todayStr = dailyStudyService.formatDateString(new Date());
    const coach = await adaptiveStudyService.generateDailyCoach(req.user, todayStr);

    res.status(200).json({
      success: true,
      coach,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Adapt active study plan
 * @route   POST /api/study-plans/adapt
 * @access  Private
 */
export const adaptPlan = async (req, res, next) => {
  try {
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required.',
      });
    }

    const result = await adaptiveStudyService.adaptStudyPlan(planId, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get adaptations history for plan
 * @route   GET /api/study-plans/:id/adaptations
 * @access  Private
 */
export const getAdaptations = async (req, res, next) => {
  try {
    const planId = req.params.id;
    const plan = await studyPlanService.getPlanById(planId, req.user._id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Study plan not found or access denied.',
      });
    }

    const adaptations = await PlanAdaptation.find({ planId, userId: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      adaptations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get AI adaptation explanation
 * @route   POST /api/study-plans/adaptation-explanation
 * @access  Private
 */
export const getAdaptationExplanation = async (req, res, next) => {
  try {
    const { type, reason, changes } = req.body;
    const explanation = await adaptiveStudyService.generateAdaptationExplanation(
      type,
      reason,
      changes || [],
      req.user.dailyStudyMinutes || 60
    );

    res.status(200).json({
      success: true,
      explanation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export study plan as standard iCal (.ics) calendar file
 * @route   GET /api/study-plans/:id/export-ics
 * @access  Private (owner only)
 */
export const exportPlanICS = async (req, res, next) => {
  try {
    const plan = await studyPlanService.getPlanById(req.params.id, req.user._id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Study plan not found or access denied.',
      });
    }

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EduFlow//Study Plan Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:EduFlow - ${plan.title.replace(/[\r\n;,]/g, ' ')}`,
    ];

    const formatICSDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const nowStamp = formatICSDate(new Date());

    for (const day of plan.days) {
      const dayDate = new Date(day.date);
      for (const task of day.tasks) {
        const startDate = new Date(dayDate);
        startDate.setHours(9, 0, 0, 0); // Default morning 09:00 start
        const endDate = new Date(startDate.getTime() + (task.duration || 30) * 60 * 1000);

        const uid = `task-${task._id}@eduflow.app`;
        const summary = `EduFlow: ${task.title} (${task.subject})`;
        const description = `Subject: ${task.subject}\\nFocus: ${day.focus || 'Study'}\\nDuration: ${task.duration} min\\nType: ${task.type || 'learning'}`;

        icsContent.push(
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${nowStamp}`,
          `DTSTART:${formatICSDate(startDate)}`,
          `DTEND:${formatICSDate(endDate)}`,
          `SUMMARY:${summary.replace(/[\r\n]/g, ' ')}`,
          `DESCRIPTION:${description.replace(/[\r\n]/g, ' ')}`,
          `STATUS:${task.completed ? 'COMPLETED' : 'CONFIRMED'}`,
          'END:VEVENT'
        );
      }
    }

    icsContent.push('END:VCALENDAR');
    const finalICS = icsContent.join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="eduflow-study-plan-${plan._id}.ics"`);
    res.status(200).send(finalICS);
  } catch (error) {
    next(error);
  }
};
