import { createWriteStream } from 'node:fs';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import PDFDocument from 'pdfkit';

import { prisma } from '../config/database.js';
import { env } from '../config/env.js';

export class ReportServiceError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'ReportServiceError';
    this.status = status;
  }
}

function parseSummary(summary) {
  if (!summary) return {};

  try {
    const parsed = JSON.parse(summary);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return { text: summary };
  }
}

function getReportFilePath(reportId, format) {
  return path.resolve(
    process.cwd(),
    env.reportDir,
    `${reportId}.${format === 'PDF' ? 'pdf' : 'json'}`,
  );
}

function isInsideReportDirectory(filePath) {
  const reportRoot = path.resolve(process.cwd(), env.reportDir);
  return filePath.startsWith(`${reportRoot}${path.sep}`);
}

function serializeReport(report) {
  const assessmentsByChangeId = new Map(
    report.analysis.aiAssessments.map((assessment) => [
      assessment.changeId,
      assessment,
    ]),
  );
  const changes = report.analysis.changes.map((change) => {
    const assessment = assessmentsByChangeId.get(change.id);

    return {
      id: change.id,
      type: change.category,
      category: change.field ?? 'GENERAL',
      oldValue: change.oldValue,
      newValue: change.newValue,
      explanation: change.explanation,
      severity: change.severity,
      aiAssessment: assessment
        ? {
            category: assessment.category,
            impact: assessment.impact,
            explanation: assessment.explanation,
            suggestedAction: assessment.suggestedAction,
            severity: assessment.severity,
            confidence: assessment.confidence,
            model: assessment.model,
          }
        : null,
    };
  });
  const criticalChanges = changes.filter(
    (change) => change.severity === 'CRITICAL',
  ).length;
  const highChanges = changes.filter(
    (change) => change.severity === 'HIGH',
  ).length;

  return {
    report: {
      id: report.id,
      title: report.title,
      format: report.format,
      createdAt: report.createdAt,
    },
    deal: {
      id: report.analysis.deal.id,
      name: report.analysis.deal.name,
      description: report.analysis.deal.description,
      status: report.analysis.deal.status,
      createdAt: report.analysis.deal.createdAt,
    },
    documents: report.analysis.deal.documents.map((document) => ({
      id: document.id,
      type: document.type,
      originalName: document.originalName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      createdAt: document.createdAt,
    })),
    analysis: {
      id: report.analysis.id,
      status: report.analysis.status,
      summary: parseSummary(report.analysis.summary),
      createdAt: report.analysis.createdAt,
      updatedAt: report.analysis.updatedAt,
      changeCount: changes.length,
      aiAssessmentCount: report.analysis.aiAssessments.length,
    },
    executiveSummary: {
      text: criticalChanges || highChanges
        ? `This analysis identified ${changes.length} change(s), including ${criticalChanges} critical and ${highChanges} high-severity change(s) requiring review.`
        : `This analysis identified ${changes.length} change(s) for review.`,
      criticalChanges,
      highChanges,
      recommendations: [
        ...new Set(
          changes
            .map((change) => change.aiAssessment?.suggestedAction)
            .filter(Boolean),
        ),
      ],
    },
    changes,
  };
}

async function loadReport(reportId) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      analysis: {
        include: {
          deal: {
            include: {
              documents: { orderBy: { createdAt: 'asc' } },
            },
          },
          changes: { orderBy: { createdAt: 'asc' } },
          aiAssessments: { orderBy: { createdAt: 'asc' } },
        },
      },
    },
  });

  if (!report) throw new ReportServiceError('Report not found.', 404);
  return report;
}

function toPublicReport(report) {
  return {
    id: report.id,
    analysisId: report.analysisId,
    title: report.title,
    format: report.format,
    createdAt: report.createdAt,
  };
}

