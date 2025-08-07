// Import JSZip statically instead of dynamically
import JSZip from 'jszip';
// Initialize mammoth as null, we'll try to load it dynamically
let mammoth: any = null;
// Other libraries can still be dynamically imported if needed
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
 * Check if a file is a legacy .doc format (not .docx)
 */
export function isLegacyDoc(file: File): boolean {
  // Check file signature or other indicators
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type;
  // Check by mime type
  if (mimeType === 'application/msword') {
    return true;
  }
  // Check by extension
  if (extension === 'doc') {
    return true;
  }
  return false;
}

/**
 * Check DOCX file signature (ZIP header)
 * @param buffer ArrayBuffer from the file
 * @returns boolean indicating if the file has a valid DOCX/ZIP signature
 */
export function hasValidDocxSignature(buffer: ArrayBuffer): boolean {
  // DOCX files are ZIP files with specific structure
  // ZIP file signature is 50 4B 03 04 (PK..)
  const array = new Uint8Array(buffer.slice(0, 4));
  const signature = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  console.log(`File signature: ${signature}`);
  // Check for ZIP signature
  return signature.toLowerCase() === '504b0304';
}

/**
 * Extract text from DOCX file using direct ZIP extraction (fallback for mammoth)
 * This is a simpler implementation than the server-side one suggested, but works in browser
 */
export async function extractDocxWithoutMammoth(buffer: ArrayBuffer): Promise<string> {
  try {
    // Quick signature check
    if (!hasValidDocxSignature(buffer)) {
      throw new Error('Not a valid DOCX/ZIP container');
    }
    // Load the ZIP file - now using the statically imported JSZip
    const zip = new JSZip();
    const zipFile = await zip.loadAsync(buffer);
    // Get the main document content
    const documentXml = zipFile.file('word/document.xml');
    if (!documentXml) {
      throw new Error('document.xml not found in DOCX');
    }
    // Get the XML content
    const xml = await documentXml.async('text');
    // Extract visible text runs <w:t>...</w:t>
    const textMatches = xml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
    const texts = textMatches.map(match => {
      // Extract content between tags
      const content = match.replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/, '$1');
      // Basic XML entity decoding
      return content.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    });
    // Join all text elements with spaces
    const text = texts.join(' ').replace(/\s+/g, ' ').trim();
    console.log(`Extracted ${texts.length} text elements using direct ZIP method`);
    return text;
  } catch (error) {
    console.error('Error in direct DOCX extraction:', error);
    throw error;
  }
}

/**
 * Check if a PDF has a text layer using pdf.js
 */
export async function pdfHasTextLayer(arrayBuffer: ArrayBuffer): Promise<boolean> {
  try {
    if (!pdfjs || !pdfjs.getDocument) {
      return false;
    }
    const loadingTask = pdfjs.getDocument({
      data: arrayBuffer
    });
    const doc = await loadingTask.promise;
    let wordCount = 0;
    // Check first 3 pages at most
    for (let i = 1; i <= Math.min(doc.numPages, 3); i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      wordCount += content.items.length;
      // If we found enough text items, we can stop checking
      if (wordCount > 20) {
        return true;
      }
    }
    return wordCount > 0;
  } catch (error) {
    console.error('Error checking PDF text layer:', error);
    return false;
  }
}

/**
 * Check if a PDF is encrypted/password-protected
 */
export async function isPdfEncrypted(arrayBuffer: ArrayBuffer): Promise<boolean> {
  try {
    if (!pdfjs || !pdfjs.getDocument) {
      return false;
    }
    const loadingTask = pdfjs.getDocument({
      data: arrayBuffer
    });
    const doc = await loadingTask.promise;
    // Check if the PDF is encrypted
    return !!doc.encrypted;
  } catch (error) {
    // Check for password errors in the exception
    const errorMsg = String(error).toLowerCase();
    return errorMsg.includes('password') || errorMsg.includes('encrypted') || errorMsg.includes('permission');
  }
}

/**
 * Parse a DOCX file using mammoth (if available) with fallback to direct ZIP extraction
 */
