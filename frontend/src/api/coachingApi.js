import axiosClient from './axiosClient';

export const coachingApi = {
  getRecommendations: async () => {
    const response = await axiosClient.get('/coaching/recommendations/');
    return response.data;
  },
  getLearningPlan: async () => {
    const response = await axiosClient.get('/coaching/learning-plan/');
    return response.data;
  },
  refreshLearningPlan: async () => {
    const response = await axiosClient.post('/coaching/learning-plan/');
    return response.data;
  },
  updateLearningActivity: async (activityId, completed) => {
    const response = await axiosClient.patch(`/coaching/learning-plan/activities/${activityId}/`, {
      completed,
    });
    return response.data;
  },
  getDrills: async () => {
    const response = await axiosClient.get('/coaching/drills/');
    return response.data;
  },
  submitDrill: async (drillId, submissionText) => {
    const response = await axiosClient.post(`/coaching/drills/${drillId}/submit/`, {
      submission: submissionText,
    });
    return response.data;
  },
};
