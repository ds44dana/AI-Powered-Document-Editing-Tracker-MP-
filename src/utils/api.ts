// Helper functions for API calls
/**
 * Generate a suggestion for a given text using the server-side API
 */
export async function generateSuggestion(text: string, systemPrompt?: string) {
  try {
    const response = await fetch('/api/generate-suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        systemPrompt
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to generate suggestion');
    }
    const data = await response.json();
    return data.suggestion;
  } catch (error) {
    console.error('Error generating suggestion:', error);
    // Return the original text if there's an error
    return text;
  }
}