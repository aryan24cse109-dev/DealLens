import { Download, FileBarChart, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import ErrorMessage from '../components/common/ErrorMessage';
import Loader from '../components/common/Loader';

export default function ReportPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [analysisId, setAnalysisId] = useState(searchParams.get('analysisId') || location.state?.analysisId || '');
  const [reports, setReports] = useState([]);
  const [detail, setDetail] = useState(null);
  const [title, setTitle] = useState('DealLens Analysis Report');
  const [format, setFormat] = useState('PDF');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  function changeAnalysisId(value) {
    setAnalysisId(value);
    setSearchParams(value ? { analysisId: value } : {}, { replace: true });
  }

  useEffect(() => {
    if (!analysisId) return;
    setLoading(true);
    api.get(`/analyses/${analysisId}/reports`)
      .then(({ data }) => setReports(data.data || []))
      .catch((requestError) => setError(getApiError(requestError, 'Reports unavailable.')))
      .finally(() => setLoading(false));
  }, [analysisId]);

  async function createReport(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await api.post(`/analyses/${analysisId}/reports`, { title, format });
      setReports((current) => [response.data.data, ...current]);
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to generate report.'));
    } finally {
      setBusy(false);
    }
  }

  async function showDetail(report) {
    try {
      const response = await api.get(`/reports/${report.id}`);
      setDetail(response.data.data);
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to load report details.'));
    }
  }

  async function download(report) {
    try {
      const response = await api.get(`/reports/${report.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.title || 'deallens-report'}.${report.format.toLowerCase()}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to download report.'));
    }
  }

  async function remove(report) {
    try {
      await api.delete(`/reports/${report.id}`);
      setReports((current) => current.filter((item) => item.id !== report.id));
      if (detail?.id === report.id) setDetail(null);
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to delete report.'));
    }
  }

  return <div className="page-shell"><header className="page-header"><div><p className="eyebrow">Export center</p><h1 className="page-title">Reports</h1><p className="page-description">Generate and manage reports from a completed owned analysis.</p></div></header>
    {error && <ErrorMessage message={error} onRetry={() => setError('')} />}
    <section className="card panel"><div className="section-title"><h2><Plus size={18} /> Generate report</h2></div><form className="form-grid" onSubmit={createReport}><label>Analysis ID<input value={analysisId} onChange={(event) => changeAnalysisId(event.target.value)} placeholder="Completed analysis ID" required /></label><label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength="200" required /></label><label>Format<select value={format} onChange={(event) => setFormat(event.target.value)}><option value="PDF">PDF</option><option value="JSON">JSON</option></select></label><button className="button primary" disabled={busy || !analysisId}>{busy ? 'Generating…' : 'Generate report'}</button></form></section>
    <section className="card panel report-list"><div className="section-title"><h2><FileBarChart size={18} /> Reports for this analysis</h2></div>{loading ? <Loader label="Loading reports…" /> : reports.length ? reports.map((report) => <div className="document-row" key={report.id}><FileBarChart size={18} /><button className="row-link" onClick={() => showDetail(report)}><strong>{report.title}</strong><span>{report.format} · {new Date(report.createdAt).toLocaleDateString()}</span></button><button className="icon-button" onClick={() => download(report)} aria-label="Download report"><Download size={16} /></button><button className="icon-button danger-text" onClick={() => remove(report)} aria-label="Delete report"><Trash2 size={16} /></button></div>) : <div className="empty-state compact">{analysisId ? 'No reports have been generated for this analysis.' : 'Run a comparison, then use Generate report from its result.'}</div>}</section>
    {detail && <section className="card panel detail-panel"><div className="section-title"><h2>{detail.title}</h2><button className="icon-button" onClick={() => setDetail(null)}>Close</button></div><p className="page-description">{detail.format} report · {new Date(detail.createdAt).toLocaleString()}</p></section>}
  </div>;
}
