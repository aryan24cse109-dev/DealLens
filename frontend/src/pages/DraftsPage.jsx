import { Mail, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import ErrorMessage from '../components/common/ErrorMessage';
import Loader from '../components/common/Loader';

export default function DraftsPage() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/communications', { params: { limit: 100, search } });
      setItems(data.data.items || []);
    } catch (requestError) {
      setError(getApiError(requestError, 'Saved drafts unavailable.'));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [search]);
  async function remove(item) {
    try {
      await api.delete(`/communications/${item.id}`);
      setItems((current) => current.filter((draft) => draft.id !== item.id));
      if (selected?.id === item.id) setSelected(null);
    } catch (requestError) { setError(getApiError(requestError, 'Unable to delete draft.')); }
  }
  if (loading) return <div className="page-shell"><Loader label="Loading saved drafts…" /></div>;
  return <div className="page-shell">
    <header className="page-header"><div><p className="eyebrow">Communication workspace</p><h1 className="page-title">Saved drafts</h1><p className="page-description">Open, edit, and reuse generated client communications.</p></div></header>
    {error && <ErrorMessage message={error} onRetry={load} />}
    <div className="toolbar"><div className="search-field"><Search size={17} /><input placeholder="Search by deal" value={search} onChange={(event) => setSearch(event.target.value)} /></div><span className="muted">{items.length} drafts</span></div>
    <section className="card panel">{items.length ? <div className="list">{items.map((item) => <div className="list-row" key={item.id}><Mail size={18} /><div className="list-main"><strong>{item.subject || 'Untitled draft'}</strong><span>{item.analysis.deal.name} · Updated {new Date(item.updatedAt).toLocaleDateString()}</span></div><button className="button secondary" onClick={() => setSelected(item)}>Open</button><button className="icon-button danger-text" onClick={() => remove(item)} title="Delete draft"><Trash2 size={16} /></button></div>)}</div> : <div className="empty-state compact">No saved drafts yet.</div>}</section>
    {selected && <section className="card panel detail-panel"><div className="section-title"><div><h2>{selected.subject || 'Untitled draft'}</h2><p>{selected.analysis.deal.name}</p></div><Link className="button primary" to={`/communication?analysisId=${encodeURIComponent(selected.analysis.id)}&draftId=${encodeURIComponent(selected.id)}`}>Edit draft</Link></div><pre className="draft-preview">{selected.content}</pre></section>}
  </div>;
}
