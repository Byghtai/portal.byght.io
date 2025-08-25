import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Download, FileText, LogOut, User, Folder, Calendar, HardDrive, Settings, AlertCircle, Menu, X, Search, Filter } from 'lucide-react';
import ByghtLogo from '../assets/byght-logo.svg';
import Cookies from 'js-cookie';

const Dashboard = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUserFiles();
  }, []);

  const fetchUserFiles = async () => {
    try {
      const token = Cookies.get('auth_token');
      const response = await fetch('/.netlify/functions/files-list', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Fehler beim Abrufen der Dateien');
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileId, filename) => {
    try {
      const token = Cookies.get('auth_token');
      const response = await fetch(`/.netlify/functions/files-download?fileId=${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Download fehlgeschlagen');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Fehler beim Download: ' + error.message);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (file.description && file.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      {/* Animated Background Elements - Cleaner */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-40 h-40 bg-white/3 rounded-full animate-float"></div>
        <div className="absolute bottom-10 left-10 w-32 h-32 bg-white/3 rounded-full animate-float" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute top-1/3 left-1/2 w-20 h-20 bg-white/2 rounded-full animate-float" style={{animationDelay: '3s'}}></div>
      </div>

      {/* Header */}
      <header className="glass-effect border-b border-white/15 relative z-10">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex justify-between items-center py-4 sm:py-6 lg:py-8">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/15 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg p-2 sm:p-3 border border-white/25">
                  <img src={ByghtLogo} alt="Byght Logo" className="w-full h-full object-contain" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-black text-white drop-shadow-lg">Byght Portal</h1>
                  <p className="text-sm sm:text-base lg:text-lg text-white/75 font-medium">Sicherer Dokumentenzugang</p>
                </div>
                <div className="sm:hidden">
                  <h1 className="text-sm sm:text-base lg:text-lg font-black text-white drop-shadow-lg">Byght Portal</h1>
                </div>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center space-x-4 lg:space-x-6">
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex items-center gap-2 text-white hover:text-white text-opacity-85 hover:text-opacity-100 font-semibold transition-all duration-300 bg-white/8 hover:bg-white/15 px-4 py-3 rounded-2xl text-sm sm:text-base lg:text-lg backdrop-blur-sm border border-white/20 hover:scale-105"
                >
                  <Settings size={18} className="sm:w-5 sm:h-5" />
                  <span className="hidden lg:inline">Admin Panel</span>
                  <span className="lg:hidden">Admin</span>
                </button>
              )}
              <div className="flex items-center gap-3 sm:gap-4 text-white text-opacity-85">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/25">
                  <User size={16} className="sm:w-5 sm:h-5" />
                </div>
                <span className="font-semibold text-sm sm:text-base lg:text-lg hidden sm:inline">{user?.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-white hover:text-red-200 font-semibold transition-all duration-300 text-sm sm:text-base lg:text-lg hover:scale-105"
              >
                <LogOut size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Abmelden</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white p-2 hover:bg-white/8 rounded-xl transition-all duration-300"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden pb-6 border-t border-white/15">
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 space-y-4 pt-6">
                {isAdmin && (
                  <button
                    onClick={() => {
                      navigate('/admin');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full sm:w-auto text-center sm:text-left transition-all duration-300 flex items-center justify-center gap-3 text-white hover:text-white text-opacity-85 hover:text-opacity-100 font-semibold transition-all duration-300 bg-white/8 hover:bg-white/15 px-6 py-4 rounded-2xl text-sm sm:text-base lg:text-lg backdrop-blur-sm border border-white/20"
                  >
                    <Settings size={20} />
                    Admin Panel
                  </button>
                )}
                <div className="flex items-center justify-center gap-4 text-white text-opacity-85 text-sm sm:text-base lg:text-lg">
                  <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/25">
                    <User size={18} />
                  </div>
                  <span className="font-semibold">{user?.username}</span>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full sm:w-auto text-center sm:text-left transition-all duration-300 flex items-center justify-center gap-3 text-white hover:text-red-200 font-semibold transition-all duration-300 text-sm sm:text-base lg:text-lg"
                >
                  <LogOut size={20} />
                  Abmelden
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 xl:px-12 p-6 sm:p-8 lg:p-10 relative z-10">
        <div className="mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white mb-4 drop-shadow-lg">Ihre Dateien</h2>
          <p className="text-sm sm:text-base lg:text-lg text-white/85 font-medium">Hier finden Sie alle für Sie freigegebenen Dateien zum Download.</p>
        </div>

        {/* Search Bar */}
        {files.length > 0 && (
          <div className="mb-8">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-white/50" />
              </div>
              <input
                type="text"
                placeholder="Dateien durchsuchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/15 backdrop-blur-sm border border-white/25 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 transition-all duration-300"
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16 sm:py-20">
            <div className="glass-effect rounded-3xl p-6 sm:p-8 lg:p-10 text-center">
              <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-white mx-auto mb-6"></div>
              <p className="text-white font-semibold text-sm sm:text-base lg:text-lg">Lade Dateien...</p>
            </div>
          </div>
        ) : error ? (
          <div className="card bg-red-500/15 backdrop-blur-sm border-red-400/25">
            <div className="flex items-center gap-4 text-red-100">
              <AlertCircle size={24} className="sm:w-6 sm:h-6 flex-shrink-0" />
              <span className="font-semibold text-sm sm:text-base lg:text-lg">{error}</span>
            </div>
          </div>
        ) : files.length === 0 ? (
          <div className="card text-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r from-[rgb(255,179,0)]/80 to-[rgb(56,184,189)]/80 rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-lg">
              <Folder className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-black text-primary mb-3">Keine Dateien verfügbar</h3>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-6 font-medium">
              Sobald Dateien für Sie freigegeben werden, erscheinen diese hier.
            </p>
            <div className="w-16 h-1 sm:w-20 bg-gradient-to-r from-[rgb(255,179,0)]/80 to-[rgb(56,184,189)]/80 rounded-full mx-auto"></div>
          </div>
        ) : (
          <div className="card">
            <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-2xl">
              <table className="min-w-full divide-y divide-gray-200/30">
                <thead>
                  <tr>
                    <th className="px-4 py-4 sm:px-6 sm:py-5 text-left text-xs sm:text-sm lg:text-base font-bold text-primary uppercase tracking-wider">
                      Dateiname
                    </th>
                    <th className="px-4 py-4 sm:px-6 sm:py-5 text-left text-xs sm:text-sm lg:text-base font-bold text-primary uppercase tracking-wider hidden sm:table-cell">
                      Größe
                    </th>
                    <th className="px-4 py-4 sm:px-6 sm:py-5 text-left text-xs sm:text-sm lg:text-base font-bold text-primary uppercase tracking-wider hidden lg:table-cell">
                      Hochgeladen am
                    </th>
                    <th className="px-4 py-4 sm:px-6 sm:py-5 text-left text-xs sm:text-sm lg:text-base font-bold text-primary uppercase tracking-wider hidden xl:table-cell">
                      Beschreibung
                    </th>
                    <th className="px-4 py-4 sm:px-6 sm:py-5 text-right text-xs sm:text-sm lg:text-base font-bold text-primary uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/30">
                  {filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50/30 transition-all duration-300 group">
                      <td className="px-4 py-5 sm:px-6 sm:py-6 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[rgb(255,179,0)]/80 to-[rgb(56,184,189)]/80 rounded-2xl flex items-center justify-center mr-4 sm:mr-5 shadow-md group-hover:scale-110 transition-transform duration-300">
                            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm sm:text-base lg:text-lg font-bold text-primary block truncate">{file.filename}</span>
                            <div className="sm:hidden mt-2">
                              <span className="text-sm sm:text-base lg:text-lg text-gray-500">{formatFileSize(file.size)}</span>
                              <span className="mx-2 text-gray-300">•</span>
                              <span className="text-sm sm:text-base lg:text-lg text-gray-500">{formatDate(file.uploadedAt)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 sm:px-6 sm:py-6 whitespace-nowrap hidden sm:table-cell">
                        <div className="flex items-center">
                          <HardDrive className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mr-3" />
                          <span className="text-sm sm:text-base lg:text-lg text-gray-600 font-medium">{formatFileSize(file.size)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-5 sm:px-6 sm:py-6 whitespace-nowrap hidden lg:table-cell">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mr-3" />
                          <span className="text-sm sm:text-base lg:text-lg text-gray-600 font-medium">{formatDate(file.uploadedAt)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-5 sm:px-6 sm:py-6 hidden xl:table-cell">
                        <span className="text-sm sm:text-base lg:text-lg text-gray-600 font-medium">{file.description || '-'}</span>
                      </td>
                      <td className="px-4 py-5 sm:px-6 sm:py-6 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDownload(file.id, file.filename)}
                          className="btn-primary flex items-center gap-2 text-xs sm:text-sm py-2 px-4 sm:py-3 sm:px-6 group-hover:scale-105 transition-transform duration-300"
                        >
                          <Download size={16} className="sm:w-5 sm:h-5" />
                          <span className="hidden sm:inline">Download</span>
                          <span className="sm:hidden">DL</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
