import axiosClient from './axiosClient';

export const debateApi = {
  getTopics: async (category = '') => {
    const params = category ? { category } : {};
    const response = await axiosClient.get('/debates/topics/', { params });
    return response.data;
  },
  createTopic: async (topicData) => {
    const response = await axiosClient.post('/debates/topics/', topicData);
    return response.data;
  },
  createSession: async (sessionData) => {
    const response = await axiosClient.post('/debates/sessions/', sessionData);
    return response.data;
  },
  getSessions: async () => {
    const response = await axiosClient.get('/debates/sessions/');
    return response.data;
  },
  getSessionDetail: async (sessionId) => {
    const response = await axiosClient.get(`/debates/sessions/${sessionId}/`);
    return response.data;
  },
  submitTurn: async (sessionId, argumentText) => {
    const response = await axiosClient.post(`/debates/sessions/${sessionId}/submit-turn/`, {
      argument_text: argumentText,
    });
    return response.data;
  },
  concludeSession: async (sessionId) => {
    const response = await axiosClient.post(`/debates/sessions/${sessionId}/conclude/`);
    return response.data;
  },
};
