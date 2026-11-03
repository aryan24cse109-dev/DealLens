import { BriefcaseBusiness, FileDiff, FileText, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import ErrorMessage from '../components/common/ErrorMessage';
import Loader from '../components/common/Loader';

const STATUS_FILTERS = [
  ['ALL', 'All status'],
  ['ANALYZED', 'Completed'],
  ['PROCESSING', 'In progress'],
  ['DRAFT', 'Pending'],
  ['FAILED', 'Failed'],
];

export default function DealsPage() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/deals', { params: { limit: 100 } }).then(({ data }) => setDeals(data.items || [])).catch((e) => setError(getApiError(e, 'Deals unavailable.'))).finally(() => setLoading(false)); }, []);
  const visible = useMemo(() => deals.filter((deal) => deal.name.toLowerCase().includes(query.toLowerCase()) && (status === 'ALL' || String(deal.status || '').toUpperCase() === status)), [deals, query, status]);
  if (loading) return <div className="page-shell"><Loader label="Loading your deals…" /></div>;
  return <div className="page-shell"><header className="page-header"><div><p className="eyebrow">Manage your deals</p><h1 className="page-title">Deals</h1><p className="page-description">Review every contract workspace and its current workflow status.</p></div><Link className="button primary" to="/upload"><Plus size={17} /> Create deal</Link></header>{error && <ErrorMessage message={error} onRetry={() => window.location.reload()} />}<section className="card table-card"><div className="table-toolbar"><div className="search-field"><Search size={17} /><input aria-label="Search by deal name" placeholder="Search by deal name" value={query} onChange={(e) => setQuery(e.target.value)} /></div><select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">{STATUS_FILTERS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><span className="muted">{visible.length} result{visible.length === 1 ? '' : 's'}</span></div>{visible.length ? <div className="responsive-table"><table><thead><tr><th>Deal name</th><th>Documents</th><th>Last updated</th><th>Workflow status</th><th aria-label="Actions" /></tr></thead><tbody>{visible.map((deal) => <tr key={deal.id}><td><div className="table-primary"><span className="deal-icon small"><BriefcaseBusiness size={16} /></span><strong>{deal.name}</strong></div></td><td><span className="inline-meta"><FileText size={14} /> {deal._count?.documents ?? '—'}</span></td><td>{deal.updatedAt ? new Date(deal.updatedAt).toLocaleDateString() : '—'}</td><td><span className={`status-badge ${String(deal.status || '').toLowerCase()}`}>{deal.status || 'Active'}</span></td><td><div className="table-actions"><button className="icon-button" title="Open comparison" onClick={() => navigate(`/comparison?dealId=${encodeURIComponent(deal.id)}`)}><FileDiff size={16} /></button></div></td></tr>)}</tbody></table></div> : <div className="empty-state compact"><BriefcaseBusiness size={25} /><strong>{query || status !== 'ALL' ? 'No deals match these filters.' : 'No deals yet.'}</strong><span>Create your first deal to begin reviewing contract changes.</span></div>}</section></div>;
}
