import { createReportSchema } from '../validators/report.schema.js';
import { reportService } from '../services/report.service.js';
import { z } from 'zod';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).default(''),
  format: z.enum(['PDF', 'TEXT', 'JSON']).optional(),
}).strict();

export const reportController = {
  async listAll(req, res, next) {
    try {
      const query = listQuerySchema.parse(req.query);
      const result = await reportService.listAllReports({
        ...query,
        ownerId: req.user.id,
      });
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  },

  async create(req, res, next) {
    try {
      const report = await reportService.createReport(
        req.user.id,
        req.params.analysisId,
        createReportSchema.parse(req.body),
      );
      return res.status(201).json({
        success: true,
        message: 'Report generated successfully.',
        data: report,
      });
    } catch (error) {
      return next(error);
    }
  },

  async list(req, res, next) {
    try {
      const reports = await reportService.listReports(req.user.id, req.params.analysisId);
      return res.status(200).json({ success: true, data: reports });
    } catch (error) {
      return next(error);
    }
  },

  async get(req, res, next) {
    try {
      const report = await reportService.getReport(req.user.id, req.params.reportId);
      return res.status(200).json({ success: true, data: report });
    } catch (error) {
      return next(error);
    }
  },

  async download(req, res, next) {
    try {
      const result = await reportService.getDownload(req.user.id, req.params.reportId);
      res.setHeader('Content-Type', result.contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.filename}"`,
      );
      return res.status(200).send(result.content);
    } catch (error) {
      return next(error);
    }
  },

  async remove(req, res, next) {
    try {
      const result = await reportService.deleteReport(req.user.id, req.params.reportId);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  },
};
