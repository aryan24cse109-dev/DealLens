import { ArrowRight, FileDiff, FileText, MessageSquareText, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';

export default function ComparisonPage() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [dealId, setDealId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [originalDocumentId, setOriginalDocumentId] = useState('');
  const [revisedDocumentId, setRevisedDocumentId] = useState('');
  const [result, setResult] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');

  useEffect(() => {
    api.get('/deals', { params: { limit: 100 } })
      .then(({ data }) => {
        const items = data.items || [];
        setDeals(items);
        if (items[0]) setDealId(items[0].id);
      })
      .catch((requestError) => setError(getApiError(requestError, 'Deals unavailable.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!dealId) return;
    setDocuments([]);
    api.get(`/deals/${dealId}/documents`)
      .then(({ data }) => {
        const items = data.data || [];
        setDocuments(items);
        setOriginalDocumentId(items.find((item) => item.type === 'ORIGINAL')?.id || '');
        setRevisedDocumentId(items.find((item) => item.type === 'REVISED')?.id || '');
      })
      .catch((requestError) => setError(getApiError(requestError, 'Documents unavailable.')));
  }, [dealId]);

  async function compare(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setProgressMessage('Processing sequential AI batches. This may take a few minutes.');
    setAssessments([]);
    try {
      const response = await api.post('/comparisons/compare', {
        originalDocumentId,
        revisedDocumentId,
      });
      setResult(response.data.data);
    } catch (requestError) {
      setError(getApiError(requestError, 'Comparison failed.'));
    } finally {
      setBusy(false);
    }
  }

  async function runAiImpact() {
    if (!result?.analysisId) return;
    setBusy(true);
    setError('');
    try {
      const response = await api.post(`/analyses/${result.analysisId}/ai-impact`);
      setAssessments(response.data.data.assessments || []);
      setProgressMessage('AI impact analysis completed.');
    } catch (requestError) {
      setError(getApiError(requestError, 'AI impact analysis failed.'));
      setProgressMessage('');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="page-shell"><Loader label="Loading your deals…" /></div>;
  return <div className="page-shell">
    <header className="page-header">
      <div><p className="eyebrow">Document analysis</p><h1 className="page-title">Compare documents</h1><p className="page-description">Select two owned PDFs to detect and classify contract changes.</p></div>
    </header>
    {error && <ErrorMessage message={error} onRetry={() => setError('')} />}
    {progressMessage && <div className="card panel"><p>{progressMessage}</p></div>}
    {!deals.length && <div className="card empty-state">Create a deal and upload an original and revised PDF before comparing documents.</div>}
    {!!deals.length && <section className="card panel">
      <div className="section-title"><h2><FileDiff size={18} /> Comparison setup</h2></div>
      <form className="form-grid comparison-form" onSubmit={compare}>
        <label>Deal<select value={dealId} onChange={(event) => setDealId(event.target.value)} required><option value="">Select a deal</option>{deals.map((deal) => <option key={deal.id} value={deal.id}>{deal.name}</option>)}</select></label>
        <div className="select-pair">
          <label>Original document<select value={originalDocumentId} onChange={(event) => setOriginalDocumentId(event.target.value)} required><option value="">Select original</option>{documents.filter((item) => item.type === 'ORIGINAL').map((item) => <option key={item.id} value={item.id}>{item.originalName}</option>)}</select></label>
          <ArrowRight className="pair-arrow" />
          <label>Revised document<select value={revisedDocumentId} onChange={(event) => setRevisedDocumentId(event.target.value)} required><option value="">Select revised</option>{documents.filter((item) => item.type === 'REVISED').map((item) => <option key={item.id} value={item.id}>{item.originalName}</option>)}</select></label>
        </div>
        <button className="button primary" disabled={busy || !originalDocumentId || !revisedDocumentId}>{busy ? 'Working…' : 'Run comparison'}</button>
      </form>
    </section>}
    {result && <Result result={result} assessments={assessments} busy={busy} onRunAiImpact={runAiImpact} onReport={() => navigate(`/report?analysisId=${encodeURIComponent(result.analysisId)}`)} onCommunication={() => navigate(`/communication?analysisId=${encodeURIComponent(result.analysisId)}`)} />}
  </div>;
}

function Result({ result, assessments, busy, onRunAiImpact, onReport, onCommunication }) {
  const changes = result.changes || [];
  return <section className="card panel result-panel">
    <div className="section-title"><div><h2>Comparison complete</h2><p>{changes.length} change{changes.length === 1 ? '' : 's'} detected · Analysis ID: {result.analysisId}</p></div><button className="button secondary" onClick={onRunAiImpact} disabled={busy || !changes.length}><Sparkles size={16} />{assessments.length ? 'Re-run AI impact' : 'Run AI impact'}</button></div>
    {changes.length ? <div className="change-list">{changes.map((change, index) => {
      const assessment = assessments.find((item) => item.changeId === change.id);
      return <article className="change-card" key={change.id || index}><div className="change-heading"><strong>{change.category || change.type || `Change ${index + 1}`}</strong><span className={`severity ${String(change.severity || '').toLowerCase()}`}>{change.severity || 'UNCLASSIFIED'}</span></div><p>{change.explanation || 'No explanation provided.'}</p><div className="change-values"><div><small>Old value</small><span>{change.originalText ?? '—'}</span></div><div><small>New value</small><span>{change.revisedText ?? '—'}</span></div></div>{assessment && <div className="assessment"><strong>AI impact: {assessment.impact}</strong><span>{assessment.explanation}</span><small>Suggested action: {assessment.suggestedAction} · Confidence: {assessment.confidence}</small></div>}</article>;
    })}</div> : <div className="empty-state compact">No changes were detected.</div>}
    {assessments.length > 0 && <div className="result-actions"><button className="button primary" onClick={onReport}><FileText size={16} /> Generate report</button><button className="button secondary" onClick={onCommunication}><MessageSquareText size={16} /> Draft communication</button></div>}
  </section>;
}
