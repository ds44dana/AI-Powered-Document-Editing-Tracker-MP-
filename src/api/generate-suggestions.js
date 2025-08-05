// This file will be deployed as a serverless function on Vercel
import OpenAI from 'openai';
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }
  try {
    // Initialize OpenAI with server-side API key
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY // Securely accessed server-side
    });
    const {
      text,
      systemPrompt
    } = req.body;
    if (!text) {
      return res.status(400).json({
        error: 'Text is required'
      });
    }
    // Default system prompt if not provided
    const defaultSystemPrompt = 'You are a helpful assistant that improves writing. Rewrite the provided sentence to make it clearer, more concise, and more engaging. Only respond with the improved version, no explanations.';
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'system',
        content: systemPrompt || defaultSystemPrompt
      }, {
        role: 'user',
        content: text
      }],
      temperature: 0.7,
      max_tokens: 150
    });
    return res.status(200).json({
      suggestion: response.choices[0]?.message?.content?.trim() || text
    });
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return res.status(500).json({
      error: 'Failed to generate suggestion',
      message: error.message
    });
  }
}