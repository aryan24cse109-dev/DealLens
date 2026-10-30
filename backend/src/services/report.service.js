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
  const extension = format === 'PDF' ? 'pdf' : format === 'TEXT' ? 'txt' : 'json';
  return path.resolve(
    process.cwd(),
    env.reportDir,
    `${reportId}.${extension}`,
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

async function loadReport(reportId, ownerId) {
  const report = await prisma.report.findFirst({
    where: { id: reportId, analysis: { deal: { ownerId } } },
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

function serializeTextReport(reportData) {
  const lines = [
    reportData.report.title,
    `Deal: ${reportData.deal.name}`,
    `Status: ${reportData.deal.status}`,
    '',
    'Executive summary',
    reportData.executiveSummary.text,
    `Critical changes: ${reportData.executiveSummary.criticalChanges}`,
    `High-severity changes: ${reportData.executiveSummary.highChanges}`,
    '',
    'Documents',
    ...reportData.documents.map((item) => `${item.type}: ${item.originalName}`),
    '',
    'Detected changes',
  ];

  reportData.changes.forEach((change, index) => {
    lines.push(
      `${index + 1}. ${change.category} (${change.severity})`,
      `Type: ${change.type}`,
      `Old value: ${change.oldValue ?? '[none]'}`,
      `New value: ${change.newValue ?? '[none]'}`,
      `Explanation: ${change.explanation ?? '[none]'}`,
    );
    if (change.aiAssessment) {
      lines.push(
        `AI impact: ${change.aiAssessment.impact}`,
        `Suggested action: ${change.aiAssessment.suggestedAction}`,
        `AI severity: ${change.aiAssessment.severity}; confidence: ${change.aiAssessment.confidence}`,
      );
    }
    lines.push('');
  });

  if (reportData.executiveSummary.recommendations.length) {
    lines.push(
      'Recommendations',
      ...reportData.executiveSummary.recommendations.map(
        (recommendation) => `- ${recommendation}`,
      ),
    );
  }

  return `${lines.join('\n')}\n`;
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
  async createReport(ownerId, analysisId, input) {
    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, deal: { ownerId } },
      select: {
        id: true,
        _count: { select: { changes: true, aiAssessments: true } },
      },
    });
    if (!analysis) throw new ReportServiceError('Analysis not found.', 404);
    if (analysis._count.changes !== analysis._count.aiAssessments) {
      throw new ReportServiceError(
        'Run AI impact analysis before generating a report.',
        422,
      );
    }

    const report = await prisma.report.create({
      data: { analysisId, title: input.title, format: input.format },
    });

    try {
      const reportData = serializeReport(await loadReport(report.id, ownerId));
      const filePath = getReportFilePath(report.id, report.format);
      await mkdir(path.dirname(filePath), { recursive: true });

      if (report.format === 'JSON') {
        await writeFile(filePath, JSON.stringify(reportData, null, 2), 'utf8');
      } else if (report.format === 'TEXT') {
        await writeFile(filePath, serializeTextReport(reportData), 'utf8');
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

  async listReports(ownerId, analysisId) {
    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, deal: { ownerId } },
      select: { id: true },
    });
    if (!analysis) throw new ReportServiceError('Analysis not found.', 404);

    const reports = await prisma.report.findMany({
      where: { analysisId, analysis: { deal: { ownerId } } },
      orderBy: { createdAt: 'desc' },
    });
    return reports.map(toPublicReport);
  },

  async getReport(ownerId, reportId) {
    const report = await loadReport(reportId, ownerId);
    return {
      ...toPublicReport(report),
      data: serializeReport(report),
    };
  },

  async getDownload(ownerId, reportId) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, analysis: { deal: { ownerId } } },
    });
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
          : report.format === 'TEXT'
            ? 'text/plain; charset=utf-8'
            : 'application/json',
        filename: `${report.title.replace(/[^a-z0-9._-]+/gi, '_')}.${report.format === 'TEXT' ? 'txt' : report.format.toLowerCase()}`,
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new ReportServiceError('Report file is missing.', 404);
      }
      throw error;
    }
  },

  async deleteReport(ownerId, reportId) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, analysis: { deal: { ownerId } } },
    });
    if (!report) throw new ReportServiceError('Report not found.', 404);

    if (report.storagePath) {
      const filePath = path.resolve(process.cwd(), report.storagePath);
      if (isInsideReportDirectory(filePath)) await removeFile(filePath);
    }
    const deletion = await prisma.report.deleteMany({
      where: { id: reportId, analysis: { deal: { ownerId } } },
    });
    if (!deletion.count) {
      throw new ReportServiceError('Report not found.', 404);
    }
    return { id: reportId, deleted: true };
  },
};

export { parseSummary, serializeReport };
