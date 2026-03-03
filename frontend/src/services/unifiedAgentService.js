import axios from 'axios';

const API_BASE = 'http://localhost:5000';

const api = axios.create({
    baseURL: API_BASE,
});

export const unifiedAgentService = {
    // Email Agent
    generateEmail: async (prompt) => {
        try {
            // Heuristic to split prompt into subject/description if possible, 
            // or just use prompt for both to let AI figure it out.
            // For now, simpler is better: use prompt for description, and a generic subject 
            // or let backend handle it if it was smarter. 
            // The current backend endpoint expects 'subject' and 'mail_description'.
            // We'll use a generic subject based on the prompt's first few words.
            const subject = prompt.split(' ').slice(0, 5).join(' ') + '...';

            const response = await api.post('/email/generate', {
                subject: subject,
                mail_description: prompt,
                receiver_name: 'Recipient', // Default
                sender_name: 'Agentify Team', // Default
            });
            return response.data;
        } catch (error) {
            console.error('Email Generation Error:', error);
            throw error;
        }
    },

    sendEmail: async (data) => {
        try {
            const response = await api.post('/email/send', data);
            return response.data;
        } catch (error) {
            console.error('Email Send Error:', error);
            throw error;
        }
    },

    // Social Media Agent
    generatePost: async (prompt, platforms = ['twitter', 'linkedin']) => {
        try {
            // The backend expects 'theme', 'topic', 'description', 'platforms' array
            const response = await api.post('/social/generate', {
                theme: 'Modern Tech', // Default theme
                topic: prompt.split(' ').slice(0, 5).join(' '),
                description: prompt,
                platforms: platforms // Send as array
            });
            return response.data;
        } catch (error) {
            console.error('Social Post Generation Error:', error);
            throw error;
        }
    },

    generatePostImage: async (prompt) => {
        try {
            const response = await api.post('/social/generate-image', {
                prompt: prompt
            });
            return response.data;
        } catch (error) {
            console.error('Image Generation Error:', error);
            throw error;
        }
    },

    postToSocials: async (data) => {
        try {
            const response = await api.post('/social/post', data);
            return response.data;
        } catch (error) {
            console.error('Social Post Error:', error);
            throw error;
        }
    },

    // Website Agent
    generateWebsite: async (prompt) => {
        try {
            // Backend uses /generate for website generation
            const response = await api.post('/generate', {
                prompt,
                theme: 'Sci-Fi Dark'
            });
            return response.data;
        } catch (error) {
            console.error('Website Generation Error:', error);
            throw error;
        }
    }
};
