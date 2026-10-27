import api from './api';

const MOCK_LEADERBOARD = [
  { id: 'mock-1', rank: 1, name: 'Azizbek', user: { name: 'Azizbek', avatar: '' }, points: 1250, xp: 1250, streak: 14, totalStudyMinutes: 2280, studyHours: 38 },
  { id: 'mock-2', rank: 2, name: 'Malika', user: { name: 'Malika', avatar: '' }, points: 1100, xp: 1100, streak: 10, totalStudyMinutes: 1920, studyHours: 32 },
  { id: 'mock-3', rank: 3, name: 'Jasur', user: { name: 'Jasur', avatar: '' }, points: 980, xp: 980, streak: 8, totalStudyMinutes: 1740, studyHours: 29 },
  { id: 'mock-4', rank: 4, name: 'Madina', user: { name: 'Madina', avatar: '' }, points: 850, xp: 850, streak: 7, totalStudyMinutes: 1440, studyHours: 24, isCurrentUser: true },
  { id: 'mock-5', rank: 5, name: 'Sardor', user: { name: 'Sardor', avatar: '' }, points: 720, xp: 720, streak: 5, totalStudyMinutes: 1140, studyHours: 19 },
];

export async function getLeaderboard() {
  try {
    const data = await api.get('/leaderboard');
    return data;
  } catch {
    return {
      success: true,
      leaderboard: MOCK_LEADERBOARD,
      currentUserRank: {
        id: 'mock-4',
        rank: 4,
        name: 'Madina',
        user: { name: 'Madina', avatar: '' },
        points: 850,
        xp: 850,
        streak: 7,
        totalStudyMinutes: 1440,
        studyHours: 24,
        isCurrentUser: true,
      },
    };
  }
}
