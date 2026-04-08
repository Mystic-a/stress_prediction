import React, { useState } from 'react';
import './LoginRegister.css';

function LoginRegister({ onAuth }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  const validatePassword = (pwd) => {
    if (pwd.length < 8) return 'Password must be at least 8 characters';
    return '';
  };

  const validateEmail = (em) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(em)) return 'Please enter a valid email address';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrors({});

    // Validation
    const newErrors = {};
    if (!username.trim()) newErrors.username = 'Username is required';
    else if (username.length < 3) newErrors.username = 'Username must be at least 3 characters';
    
    if (!isLogin) {
      if (!email.trim()) newErrors.email = 'Email is required';
      else {
        const emailErr = validateEmail(email);
        if (emailErr) newErrors.email = emailErr;
      }
    }

    const pwdErr = validatePassword(password);
    if (pwdErr) newErrors.password = pwdErr;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      await onAuth({
        username,
        email,
        password,
        fullName,
        isLogin,
      });
    } catch (authError) {
      setError(authError.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Stress Predictor</h1>
        <p className="auth-subtitle">Track your daily health and predict stress levels</p>

        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button className="close-error" onClick={() => setError('')}>×</button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <h2>{isLogin ? 'Welcome Back' : 'Get Started'}</h2>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a unique username"
              className={errors.username ? 'input-error' : ''}
              minLength={3}
              aria-label="Username"
            />
            {errors.username && <span className="field-error">{errors.username}</span>}
            <span className="field-hint">3+ characters, letters and numbers only</span>
          </div>

          <div className="form-group">
            <label htmlFor="email" style={isLogin ? { display: 'none' } : {}}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isLogin ? '' : 'your.email@example.com'}
              required={!isLogin}
              disabled={isLogin}
              className={errors.email ? 'input-error' : ''}
              style={isLogin ? { display: 'none' } : {}}
              aria-label="Email"
            />
            {!isLogin && errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="fullName">Full Name (optional)</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                aria-label="Full Name"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              minLength={8}
              required
              className={errors.password ? 'input-error' : ''}
              aria-label="Password"
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
            <span className="field-hint">Use a mix of letters, numbers, and symbols for security</span>
          </div>

          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Create Account')}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button 
              type="button" 
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setErrors({});
              }}
              className="toggle-btn"
            >
              {isLogin ? 'Register here' : 'Login here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginRegister;
