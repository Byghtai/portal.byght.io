import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, User, AlertCircle } from 'lucide-react';
import ByghtLogo from '../assets/byght-logo.svg';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Anmeldung fehlgeschlagen');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm sm:max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center mobile-logo-large bg-white rounded-2xl shadow-xl mb-4 sm:mb-6 p-3 sm:p-4">
            <img src={ByghtLogo} alt="Byght Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="mobile-title font-bold text-white mb-2">Byght Portal</h1>
          <p className="mobile-text text-white text-opacity-90">Sicherer Zugang zu Ihren Dokumenten</p>
        </div>

        {/* Login Form */}
        <div className="glass-effect rounded-3xl mobile-padding shadow-2xl">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="mobile-subtitle font-bold text-primary mb-2">Willkommen zurück</h2>
            <p className="mobile-text text-gray-600">Melden Sie sich an, um fortzufahren</p>
          </div>

          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
              <AlertCircle size={18} className="sm:w-5 sm:h-5" />
              <span className="font-medium mobile-text">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="username" className="block mobile-text font-semibold text-primary mb-2 sm:mb-3">
                Benutzername
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field pl-10 sm:pl-12"
                  placeholder="Ihr Benutzername"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block mobile-text font-semibold text-primary mb-2 sm:mb-3">
                Passwort
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 sm:pl-12"
                  placeholder="Ihr Passwort"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 sm:py-4 mobile-text font-bold"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                  <span className="mobile-text">Anmelden...</span>
                </div>
              ) : (
                'Anmelden'
              )}
            </button>
          </form>

          <div className="mt-6 sm:mt-8 text-center mobile-text text-gray-500">
            © 2025 Byght GmbH - Alle Rechte vorbehalten
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
