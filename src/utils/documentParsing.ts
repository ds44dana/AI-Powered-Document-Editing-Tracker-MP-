// Import JSZip statically instead of dynamically
import JSZip from 'jszip';
// Remove the dynamic imports that were causing issues
// Instead we'll use API calls for the heavy lifting
// Type definitions
export type ParseResult = {
  text: string;
  score: number;
  source: string;
  meta?: Record<string, any>;
  pages?: {
    n: number;
    text: string;
  }[];
  error?: {
    code: string;
    message: string;
    actionable?: boolean;
    suggestedAction?: string;
  };
};
export type ParseOptions = {
  timeoutMs?: number;
  maxPages?: number;
  enableOcr?: boolean;
  ocrLanguage?: string;
  minQualityScore?: number;
  minWordCount?: number;
};
const DEFAULT_OPTIONS: ParseOptions = {
  timeoutMs: 30000,
  // 30 seconds
  maxPages: 50,
  enableOcr: true,
  ocrLanguage: 'eng',
  minQualityScore: 0.35,
  // Lowered from 0.65 to be more permissive
  minWordCount: 30 // Accept docs with at least this many words regardless of score
};

/**
 * Calculates a quality score for extracted text
 * Returns a score between 0 (poor) and 1 (excellent)
 */
export function scoreQuality(text: string): number {
  if (!text || text.length === 0) return 0;
  const len = text.length;
  // Calculate metrics that indicate poor quality
  const replacementChar = (text.match(/\uFFFD/g) || []).length / len;
  const nonPrintable = (text.match(/[\x00-\x08\x0E-\x1F]/g) || []).length / len;
  const pdfInternals = /\/(Obj|stream|FlateDecode|endobj)/.test(text) ? 0.25 : 0;
  // Token-based metrics
  const tokens = text.split(/\s+/);
  const avgTokenLen = tokens.reduce((acc, t) => acc + t.length, 0) / (tokens.length || 1);
  const tooLongTokens = avgTokenLen > 40 ? 0.2 : 0;
  // Whitespace and letter distribution
  const whitespace = (text.match(/\s/g) || []).length / len;
  const letters = (text.match(/[A-Za-z\u00C0-\u024F]/g) || []).length / len;
  const lowLetterRatio = letters < 0.2 ? 0.2 : 0;
  const lowWhitespaceRatio = whitespace < 0.05 ? 0.1 : 0;
  // Calculate final score (1 = perfect, 0 = unusable)
  const score = 1 - (0.6 * replacementChar + 0.2 * nonPrintable + pdfInternals + tooLongTokens + lowLetterRatio + lowWhitespaceRatio);
  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, score));
}

/**
 * Count words in a text string
 */
export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Main orchestrator function that manages the document parsing pipeline
 * Now uses server-side API instead of client-side parsing
 */
export async function parseDocument(file: File, options: ParseOptions = {}): Promise<ParseResult> {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  // For debugging
  console.log(`Preparing to upload document: ${file.name} (${file.type}, ${file.size} bytes)`);
  try {
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('file', file);
    // Add options to the form data
    Object.entries(opts).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    // Send the file to our server-side API
    const response = await fetch('/api/extract', {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      const errorData = await response.json();
      return {
        text: '',
        score: 0,
        source: 'api-error',
        error: {
          code: errorData.error?.code || 'API_ERROR',
          message: errorData.error?.message || `Server error: ${response.status}`,
          actionable: false
        }
      };
    }
    // Parse the successful response
    const result = await response.json();
    // If the API returned an error object, format it properly
    if (result.error) {
      return {
        text: '',
        score: 0,
        source: result.source || 'api-error',
        error: result.error
      };
    }
    // Return the successful result
    return {
      text: result.text || '',
      score: result.score || scoreQuality(result.text || ''),
      source: result.source || 'api',
      meta: result.meta,
      pages: result.pages
    };
  } catch (error) {
    console.error('Error parsing document:', error);
    return {
      text: '',
      score: 0,
      source: 'client-error',
      error: {
        code: 'CLIENT_ERROR',
        message: `Error uploading document: ${error.message}`,
        actionable: false
      }
    };
  }
}

/**
 * Utility function to get a human-readable quality description
 */
export function getQualityDescription(score: number): string {
  if (score >= 0.9) return 'Excellent';
  if (score >= 0.75) return 'Good';
  if (score >= 0.5) return 'Fair';
  if (score >= 0.25) return 'Poor';
  return 'Very Poor';
}