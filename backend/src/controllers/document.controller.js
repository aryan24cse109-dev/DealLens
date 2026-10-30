
import { z } from 'zod';

import {
  documentService,
  DocumentServiceError,
} from '../services/document.service.js';

import { documentUploadSchema } from '../validators/document.schema.js';

const idSchema = z.string().min(1).max(100);

function parseId(value, label) {
  const result = idSchema.safeParse(value);

  if (!result.success) {
    throw new DocumentServiceError(`Invalid ${label}.`, 400);
  }

  return result.data;
}

export const documentController = {
  async upload(req, res, next) {
    try {
      const dealId = parseId(req.params.dealId, 'deal ID');
      const body = documentUploadSchema.parse(req.body);

      const document = await documentService.uploadDocument({
        dealId,
        ownerId: req.user.id,
        file: req.file,
        type: body.type,
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded and text extracted successfully.',
        data: document,
      });
    } catch (error) {
      next(error);
    }
  },

  async listByDeal(req, res, next) {
    try {
      const dealId = parseId(req.params.dealId, 'deal ID');
      const documents = await documentService.listDocuments(dealId, req.user.id);

      res.status(200).json({
        success: true,
        data: documents,
      });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const id = parseId(req.params.id, 'document ID');
      const document = await documentService.getDocument(id, req.user.id);

      res.status(200).json({
        success: true,
        data: document,
      });
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      const id = parseId(req.params.id, 'document ID');
      const result = await documentService.deleteDocument(id, req.user.id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};
