

import { unlink } from 'node:fs/promises';
import path from 'node:path';

import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { documentRepository } from '../repositories/document.repository.js';
import { extractPdfText } from './pdf-extraction.service.js';

export class DocumentServiceError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'DocumentServiceError';
    this.status = status;
  }
}

async function removeFile(filePath) {
  if (!filePath) return;

  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Could not remove uploaded file:', error.message);
    }
  }
}

export const documentService = {
  async uploadDocument({ dealId, file, type }) {
    if (!file) {
      throw new DocumentServiceError('Please upload a PDF file.', 400);
    }

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      select: { id: true },
    });

    if (!deal) {
      await removeFile(file.path);
      throw new DocumentServiceError('Deal not found.', 404);
    }

    let extractedText;

    try {
      extractedText = await extractPdfText(file.path);
    } catch (error) {
      await removeFile(file.path);

      throw new DocumentServiceError(
        error.message || 'Could not extract PDF text.',
        422,
      );
    }

    try {
      const document = await documentRepository.create({
        dealId,
        type,
        originalName: path.basename(file.originalname),
        storagePath: path.relative(process.cwd(), file.path),
        mimeType: 'application/pdf',
        sizeBytes: file.size,
        extractedText,
      });

      // Do not return extracted text in the upload response.
      const { extractedText: _text, ...safeDocument } = document;

      return safeDocument;
    } catch (error) {
      await removeFile(file.path);
      throw error;
    }
  },

  async listDocuments(dealId) {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      select: { id: true },
    });

    if (!deal) {
      throw new DocumentServiceError('Deal not found.', 404);
    }

    return documentRepository.findByDealId(dealId);
  },

  async getDocument(id) {
    const document = await documentRepository.findById(id);

    if (!document) {
      throw new DocumentServiceError('Document not found.', 404);
    }

    return document;
  },

  async deleteDocument(id) {
    const document = await documentRepository.findById(id);

    if (!document) {
      throw new DocumentServiceError('Document not found.', 404);
    }

    await documentRepository.deleteById(id);

    const absolutePath = path.resolve(process.cwd(), document.storagePath);
    const uploadRoot = path.resolve(process.cwd(), env.uploadDir);

    // Only delete files inside the configured upload directory.
    if (
      absolutePath.startsWith(`${uploadRoot}${path.sep}`) ||
      absolutePath === uploadRoot
    ) {
      await removeFile(absolutePath);
    }

    return { id, deleted: true };
  },
};
