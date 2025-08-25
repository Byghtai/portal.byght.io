import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Download, FileText, LogOut, User, Folder, Calendar, HardDrive, Settings, AlertCircle, Menu, X, Search } from 'lucide-react';
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
    <div className="min-h-screen bg-byght-lightgray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <img src={ByghtLogo} alt="Byght Logo" className="h-10 w-auto" />
              <div className="hidden sm:block">
                <h1 className="text-xl font-semibold text-byght-gray">Byght Portal</h1>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center space-x-4">
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex items-center gap-2 text-byght-gray hover:text-byght-turquoise transition-colors"
                >
                  <Settings size={18} />
                  <span>Admin</span>
                </button>
              )}
              <div className="flex items-center gap-2 text-byght-gray">
                <User size={18} />
                <span className="font-medium">{user?.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-byght-gray hover:text-red-500 transition-colors"
              >
                <LogOut size={18} />
                <span>Abmelden</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-byght-gray p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden pb-4 border-t border-gray-200">
              <div className="flex flex-col space-y-3 pt-4">
                {isAdmin && (
                  <button
                    onClick={() => {
                      navigate('/admin');
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 text-byght-gray hover:text-byght-turquoise transition-colors py-2"
                  >
                    <Settings size={18} />
                    Admin Panel
                  </button>
                )}
                <div className="flex items-center gap-2 text-byght-gray py-2">
                  <User size={18} />
                  <span className="font-medium">{user?.username}</span>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 text-byght-gray hover:text-red-500 transition-colors py-2"
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
      <main className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-byght-gray mb-2">Ihre Dateien</h2>
          <p className="text-gray-600">Hier finden Sie alle für Sie freigegebenen Dateien.</p>
        </div>

        {/* Search Bar */}
        {files.length > 0 && (
          <div className="mb-6">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Dateien durchsuchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-byght-turquoise mx-auto mb-4"></div>
              <p className="text-gray-600">Lade Dateien...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          </div>
        ) : files.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-byght-turquoise/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Folder className="h-8 w-8 text-byght-turquoise" />
            </div>
            <h3 className="text-xl font-semibold text-byght-gray mb-2">Keine Dateien verfügbar</h3>
            <p className="text-gray-600">
              Sobald Dateien für Sie freigegeben werden, erscheinen diese hier.
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dateiname
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Größe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Hochgeladen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                      Beschreibung
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-byght-turquoise/10 rounded-lg flex items-center justify-center mr-3">
                            <FileText className="h-5 w-5 text-byght-turquoise" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-byght-gray">{file.filename}</div>
                            <div className="sm:hidden text-xs text-gray-500 mt-1">
                              {formatFileSize(file.size)} • {formatDate(file.uploadedAt)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        <div className="flex items-center text-sm text-gray-600">
                          <HardDrive className="h-4 w-4 text-gray-400 mr-2" />
                          {formatFileSize(file.size)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {formatDate(file.uploadedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden xl:table-cell">
                        <span className="text-sm text-gray-600">{file.description || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDownload(file.id, file.filename)}
                          className="btn-primary inline-flex items-center gap-2 text-sm"
                        >
                          <Download size={16} />
                          <span className="hidden sm:inline">Download</span>
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