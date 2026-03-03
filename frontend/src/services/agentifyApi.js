import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
});

export const generateWebsite = async (prompt) => {
  try {
    const response = await api.post('/generate', { prompt });
    return response.data;
  } catch (error) {
    throw new Error('Failed to generate website');
  }
};

export const generateEmail = async (subject, description) => {
  try {
    const response = await api.post('/email/generate', {
      subject,
      mail_description: description,
      receiver_name: 'Recipient',
      sender_name: 'Agentify Team',
    });
    return response.data;
  } catch (error) {
    throw new Error('Failed to generate email');
  }
};

export const sendEmails = async (subject, body, recipients) => {
  try {
    const response = await api.post('/email/send', {
      subject,
      body,
      to_emails: recipients,
      sender_name: 'Agentify Team',
    });
    return response.data;
  } catch (error) {
    throw new Error('Failed to send emails');
  }
};