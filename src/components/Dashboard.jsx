import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Download, FileText, LogOut, User, Folder, Calendar, HardDrive, Settings, AlertCircle, Menu, X, Cloud, Key, CheckCircle, Upload, Users, FileCheck, HelpCircle, Mail, ChevronRight, ChevronDown } from 'lucide-react';
import ByghtLogo from '../assets/byght-logo.svg';
import Cookies from 'js-cookie';
import { downloadFileFromS3 } from '../utils/s3Download';

const Dashboard = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  

  
  // FAQ collapse states
  const [expandedFaq, setExpandedFaq] = useState(null);

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

  const handleDownload = async (fileId, filename, fileSize = 0) => {
    try {
      const token = Cookies.get('auth_token');
      
      if (!token) {
        throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
      }
      
      // Zeige Download-Status (optional)
      console.log(`Starte Download: ${filename}`);
      

      
      // Download über S3 Presigned URL
      const success = await downloadFileFromS3(fileId, filename, token);
      
      if (success) {
        console.log(`✅ Download erfolgreich: ${filename}`);
      } else {
        throw new Error('Download konnte nicht gestartet werden');
      }
    } catch (error) {
      console.error('❌ Download-Fehler:', error);
      alert(`Download fehlgeschlagen: ${error.message}`);
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

  const truncateFilename = (filename, maxLength = 35) => {
    if (filename.length <= maxLength) return filename;
    
    // Find the last dot to preserve file extension
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) {
      // No extension, just truncate
      return filename.substring(0, maxLength - 3) + '...';
    }
    
    const extension = filename.substring(lastDotIndex);
    const nameWithoutExtension = filename.substring(0, lastDotIndex);
    
    // Calculate how much space we have for the name part
    const availableSpace = maxLength - extension.length - 3; // 3 for "..."
    
    if (availableSpace <= 0) {
      // Extension is too long, just truncate everything
      return filename.substring(0, maxLength - 3) + '...';
    }
    
    return nameWithoutExtension.substring(0, availableSpace) + '...' + extension;
  };



  const toggleFaq = (faqId) => {
    setExpandedFaq(expandedFaq === faqId ? null : faqId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
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

      {/* Main Content - Confluence Import Anleitung */}
      <main className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Titel */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-3 flex items-center gap-3">
              <Upload className="text-byght-turquoise" size={32} />
              Importing the SmartKit into Confluence (Cloud)
            </h1>
            <p className="text-lg text-gray-600">
              A quick, friendly guide to import the IMS / ISMS / DPMS/DSMS / EMS/UMS SmartKit into your <strong>Confluence Cloud</strong> — and hand it off to us for final setup & testing. ✨
            </p>
          </div>

          {/* What you'll need */}
          <div className="mb-8 bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle className="text-blue-500" size={24} />
              What you'll need
            </h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Cloud className="text-blue-500 mt-1 flex-shrink-0" size={20} />
                <div>
                  <strong>Confluence Cloud</strong>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Key className="text-blue-500 mt-1 flex-shrink-0" size={20} />
                <div>
                  <strong>Permissions:</strong> Confluence Site Admin <span className="text-gray-600">(space import requires admin rights)</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200 mb-8"></div>

          {/* Step-by-step guide */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <FileCheck className="text-green-500" size={24} />
              Step-by-step guide
            </h2>
            
            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-byght-turquoise text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Download className="text-byght-turquoise" size={20} />
                    Download the SmartKit package
                  </h3>
                  <p className="text-gray-600 mb-3">
                    Save the <code className="bg-gray-100 px-2 py-1 rounded">.zip</code> to your computer <strong>(do not unzip)</strong>.
                  </p>
                </div>
              </div>

              {/* Dateitabelle */}
              <div className="ml-14 mb-6">

                {loading ? (
                  <div className="flex justify-center py-8 bg-gray-50 rounded-lg">
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
                  <div className="bg-gray-50 rounded-lg text-center py-8">
                    <div className="w-16 h-16 bg-byght-turquoise/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Folder className="h-8 w-8 text-byght-turquoise" />
                    </div>
                    <h3 className="text-lg font-semibold text-byght-gray mb-2">
                      No files available
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Files will appear here once they are made available to you.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Filename
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                              Product
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                              Version
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                              Language
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                              Confluence
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                              Size
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {files.map((file) => (
                            <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-byght-turquoise/10 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                                    <FileText className="h-4 w-4 text-byght-turquoise" />
                                  </div>
                                  <div>
                                    <div 
                                      className="text-sm font-medium text-byght-gray" 
                                      title={file.filename}
                                    >
                                      {truncateFilename(file.filename)}
                                    </div>
                                    <div className="lg:hidden text-xs text-gray-500 mt-1">
                                      {[file.productLabel, file.versionLabel, file.languageLabel, file.confluenceLabel].filter(Boolean).join(' • ')}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                                <span className="text-sm text-gray-900">
                                  {file.productLabel || '-'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                                <span className="text-sm text-gray-900">
                                  {file.versionLabel || '-'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                                <span className="text-sm text-gray-900">
                                  {file.languageLabel || '-'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                                <span className="text-sm text-gray-900">
                                  {file.confluenceLabel || '-'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                                <div className="flex items-center text-sm text-gray-600">
                                  <HardDrive className="h-3 w-3 text-gray-400 mr-1" />
                                  {formatFileSize(file.size)}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <button
                                  onClick={() => handleDownload(file.id, file.filename, file.size)}
                                  className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                                  title="Download"
                                >
                                  <Download size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {files.length > 0 && (
                      <div className="px-4 py-3 bg-gray-50 text-xs text-gray-600 border-t border-gray-200">
                        Showing {files.length} files
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-byght-turquoise text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Settings className="text-byght-turquoise" size={20} />
                    Open Confluence administration
                  </h3>
                  <p className="text-gray-600">
                    Go to <strong>Settings → Administration</strong>.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-byght-turquoise text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Folder className="text-byght-turquoise" size={20} />
                    Import the space(s)
                  </h3>
                  <p className="text-gray-600 mb-3">
                    <strong>Data management → Import spaces →</strong> select the <strong>Space export file (.zip)</strong>.
                  </p>
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                    <p className="text-sm text-amber-800">
                      <span className="font-semibold">⚠️ Important:</span> If you're using the <strong>IMS SmartKit</strong>, import the IMS space first, then import the other spaces provided (e.g. ISMS, QMS, EMS/UMS, DPMS/DSMS).
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-byght-turquoise text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <FileCheck className="text-byght-turquoise" size={20} />
                    Skip macro repair
                  </h3>
                  <p className="text-gray-600">
                    When prompted, choose <strong>Skip macro repair</strong>.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-byght-turquoise text-white rounded-full flex items-center justify-center font-bold">
                  5
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <CheckCircle className="text-green-500" size={20} />
                    Finish & verify
                  </h3>
                  <p className="text-gray-600">
                    Go to <strong>Spaces → View all spaces</strong> and open the newly imported SmartKit space(s).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200 mb-8"></div>

          {/* Hand-off to Byght */}
          <div className="mb-8 bg-green-50 border-l-4 border-green-400 p-6 rounded-r-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="text-green-500" size={24} />
              Hand-off to Byght (setup & testing)
            </h2>
            <p className="text-gray-700 mb-4">
              We'll complete the configuration and test everything so your SmartKit is production-ready. 👀
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <ChevronRight className="text-green-500 mt-1 flex-shrink-0" size={20} />
                <div>
                  <strong className="text-gray-800">Grant our service account access to the imported space(s):</strong>
                  <div className="mt-1 font-mono text-sm bg-gray-100 px-2 py-1 rounded inline-block">
                    isms-smartkit@byght.de
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    <strong>Recommended:</strong> Space Admin permissions.
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="text-green-500 mt-1 flex-shrink-0" size={20} />
                <div>
                  <strong className="text-gray-800">Let us know when you're done</strong>
                  <div className="text-sm text-gray-600 mt-1">
                    Ping us once import & permissions are set—or if you'd like a guided import.
                  </div>
                </div>
              </li>
            </ul>
          </div>

          {/* Need help? */}
          <div className="mb-8 border-t pt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Mail className="text-byght-turquoise" size={24} />
              Need help?
            </h2>
            <p className="text-gray-600">
              We're happy to assist with the import, configuration, and final checks.
            </p>
            <p className="mt-3">
              <strong className="text-gray-800">📧 Contact us:</strong>{' '}
              <a href="mailto:Fragen@byght.io" className="text-byght-turquoise hover:text-byght-turquoise/80 font-medium">
                Fragen@byght.io
              </a>
            </p>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200 mb-8"></div>

          {/* FAQs */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <HelpCircle className="text-blue-500" size={24} />
              FAQs
            </h2>
            
            <div className="space-y-3">
              {/* FAQ 1 */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleFaq('faq1')}
                  className="w-full px-5 py-4 text-left bg-white hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <h3 className="font-semibold text-gray-800">
                    "File type or format not recognized." What now?
                  </h3>
                  <div className="flex-shrink-0 ml-4">
                    {expandedFaq === 'faq1' ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </button>
                {expandedFaq === 'faq1' && (
                  <div className="px-5 pb-4 bg-gray-50">
                    <p className="text-gray-600 flex items-start gap-2">
                      <span className="text-amber-500">👉</span>
                      <span>Upload the original <code className="bg-gray-200 px-1 rounded">.zip</code> (don't unzip) via <strong>Data management → Import spaces</strong> using <strong>Space import</strong>.</span>
                    </p>
                  </div>
                )}
              </div>

              {/* FAQ 2 */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleFaq('faq2')}
                  className="w-full px-5 py-4 text-left bg-white hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <h3 className="font-semibold text-gray-800">
                    "Space key already exists" or name conflict.
                  </h3>
                  <div className="flex-shrink-0 ml-4">
                    {expandedFaq === 'faq2' ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </button>
                {expandedFaq === 'faq2' && (
                  <div className="px-5 pb-4 bg-gray-50">
                    <p className="text-gray-600 flex items-start gap-2">
                      <span className="text-amber-500">👉</span>
                      <span>An earlier import or a conflicting key likely exists. Either remove/rename the existing space or import using a different space key/name. If you're unsure, tell us and we'll help.</span>
                    </p>
                  </div>
                )}
              </div>

              {/* FAQ 3 */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleFaq('faq3')}
                  className="w-full px-5 py-4 text-left bg-white hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <h3 className="font-semibold text-gray-800">
                    Can't find the space(s) after import / need to reset access.
                  </h3>
                  <div className="flex-shrink-0 ml-4">
                    {expandedFaq === 'faq3' ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </button>
                {expandedFaq === 'faq3' && (
                  <div className="px-5 pb-4 bg-gray-50">
                    <div className="text-gray-600">
                      <p className="flex items-start gap-2 mb-2">
                        <span className="text-amber-500">👉</span>
                        <span>As a <strong>Confluence Site Admin</strong>:</span>
                      </p>
                      <ul className="ml-8 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-gray-400">•</span>
                          <span>Go to <strong>Settings → Space permissions</strong>, find the space(s) by name or key.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-400">•</span>
                          <span>Use <strong>Recover permissions / Grant space permissions</strong> to add yourself as <strong>Space Admin</strong>.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-400">•</span>
                          <span>Open the space(s) → <strong>Space settings → Security → Permissions</strong> and:</span>
                        </li>
                      </ul>
                      <ul className="ml-14 mt-2 space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-gray-400">◦</span>
                          <span>Add your standard user groups (e.g., <code className="bg-gray-200 px-1 rounded">confluence-users</code>) with <strong>View</strong> (and any additional) rights.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-400">◦</span>
                          <span>Add your admin group/users with <strong>Admin</strong>. </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* FAQ 4 */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleFaq('faq4')}
                  className="w-full px-5 py-4 text-left bg-white hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <h3 className="font-semibold text-gray-800">
                    I don't want to give you space admin permissions. Is a Guest user also possible for the setup?
                  </h3>
                  <div className="flex-shrink-0 ml-4">
                    {expandedFaq === 'faq4' ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </button>
                {expandedFaq === 'faq4' && (
                  <div className="px-5 pb-4 bg-gray-50">
                    <p className="text-gray-600 flex items-start gap-2">
                      <span className="text-amber-500">👉</span>
                      <span>Yes, but we are a bit limited as guest users. There will be 1-2 things remaining which we need to adjust together with you during the intro.</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;