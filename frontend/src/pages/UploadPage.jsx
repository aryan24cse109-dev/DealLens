import { Edit3, FileText, Plus, Trash2, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';
import api, { getApiError } from '../services/api';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import Modal from '../components/common/Modal';

export default function UploadPage() {
  const [deals, setDeals] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fileType, setFileType] = useState('ORIGINAL');
  const [file, setFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadDeals() {
    try {
      const result = await api.get('/deals', { params: { limit: 50 } });
      const items = result.data.items || [];
      setDeals(items);
      if (!selectedId && items[0]) setSelectedId(items[0].id);
    } catch (requestError) {
      setError(getApiError(requestError, 'Deals unavailable.'));
    } finally {
      setLoading(false);
    }
  }

  async function loadDeal(id = selectedId) {
    if (!id) {
      setSelectedDeal(null);
      setDocuments([]);
      return;
    }
    try {
      const result = await api.get(`/deals/${id}`);
      setSelectedDeal(result.data.data);
      setDocuments(result.data.data.documents || []);
    } catch (requestError) {
      setError(getApiError(requestError, 'Deal details unavailable.'));
    }
  }

  useEffect(() => { loadDeals(); }, []);
  useEffect(() => { loadDeal(); }, [selectedId]);

  async function createDeal(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api.post('/deals', { name, description: description || undefined });
      setDeals((current) => [result.data.data, ...current]);
      setSelectedId(result.data.data.id);
      setName('');
      setDescription('');
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to create deal.'));
    } finally {
      setBusy(false);
    }
  }

  async function updateDeal(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await api.patch(`/deals/${selectedId}`, {
        name: selectedDeal.name,
        description: selectedDeal.description,
        status: selectedDeal.status,
      });
      setSelectedDeal(response.data.data);
      setDeals((current) => current.map((deal) => deal.id === selectedId ? response.data.data : deal));
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to update deal.'));
    } finally {
      setBusy(false);
    }
  }

  async function removeDeal() {
    try {
      await api.delete(`/deals/${confirm.id}`);
      setDeals((current) => current.filter((deal) => deal.id !== confirm.id));
      setConfirm(null);
      setSelectedId('');
      setSelectedDeal(null);
      setDocuments([]);
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to delete deal.'));
      setConfirm(null);
    }
  }

  async function upload(event) {
    event.preventDefault();
    if (!selectedId || !file) return setError('Select a deal and PDF file first.');
    if (file.type !== 'application/pdf' || file.size > 15 * 1024 * 1024) return setError('Only PDF files up to 15 MB are supported.');
    const body = new FormData();
    body.append('file', file);
    body.append('type', fileType);
    setBusy(true);
    setError('');
    try {
      await api.post(`/deals/${selectedId}/documents`, body);
      setFile(null);
      event.target.reset();
      await loadDeal();
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to upload PDF.'));
    } finally {
      setBusy(false);
    }
  }

  async function removeDocument() {
    try {
      await api.delete(`/documents/${confirm.id}`);
      setConfirm(null);
      await loadDeal();
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to delete document.'));
    }
  }

  if (loading) return <div className="page-shell"><Loader label="Loading your deals…" /></div>;
  return <div className="page-shell"><header className="page-header"><div><p className="eyebrow">Deal workspace</p><h1 className="page-title">Deals and documents</h1><p className="page-description">Create, update, and prepare your owned deal documents for comparison.</p></div></header>
    {error && <ErrorMessage message={error} onRetry={() => { setError(''); loadDeals(); loadDeal(); }} />}
    <div className="content-grid"><section className="card panel"><div className="section-title"><h2><Plus size={18} /> New deal</h2></div><form className="form-grid" onSubmit={createDeal}><label>Deal name<input value={name} onChange={(event) => setName(event.target.value)} minLength="2" maxLength="200" required /></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength="2000" rows="4" /></label><button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Create deal'}</button></form></section>
      <section className="card panel"><div className="section-title"><h2><Edit3 size={18} /> Manage deal</h2>{selectedDeal && <button className="icon-button danger-text" onClick={() => setConfirm({ id: selectedDeal.id, type: 'deal' })}><Trash2 size={16} /></button>}</div>{selectedDeal ? <form className="form-grid" onSubmit={updateDeal}><label>Deal<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{deals.map((deal) => <option key={deal.id} value={deal.id}>{deal.name}</option>)}</select></label><label>Name<input value={selectedDeal.name} onChange={(event) => setSelectedDeal({ ...selectedDeal, name: event.target.value })} required /></label><label>Description<textarea value={selectedDeal.description || ''} onChange={(event) => setSelectedDeal({ ...selectedDeal, description: event.target.value })} rows="3" /></label><label>Status<select value={selectedDeal.status} onChange={(event) => setSelectedDeal({ ...selectedDeal, status: event.target.value })}><option value="DRAFT">Draft</option><option value="PROCESSING">Processing</option><option value="ANALYZED">Analyzed</option><option value="FAILED">Failed</option></select></label><button className="button secondary" disabled={busy}>Save changes</button></form> : <div className="empty-state compact">Create or select a deal to manage it.</div>}</section>
      <section className="card panel"><div className="section-title"><h2><UploadCloud size={18} /> Upload documents</h2></div><form className="form-grid" onSubmit={upload}><label>Document type<select value={fileType} onChange={(event) => setFileType(event.target.value)}><option value="ORIGINAL">Original</option><option value="REVISED">Revised</option><option value="SUPPORTING">Supporting</option></select></label><label className="file-input">PDF file<input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} required /></label><button className="button primary" disabled={busy || !selectedId}>{busy ? 'Uploading…' : 'Upload PDF'}</button></form><div className="document-list">{documents.map((document) => <div className="document-row" key={document.id}><FileText size={18} /><div><strong>{document.originalName}</strong><span>{document.type} · {Math.round(document.sizeBytes / 1024)} KB</span></div><button className="icon-button danger-text" onClick={() => setConfirm({ ...document, type: 'document' })}><Trash2 size={16} /></button></div>)}{selectedId && !documents.length && <div className="empty-state compact">No documents uploaded for this deal.</div>}</div></section>
    </div>
    {confirm && <Modal title={`Delete ${confirm.type}?`} onClose={() => setConfirm(null)} onConfirm={confirm.type === 'deal' ? removeDeal : removeDocument} confirmLabel="Delete"><p>This cannot be undone.</p></Modal>}
  </div>;
}