function writePdf(reportData, filePath) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ margin: 50 });
    const output = createWriteStream(filePath);
    output.on('error', reject);
    output.on('finish', resolve);
    document.pipe(output);

    document.fontSize(20).text(reportData.report.title);
    document.moveDown();
    document.fontSize(12).text(`Deal: ${reportData.deal.name}`);
    document.text(`Status: ${reportData.deal.status}`);
    document.text(`Generated: ${reportData.report.createdAt.toISOString()}`);
    document.moveDown();

    document.fontSize(16).text('Executive summary');
    document.fontSize(11).text(reportData.executiveSummary.text);
    document.text(`Critical changes: ${reportData.executiveSummary.criticalChanges}`);
    document.text(`High-severity changes: ${reportData.executiveSummary.highChanges}`);
    document.moveDown();

    document.fontSize(16).text('Documents');
    reportData.documents.forEach((item) => {
      document.fontSize(11).text(`${item.type}: ${item.originalName}`);
    });
    document.moveDown();

    document.fontSize(16).text('Detected changes');
    reportData.changes.forEach((change, index) => {
      document.fontSize(12).text(
        `${index + 1}. ${change.category} (${change.severity})`,
      );
      document.fontSize(10).text(`Type: ${change.type}`);
      document.text(`Old value: ${change.oldValue ?? '[none]'}`);
      document.text(`New value: ${change.newValue ?? '[none]'}`);
      document.text(`Explanation: ${change.explanation ?? '[none]'}`);
      if (change.aiAssessment) {
        document.text(`AI impact: ${change.aiAssessment.impact}`);
        document.text(`Suggested action: ${change.aiAssessment.suggestedAction}`);
        document.text(
          `AI severity: ${change.aiAssessment.severity}; confidence: ${change.aiAssessment.confidence}`,
        );
      } else {
        document.text('AI impact assessment: Not available.');
      }
      document.moveDown();
    });

    if (reportData.executiveSummary.recommendations.length) {
      document.fontSize(16).text('Recommendations');
      reportData.executiveSummary.recommendations.forEach((recommendation) => {
        document.fontSize(11).text(`- ${recommendation}`);
      });
    }

    document.end();
  });
}

async function removeFile(filePath) {
  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

export const reportService = {
  async createReport(analysisId, input) {
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      select: { id: true },
    });
    if (!analysis) throw new ReportServiceError('Analysis not found.', 404);

    const report = await prisma.report.create({
      data: { analysisId, title: input.title, format: input.format },
    });

    try {
      const reportData = serializeReport(await loadReport(report.id));
      const filePath = getReportFilePath(report.id, report.format);
      await mkdir(path.dirname(filePath), { recursive: true });

      if (report.format === 'JSON') {
        await writeFile(filePath, JSON.stringify(reportData, null, 2), 'utf8');
      } else {
        await writePdf(reportData, filePath);
      }

      const savedReport = await prisma.report.update({
        where: { id: report.id },
        data: { storagePath: path.relative(process.cwd(), filePath) },
      });
      return toPublicReport(savedReport);
    } catch (error) {
      await prisma.report.delete({ where: { id: report.id } }).catch(() => {});
      throw error;
    }
  },

  async listReports(analysisId) {
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      select: { id: true },
    });
    if (!analysis) throw new ReportServiceError('Analysis not found.', 404);

    const reports = await prisma.report.findMany({
      where: { analysisId },
      orderBy: { createdAt: 'desc' },
    });
    return reports.map(toPublicReport);
  },

  async getReport(reportId) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new ReportServiceError('Report not found.', 404);
    return toPublicReport(report);
  },

  async getDownload(reportId) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new ReportServiceError('Report not found.', 404);
    if (!report.storagePath) {
      throw new ReportServiceError('Report file is not available.', 404);
    }

    const filePath = path.resolve(process.cwd(), report.storagePath);
    if (!isInsideReportDirectory(filePath)) {
      throw new ReportServiceError('Report file path is invalid.', 500);
    }

    try {
      return {
        report,
        content: await readFile(filePath),
        contentType: report.format === 'PDF'
          ? 'application/pdf'
          : 'application/json',
        filename: `${report.title.replace(/[^a-z0-9._-]+/gi, '_')}.${report.format.toLowerCase()}`,
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new ReportServiceError('Report file is missing.', 404);
      }
      throw error;
    }
  },

  async deleteReport(reportId) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new ReportServiceError('Report not found.', 404);

    if (report.storagePath) {
      const filePath = path.resolve(process.cwd(), report.storagePath);
      if (isInsideReportDirectory(filePath)) await removeFile(filePath);
    }
    await prisma.report.delete({ where: { id: reportId } });
    return { id: reportId, deleted: true };
  },
};

export { parseSummary, serializeReport };
