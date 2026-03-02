import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [form, setForm] = useState({ username: 'admin', password: 'admin123' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) return;
    setLoading(true);
    try {
      const user = await login(form.username.trim(), form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-box animate-fadeUp">
        <div className="login-logo">
          <div className="login-icon">☕</div>
          <h1>Chiya Chowk</h1>
          <p>Point of Sale System</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter username"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              autoComplete="username"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in...</> : '→ Sign In to POS'}
          </button>
        </form>

        <div className="login-hint">
          Demo: <strong>admin</strong> / <strong>admin123</strong> &nbsp;|&nbsp; Staff: <strong>staff</strong> / <strong>staff123</strong>
        </div>
      </div>

      <style>{`
        .login-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse at 30% 40%, rgba(212,134,42,0.07) 0%, transparent 60%),
                      radial-gradient(ellipse at 70% 80%, rgba(212,134,42,0.04) 0%, transparent 50%),
                      var(--bg);
          padding: 20px;
        }
        .login-box {
          background: var(--card);
          border: 1px solid var(--border2);
          border-radius: 20px;
          padding: 44px 36px;
          width: 100%;
          max-width: 400px;
          box-shadow: var(--shadow), 0 0 60px rgba(212,134,42,0.05);
        }
        .login-logo {
          text-align: center;
          margin-bottom: 32px;
        }
        .login-icon {
          width: 62px; height: 62px;
          background: linear-gradient(135deg, var(--amber), var(--amber2));
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 28px;
          margin: 0 auto 14px;
          box-shadow: 0 8px 24px rgba(212,134,42,0.3);
        }
        .login-logo h1 {
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .login-logo p {
          font-size: 12px;
          color: var(--text3);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .login-hint {
          margin-top: 20px;
          font-size: 12px;
          color: var(--text3);
          text-align: center;
          padding: 11px;
          background: var(--amber-dim);
          border-radius: var(--radius2);
          border: 1px solid var(--amber-glow);
          line-height: 1.7;
        }
        .login-hint strong { color: var(--amber); }
      `}</style>
    </div>
  );
};

export default LoginPage;