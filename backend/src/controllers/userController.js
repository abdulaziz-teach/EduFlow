const isOnboardingComplete = (user) => user.onboardingComplete || Boolean(
  user.subjects?.length && user.goal?.type &&
  Number.isFinite(user.dailyStudyMinutes) && user.dailyStudyMinutes > 0
);

/**
 * @desc    Get current authenticated user
 * @route   GET /api/users/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  // req.user is set by authMiddleware — identity comes from the JWT, not from the client
  res.json({
    success: true,
    user: req.user.toSafeObject(),
  });
};

/**
 * @desc    Update current authenticated user profile
 * @route   PATCH /api/users/me
 * @access  Private
 *
 * Strict whitelist of allowed fields.
 * Does NOT allow modifying: _id, password, passwordHash, role, status, streak, createdAt, updatedAt.
 */
export const updateMe = async (req, res, next) => {
  try {
    const allowedFields = [
      'name',
      'displayName',
      'username',
      'avatar',
      'age',
      'subjects',
      'goal',
      'dailyStudyMinutes',
      'level',
      'learningStyle',
      'weakTopics',
      'studySchedule',
      'preferredLanguage',
    ];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Trim text fields if provided
    if (updates.name && typeof updates.name === 'string') {
      updates.name = updates.name.trim();
    }
    if (updates.displayName && typeof updates.displayName === 'string') {
      updates.displayName = updates.displayName.trim();
    }
    if (updates.username && typeof updates.username === 'string') {
      updates.username = updates.username.trim().toLowerCase();
    }

    const user = await req.user.set(updates).save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

export const saveOnboardingDraft = async (req, res, next) => {
  try {
    if (isOnboardingComplete(req.user)) {
      return res.status(409).json({
        success: false,
        error: 'ONBOARDING_ALREADY_COMPLETE',
        message: 'Your onboarding is already complete. Edit your learning profile instead.',
      });
    }

    const fields = [
      'step',
      'goalType',
      'goalDescription',
      'subjects',
      'level',
      'weakTopics',
      'dailyStudyMinutes',
      'learningStyle',
      'targetDate',
      'preferredDays',
      'preferredTime',
      'preferredLanguage',
      'age',
    ];
    const draft = Object.fromEntries(
      fields.filter((field) => req.body[field] !== undefined).map((field) => [field, req.body[field]])
    );

    req.user.onboardingDraft = {
      ...(req.user.onboardingDraft?.toObject?.() || req.user.onboardingDraft || {}),
      ...draft,
    };
    req.user.onboardingDraftUpdatedAt = new Date();
    await req.user.save();

    res.json({
      success: true,
      message: 'Onboarding progress saved',
      onboardingDraft: req.user.onboardingDraft,
    });
  } catch (error) {
    next(error);
  }
};

export const completeOnboarding = async (req, res, next) => {
  try {
    if (isOnboardingComplete(req.user)) {
      return res.status(409).json({
        success: false,
        error: 'ONBOARDING_ALREADY_COMPLETE',
        message: 'Your onboarding is already complete.',
      });
    }

    const {
      goalType,
      goalDescription,
      subjects,
      level,
      weakTopics,
      dailyStudyMinutes,
      learningStyle,
      targetDate,
      preferredDays,
      preferredTime,
      preferredLanguage,
      age,
    } = req.body;

    req.user.set({
      subjects,
      level,
      weakTopics,
      dailyStudyMinutes,
      learningStyle,
      goal: {
        type: goalType,
        description: goalDescription || goalType,
        ...(targetDate ? { targetDate: new Date(`${targetDate}T00:00:00.000Z`) } : {}),
      },
      studySchedule: { preferredDays, preferredTime },
      preferredLanguage,
      age,
      onboardingComplete: true,
      onboardingDraft: null,
      onboardingDraftUpdatedAt: null,
    });
    await req.user.save();

    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      user: req.user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};
