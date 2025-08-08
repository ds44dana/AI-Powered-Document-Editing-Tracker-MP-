// Use optional dynamic imports for libraries that might not be available
let mammoth: any = null;
let Tesseract: any = null;
let pdfjs: any = null;

// Try to load pdfjs-dist
try {
  // We'll use a dynamic import for pdfjs
  pdfjs = require('pdfjs-dist');
  // Set worker path for pdf.js (if available)
  if (pdfjs && pdfjs.GlobalWorkerOptions) {
    const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url);
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker.toString();
  }
} catch (e) {
  console.warn('pdfjs-dist not available:', e.message);
  // Create a minimal mock implementation
  pdfjs = {
    getDocument: () => {
      throw new Error('PDF.js is not available');
    }
  };
}

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
};
export type ParseOptions = {
  timeoutMs?: number;
  maxPages?: number;
  enableOcr?: boolean;
  ocrLanguage?: string;
};
const DEFAULT_OPTIONS: ParseOptions = {
  timeoutMs: 30000,
  // 30 seconds
  maxPages: 50,
  enableOcr: true,
  ocrLanguage: 'eng'
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
 * Parse a DOCX file using mammoth (if available)
 */
export async function parseDocx(file: File): Promise<ParseResult> {
  try {
    // Try to dynamically load mammoth if not already loaded
    if (!mammoth) {
      try {
        mammoth = await import('mammoth');
      } catch (e) {
        console.warn('mammoth library not available:', e.message);
        return {
          text: '',
          score: 0,
          source: 'mammoth-not-installed',
          meta: {
            error: 'The mammoth library is not installed. Please install it with: npm install mammoth'
          }
        };
      }
    }
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({
      arrayBuffer
    });
    const text = result.value;
    const score = scoreQuality(text);
    return {
      text,
      score,
      source: 'mammoth',
      meta: {
        warnings: result.messages
      }
    };
  } catch (error) {
    console.error('Error parsing DOCX with mammoth:', error);
    return {
      text: '',
      score: 0,
      source: 'mammoth-failed',
      meta: {
        error: String(error)
      }
    };
  }
}

/**
 * Parse a PDF file using pdf.js (if available)
 */
export async function parsePdf(file: File, options: ParseOptions = {}): Promise<ParseResult> {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  try {
    if (!pdfjs || !pdfjs.getDocument) {
      return {
        text: '',
        score: 0,
        source: 'pdfjs-not-installed',
        meta: {
          error: 'The pdfjs-dist library is not installed. Please install it with: npm install pdfjs-dist'
        }
      };
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({
      data: arrayBuffer
    }).promise;
    const numPages = Math.min(pdf.numPages, opts.maxPages || Infinity);
    const pages: {
      n: number;
      text: string;
    }[] = [];
    let fullText = '';
    // Extract text from each page
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(' ');
      pages.push({
        n: i,
        text: pageText
      });
      fullText += pageText + '\n\n';
    }
    const score = scoreQuality(fullText);
    return {
      text: fullText,
      score,
      source: 'pdf.js',
      pages,
      meta: {
        pageCount: pdf.numPages,
        extractedPages: numPages
      }
    };
  } catch (error) {
    console.error('Error parsing PDF with pdf.js:', error);
    return {
      text: '',
      score: 0,
      source: 'pdf.js-failed',
      meta: {
        error: String(error)
      }
    };
  }
}

/**
 * Parse a TXT file
 */
export async function parseTxt(file: File): Promise<ParseResult> {
  try {
    const text = await file.text();
    const score = scoreQuality(text);
    return {
      text,
      score,
      source: 'text-reader'
    };
  } catch (error) {
    console.error('Error parsing TXT:', error);
    return {
      text: '',
      score: 0,
      source: 'text-reader-failed',
      meta: {
        error: String(error)
      }
    };
  }
}

/**
 * Run OCR on a file by first converting it to images (if Tesseract.js is available)
 */
export async function runOcr(file: File, options: ParseOptions = {}): Promise<ParseResult> {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  try {
    // Try to dynamically load Tesseract if not already loaded
    if (!Tesseract) {
      try {
        Tesseract = await import('tesseract.js');
      } catch (e) {
        console.warn('tesseract.js library not available:', e.message);
        return {
          text: '',
          score: 0,
          source: 'tesseract-not-installed',
          meta: {
            error: 'The tesseract.js library is not installed. Please install it with: npm install tesseract.js'
          }
        };
      }
    }
    // For this demo, we'll only support OCR on images directly
    if (!file.type.startsWith('image/')) {
      return {
        text: '',
        score: 0,
        source: 'ocr-unsupported-type',
        meta: {
          error: 'OCR only supported on images in this demo'
        }
      };
    }
    // Create a URL for the image
    const imageUrl = URL.createObjectURL(file);
    // Run OCR using Tesseract
    const result = await Tesseract.recognize(imageUrl, opts.ocrLanguage || 'eng', {
      logger: m => console.log(m)
    });
    // Clean up the URL
    URL.revokeObjectURL(imageUrl);
    const text = result.data.text;
    const score = scoreQuality(text);
    return {
      text,
      score,
      source: 'tesseract-ocr',
      meta: {
        confidence: result.data.confidence,
        words: result.data.words.length
      }
    };
  } catch (error) {
    console.error('Error running OCR:', error);
    return {
      text: '',
      score: 0,
      source: 'ocr-failed',
      meta: {
        error: String(error)
      }
    };
  }
}

/**
 * Main orchestrator function that manages the document parsing pipeline
 */
export async function parseDocument(file: File, options: ParseOptions = {}): Promise<ParseResult> {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeType = file.type;
  // Start with an empty result
  let bestResult: ParseResult = {
    text: '',
    score: 0,
    source: 'none'
  };
  // Create a controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    // Step 1: Parse based on file extension
    if (fileExtension === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await parseDocx(file);
      if (result.score > bestResult.score) {
        bestResult = result;
      }
      // If score is good enough, return early
      if (result.score >= 0.65) {
        return bestResult;
      }
    } else if (fileExtension === 'pdf' || mimeType === 'application/pdf') {
      const result = await parsePdf(file, opts);
      if (result.score > bestResult.score) {
        bestResult = result;
      }
      // If score is good enough, return early
      if (result.score >= 0.65) {
        return bestResult;
      }
    } else if (fileExtension === 'txt' || mimeType === 'text/plain') {
      const result = await parseTxt(file);
      if (result.score > bestResult.score) {
        bestResult = result;
      }
      // If score is good enough, return early
      if (result.score >= 0.65) {
        return bestResult;
      }
    }
    // Step 2: If score is still poor, try alternative parsing methods
    if (bestResult.score < 0.65) {
      // For PDFs, try an alternative PDF parsing method
      if (fileExtension === 'pdf' || mimeType === 'application/pdf') {
        // In a real app, we would try an alternative PDF parser here
        console.log('Would try alternative PDF parser here');
      }
      // For DOCXs, try an alternative DOCX parsing method
      if (fileExtension === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // In a real app, we would try an alternative DOCX parser here
        console.log('Would try alternative DOCX parser here');
      }
    }
    // Step 3: If score is still very poor, try OCR as last resort
    if (bestResult.score < 0.35 && opts.enableOcr) {
      console.log('Text extraction quality is poor, attempting OCR...');
      const ocrResult = await runOcr(file, opts);
      if (ocrResult.score > bestResult.score) {
        bestResult = ocrResult;
      }
    }
    // Return the best result we found
    return bestResult;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Document parsing timed out');
      return {
        text: bestResult.text || '',
        score: bestResult.score,
        source: bestResult.source || 'timeout',
        meta: {
          error: 'Processing timed out',
          ...bestResult.meta
        }
      };
    }
    console.error('Error parsing document:', error);
    return {
      text: bestResult.text || '',
      score: bestResult.score,
      source: bestResult.source || 'error',
      meta: {
        error: String(error),
        ...bestResult.meta
      }
    };
  } finally {
    clearTimeout(timeoutId);
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