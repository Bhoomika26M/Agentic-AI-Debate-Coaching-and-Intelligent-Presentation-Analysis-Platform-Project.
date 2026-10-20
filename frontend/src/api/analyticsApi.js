import axiosClient from './axiosClient';

export const analyticsApi = {
  getOverview: async () => {
    const response = await axiosClient.get('/analytics/overview/');
    return response.data;
  },
  getSkillsRadar: async () => {
    const response = await axiosClient.get('/analytics/skills-radar/');
    return response.data;
  },
  getProgressHistory: async () => {
    const response = await axiosClient.get('/analytics/progress-history/');
    return response.data;
  },
  getFallacyFrequency: async () => {
    const response = await axiosClient.get('/analytics/fallacy-frequency/');
    return response.data;
  },
};
