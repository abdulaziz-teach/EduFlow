import api from './api';

const MOCK_LEADERBOARD = [
  { rank: 1, user: { name: 'Azizbek', avatar: '' }, points: 1250, streak: 14, studyHours: 38 },
  { rank: 2, user: { name: 'Malika', avatar: '' }, points: 1100, streak: 10, studyHours: 32 },
  { rank: 3, user: { name: 'Jasur', avatar: '' }, points: 980, streak: 8, studyHours: 29 },
  { rank: 4, user: { name: 'Madina', avatar: '' }, points: 850, streak: 7, studyHours: 24 },
  { rank: 5, user: { name: 'Sardor', avatar: '' }, points: 720, streak: 5, studyHours: 19 },
];

export async function getLeaderboard() {
  try {
    const data = await api.get('/leaderboard');
    return data;
  } catch {
    return {
      success: true,
      leaderboard: MOCK_LEADERBOARD,
      currentUserRank: 1,
    };
  }
}
