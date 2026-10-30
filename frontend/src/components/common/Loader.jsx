export default function Loader({ label = 'Loading…' }) {
  return <div className="inline-state"><div className="spinner small" /><span>{label}</span></div>;
}