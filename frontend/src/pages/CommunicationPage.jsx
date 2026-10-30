import { Mail, Save, Trash2, WandSparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import ErrorMessage from '../components/common/ErrorMessage';
import Loader from '../components/common/Loader';

const types = [['CLIENT_NOTIFICATION', 'Client notification'], ['INTERNAL_LEGAL_REVIEW', 'Internal legal review'], ['HIGH_SEVERITY_ESCALATION', 'High-severity escalation'], ['CONTRACT_CLARIFICATION_REQUEST', 'Contract clarification request'], ['NEGOTIATION_MESSAGE', 'Negotiation message']];

export default function CommunicationPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [analysisId, setAnalysisId] = useState(searchParams.get('analysisId') || location.state?.analysisId || '');
  const [type, setType] = useState(types[0][0]);
  const [channel, setChannel] = useState('EMAIL');
  const [instructions, setInstructions] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [selected, setSelected] = useState(null);
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
    api.get(`/analyses/${analysisId}/communications`)
      .then(({ data }) => setDrafts(data.data || []))
      .catch((requestError) => setError(getApiError(requestError, 'Drafts unavailable.')))
      .finally(() => setLoading(false));
  }, [analysisId]);

  async function generate(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await api.post(`/analyses/${analysisId}/communications`, { communicationType: type, channel, instructions });
      setDrafts((current) => [response.data.data, ...current]);
      setSelected(response.data.data);
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to generate communication.'));
    } finally {
      setBusy(false);
    }
  }

  async function selectDraft(draft) {
    try {
      const response = await api.get(`/communications/${draft.id}`);
      setSelected(response.data.data);
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to load draft details.'));
    }
  }

  async function save() {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await api.patch(`/communications/${selected.id}`, { subject: selected.subject, content: selected.content });
      setSelected(response.data.data);
      setDrafts((current) => current.map((item) => item.id === response.data.data.id ? response.data.data : item));
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to save draft.'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(draft) {
    try {
      await api.delete(`/communications/${draft.id}`);
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
      if (selected?.id === draft.id) setSelected(null);
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to delete draft.'));
    }
  }

  return <div className="page-shell"><header className="page-header"><div><p className="eyebrow">Stakeholder messaging</p><h1 className="page-title">Communication drafts</h1><p className="page-description">Generate context-aware messages from a saved analysis and refine them before sending.</p></div></header>
    {error && <ErrorMessage message={error} onRetry={() => setError('')} />}
    <div className="content-grid"><section className="card panel"><div className="section-title"><h2><WandSparkles size={18} /> Generate draft</h2></div><form className="form-grid" onSubmit={generate}><label>Analysis ID<input value={analysisId} onChange={(event) => changeAnalysisId(event.target.value)} placeholder="Completed analysis ID" required /></label><label>Communication type<select value={type} onChange={(event) => setType(event.target.value)}>{types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Channel<select value={channel} onChange={(event) => setChannel(event.target.value)}><option value="EMAIL">Email</option><option value="INTERNAL_NOTE">Internal note</option><option value="MESSAGE">Message</option></select></label><label>Additional instructions<textarea rows="5" value={instructions} onChange={(event) => setInstructions(event.target.value)} maxLength="2000" /></label><button className="button primary" disabled={busy || !analysisId}>{busy ? 'Generating…' : 'Generate draft'}</button></form></section>
      <section className="card panel"><div className="section-title"><h2><Mail size={18} /> Draft editor</h2></div>{selected ? <div className="form-grid"><label>Subject<input value={selected.subject || ''} onChange={(event) => setSelected({ ...selected, subject: event.target.value })} /></label><label>Content<textarea rows="14" value={selected.content} onChange={(event) => setSelected({ ...selected, content: event.target.value })} /></label><div className="editor-actions"><button className="button primary" onClick={save} disabled={busy}><Save size={16} /> Save draft</button><button className="button secondary" onClick={() => remove(selected)}><Trash2 size={16} /> Delete</button></div></div> : <div className="empty-state compact">Generate or select a draft to edit it.</div>}{loading ? <Loader label="Loading drafts…" /> : drafts.length > 0 && <div className="draft-list">{drafts.map((draft) => <div className="draft-row" key={draft.id}><button onClick={() => selectDraft(draft)}><strong>{draft.subject || 'Untitled draft'}</strong><span>{draft.channel}</span></button><button className="icon-button danger-text" onClick={() => remove(draft)} aria-label="Delete draft"><Trash2 size={16} /></button></div>)}</div>}</section>
    </div>
  </div>;
}
