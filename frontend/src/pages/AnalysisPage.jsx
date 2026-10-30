import { FileText, MessageSquareText, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';

export default function AnalysisPage() {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');

  async function load() {
    try {
      const response = await api.get(`/analyses/${analysisId}`);
      setAnalysis(response.data.data);
    } catch (requestError) {
      setError(getApiError(requestError, 'Analysis unavailable.'));
    }
  }
  useEffect(() => { load(); }, [analysisId]);

  async function runAiImpact() {
    setBusy(true);
    setError('');
    setProgressMessage('Processing sequential AI batches. This may take a few minutes.');
    try {
      await api.post(`/analyses/${analysisId}/ai-impact`);
      await load();
      setProgressMessage('AI impact analysis completed.');
    } catch (requestError) {
      setError(getApiError(requestError, 'AI impact analysis failed.'));
      setProgressMessage('');
    } finally {
      setBusy(false);
    }
  }

  if (error && !analysis) return <div className="page-shell"><ErrorMessage message={error} onRetry={load} /></div>;
  if (!analysis) return <div className="page-shell"><Loader label="Loading analysis…" /></div>;
  const aiComplete = analysis.aiAssessments.length === analysis.changes.length;
  return <div className="page-shell"><header className="page-header"><div><p className="eyebrow">{analysis.deal.name}</p><h1 className="page-title">Analysis results</h1><p className="page-description">Status: {analysis.status} · Analysis ID: {analysis.id}</p></div></header>{error && <ErrorMessage message={error} onRetry={() => setError('')} />}{progressMessage && <div className="card panel"><p>{progressMessage}</p></div>}<section className="card panel"><div className="section-title"><h2>Documents</h2></div><div className="document-list">{analysis.deal.documents.map((document) => <div className="document-row" key={document.id}><FileText size={18} /><div><strong>{document.originalName}</strong><span>{document.type} · {Math.ceil(document.sizeBytes / 1024)} KB</span></div></div>)}</div></section><section className="card panel"><div className="section-title"><div><h2>Detected changes</h2><p>{analysis.changes.length} changes found.</p></div><button className="button secondary" onClick={runAiImpact} disabled={busy || !analysis.changes.length}><Sparkles size={16} />{busy ? 'Assessing…' : analysis.aiAssessments.length ? 'Refresh AI impact' : 'Run AI impact'}</button></div>{analysis.changes.length ? analysis.changes.map((change) => { const assessment = analysis.aiAssessments.find((item) => item.changeId === change.id); return <article className="change-card" key={change.id}><div className="change-heading"><strong>{change.field || change.category}</strong><span className={`severity ${String(change.severity).toLowerCase()}`}>{change.severity}</span></div><p>{change.explanation}</p><div className="change-values"><div><small>Old value</small><span>{change.oldValue || '—'}</span></div><div><small>New value</small><span>{change.newValue || '—'}</span></div></div>{assessment && <div className="assessment"><strong>{assessment.impact}</strong><span>{assessment.explanation}</span><small>Action: {assessment.suggestedAction}</small></div>}</article>; }) : <div className="empty-state compact">No changes were detected.</div>}</section><div className="result-actions"><button className="button primary" onClick={() => navigate(`/report?analysisId=${encodeURIComponent(analysis.id)}`)} disabled={!aiComplete}><FileText size={16} /> {aiComplete ? 'Generate Report' : 'Run AI impact before report'}</button>{aiComplete && <button className="button secondary" onClick={() => navigate(`/communication?analysisId=${encodeURIComponent(analysis.id)}`)}><MessageSquareText size={16} /> Continue to Communication</button>}</div></div>;
}
