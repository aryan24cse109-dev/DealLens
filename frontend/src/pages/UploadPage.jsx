import { FileText, Plus, Trash2, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';

const categories = [
  ['ORIGINAL', 'Original Documents', true],
  ['REVISED', 'Revised Documents', true],
  ['SUPPORTING', 'Supporting Documents', false],
];
const MAX_FILE_SIZE = 15 * 1024 * 1024;

export default function UploadPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState({ ORIGINAL: [], REVISED: [], SUPPORTING: [] });
  const [deals, setDeals] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/deals', { params: { limit: 50 } })
      .then(({ data }) => setDeals(data.items || []))
      .catch((requestError) => setError(getApiError(requestError, 'Deals unavailable.')))
      .finally(() => setLoading(false));
  }, []);

  function addFiles(type, selectedFiles) {
    const valid = [];
    for (const file of Array.from(selectedFiles)) {
      if (file.type !== 'application/pdf' || file.size > MAX_FILE_SIZE) {
        setError(`${file.name} must be a PDF no larger than 15 MB.`);
        continue;
      }
      valid.push(file);
    }
    if (valid.length) setFiles((current) => ({ ...current, [type]: [...current[type], ...valid] }));
  }

  function removeFile(type, index) {
    setFiles((current) => ({ ...current, [type]: current[type].filter((_, itemIndex) => itemIndex !== index) }));
  }

  async function uploadFiles(dealId) {
    for (const [type, selectedFiles] of Object.entries(files)) {
      for (const file of selectedFiles) {
        const body = new FormData();
        body.append('file', file);
        body.append('type', type);
        await api.post(`/deals/${dealId}/documents`, body);
      }
    }
  }

  async function startAnalysis(event) {
    event.preventDefault();
    if (!name.trim() || name.trim().length < 2) return setError('Enter a deal name with at least 2 characters.');
    if (!files.ORIGINAL.length || !files.REVISED.length) return setError('Add at least one original and one revised PDF.');
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/deals', { name: name.trim(), description: description.trim() || undefined });
      await uploadFiles(data.data.id);
      const uploaded = (await api.get(`/deals/${data.data.id}/documents`)).data.data || [];
      const original = uploaded.find((document) => document.type === 'ORIGINAL');
      const revised = uploaded.find((document) => document.type === 'REVISED');
      const comparison = await api.post('/comparisons/compare', {
        originalDocumentId: original.id,
        revisedDocumentId: revised.id,
      });
      navigate(`/analyse/${encodeURIComponent(comparison.data.data.analysisId)}`);
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to create and analyse the deal. The deal may have been created; review it before retrying.'));
    } finally {
      setBusy(false);
    }
  }

  async function deleteDeal() {
    if (!selectedId) return;
    try {
      await api.delete(`/deals/${selectedId}`);
      setDeals((current) => current.filter((deal) => deal.id !== selectedId));
      setSelectedId('');
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to delete deal.'));
    }
  }

  if (loading) return <div className="page-shell"><Loader label="Loading your deals…" /></div>;
  return <div className="page-shell">
    <header className="page-header"><div><p className="eyebrow">Deal workspace</p><h1 className="page-title">Create a deal</h1><p className="page-description">Upload the contract versions, then start a complete analysis.</p></div></header>
    {error && <ErrorMessage message={error} onRetry={() => setError('')} />}
    <form className="workflow-form" onSubmit={startAnalysis}>
      <section className="card panel"><div className="section-title"><h2><Plus size={18} /> Deal details</h2></div><div className="form-grid"><label>Deal name<input value={name} onChange={(event) => setName(event.target.value)} minLength="2" maxLength="200" required /></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength="2000" rows="3" /></label></div></section>
      {categories.map(([type, label, required]) => <section className="card panel upload-section" key={type}><div className="section-title"><h2><UploadCloud size={18} /> {label}</h2><span className="status-badge">{required ? 'Required' : 'Optional'}</span></div><label className="dropzone">Choose PDF files<input type="file" accept="application/pdf,.pdf" multiple onChange={(event) => { addFiles(type, event.target.files); event.target.value = ''; }} /><span>PDF only · maximum 15 MB per file</span></label>{files[type].map((file, index) => <div className="selected-file" key={`${file.name}-${file.lastModified}`}><FileText size={17} /><span><strong>{file.name}</strong><small>{Math.ceil(file.size / 1024)} KB</small></span><button type="button" className="icon-button danger-text" onClick={() => removeFile(type, index)}><Trash2 size={16} /></button></div>)}</section>)}
      <button className="button primary workflow-submit" disabled={busy}>{busy ? 'Creating deal, uploading, and analysing…' : 'Start Analysing'}</button>
    </form>
    <section className="card panel"><div className="section-title"><h2>Existing deals</h2><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">Select a deal</option>{deals.map((deal) => <option key={deal.id} value={deal.id}>{deal.name}</option>)}</select></div>{selectedId && <div className="result-actions"><button className="button secondary" onClick={() => deleteDeal()}><Trash2 size={16} /> Delete selected deal</button></div>}{!deals.length && <div className="empty-state compact">No owned deals yet.</div>}</section>
  </div>;
}
