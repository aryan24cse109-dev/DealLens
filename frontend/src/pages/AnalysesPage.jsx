import { FileDiff, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import ErrorMessage from '../components/common/ErrorMessage';
import Loader from '../components/common/Loader';

export default function AnalysesPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analyses', { params: { limit: 100, search } })
      .then(({ data }) => setItems(data.data.items || []))
      .catch((requestError) => setError(getApiError(requestError, 'Analyses unavailable.')))
      .finally(() => setLoading(false));
  }, [search]);

  if (loading) return <div className="page-shell"><Loader label="Loading analyses…" /></div>;
  return <div className="page-shell">
    <header className="page-header"><div><p className="eyebrow">Contract intelligence</p><h1 className="page-title">AI analyses</h1><p className="page-description">Review every comparison and its persisted impact assessment.</p></div></header>
    {error && <ErrorMessage message={error} onRetry={() => window.location.reload()} />}
    <div className="toolbar"><div className="search-field"><Search size={17} /><input placeholder="Search by deal" value={search} onChange={(event) => setSearch(event.target.value)} /></div><span className="muted">{items.length} analyses</span></div>
    <section className="card panel">{items.length ? <div className="list">{items.map((item) => <Link className="list-row analysis-row" to={`/analyse/${encodeURIComponent(item.id)}`} key={item.id}><div className="deal-icon"><FileDiff size={18} /></div><div className="list-main"><strong>{item.deal.name}</strong><span>{item.status} · {item._count.changes} changes · {item._count.aiAssessments} assessments</span></div><span className="status-badge">{new Date(item.createdAt).toLocaleDateString()}</span></Link>)}</div> : <div className="empty-state compact">No analyses match your search.</div>}</section>
  </div>;
}
