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
 * Only allows updating: name, subjects, goal, dailyStudyMinutes.
 * Does NOT allow modifying: _id, password, streak, createdAt, updatedAt.
 */
export const updateMe = async (req, res, next) => {
  try {
    // Whitelist of allowed fields
    const allowedFields = ['name', 'subjects', 'goal', 'dailyStudyMinutes'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Trim name if provided
    if (updates.name && typeof updates.name === 'string') {
      updates.name = updates.name.trim();
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
