// This file is no longer needed for client-side OpenAI calls
// Instead, we're using the server-side API endpoint
// Import the API helper functions
import { generateSuggestion } from './api';
// Export the API helper functions
export { generateSuggestion };
// For backward compatibility, export a mock OpenAI object
// This helps minimize changes to existing code
const mockOpenAI = {
  chat: {
    completions: {
      create: async ({
        messages
      }) => {
        const userMessage = messages.find(msg => msg.role === 'user')?.content || '';
        const systemMessage = messages.find(msg => msg.role === 'system')?.content;
        const suggestion = await generateSuggestion(userMessage, systemMessage);
        return {
          choices: [{
            message: {
              content: suggestion,
              role: 'assistant'
            }
          }]
        };
      }
    }
  }
};
export default mockOpenAI;