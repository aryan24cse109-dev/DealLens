import { ArrowRight, Check, FileText, LockKeyhole, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './login.css';

const highlights = [
  { icon: FileText, title: 'Document Comparison', text: 'See what changed across every version.' },
  { icon: Sparkles, title: 'AI Impact Insights', text: 'Understand the commercial meaning behind edits.' },
  { icon: Zap, title: 'Reports & Communication', text: 'Turn analysis into clear next steps.' },
];

export default function LoginPage() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const oauthError = new URLSearchParams(location.search).get('error');
  const message = oauthError === 'account-linking-required'
    ? 'This Google account requires explicit account linking.'
    : oauthError ? 'Google sign-in could not be completed. Please try again.' : '';

  useEffect(() => {
    if (status === 'authenticated') navigate('/dashboard', { replace: true });
  }, [status, navigate]);

  function signIn() {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    window.location.assign(`${baseUrl}/auth/google`);
  }

  return <main className="login-shell">
    <section className="login-hero">
      <div className="brand-mark"><span>DL</span><strong>DealLens</strong></div>
      <div className="hero-copy"><p className="eyebrow">Contract clarity, built in</p><h1>See the deal<br /><em>behind the redlines.</em></h1><p>DealLens helps legal and commercial teams understand contract changes, assess impact, and move negotiations forward with confidence.</p></div>
      <div className="highlight-list">{highlights.map(({ icon: Icon, title, text }) => <div className="highlight" key={title}><div className="highlight-icon"><Icon size={18} /></div><div><strong>{title}</strong><span>{text}</span></div></div>)}</div>
      <div className="hero-footer"><ShieldCheck size={16} /> Your documents stay private and secure.</div>
    </section>
    <section className="login-panel"><div className="login-card"><div className="login-card-top"><div className="mobile-brand"><span>DL</span><strong>DealLens</strong></div><div className="lock-icon"><LockKeyhole size={20} /></div></div><p className="eyebrow">Welcome back</p><h2>Sign in to your workspace</h2><p className="login-muted">Use your Google account to securely access your deals and analysis.</p>{message && <div className="alert error">{message}</div>}<button className="google-button" onClick={signIn}><span className="google-g">G</span>Continue with Google<ArrowRight size={17} /></button><div className="login-trust"><Check size={14} /> No passwords to remember <span>•</span> Secure sign-in</div></div><p className="login-legal">By continuing, you agree to use DealLens for authorized business documents only.</p></section>
  </main>;
}
