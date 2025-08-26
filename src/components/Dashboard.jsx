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
  
  // Filter states
  const [filterProduct, setFilterProduct] = useState('');
  const [filterVersion, setFilterVersion] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');

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
        throw new Error('Error fetching files');
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
        throw new Error('Download failed');
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
      alert('Error downloading: ' + error.message);
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
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = !searchTerm || 
      file.filename.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProduct = !filterProduct || file.productLabel === filterProduct;
    const matchesVersion = !filterVersion || file.versionLabel === filterVersion;
    const matchesLanguage = !filterLanguage || file.languageLabel === filterLanguage;
    
    return matchesSearch && matchesProduct && matchesVersion && matchesLanguage;
  });

  // Get unique values for filter dropdowns
  const uniqueProducts = [...new Set(files.map(f => f.productLabel).filter(Boolean))];
  const uniqueVersions = [...new Set(files.map(f => f.versionLabel).filter(Boolean))];
  const uniqueLanguages = [...new Set(files.map(f => f.languageLabel).filter(Boolean))];

  return (
    <div className="min-h-screen bg-byght-lightgray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <img src={ByghtLogo} alt="Byght Logo" className="h-10 w-auto" />
              <div className="hidden sm:block">
                <h1 className="text-xl font-semibold text-byght-gray">Portal</h1>
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
                <span>Logout</span>
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
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-byght-gray mb-2">Your Files</h2>
          <p className="text-gray-600">
            Here you will find all files that have been made available to you.
            {files.length > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                ({filteredFiles.length} of {files.length} files)
              </span>
            )}
          </p>
        </div>

        {/* Search and Filter Bar */}
        {files.length > 0 && (
          <div className="mb-6 space-y-4">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>

            {/* Filter Section */}
            {(uniqueProducts.length > 0 || uniqueVersions.length > 0 || uniqueLanguages.length > 0) && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {uniqueProducts.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Product
                      </label>
                      <select
                        value={filterProduct}
                        onChange={(e) => setFilterProduct(e.target.value)}
                        className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-byght-turquoise"
                      >
                        <option value="">All Products</option>
                        {uniqueProducts.map(product => (
                          <option key={product} value={product}>{product}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {uniqueVersions.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Version
                      </label>
                      <select
                        value={filterVersion}
                        onChange={(e) => setFilterVersion(e.target.value)}
                        className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-byght-turquoise"
                      >
                        <option value="">All Versions</option>
                        {uniqueVersions.map(version => (
                          <option key={version} value={version}>{version}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {uniqueLanguages.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Language
                      </label>
                      <select
                        value={filterLanguage}
                        onChange={(e) => setFilterLanguage(e.target.value)}
                        className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-byght-turquoise"
                      >
                        <option value="">All Languages</option>
                        {uniqueLanguages.map(language => (
                          <option key={language} value={language}>{language}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setFilterProduct('');
                        setFilterVersion('');
                        setFilterLanguage('');
                      }}
                      className="w-full px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-byght-turquoise mx-auto mb-4"></div>
              <p className="text-gray-600">Loading files...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-byght-turquoise/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Folder className="h-8 w-8 text-byght-turquoise" />
            </div>
            <h3 className="text-xl font-semibold text-byght-gray mb-2">
              {files.length === 0 ? 'No files available' : 'No files match the current filters'}
            </h3>
            <p className="text-gray-600">
              {files.length === 0 
                ? 'Once files are made available to you, they will appear here.'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Labels
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                      Uploaded
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
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
                      <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {file.productLabel && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {file.productLabel}
                            </span>
                          )}
                          {file.versionLabel && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              v{file.versionLabel}
                            </span>
                          )}
                          {file.languageLabel && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              {file.languageLabel}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        <div className="flex items-center text-sm text-gray-600">
                          <HardDrive className="h-4 w-4 text-gray-400 mr-2" />
                          {formatFileSize(file.size)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden xl:table-cell">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {formatDate(file.uploadedAt)}
                        </div>
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