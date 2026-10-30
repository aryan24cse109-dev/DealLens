import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { getApiError } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function refreshUser() {
    setStatus('loading');
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data);
      setError('');
      setStatus('authenticated');
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        setUser(null);
        setError('');
        setStatus('unauthenticated');
      } else {
        setError(getApiError(requestError, 'Unable to verify your session.'));
        setStatus('error');
      }
    }
  }

  async function logout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutError('');
    try {
      await api.post('/auth/logout');
      setUser(null);
      setStatus('unauthenticated');
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        setUser(null);
        setStatus('unauthenticated');
        return;
      }

      setLogoutError(getApiError(requestError, 'Unable to log out. Please try again.'));
    } finally {
      setIsLoggingOut(false);
    }
  }

  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
      setStatus('unauthenticated');
      setError('');
    }

    window.addEventListener('deallens:session-expired', handleSessionExpired);
    return () => window.removeEventListener('deallens:session-expired', handleSessionExpired);
  }, []);

  useEffect(() => { refreshUser(); }, []);

  const value = useMemo(() => ({
    user, status, error, logoutError, isLoggingOut, refreshUser, logout,
  }), [user, status, error, logoutError, isLoggingOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
