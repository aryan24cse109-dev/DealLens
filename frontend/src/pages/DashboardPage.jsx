import { Activity, AlertTriangle, CheckCircle2, FileText, Plus, BriefcaseBusiness } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import api, { getApiError } from '../services/api';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';

function formatDate(value) { return value ? new Date(value).toLocaleDateString() : '—'; }
export default function DashboardPage() {
  const [data, setData] = useState(null); const [error, setError] = useState('');
  const load = useCallback(async () => { try { setError(''); setData((await api.get('/dashboard')).data.data); } catch (requestError) { setError(getApiError(requestError, 'Dashboard unavailable.')); } }, []);
  useEffect(() => { load(); }, [load]);
  if (error) return <div className="page-shell"><ErrorMessage message={error} onRetry={load} /></div>;
  if (!data) return <div className="page-shell"><Loader label="Loading dashboard…" /></div>;
  const metrics = data.metrics;
  return <div className="page-shell"><header className="page-header"><div><p className="eyebrow">Workspace overview</p><h1 className="page-title">Understand changes. Control risk.</h1><p className="page-description">A clear view of your contracts, findings, and next steps.</p></div><Link className="button primary" to="/upload"><Plus size={17} /> New deal</Link></header><section className="metric-grid"><Metric icon={BriefcaseBusiness} label="Total deals" value={metrics.totalDeals} /><Metric icon={FileText} label="Uploaded documents" value={metrics.totalDocuments} /><Metric icon={Activity} label="Total analyses" value={metrics.totalAnalyses} /><Metric icon={AlertTriangle} label="High / critical changes" value={`${metrics.highSeverityChanges} / ${metrics.criticalSeverityChanges}`} tone="warning" /></section><div className="dashboard-grid"><section className="card panel"><div className="section-title"><div><h2>Recent deals</h2><p>Only your owned deals are shown.</p></div><Link to="/upload" className="text-button">Manage deals</Link></div>{data.recentDeals.length ? <div className="list">{data.recentDeals.map((deal) => <div className="list-row" key={deal.id}><div className="deal-avatar">{deal.name.slice(0, 1)}</div><div className="list-main"><strong>{deal.name}</strong><span>{deal.status} · {formatDate(deal.updatedAt)}</span></div><span className="status-badge">{deal._count.documents} docs</span></div>)}</div> : <div className="empty-state compact">No owned deals yet. Create your first deal to begin.</div>}</section><section className="card panel"><div className="section-title"><div><h2>Recent activity</h2><p>Latest work in your workspace.</p></div></div>{data.recentActivity.length ? <div className="list">{data.recentActivity.slice(0, 8).map((item) => <div className="activity-row" key={`${item.type}-${item.id}`}><CheckCircle2 size={16} /><div><strong>{item.description}</strong><span>{formatDate(item.timestamp)}</span></div></div>)}</div> : <div className="empty-state compact">Activity will appear after you create a deal.</div>}</section></div></div>;
}
function Metric({ icon: Icon, label, value, tone = '' }) { return <article className={`metric-card ${tone}`}><div className="metric-icon"><Icon size={19} /></div><div><p>{label}</p><strong>{value}</strong></div></article>; }
