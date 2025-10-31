import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

export const generateWebsite = async (prompt) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/generate`, { prompt });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const downloadZip = async (prompt) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/download-zip`, 
      { prompt },
      { responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    console.error('Download Error:', error);
    throw error;
  }
};
