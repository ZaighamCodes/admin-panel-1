import api from './api';

/**
 * Get all active qualifications (Public)
 */
export const getActiveQualifications = async () => {
  const response = await api.get('/doctor/qualifications');
  return response;
};

/**
 * Get all qualifications including inactive (ADMIN only)
 */
export const getAllQualifications = async () => {
  const response = await api.get('/doctor/qualifications');
  return response;
};



export const createQualification = async (qualificationData) => {
  const response = await api.post('/doctor/qualifications', qualificationData);
  return response;
};

/**
 * Update qualification (ADMIN only)
 */
export const updateQualification = async (qualificationId, qualificationData) => {
  const response = await api.put(`/doctor/qualifications/${qualificationId}`, qualificationData);
  return response;
};


/**
 * Toggle qualification active/inactive status (ADMIN only)
 */
export const toggleQualificationStatus = async (qualificationId) => {
  const response = await api.patch(`/doctor/qualifications/${qualificationId}/toggle-status`);
  return response;
};

/**
 * Delete/Deactivate qualification (ADMIN only)
 */
export const deleteQualification = async (qualificationId) => {
  const response = await api.delete(`/doctor/qualifications/${qualificationId}`);
  return response;
};
