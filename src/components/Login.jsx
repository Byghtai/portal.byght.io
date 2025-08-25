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
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full animate-float"></div>
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-white/10 rounded-full animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white/5 rounded-full animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="w-full max-w-md sm:max-w-lg relative z-10">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center mobile-logo-large bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl mb-6 sm:mb-8 p-4 sm:p-6 border border-white/30 animate-float">
            <img src={ByghtLogo} alt="Byght Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="mobile-title font-black text-white mb-3 drop-shadow-lg">Byght Portal</h1>
          <p className="mobile-text text-white/90 font-medium">Sicherer Zugang zu Ihren Dokumenten</p>
        </div>

        {/* Login Form */}
        <div className="glass-effect rounded-3xl mobile-padding shadow-2xl border border-white/20">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="mobile-subtitle font-bold text-white mb-3">Willkommen zurück</h2>
            <p className="mobile-text text-white/80">Melden Sie sich an, um fortzufahren</p>
          </div>

          {error && (
            <div className="mb-6 sm:mb-8 p-4 sm:p-5 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-2xl flex items-center gap-3 text-red-100 animate-pulse">
              <AlertCircle size={20} className="sm:w-6 sm:h-6 flex-shrink-0" />
              <span className="font-medium mobile-text">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            <div className="space-y-2">
              <label htmlFor="username" className="block mobile-text font-semibold text-white/90 mb-3">
                Benutzername
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none">
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-white/60 group-focus-within:text-[rgb(255,179,0)] transition-colors duration-300" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field pl-12 sm:pl-14 bg-white/90 backdrop-blur-sm border-white/30 text-[rgb(10,16,69)] placeholder-white/50"
                  placeholder="Ihr Benutzername"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block mobile-text font-semibold text-white/90 mb-3">
                Passwort
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-white/60 group-focus-within:text-[rgb(255,179,0)] transition-colors duration-300" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-12 sm:pl-14 pr-12 bg-white/90 backdrop-blur-sm border-white/30 text-[rgb(10,16,69)] placeholder-white/50"
                  placeholder="Ihr Passwort"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 sm:pr-5 flex items-center text-white/60 hover:text-white transition-colors duration-300"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-4 sm:py-5 mobile-text font-bold mt-8"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-white"></div>
                  <span className="mobile-text">Anmelden...</span>
                </div>
              ) : (
                'Anmelden'
              )}
            </button>
          </form>

          <div className="mt-8 sm:mt-10 text-center mobile-text text-white/60 font-medium">
            © 2025 Byght GmbH - Alle Rechte vorbehalten
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
