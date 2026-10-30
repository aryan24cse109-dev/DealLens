import { Clipboard, Mail, Save, Trash2, WandSparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import ErrorMessage from '../components/common/ErrorMessage';
import Loader from '../components/common/Loader';

export default function CommunicationPage() {
  const [searchParams] = useSearchParams();
  const analysisId = searchParams.get('analysisId') || '';
  const [analysis, setAnalysis] = useState(null);
  const [instructions, setInstructions] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');

  async function load() {
    if (!analysisId) return;
    setLoading(true);
    setError('');
    try {
      const [analysisResponse, draftsResponse] = await Promise.all([
        api.get(`/analyses/${analysisId}`),
        api.get(`/analyses/${analysisId}/communications`),
      ]);
      const loadedDrafts = draftsResponse.data.data || [];
      setAnalysis(analysisResponse.data.data);
      setDrafts(loadedDrafts);
      setSelected((current) => current || loadedDrafts[0] || null);
    } catch (requestError) {
      setError(getApiError(requestError, 'Communication context unavailable.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [analysisId]);

  async function generate(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setCopied(false);
    setProgressMessage('Generating the client clarification email from the saved findings…');
    try {
      const response = await api.post(`/analyses/${analysisId}/communications`, {
        additionalInstructions: instructions,
      });
      setDrafts((current) => [response.data.data, ...current]);
      setSelected(response.data.data);
      setProgressMessage('Client clarification email generated.');
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to generate the clarification email.'));
      setProgressMessage('');
    } finally {
      setBusy(false);
    }
  }

  async function selectDraft(draft) {
    try {
      const response = await api.get(`/communications/${draft.id}`);
      setSelected(response.data.data);
      setError('');
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to load the saved draft.'));
    }
  }

  async function save() {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await api.patch(`/communications/${selected.id}`, {
        subject: selected.subject,
        content: selected.content,
      });
      setSelected(response.data.data);
      setDrafts((current) => current.map((item) => (
        item.id === selected.id ? response.data.data : item
      )));
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to save draft.'));
    } finally {
      setBusy(false);
    }
  }

  async function copyEmail() {
    if (!selected) return;
    await navigator.clipboard.writeText(
      `${selected.subject || ''}\n\n${selected.content}`,
    );
    setCopied(true);
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

  if (!analysisId) {
    return <div className="page-shell"><div className="card empty-state">
      No analysis selected. Generate an analysis report first.
    </div></div>;
  }
  if (loading && !analysis) {
    return <div className="page-shell"><Loader label="Loading communication context…" /></div>;
  }

  return <div className="page-shell">
    <header className="page-header">
      <div>
        <p className="eyebrow">{analysis?.deal.name || 'Analysis'}</p>
        <h1 className="page-title">Client Clarification Email</h1>
        <p className="page-description">
          Generate a professional email requesting your client to clarify the
          findings and provide a finalized document based on your analysis report.
        </p>
      </div>
    </header>
    {error && <ErrorMessage message={error} onRetry={load} />}
    {progressMessage && <div className="card panel"><p>{progressMessage}</p></div>}
    <div className="content-grid">
      <section className="card panel">
        <div className="section-title">
          <h2><WandSparkles size={18} /> Generate Email</h2>
        </div>
        <p className="muted">
          {analysis?.changes?.length || 0} findings and persisted impact
          assessments will be used from this owned analysis.
        </p>
        <form className="form-grid" onSubmit={generate}>
          <label>
            Optional additional instructions
            <textarea
              rows="6"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              maxLength="2000"
              placeholder="Add context or a preferred tone, if needed."
            />
          </label>
          <button className="button primary" disabled={busy || !analysis}>
            {busy ? 'Generating…' : 'Generate Email'}
          </button>
        </form>
      </section>
      <section className="card panel">
        <div className="section-title">
          <h2><Mail size={18} /> Draft editor</h2>
        </div>
        {selected ? <div className="form-grid">
          <label>
            Email subject
            <input
              value={selected.subject || ''}
              onChange={(event) => setSelected({ ...selected, subject: event.target.value })}
            />
          </label>
          <label>
            Email body
            <textarea
              rows="16"
              value={selected.content}
              onChange={(event) => setSelected({ ...selected, content: event.target.value })}
            />
          </label>
          <div className="editor-actions">
            <button className="button primary" type="button" onClick={generate} disabled={busy}>
              <WandSparkles size={16} /> Regenerate Email
            </button>
            <button className="button secondary" type="button" onClick={save} disabled={busy}>
              <Save size={16} /> Save Draft
            </button>
            <button className="button secondary" type="button" onClick={copyEmail}>
              <Clipboard size={16} /> {copied ? 'Copied' : 'Copy Email'}
            </button>
          </div>
        </div> : <div className="empty-state compact">
          Generate an email or select a saved draft to edit it.
        </div>}
        {drafts.length > 0 && <div className="draft-list">
          {drafts.map((draft) => <div className="draft-row" key={draft.id}>
            <button type="button" onClick={() => selectDraft(draft)}>
              <strong>{draft.subject || 'Untitled email'}</strong>
              <span>Client clarification email</span>
            </button>
            <button className="icon-button danger-text" type="button" onClick={() => remove(draft)}>
              <Trash2 size={16} />
            </button>
          </div>)}
        </div>}
      </section>
    </div>
  </div>;
}
