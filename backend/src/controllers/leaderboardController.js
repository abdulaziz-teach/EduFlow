import User from '../models/User.js';
import LeaderboardEntry from '../models/LeaderboardEntry.js';
import StudySession from '../models/StudySession.js';
import PracticeSession from '../models/PracticeSession.js';

/**
 * Get Leaderboard rankings using indexed MongoDB queries and aggregation
 */
export async function getLeaderboard(req, res, next) {
  try {
    const currentUserId = req.user._id.toString();
    const period = req.query.period || 'allTime';

    // 1. Try querying indexed LeaderboardEntry collection
    const entryCount = await LeaderboardEntry.countDocuments({ period });

    if (entryCount > 0) {
      const topEntries = await LeaderboardEntry.find({ period })
        .sort({ score: -1 })
        .limit(50)
        .populate('userId', 'displayName name avatar streak')
        .lean();

      const userEntry = await LeaderboardEntry.findOne({ userId: currentUserId, period }).lean();

      const leaderboard = topEntries.map((item, idx) => ({
        id: item.userId?._id || item.userId,
        name: item.userId?.displayName || item.userId?.name || 'Student',
        streak: item.userId?.streak || 0,
        xp: item.score,
        score: item.score,
        rank: item.rank || idx + 1,
        isCurrentUser: String(item.userId?._id || item.userId) === currentUserId,
      }));

      const currentUserRank = userEntry
        ? {
            id: currentUserId,
            name: req.user.displayName || req.user.name,
            streak: req.user.streak || 0,
            xp: userEntry.score,
            score: userEntry.score,
            rank: userEntry.rank,
            isCurrentUser: true,
          }
        : null;

      return res.json({
        success: true,
        period,
        leaderboard,
        currentUserRank,
      });
    }

    // 2. If LeaderboardEntry is not yet populated, compute directly via optimized MongoDB Aggregation
    // (Aggregated in MongoDB without loading all users into Node memory)
    const pipeline = [
      {
        $match: { status: { $ne: 'deleted' } },
      },
      {
        $lookup: {
          from: 'studysessions',
          let: { uId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$userId', '$$uId'] }, { $ne: ['$completedAt', null] }] } } },
            { $group: { _id: null, totalMinutes: { $sum: '$durationMinutes' } } },
          ],
          as: 'studyStats',
        },
      },
      {
        $lookup: {
          from: 'practicesessions',
          let: { uId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$userId', '$$uId'] }, { $eq: ['$completed', true] }] } } },
            { $group: { _id: null, totalCorrect: { $sum: '$correctAnswers' }, totalQuizzes: { $sum: 1 } } },
          ],
          as: 'practiceStats',
        },
      },
      {
        $project: {
          name: { $ifNull: ['$displayName', '$name'] },
          streak: { $ifNull: ['$streak', 0] },
          totalStudyMinutes: { $ifNull: [{ $arrayElemAt: ['$studyStats.totalMinutes', 0] }, 0] },
          totalQuizzes: { $ifNull: [{ $arrayElemAt: ['$practiceStats.totalQuizzes', 0] }, 0] },
          totalCorrect: { $ifNull: [{ $arrayElemAt: ['$practiceStats.totalCorrect', 0] }, 0] },
        },
      },
      {
        $addFields: {
          // XP formula: 1 min study = 2 XP, 1 correct question = 15 XP, streak day = 50 XP
          xp: {
            $add: [
              { $multiply: ['$totalStudyMinutes', 2] },
              { $multiply: ['$totalCorrect', 15] },
              { $multiply: ['$streak', 50] },
            ],
          },
        },
      },
      { $sort: { xp: -1 } },
      { $limit: 50 },
    ];

    const aggregated = await User.aggregate(pipeline);

    const leaderboardData = aggregated.map((item, index) => ({
      id: item._id.toString(),
      name: item.name,
      streak: item.streak,
      totalStudyMinutes: item.totalStudyMinutes,
      totalQuizzes: item.totalQuizzes,
      xp: item.xp,
      rank: index + 1,
      isCurrentUser: item._id.toString() === currentUserId,
    }));

    const currentUserRank = leaderboardData.find((r) => r.isCurrentUser) || null;

    res.json({
      success: true,
      period,
      leaderboard: leaderboardData,
      currentUserRank,
    });
  } catch (err) {
    next(err);
  }
}
