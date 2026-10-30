import { prisma } from '../config/database.js';

const DEAL_STATUSES = ['DRAFT', 'PROCESSING', 'ANALYZED', 'FAILED'];
const CHANGE_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function getDateWhere({ from, to }) {
  if (!from && !to) return undefined;

  const createdAt = {};

  if (from) createdAt.gte = from;
  if (to) {
    const exclusiveTo = new Date(to);
    exclusiveTo.setUTCDate(exclusiveTo.getUTCDate() + 1);
    createdAt.lt = exclusiveTo;
  }

  return { createdAt };
}

function initializeCounts(values) {
  return Object.fromEntries(values.map((value) => [value, 0]));
}

function mapGroupedCounts(rows, key) {
  return Object.fromEntries(rows.map((row) => [row[key], row._count._all]));
}

function buildActivity({ deals, documents, analyses, reports, drafts }) {
  return [
    ...deals.map((deal) => ({
      type: 'DEAL_CREATED',
      id: deal.id,
      timestamp: deal.createdAt,
      dealId: deal.id,
      dealName: deal.name,
      description: `Deal "${deal.name}" was created.`,
    })),
    ...documents.map((document) => ({
      type: 'DOCUMENT_UPLOADED',
      id: document.id,
      timestamp: document.createdAt,
      dealId: document.dealId,
      dealName: document.deal.name,
      description: `Document "${document.originalName}" was uploaded.`,
    })),
    ...analyses.map((analysis) => ({
      type: 'ANALYSIS_CREATED',
      id: analysis.id,
      timestamp: analysis.createdAt,
      dealId: analysis.dealId,
      dealName: analysis.deal.name,
      description: `Analysis for "${analysis.deal.name}" was created.`,
    })),
    ...reports.map((report) => ({
      type: 'REPORT_CREATED',
      id: report.id,
      timestamp: report.createdAt,
      dealId: report.analysis.dealId,
      dealName: report.analysis.deal.name,
      description: `Report "${report.title}" was generated.`,
    })),
    ...drafts.map((draft) => ({
      type: 'COMMUNICATION_CREATED',
      id: draft.id,
      timestamp: draft.createdAt,
      dealId: draft.analysis.dealId,
      dealName: draft.analysis.deal.name,
      description: `A ${draft.channel} communication draft was created.`,
    })),
  ]
    .sort((first, second) => second.timestamp - first.timestamp)
    .slice(0, 20);
}

export const dashboardService = {
  async getSummary({ from, to, limit, ownerId }) {
    const dateWhere = getDateWhere({ from, to });
    const dealWhere = { ...dateWhere, ownerId };
    const analysisWhere = { ...dateWhere, deal: { ownerId } };
    const documentWhere = { ...dateWhere, deal: { ownerId } };
    const changeWhere = { ...dateWhere, analysis: { deal: { ownerId } } };
    const reportWhere = {
      ...dateWhere,
      analysis: { deal: { ownerId } },
    };
    const draftWhere = {
      ...dateWhere,
      analysis: { deal: { ownerId } },
    };
    const recentTake = Math.min(limit, 50);

    const [
      totalDeals,
      totalDocuments,
      totalAnalyses,
      totalChanges,
      completedAnalyses,
      failedAnalyses,
      pendingAnalyses,
      severityRows,
      dealStatusRows,
      analysisStatusRows,
      highSeverityChanges,
      criticalSeverityChanges,
      recentDeals,
      recentAnalyses,
      recentActivityDeals,
      recentActivityDocuments,
      recentActivityAnalyses,
      recentActivityReports,
      recentActivityDrafts,
    ] = await Promise.all([
      prisma.deal.count({ where: dealWhere }),
      prisma.document.count({ where: documentWhere }),
      prisma.analysis.count({ where: analysisWhere }),
      prisma.change.count({ where: changeWhere }),
      prisma.analysis.count({ where: { ...analysisWhere, status: 'COMPLETED' } }),
      prisma.analysis.count({ where: { ...analysisWhere, status: 'FAILED' } }),
      prisma.analysis.count({ where: { ...analysisWhere, status: 'PENDING' } }),
      prisma.change.groupBy({
        by: ['severity'],
        where: changeWhere,
        _count: { _all: true },
      }),
      prisma.deal.groupBy({
        by: ['status'],
        where: dealWhere,
        _count: { _all: true },
      }),
      prisma.analysis.groupBy({
        by: ['status'],
        where: analysisWhere,
        _count: { _all: true },
      }),
      prisma.change.count({
        where: { ...changeWhere, severity: 'HIGH' },
      }),
      prisma.change.count({
        where: { ...changeWhere, severity: 'CRITICAL' },
      }),
      prisma.deal.findMany({
        where: dealWhere,
        orderBy: { createdAt: 'desc' },
        take: recentTake,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              documents: true,
              analyses: true,
            },
          },
        },
      }),
      prisma.analysis.findMany({
        where: analysisWhere,
        orderBy: { createdAt: 'desc' },
        take: recentTake,
        select: {
          id: true,
          dealId: true,
          status: true,
          summary: true,
          createdAt: true,
          updatedAt: true,
          deal: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              changes: true,
              aiAssessments: true,
            },
          },
        },
      }),
      prisma.deal.findMany({
        where: dealWhere,
        orderBy: { createdAt: 'desc' },
        take: recentTake,
        select: { id: true, name: true, createdAt: true },
      }),
      prisma.document.findMany({
        where: documentWhere,
        orderBy: { createdAt: 'desc' },
        take: recentTake,
        select: {
          id: true,
          dealId: true,
          originalName: true,
          createdAt: true,
          deal: { select: { name: true } },
        },
      }),
      prisma.analysis.findMany({
        where: analysisWhere,
        orderBy: { createdAt: 'desc' },
        take: recentTake,
        select: {
          id: true,
          dealId: true,
          createdAt: true,
          deal: { select: { name: true } },
        },
      }),
      prisma.report.findMany({
        where: reportWhere,
        orderBy: { createdAt: 'desc' },
        take: recentTake,
        select: {
          id: true,
          title: true,
          createdAt: true,
          analysis: {
            select: {
              dealId: true,
              deal: { select: { name: true } },
            },
          },
        },
      }),
      prisma.communicationDraft.findMany({
        where: draftWhere,
        orderBy: { createdAt: 'desc' },
        take: recentTake,
        select: {
          id: true,
          channel: true,
          createdAt: true,
          analysis: {
            select: {
              dealId: true,
              deal: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const severityDistribution = {
      ...initializeCounts(CHANGE_SEVERITIES),
      ...mapGroupedCounts(severityRows, 'severity'),
    };
    const dealStatusDistribution = {
      ...initializeCounts(DEAL_STATUSES),
      ...mapGroupedCounts(dealStatusRows, 'status'),
    };

    return {
      metrics: {
        totalDeals,
        totalDocuments,
        totalAnalyses,
        totalChanges,
        completedAnalyses,
        failedAnalyses,
        pendingAnalyses,
        highSeverityChanges,
        criticalSeverityChanges,
      },
      severityDistribution,
      dealStatusDistribution,
      analysisStatusDistribution: mapGroupedCounts(
        analysisStatusRows,
        'status',
      ),
      recentDeals,
      recentAnalyses,
      recentActivity: buildActivity({
        deals: recentActivityDeals,
        documents: recentActivityDocuments,
        analyses: recentActivityAnalyses,
        reports: recentActivityReports,
        drafts: recentActivityDrafts,
      }),
    };
  },
};

export { buildActivity, getDateWhere };
