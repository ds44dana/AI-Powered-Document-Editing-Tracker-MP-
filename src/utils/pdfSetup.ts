import * as pdfjsLib from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';

GlobalWorkerOptions.workerSrc = workerSrc;

export default pdfjsLib;
