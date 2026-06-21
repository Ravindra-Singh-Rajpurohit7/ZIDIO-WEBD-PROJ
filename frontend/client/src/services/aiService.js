import apiCall from './api';

/**
 * Service to manage AI Summary operations
 */
export const generateSummary = async (meetingId) => {
  return await apiCall(`/api/ai/summary/${meetingId}`, {
    method: 'POST',
  });
};

export const getSummary = async (meetingId) => {
  return await apiCall(`/api/ai/summary/${meetingId}`);
};
