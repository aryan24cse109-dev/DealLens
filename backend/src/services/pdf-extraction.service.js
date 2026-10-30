
import { readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';

export async function extractPdfText(filePath) {
  const buffer = await readFile(filePath);

  // Check the PDF magic header; MIME types can be spoofed.
  if (buffer.length < 5 || buffer.subarray(0, 5).toString() !== '%PDF-') {
    throw new Error('The uploaded file is not a valid PDF.');
  }

  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const result = await parser.getText();
    const text = result.text?.trim() ?? '';

    if (!text) {
      throw new Error(
        'No readable text found. This may be a scanned PDF; OCR is not implemented yet.',
      );
    }

    return text;
  } finally {
    await parser.destroy();
  }
}
