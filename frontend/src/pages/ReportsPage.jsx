import { Download, FileBarChart, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import ErrorMessage from '../components/common/ErrorMessage';
import Loader from '../components/common/Loader';

export default function ReportsPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/reports', { params: { limit: 100, search } });
      setItems(data.data.items || []);
    } catch (requestError) { setError(getApiError(requestError, 'Reports unavailable.')); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [search]);
  async function download(report) {
    try {
      const response = await api.get(`/reports/${report.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.title.replace(/[^a-z0-9._-]+/gi, '_')}.${report.format === 'TEXT' ? 'txt' : report.format.toLowerCase()}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) { setError(getApiError(requestError, 'Unable to download report.')); }
  }
  if (loading) return <div className="page-shell"><Loader label="Loading generated reports…" /></div>;
  return <div className="page-shell">
    <header className="page-header"><div><p className="eyebrow">Export library</p><h1 className="page-title">Generated reports</h1><p className="page-description">Download reports generated from your completed analyses.</p></div></header>
    {error && <ErrorMessage message={error} onRetry={load} />}
    <div className="toolbar"><div className="search-field"><Search size={17} /><input placeholder="Search by deal" value={search} onChange={(event) => setSearch(event.target.value)} /></div><span className="muted">{items.length} reports</span></div>
    <section className="card panel">{items.length ? <div className="list">{items.map((report) => <div className="list-row" key={report.id}><FileBarChart size={18} /><div className="list-main"><strong>{report.title}</strong><span>{report.deal.name} · {report.format} · {new Date(report.createdAt).toLocaleDateString()}</span></div><Link className="text-button" to={`/report?analysisId=${encodeURIComponent(report.analysisId)}`}>Open analysis</Link><button className="button secondary" onClick={() => download(report)}><Download size={16} /> Download</button></div>)}</div> : <div className="empty-state compact">No generated reports yet.</div>}</section>
  </div>;
}
