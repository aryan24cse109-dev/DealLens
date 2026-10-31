import { BriefcaseBusiness, FileText, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import ErrorMessage from '../components/common/ErrorMessage';
import Loader from '../components/common/Loader';

export default function DealsPage() {
  const [deals, setDeals] = useState([]); const [query, setQuery] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/deals', { params: { limit: 100 } }).then(({ data }) => setDeals(data.items || [])).catch((e) => setError(getApiError(e, 'Deals unavailable.'))).finally(() => setLoading(false)); }, []);
  const visible = deals.filter((deal) => deal.name.toLowerCase().includes(query.toLowerCase()));
  if (loading) return <div className="page-shell"><Loader label="Loading your deals…" /></div>;
  return <div className="page-shell"><header className="page-header"><div><p className="eyebrow">Portfolio</p><h1 className="page-title">Your deals</h1><p className="page-description">A focused view of every contract workspace you own.</p></div><Link className="button primary" to="/upload"><Plus size={17} /> Create deal</Link></header>{error && <ErrorMessage message={error} onRetry={() => window.location.reload()} />}<div className="toolbar"><div className="search-field"><Search size={17} /><input placeholder="Search deals" value={query} onChange={(e) => setQuery(e.target.value)} /></div><span className="muted">{visible.length} deal{visible.length === 1 ? '' : 's'}</span></div><section className="deal-grid">{visible.map((deal) => <article className="deal-card card" key={deal.id}><div className="deal-card-top"><div className="deal-icon"><BriefcaseBusiness size={19} /></div><span className="status-badge">{deal.status || 'Active'}</span></div><h2>{deal.name}</h2><p>{deal.description || 'Contract workspace ready for review.'}</p><div className="deal-meta"><span><FileText size={15} /> {deal._count?.documents ?? '—'} documents</span><span>{deal.updatedAt ? new Date(deal.updatedAt).toLocaleDateString() : '—'}</span></div></article>)}{!visible.length && <div className="card empty-state">No deals match your search.</div>}</section></div>;
}
