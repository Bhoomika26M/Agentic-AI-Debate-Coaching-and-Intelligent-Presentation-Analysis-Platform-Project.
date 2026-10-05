import axiosClient from './axiosClient';

export const argumentApi = {
  analyzeArgument: async (argumentText, context = '') => {
    const response = await axiosClient.post('/arguments/analyze/', {
      argument_text: argumentText,
      context,
    });
    return response.data;
  },
  getHistory: async () => {
    const response = await axiosClient.get('/arguments/history/');
    return response.data;
  },
  getDetail: async (id) => {
    const response = await axiosClient.get(`/arguments/${id}/`);
    return response.data;
  },
};
