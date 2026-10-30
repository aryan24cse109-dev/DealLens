import { Download, FileBarChart, MessageSquareText, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import ErrorMessage from '../components/common/ErrorMessage';
import Loader from '../components/common/Loader';

export default function ReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const analysisId = searchParams.get('analysisId') || '';
  const [analysis, setAnalysis] = useState(null);
  const [reports, setReports] = useState([]);
  const [detail, setDetail] = useState(null);
  const [format, setFormat] = useState('PDF');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!analysisId) return;
    try {
      const [analysisResponse, reportsResponse] = await Promise.all([
        api.get(`/analyses/${analysisId}`),
        api.get(`/analyses/${analysisId}/reports`),
      ]);
      setAnalysis(analysisResponse.data.data);
      setReports(reportsResponse.data.data || []);
    } catch (requestError) {
      setError(getApiError(requestError, 'Report context unavailable.'));
    }
  }
  useEffect(() => { load(); }, [analysisId]);

  async function createReport(event) {
    event.preventDefault();
    if (!analysis || analysis.status !== 'COMPLETED') return setError('The analysis must be completed before generating a report.');
    setBusy(true);
    setError('');
    try {
      const response = await api.post(`/analyses/${analysisId}/reports`, {
        title: `${analysis.deal.name} Analysis Report`,
        format,
      });
      setReports((current) => [response.data.data, ...current]);
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to generate report.'));
    } finally {
      setBusy(false);
    }
  }

  async function download(report) {
    try {
      const response = await api.get(`/reports/${report.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.title.replace(/[^a-z0-9._-]+/gi, '_')}.${report.format === 'TEXT' ? 'txt' : report.format.toLowerCase()}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to download report.'));
    }

    async function showDetail(report) {
      try {
        const response = await api.get(`/reports/${report.id}`);
        setDetail(response.data.data);
      } catch (requestError) {
        setError(getApiError(requestError, 'Unable to load report details.'));
      }
    }
  }

  if (!analysisId) return <div className="page-shell"><div className="card empty-state">No analysis selected. Start a comparison first.</div></div>;
  if (!analysis && !error) return <div className="page-shell"><Loader label="Loading report context…" /></div>;
  return <div className="page-shell"><header className="page-header"><div><p className="eyebrow">{analysis?.deal.name || 'Analysis'}</p><h1 className="page-title">Generate Report</h1><p className="page-description">Use the completed analysis and all associated documents.</p></div></header>{error && <ErrorMessage message={error} onRetry={load} />}{analysis && <><section className="card panel"><div className="section-title"><h2><Plus size={18} /> Report format</h2></div><form className="form-grid" onSubmit={createReport}><label>Format<select value={format} onChange={(event) => setFormat(event.target.value)}><option value="PDF">PDF</option><option value="TEXT">Text</option></select></label><button className="button primary" disabled={busy || analysis.status !== 'COMPLETED'}>{busy ? 'Generating…' : 'Generate Report'}</button></form></section><section className="card panel report-list"><div className="section-title"><h2><FileBarChart size={18} /> Generated reports</h2></div>{reports.length ? reports.map((report) => <div className="document-row" key={report.id}><FileBarChart size={18} /><button className="row-link" onClick={() => showDetail(report)}><strong>{report.title}</strong><span>{report.format} · {new Date(report.createdAt).toLocaleDateString()}</span></button><button className="button secondary" onClick={() => download(report)}><Download size={16} /> Download Report</button></div>) : <div className="empty-state compact">No report has been generated yet.</div>}</section>{detail && <section className="card panel detail-panel"><div className="section-title"><h2>{detail.title}</h2><button className="button secondary" onClick={() => setDetail(null)}>Close</button></div><p>{detail.data.executiveSummary.text}</p><div className="document-list">{detail.data.changes.map((change) => <div className="document-row" key={change.id}><div><strong>{change.category} · {change.severity}</strong><span>{change.explanation}</span></div></div>)}</div></section>}{reports.length > 0 && <button className="button secondary" onClick={() => navigate(`/communication?analysisId=${encodeURIComponent(analysisId)}`)}><MessageSquareText size={16} /> Continue to Communication</button>}</>}</div>;
}
