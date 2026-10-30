import {
  createCommunicationSchema,
  updateCommunicationSchema,
} from '../validators/communication.schema.js';
import { communicationService } from '../services/communication.service.js';

export const communicationController = {
  async create(req, res, next) {
    try {
      const draft = await communicationService.createDraft(
        req.user.id,
        req.params.analysisId,
        createCommunicationSchema.parse(req.body),
      );
      return res.status(201).json({
        success: true,
        message: 'Communication draft generated successfully.',
        data: draft,
      });
    } catch (error) {
      return next(error);
    }
  },

  async list(req, res, next) {
    try {
      const drafts = await communicationService.listDrafts(req.user.id, req.params.analysisId);
      return res.status(200).json({ success: true, data: drafts });
    } catch (error) {
      return next(error);
    }
  },

  async get(req, res, next) {
    try {
      const draft = await communicationService.getDraft(req.user.id, req.params.draftId);
      return res.status(200).json({ success: true, data: draft });
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      const draft = await communicationService.updateDraft(
        req.user.id,
        req.params.draftId,
        updateCommunicationSchema.parse(req.body),
      );
      return res.status(200).json({ success: true, data: draft });
    } catch (error) {
      return next(error);
    }
  },

  async remove(req, res, next) {
    try {
      const result = await communicationService.deleteDraft(req.user.id, req.params.draftId);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  },
};
