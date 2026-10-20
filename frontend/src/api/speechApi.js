import axiosClient from './axiosClient';

export const speechApi = {
  analyzeSpeech: async ({ transcript, durationSeconds, audioFile = null }) => {
    const formData = new FormData();
    formData.append('transcript', transcript);
    formData.append('duration_seconds', durationSeconds);
    if (audioFile) {
      formData.append('audio_file', audioFile);
    }
    const response = await axiosClient.post('/speech/analyze-audio/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getSessions: async () => {
    const response = await axiosClient.get('/speech/sessions/');
    return response.data;
  },
  getSessionDetail: async (id) => {
    const response = await axiosClient.get(`/speech/sessions/${id}/`);
    return response.data;
  },
};
