import axiosClient from './axiosClient';

export const coachingApi = {
  getRecommendations: async () => {
    const response = await axiosClient.get('/coaching/recommendations/');
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
