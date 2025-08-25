import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Download, FileText, LogOut, User, Folder, Calendar, HardDrive, Settings, AlertCircle } from 'lucide-react';
import ByghtLogo from '../assets/byght-logo.svg';
import Cookies from 'js-cookie';

const Dashboard = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg p-2">
                  <img src={ByghtLogo} alt="Byght Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Byght Portal</h1>
                  <p className="text-white text-opacity-80 text-sm">Sicherer Dokumentenzugang</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex items-center gap-2 text-white hover:text-white text-opacity-90 hover:text-opacity-100 font-medium transition-all duration-300 bg-white bg-opacity-10 hover:bg-opacity-20 px-4 py-2 rounded-xl"
                >
                  <Settings size={18} />
                  Admin Panel
                </button>
              )}
              <div className="flex items-center gap-3 text-white text-opacity-90">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <User size={16} />
                </div>
                <span className="font-medium">{user?.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-white hover:text-red-200 font-medium transition-all duration-300"
              >
                <LogOut size={18} />
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-3">Ihre Dateien</h2>
          <p className="text-white text-opacity-90 text-lg">Hier finden Sie alle für Sie freigegebenen Dateien zum Download.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-2xl p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white text-center">Lade Dateien...</p>
            </div>
          </div>
        ) : error ? (
          <div className="card bg-red-50 border-red-200">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle size={24} />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        ) : files.length === 0 ? (
          <div className="card text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-[rgb(255,179,0)] to-[rgb(56,184,189)] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Folder className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">Keine Dateien verfügbar</h3>
            <p className="text-gray-600 mb-4">
              Sobald Dateien für Sie freigegeben werden, erscheinen diese hier.
            </p>
            <div className="w-16 h-1 bg-gradient-to-r from-[rgb(255,179,0)] to-[rgb(56,184,189)] rounded-full mx-auto"></div>
          </div>
        ) : (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                      Dateiname
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                      Größe
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                      Hochgeladen am
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                      Beschreibung
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-primary uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {files.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-6 py-6 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-[rgb(255,179,0)] to-[rgb(56,184,189)] rounded-xl flex items-center justify-center mr-4">
                            <FileText className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-primary">{file.filename}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap">
                        <div className="flex items-center">
                          <HardDrive className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">{formatFileSize(file.size)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">{formatDate(file.uploadedAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="text-sm text-gray-600">{file.description || '-'}</span>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDownload(file.id, file.filename)}
                          className="btn-primary flex items-center gap-2"
                        >
                          <Download size={16} />
                          Download
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
