import api from './api';

export async function getLeaderboard() {
  const data = await api.get('/leaderboard');
  return data;
}
