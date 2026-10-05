import axiosClient from './axiosClient';

export const presentationApi = {
  analyzeDeck: async (pdfFile, title) => {
    const formData = new FormData();
    formData.append('deck_file', pdfFile);
    if (title) {
      formData.append('title', title);
    }
    const response = await axiosClient.post('/presentations/analyze-deck/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getSessions: async () => {
    const response = await axiosClient.get('/presentations/sessions/');
    return response.data;
  },
  getSessionDetail: async (id) => {
    const response = await axiosClient.get(`/presentations/sessions/${id}/`);
    return response.data;
  },
};
