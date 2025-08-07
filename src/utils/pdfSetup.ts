// Client-side PDF.js setup using CDN for the worker
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
// Set the worker source to a CDN version with the exact version
// This avoids bundling issues with the worker
const PDFJS_VERSION = '3.4.120';
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;
export default pdfjsLib;