import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Download, FileText, LogOut, User, Folder, Calendar, HardDrive, Settings, AlertCircle, Menu, X } from 'lucide-react';
import ByghtLogo from '../assets/byght-logo.svg';
import Cookies from 'js-cookie';

const Dashboard = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="glass-effect border-b border-white border-opacity-20">
        <div className="mobile-container">
          <div className="flex justify-between items-center mobile-header">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="mobile-logo-medium bg-white rounded-xl flex items-center justify-center shadow-lg p-1 sm:p-2">
                  <img src={ByghtLogo} alt="Byght Logo" className="w-full h-full object-contain" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="mobile-subtitle font-bold text-white">Byght Portal</h1>
                  <p className="mobile-text text-white text-opacity-80">Sicherer Dokumentenzugang</p>
                </div>
                <div className="sm:hidden">
                  <h1 className="mobile-text font-bold text-white">Byght Portal</h1>
                </div>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center space-x-4 lg:space-x-6">
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex items-center gap-2 text-white hover:text-white text-opacity-90 hover:text-opacity-100 font-medium transition-all duration-300 bg-white bg-opacity-10 hover:bg-opacity-20 px-3 py-2 rounded-xl mobile-text"
                >
                  <Settings size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="hidden lg:inline">Admin Panel</span>
                  <span className="lg:hidden">Admin</span>
                </button>
              )}
              <div className="flex items-center gap-2 sm:gap-3 text-white text-opacity-90">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <User size={14} className="sm:w-4 sm:h-4" />
                </div>
                <span className="font-medium mobile-text hidden sm:inline">{user?.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-white hover:text-red-200 font-medium transition-all duration-300 mobile-text"
              >
                <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">Abmelden</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white p-2"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden pb-4 border-t border-white border-opacity-20">
              <div className="mobile-nav space-y-3 pt-4">
                {isAdmin && (
                  <button
                    onClick={() => {
                      navigate('/admin');
                      setMobileMenuOpen(false);
                    }}
                    className="mobile-nav-item flex items-center justify-center gap-2 text-white hover:text-white text-opacity-90 hover:text-opacity-100 font-medium transition-all duration-300 bg-white bg-opacity-10 hover:bg-opacity-20 px-4 py-3 rounded-xl mobile-text"
                  >
                    <Settings size={18} />
                    Admin Panel
                  </button>
                )}
                <div className="flex items-center justify-center gap-3 text-white text-opacity-90 mobile-text">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <User size={16} />
                  </div>
                  <span className="font-medium">{user?.username}</span>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="mobile-nav-item flex items-center justify-center gap-2 text-white hover:text-red-200 font-medium transition-all duration-300 mobile-text"
                >
                  <LogOut size={18} />
                  Abmelden
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="mobile-container mobile-padding">
        <div className="mb-6 sm:mb-8">
          <h2 className="mobile-title font-bold text-white mb-2 sm:mb-3">Ihre Dateien</h2>
          <p className="mobile-text text-white text-opacity-90">Hier finden Sie alle für Sie freigegebenen Dateien zum Download.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12 sm:py-16">
            <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-2xl mobile-padding">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white text-center mobile-text">Lade Dateien...</p>
            </div>
          </div>
        ) : error ? (
          <div className="card bg-red-50 border-red-200">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle size={20} className="sm:w-6 sm:h-6" />
              <span className="font-medium mobile-text">{error}</span>
            </div>
          </div>
        ) : files.length === 0 ? (
          <div className="card text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-[rgb(255,179,0)] to-[rgb(56,184,189)] rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Folder className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </div>
            <h3 className="mobile-subtitle font-bold text-primary mb-2">Keine Dateien verfügbar</h3>
            <p className="mobile-text text-gray-600 mb-4">
              Sobald Dateien für Sie freigegeben werden, erscheinen diese hier.
            </p>
            <div className="w-12 h-1 sm:w-16 bg-gradient-to-r from-[rgb(255,179,0)] to-[rgb(56,184,189)] rounded-full mx-auto"></div>
          </div>
        ) : (
          <div className="card">
            <div className="mobile-table-container">
              <table className="mobile-table-wrapper">
                <thead>
                  <tr>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left mobile-table font-bold text-primary uppercase tracking-wider">
                      Dateiname
                    </th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left mobile-table font-bold text-primary uppercase tracking-wider hidden sm:table-cell">
                      Größe
                    </th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left mobile-table font-bold text-primary uppercase tracking-wider hidden lg:table-cell">
                      Hochgeladen am
                    </th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left mobile-table font-bold text-primary uppercase tracking-wider hidden xl:table-cell">
                      Beschreibung
                    </th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-right mobile-table font-bold text-primary uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {files.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-3 py-4 sm:px-6 sm:py-6 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-[rgb(255,179,0)] to-[rgb(56,184,189)] rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="mobile-text font-semibold text-primary block truncate">{file.filename}</span>
                            <div className="sm:hidden mt-1">
                              <span className="mobile-text text-gray-500">{formatFileSize(file.size)}</span>
                              <span className="mx-2 text-gray-300">•</span>
                              <span className="mobile-text text-gray-500">{formatDate(file.uploadedAt)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 sm:px-6 sm:py-6 whitespace-nowrap hidden sm:table-cell">
                        <div className="flex items-center">
                          <HardDrive className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mr-2" />
                          <span className="mobile-text text-gray-600">{formatFileSize(file.size)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-4 sm:px-6 sm:py-6 whitespace-nowrap hidden lg:table-cell">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mr-2" />
                          <span className="mobile-text text-gray-600">{formatDate(file.uploadedAt)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-4 sm:px-6 sm:py-6 hidden xl:table-cell">
                        <span className="mobile-text text-gray-600">{file.description || '-'}</span>
                      </td>
                      <td className="px-3 py-4 sm:px-6 sm:py-6 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDownload(file.id, file.filename)}
                          className="btn-primary flex items-center gap-1 sm:gap-2 mobile-button"
                        >
                          <Download size={14} className="sm:w-4 sm:h-4" />
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
