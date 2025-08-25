import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';
import ByghtLogo from '../assets/byght-logo.svg';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements - Cleaner */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/5 rounded-full animate-float"></div>
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-white/5 rounded-full animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white/3 rounded-full animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="w-full max-w-md sm:max-w-lg relative z-10">
        {/* Logo/Brand Section - Größer */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 bg-white/15 backdrop-blur-xl rounded-2xl shadow-lg mb-6 sm:mb-8 p-4 sm:p-5 border border-white/25">
            <img src={ByghtLogo} alt="Byght Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 drop-shadow-md">Byght Portal</h1>
          <p className="text-sm sm:text-base text-white/80 font-medium">Sicherer Zugang zu Ihren Dokumenten</p>
        </div>

        {/* Login Form - Cleaner */}
        <div className="glass-effect rounded-2xl p-6 sm:p-8 shadow-lg border border-white/25">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Willkommen zurück</h2>
            <p className="text-sm sm:text-base text-white/75">Melden Sie sich an, um fortzufahren</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/15 backdrop-blur-sm border border-red-400/25 rounded-xl flex items-center gap-3 text-red-100">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span className="font-medium text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-white/85 mb-2">
                Benutzername
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-white/50 group-focus-within:text-[rgb(255,179,0)] transition-colors duration-200" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/95 backdrop-blur-sm border border-white/25 rounded-lg text-[rgb(10,16,69)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgb(255,179,0)]/30 focus:border-[rgb(255,179,0)] transition-all duration-200"
                  placeholder="Ihr Benutzername"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-white/85 mb-2">
                Passwort
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white/50 group-focus-within:text-[rgb(255,179,0)] transition-colors duration-200" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-white/95 backdrop-blur-sm border border-white/25 rounded-lg text-[rgb(10,16,69)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgb(255,179,0)]/30 focus:border-[rgb(255,179,0)] transition-all duration-200"
                  placeholder="Ihr Passwort"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/50 hover:text-white/70 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 font-semibold mt-6"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Anmelden...</span>
                </div>
              ) : (
                'Anmelden'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-white/50">
            © 2025 Byght GmbH - Alle Rechte vorbehalten
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
