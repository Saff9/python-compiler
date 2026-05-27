import React, { useState } from 'react';
import { Lock, User, Terminal as TerminalIcon, Sparkles } from 'lucide-react';
import { AVATAR_MAP, AVATAR_IDS, DEFAULT_AVATAR } from '../utils/avatars';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATAR);
  const [error, setError] = useState('');

  const getUsers = () => {
    const saved = localStorage.getItem('py_compiler_users');
    return saved ? JSON.parse(saved) : {};
  };

  const saveUsers = (users) => {
    localStorage.setItem('py_compiler_users', JSON.stringify(users));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    const users = getUsers();

    if (isRegister) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (users[username.toLowerCase()]) {
        setError('Username already exists');
        return;
      }

      // Register new user
      const newUser = {
        username,
        password,
        avatar: selectedAvatar,
        created: Date.now()
      };

      users[username.toLowerCase()] = newUser;
      saveUsers(users);

      // Save session and log in
      localStorage.setItem('py_compiler_session', JSON.stringify({
        username,
        avatar: selectedAvatar
      }));
      onLoginSuccess({ username, avatar: selectedAvatar });
    } else {
      // Login
      const user = users[username.toLowerCase()];
      if (!user || user.password !== password) {
        setError('Invalid username or password');
        return;
      }

      // Save session and log in
      localStorage.setItem('py_compiler_session', JSON.stringify({
        username: user.username,
        avatar: user.avatar
      }));
      onLoginSuccess({ username: user.username, avatar: user.avatar });
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="login-logo">
            <TerminalIcon size={32} />
            <h1>PyCraft IDE</h1>
          </div>
          <p>{isRegister ? 'Create your workspace profile' : 'Sign in to access your coding workspace'}</p>
        </div>

        {error && (
          <div style={{
            color: 'var(--accent-rose)',
            fontSize: '13px',
            background: 'rgba(244, 63, 94, 0.1)',
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username-input">Username</label>
            <div className="input-container">
              <User className="input-icon" size={18} />
              <input
                id="username-input"
                type="text"
                className="form-input"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">Password</label>
            <div className="input-container">
              <Lock className="input-icon" size={18} />
              <input
                id="password-input"
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {isRegister && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password-input">Confirm Password</label>
                <div className="input-container">
                  <Lock className="input-icon" size={18} />
                  <input
                    id="confirm-password-input"
                    type="password"
                    className="form-input"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="avatar-selector">
                <label className="form-label">Select Avatar Icon</label>
                <div className="avatar-grid">
                  {AVATAR_IDS.map((id) => {
                    const Icon = AVATAR_MAP[id];
                    return (
                      <div
                        key={id}
                        className={`avatar-option ${selectedAvatar === id ? 'selected' : ''}`}
                        onClick={() => setSelectedAvatar(id)}
                      >
                        <Icon size={20} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
            <Sparkles size={18} />
            {isRegister ? 'Create Profile' : 'Access IDE'}
          </button>
        </form>

        <div className="login-toggle">
          {isRegister ? (
            <p>
              Already have an account?{' '}
              <span onClick={() => { setIsRegister(false); setError(''); }}>Sign In</span>
            </p>
          ) : (
            <p>
              New coder?{' '}
              <span onClick={() => { setIsRegister(true); setError(''); }}>Create Profile</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