export async function parseDocx(file: File): Promise<ParseResult> {
  try {
    // Check if it's a legacy .doc file
    if (isLegacyDoc(file)) {
      console.log('Detected legacy .doc format');
      return {
        text: '',
        score: 0,
        source: 'doc-not-supported',
        error: {
          code: 'LEGACY_DOC_FORMAT',
          message: 'Legacy .doc format detected. Please convert to .docx before uploading.',
          actionable: true,
          suggestedAction: 'Convert to .docx and try again'
        }
      };
    }
    // Get the raw binary data from the file
    const arrayBuffer = await file.arrayBuffer();
    // Log information about the file for debugging
    console.log(`Processing DOCX: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
    // Verify file signature
    if (!hasValidDocxSignature(arrayBuffer)) {
      console.error('Invalid DOCX signature');
      return {
        text: '',
        score: 0,
        source: 'invalid-docx-signature',
        error: {
          code: 'INVALID_DOCX_SIGNATURE',
          message: 'This file does not appear to be a valid DOCX file. The file may be corrupted.',
          actionable: true,
          suggestedAction: 'Please try resaving the document in Word and upload again'
        }
      };
    }
    // APPROACH 1: Try to use mammoth for extraction if available
    let mammothResult = null;
    try {
      // Try to dynamically load mammoth if not already loaded
      if (!mammoth) {
        try {
          mammoth = await import('mammoth');
        } catch (e) {
          console.warn('mammoth.js library not available:', e.message);
          // We'll continue with the fallback method
        }
      }
      // Only attempt mammoth extraction if the library was loaded
      if (mammoth) {
        console.log('Attempting extraction with mammoth...');
        const result = await mammoth.extractRawText({
          arrayBuffer
        });
        const text = result.value;
        // If we got text, use it
        if (text && text.trim() !== '') {
          console.log('Mammoth extraction successful');
          mammothResult = {
            text,
            score: scoreQuality(text),
            source: 'mammoth',
            meta: {
              warnings: result.messages,
              wordCount: countWords(text)
            }
          };
        } else {
          console.log('Mammoth returned empty text without error');
        }
      } else {
        console.log('Mammoth library not available, skipping to fallback method');
      }
    } catch (mammothError) {
      console.error('Error in mammoth.js processing:', mammothError);
      // Check for specific mammoth errors
      const errorMsg = String(mammothError).toLowerCase();
      if (errorMsg.includes('zip') || errorMsg.includes('archive')) {
        return {
          text: '',
          score: 0,
          source: 'mammoth-zip-error',
          error: {
            code: 'DOCX_NOT_VALID_ZIP',
            message: 'This file appears to be corrupted or not a valid Office document. Please try resaving it in Word before uploading.',
            actionable: true,
            suggestedAction: 'Resave document in Word and try again'
          }
        };
      }
      if (errorMsg.includes('password') || errorMsg.includes('protected')) {
        return {
          text: '',
          score: 0,
          source: 'mammoth-protected-doc',
          error: {
            code: 'DOCX_PASSWORD_PROTECTED',
            message: 'This document appears to be password-protected. Please remove the protection before uploading.',
            actionable: true,
            suggestedAction: 'Remove password protection and try again'
          }
        };
      }
    }
    // If mammoth worked, return its result
    if (mammothResult && mammothResult.text) {
      return mammothResult;
    }
    // APPROACH 2: Fallback to direct ZIP extraction
    console.log('Mammoth failed or unavailable, trying direct ZIP extraction...');
    try {
      const extractedText = await extractDocxWithoutMammoth(arrayBuffer);
      if (extractedText && extractedText.trim() !== '') {
        const score = scoreQuality(extractedText);
        const wordCount = countWords(extractedText);
        console.log(`Direct ZIP extraction successful: ${wordCount} words, score=${score}`);
        return {
          text: extractedText,
          score: score,
          source: 'direct-zip-extraction',
          meta: {
            wordCount: wordCount,
            fallbackMethod: true
          }
        };
      }
    } catch (zipError) {
      console.error('Error in direct ZIP extraction:', zipError);
    }
    // If we get here, both extraction methods failed
    return {
      text: '',
      score: 0,
      source: 'docx-extraction-failed',
      error: {
        code: 'DOCX_NO_TEXT_EXTRACTED',
        message: 'No text could be extracted from this Word document. The document may contain only images, shapes, or text in unsupported elements.',
        actionable: true,
        suggestedAction: 'Try saving the document as PDF and upload again'
      }
    };
  } catch (error) {
    console.error('Error in DOCX parsing wrapper:', error);
    return {
      text: '',
      score: 0,
      source: 'docx-parse-failed',
      error: {
        code: 'DOCX_GENERAL_ERROR',
        message: 'An unexpected error occurred while processing the Word document: ' + String(error),
        actionable: false
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
        error: {
          code: 'MISSING_LIBRARY',
          message: 'The pdfjs-dist library is not installed.',
          actionable: false
        }
      };
    }
    const arrayBuffer = await file.arrayBuffer();
    // Check if the PDF is encrypted
    const isEncrypted = await isPdfEncrypted(arrayBuffer);
    if (isEncrypted) {
      return {
        text: '',
        score: 0,
        source: 'pdf-encrypted',
        error: {
          code: 'PDF_ENCRYPTED',
          message: 'This PDF is password-protected. Please remove the password protection and try again.',
          actionable: true,
          suggestedAction: 'Upload an unprotected version of this document'
        }
      };
    }
    // Check if the PDF has a text layer before attempting full extraction
    const hasTextLayer = await pdfHasTextLayer(arrayBuffer);
    if (!hasTextLayer) {
      console.log('PDF has no text layer, may need OCR');
      // If no text layer and OCR is enabled, we'll let the orchestrator handle OCR
      if (opts.enableOcr) {
        return {
          text: '',
          score: 0,
          source: 'pdf-no-text-layer',
          error: {
            code: 'PDF_NO_TEXT_LAYER',
            message: 'This PDF does not contain selectable text and may need OCR processing.',
            actionable: true,
            suggestedAction: 'Process with OCR'
          }
        };
      } else {
        return {
          text: '',
          score: 0,
          source: 'pdf-no-text-layer',
          error: {
            code: 'PDF_NO_TEXT_LAYER',
            message: 'This PDF does not contain selectable text. Please enable OCR or upload a version with selectable text.',
            actionable: false
          }
        };
      }
    }
    // Extract text from the PDF
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
    const wordCount = countWords(fullText);
    // Log debug info
    console.log(`PDF parse result: score=${score}, words=${wordCount}, pages=${numPages}`);
    return {
      text: fullText,
      score,
      source: 'pdf.js',
      pages,
      meta: {
        pageCount: pdf.numPages,
        extractedPages: numPages,
        wordCount
      }
    };
  } catch (error) {
    console.error('Error parsing PDF with pdf.js:', error);
    // Check for specific error types
    const errorMsg = String(error).toLowerCase();
    if (errorMsg.includes('password') || errorMsg.includes('encrypted')) {
      return {
        text: '',
        score: 0,
        source: 'pdf-encrypted',
        error: {
          code: 'PDF_ENCRYPTED',
          message: 'This PDF is password-protected. Please remove the password protection and try again.',
          actionable: true,
          suggestedAction: 'Upload an unprotected version of this document'
        }
      };
    }
    return {
      text: '',
      score: 0,
      source: 'pdf.js-failed',
      error: {
        code: 'PDF_PARSE_ERROR',
        message: 'Failed to parse PDF file: ' + String(error),
        actionable: false
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
    const wordCount = countWords(text);
    // Log debug info
    console.log(`TXT parse result: score=${score}, words=${wordCount}`);
    return {
      text,
      score,
      source: 'text-reader',
      meta: {
        wordCount
      }
    };
  } catch (error) {
    console.error('Error parsing TXT:', error);
    return {
      text: '',
      score: 0,
      source: 'text-reader-failed',
      error: {
        code: 'TXT_PARSE_ERROR',
        message: 'Failed to parse text file: ' + String(error),
        actionable: false
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
          error: {
            code: 'MISSING_LIBRARY',
            message: 'The tesseract.js library is not installed.',
            actionable: false
          }
        };
      }
    }
    // For this demo, we'll only support OCR on images directly
    // In a real implementation, we would convert PDFs/DOCs to images first
    if (!file.type.startsWith('image/')) {
      // For PDFs, we'd need to render pages to images first
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        console.log('PDF OCR would be implemented in production version');
        // In a real implementation, we would:
        // 1. Use pdf.js to render each page to a canvas
        // 2. Convert canvas to image
        // 3. Run OCR on each image
        // 4. Combine results
        return {
          text: '',
          score: 0,
          source: 'ocr-pdf-not-implemented',
          error: {
            code: 'OCR_PDF_NOT_IMPLEMENTED',
            message: 'OCR for PDFs is not implemented in this demo version.',
            actionable: false
          }
        };
      }
      return {
        text: '',
        score: 0,
        source: 'ocr-unsupported-type',
        error: {
          code: 'OCR_UNSUPPORTED_TYPE',
          message: 'OCR is only supported for image files in this demo.',
          actionable: false
        }
      };
    }
    // Create a URL for the image
    const imageUrl = URL.createObjectURL(file);
    console.log('Starting OCR processing...');
    // Run OCR using Tesseract
    const result = await Tesseract.recognize(imageUrl, opts.ocrLanguage || 'eng', {
      logger: m => console.log(`OCR progress: ${m.status} (${Math.round(m.progress * 100)}%)`)
    });
    // Clean up the URL
    URL.revokeObjectURL(imageUrl);
    const text = result.data.text;
    const score = scoreQuality(text);
    const wordCount = countWords(text);
    // Log debug info
    console.log(`OCR result: score=${score}, words=${wordCount}, confidence=${result.data.confidence}`);
    return {
      text,
      score,
      source: 'tesseract-ocr',
      meta: {
        confidence: result.data.confidence,
        words: result.data.words.length,
        wordCount
      }
    };
  } catch (error) {
    console.error('Error running OCR:', error);
    return {
      text: '',
      score: 0,
      source: 'ocr-failed',
      error: {
        code: 'OCR_FAILED',
        message: 'OCR processing failed: ' + String(error),
        actionable: false
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
  // For debugging
  console.log(`Parsing document: ${file.name} (${file.type}, ${file.size} bytes)`);
  // Create a controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    // Step 1: Parse based on file extension and mime type
    if (fileExtension === 'docx' || fileExtension === 'doc' || mimeType === 'application/msword' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    // Also handle generic binary types that might be Word docs
    mimeType === 'application/octet-stream' && (fileExtension === 'docx' || fileExtension === 'doc')) {
      console.log('Detected Word document, attempting to parse...');
      // Check if it's a legacy .doc file
      if (isLegacyDoc(file)) {
        return {
          text: '',
          score: 0,
          source: 'doc-not-supported',
          error: {
            code: 'LEGACY_DOC_FORMAT',
            message: 'Legacy .doc format detected. Please convert to .docx before uploading.',
            actionable: true,
            suggestedAction: 'Convert to .docx and try again'
          }
        };
      }
      const result = await parseDocx(file);
      // If there's a specific error, return it directly
      if (result.error?.code && ['LEGACY_DOC_FORMAT', 'DOCX_NOT_VALID_ZIP', 'DOCX_PASSWORD_PROTECTED', 'INVALID_DOCX_SIGNATURE'].includes(result.error.code)) {
        return result;
      }
      if (result.text) {
        const wordCount = countWords(result.text);
        // Accept if word count is sufficient, regardless of score
        if (wordCount >= opts.minWordCount!) {
          console.log(`DOCX accepted based on word count: ${wordCount} words`);
          return result;
        }
        // Accept if score is good enough
        if (result.score >= opts.minQualityScore!) {
          console.log(`DOCX accepted based on quality score: ${result.score}`);
          return result;
        }
        // Store as best result if better than current best
        if (result.score > bestResult.score) {
          bestResult = result;
        }
      }
    } else if (fileExtension === 'pdf' || mimeType === 'application/pdf' || mimeType === 'application/octet-stream' && fileExtension === 'pdf') {
      const result = await parsePdf(file, opts);
      // If the PDF is encrypted or has no text layer, return that result directly
      if (result.error?.code === 'PDF_ENCRYPTED' || result.error?.code === 'PDF_NO_TEXT_LAYER') {
        return result;
      }
      if (result.text) {
        const wordCount = countWords(result.text);
        // Accept if word count is sufficient, regardless of score
        if (wordCount >= opts.minWordCount!) {
          console.log(`PDF accepted based on word count: ${wordCount} words`);
          return result;
        }
        // Accept if score is good enough
        if (result.score >= opts.minQualityScore!) {
          console.log(`PDF accepted based on quality score: ${result.score}`);
          return result;
        }
        // Store as best result if better than current best
        if (result.score > bestResult.score) {
          bestResult = result;
        }
      }
    } else if (fileExtension === 'txt' || mimeType === 'text/plain' || mimeType === 'application/octet-stream' && fileExtension === 'txt') {
      const result = await parseTxt(file);
      if (result.text) {
        const wordCount = countWords(result.text);
        // Accept if word count is sufficient, regardless of score
        if (wordCount >= opts.minWordCount!) {
          console.log(`TXT accepted based on word count: ${wordCount} words`);
          return result;
        }
        // Accept if score is good enough
        if (result.score >= opts.minQualityScore!) {
          console.log(`TXT accepted based on quality score: ${result.score}`);
          return result;
        }
        // Store as best result if better than current best
        if (result.score > bestResult.score) {
          bestResult = result;
        }
      }
    } else {
      // Unsupported file format
      return {
        text: '',
        score: 0,
        source: 'unsupported-format',
        error: {
          code: 'UNSUPPORTED_FORMAT',
          message: `Unsupported file format: .${fileExtension}. Please upload .docx, .pdf, or .txt files.`,
          actionable: true,
          suggestedAction: 'Upload a supported file format'
        }
      };
    }
    // Step 2: If we have any text at all but score is low, use it anyway
    // This prevents "no text extracted" errors when we actually did get some text
    if (bestResult.text && bestResult.text.trim()) {
      const wordCount = countWords(bestResult.text);
      // If we have a decent amount of words, use this result despite low score
      if (wordCount >= 10) {
        console.log(`Using low quality text (score: ${bestResult.score}) with ${wordCount} words`);
        return bestResult;
      }
    }
    // Step 3: If text extraction failed or quality is very poor, try OCR as last resort
    if ((!bestResult.text || bestResult.score < 0.2) && opts.enableOcr) {
      console.log('Text extraction failed or quality is poor, attempting OCR...');
      const ocrResult = await runOcr(file, opts);
      if (ocrResult.text) {
        const wordCount = countWords(ocrResult.text);
        // Accept OCR result if it has enough words
        if (wordCount >= Math.max(10, opts.minWordCount! / 2)) {
          console.log(`OCR accepted with ${wordCount} words`);
          return ocrResult;
        }
        // Store as best result if better than current best
        if (ocrResult.score > bestResult.score) {
          bestResult = ocrResult;
        }
      }
    }
    // If we have any text at all at this point, return it
    if (bestResult.text && bestResult.text.trim()) {
      return bestResult;
    }
    // If we get here, all extraction methods failed
    if (fileExtension === 'docx') {
      return {
        text: '',
        score: 0,
        source: 'docx-extraction-failed',
        error: {
          code: 'DOCX_NO_TEXT_EXTRACTED',
          message: 'No text could be extracted from this Word document. The document may contain only images, shapes, or text in unsupported elements.',
          actionable: true,
          suggestedAction: 'Try saving the document as PDF and upload again'
        }
      };
    } else {
      return {
        text: '',
        score: 0,
        source: 'extraction-failed',
        error: {
          code: 'NO_TEXT_EXTRACTED',
          message: 'Could not extract any text from the document. The file may be corrupted, password-protected, or contain only images without OCR processing.',
          actionable: opts.enableOcr ? false : true,
          suggestedAction: opts.enableOcr ? undefined : 'Enable OCR processing'
        }
      };
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Document parsing timed out');
      return {
        text: bestResult.text || '',
        score: bestResult.score,
        source: bestResult.source || 'timeout',
        error: {
          code: 'PARSING_TIMEOUT',
          message: 'Document processing timed out.',
          actionable: false
        }
      };
    }
    console.error('Error parsing document:', error);
    return {
      text: bestResult.text || '',
      score: bestResult.score,
      source: bestResult.source || 'error',
      error: {
        code: 'PARSING_ERROR',
        message: 'Error processing document: ' + String(error),
        actionable: false
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