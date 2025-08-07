// Server-side document extraction API
export const config = {
  runtime: 'nodejs16.x',
  maxDuration: 30
};
import formidable from 'formidable';
import mammoth from 'mammoth';
import { Buffer } from 'buffer';
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }
  try {
    // Parse the multipart form data
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({
          error: 'Failed to parse form data'
        });
      }
      const file = files.file;
      if (!file) {
        return res.status(400).json({
          error: 'No file provided'
        });
      }
      const fileName = file.originalFilename || file.name || '';
      const fileExtension = fileName.split('.').pop().toLowerCase();
      try {
        // Handle different file types
        if (fileExtension === 'docx') {
          // Process DOCX with mammoth
          const result = await mammoth.extractRawText({
            path: file.filepath
          });
          return res.status(200).json({
            text: result.value,
            score: 0.9,
            // Placeholder score
            source: 'mammoth',
            meta: {
              warnings: result.messages
            }
          });
        } else if (fileExtension === 'pdf') {
          // For PDF, we'd use a server-side PDF parser like pdf-parse
          // This is just a placeholder
          return res.status(200).json({
            text: "PDF parsing would happen server-side",
            score: 0.8,
            source: 'pdf-server'
          });
        } else if (fileExtension === 'txt') {
          // For TXT files, simply read the file
          const fs = require('fs');
          const text = fs.readFileSync(file.filepath, 'utf8');
          return res.status(200).json({
            text,
            score: 1.0,
            source: 'text-reader'
          });
        } else {
          return res.status(400).json({
            error: {
              code: 'UNSUPPORTED_FORMAT',
              message: `Unsupported file format: .${fileExtension}. Please upload .docx, .pdf, or .txt files.`
            }
          });
        }
      } catch (error) {
        console.error('Error processing file:', error);
        return res.status(500).json({
          error: {
            code: 'PROCESSING_ERROR',
            message: error.message || 'Failed to process file'
          }
        });
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: 'Server error'
    });
  }
}