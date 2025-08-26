import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Upload, 
  Users, 
  FileText, 
  Trash2, 
  ArrowLeft, 
  Plus,
  X,
  Check,
  Edit2,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import Cookies from 'js-cookie';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('files');
  const [files, setFiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [productLabel, setProductLabel] = useState('');
  const [versionLabel, setVersionLabel] = useState('');
  const [languageLabel, setLanguageLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [newUser, setNewUser] = useState({ 
    username: '', 
    password: '', 
    isAdmin: false,
    expiryDate: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 4 weeks from today
  });
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // States for user-file assignment management
  const [editingUser, setEditingUser] = useState(null);
  const [showEditUserFiles, setShowEditUserFiles] = useState(false);
  const [editSelectedFiles, setEditSelectedFiles] = useState([]);
  const [updatingUserFiles, setUpdatingUserFiles] = useState(false);
  const [userFiles, setUserFiles] = useState({});
  const [deletingFile, setDeletingFile] = useState(null);
  const [loadingUserFiles, setLoadingUserFiles] = useState({});
  const [editingExpiryDate, setEditingExpiryDate] = useState({});
  const [updatingExpiryDate, setUpdatingExpiryDate] = useState({});
  const [cleaningUp, setCleaningUp] = useState(false);
  
  // File editing states
  const [editingFile, setEditingFile] = useState(null);
  const [showEditFileModal, setShowEditFileModal] = useState(false);
  const [editFileLabels, setEditFileLabels] = useState({ productLabel: '', versionLabel: '', languageLabel: '' });
  const [updatingFile, setUpdatingFile] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterVersion, setFilterVersion] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchFiles(), fetchUsers()]);
    setLoading(false);
  };

  const fetchFiles = async () => {
    try {
      const token = Cookies.get('auth_token');
      const response = await fetch('/.netlify/functions/admin-files-list', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = Cookies.get('auth_token');
      const response = await fetch('/.netlify/functions/admin-users-list', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        // Load files for all users
        await fetchAllUserFiles(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAllUserFiles = async (usersList) => {
    const userFilesData = {};
    const loadingStates = {};
    
    for (const user of usersList) {
      loadingStates[user.id] = true;
      try {
        const token = Cookies.get('auth_token');
        const response = await fetch(`/.netlify/functions/admin-get-user-files?userId=${user.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          userFilesData[user.id] = data.files || [];
        } else {
          userFilesData[user.id] = [];
        }
      } catch (error) {
        console.error(`Error fetching files for user ${user.id}:`, error);
        userFilesData[user.id] = [];
      } finally {
        loadingStates[user.id] = false;
      }
    }
    
    setUserFiles(userFilesData);
    setLoadingUserFiles(loadingStates);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      alert('Please select at least one file.');
      return;
    }

    setUploading(true);
    
    for (const file of uploadFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', description);
      formData.append('productLabel', productLabel);
      formData.append('versionLabel', versionLabel);
      formData.append('languageLabel', languageLabel);

      try {
        const token = Cookies.get('auth_token');
        const response = await fetch('/.netlify/functions/admin-upload-file', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          alert(`Error uploading ${file.name}: ${error.error}`);
        }
      } catch (error) {
        alert(`Error uploading ${file.name}: ${error.message}`);
      }
    }

    setUploadFiles([]);
    setDescription('');
    setProductLabel('');
    setVersionLabel('');
    setLanguageLabel('');
    setUploading(false);
    fetchFiles();
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setUploadFiles(files);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      setUploadFiles(files);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Do you really want to delete this file?')) return;
    
    setDeletingFile(fileId);
    try {
      const token = Cookies.get('auth_token');
      const response = await fetch('/.netlify/functions/admin-delete-file', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Deletion successful:', result);
        
        // Show debug information
        if (result.debugInfo) {
          console.log('Debug-Info:', {
            'Blob existed before': result.debugInfo.blobExistedBefore,
            'Blob exists after': result.debugInfo.blobExistsAfter,
            'Blob was deleted': result.debugInfo.blobDeleted
          });
        }
        
        // Show success feedback
        if (result.blobDeleted) {
          console.log(`✅ File ${result.fileId} and blob ${result.blobKey} were successfully deleted`);
        } else if (result.debugInfo?.blobExistedBefore) {
          console.error(`⚠️ File ${result.fileId} was deleted from DB, but blob ${result.blobKey} could not be deleted!`);
        } else {
          console.warn(`ℹ️ File ${result.fileId} was deleted from DB (no blob present)`);
        }
        
        fetchFiles();
      } else {
        const error = await response.json();
        alert('Error deleting: ' + error.error);
      }
    } catch (error) {
      alert('Error deleting: ' + error.message);
    } finally {
      setDeletingFile(null);
    }
  };

  const handleCleanupOrphanedFiles = async () => {
    if (!confirm('Do you really want to clean up all orphaned files from blob storage? This action cannot be undone.')) return;
    
    setCleaningUp(true);
    try {
      const token = Cookies.get('auth_token');
      const response = await fetch('/.netlify/functions/admin-cleanup-orphaned-files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Cleanup completed!\n\nDeleted files: ${result.deletedCount}\nOrphaned files found: ${result.totalOrphaned}${result.errors ? '\n\nErrors occurred: ' + result.errors.length : ''}`);
      } else {
        const error = await response.json();
        alert('Error during cleanup: ' + error.error);
      }
    } catch (error) {
      alert('Error during cleanup: ' + error.message);
    } finally {
      setCleaningUp(false);
    }
  };



  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = Cookies.get('auth_token');
      const response = await fetch('/.netlify/functions/admin-create-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        setNewUser({ 
          username: '', 
          password: '', 
          isAdmin: false,
          expiryDate: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        setShowNewUserForm(false);
        fetchUsers();
      } else {
        const error = await response.json();
        alert('Error creating: ' + error.error);
      }
    } catch (error) {
      alert('Error creating: ' + error.message);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Do you really want to delete user "${username}"?`)) return;
    
    try {
      const token = Cookies.get('auth_token');
      const response = await fetch('/.netlify/functions/admin-delete-user', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        fetchUsers();
      } else {
        const error = await response.json();
        alert('Error deleting: ' + error.error);
      }
    } catch (error) {
      alert('Error deleting: ' + error.message);
    }
  };

  const handleEditUserFiles = async (user) => {
    setEditingUser(user);
    setShowEditUserFiles(true);
    setEditSelectedFiles(userFiles[user.id]?.map(f => f.id) || []);
  };

  const handleUpdateUserFiles = async () => {
    setUpdatingUserFiles(true);
    try {
      const token = Cookies.get('auth_token');
      const response = await fetch('/.netlify/functions/admin-update-user-files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: editingUser.id,
          fileIds: editSelectedFiles,
        }),
      });

      if (response.ok) {
        setShowEditUserFiles(false);
        setEditingUser(null);
        // Update user list
        await fetchUsers();
        alert('File assignments successfully updated');
      } else {
        const error = await response.json();
        alert('Error updating: ' + error.error);
      }
    } catch (error) {
      alert('Error updating: ' + error.message);
    } finally {
      setUpdatingUserFiles(false);
    }
  };

  const handleUpdateExpiryDate = async (userId, newExpiryDate) => {
    setUpdatingExpiryDate({ ...updatingExpiryDate, [userId]: true });
    try {
      const token = Cookies.get('auth_token');
      const response = await fetch('/.netlify/functions/admin-update-user', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          expiryDate: newExpiryDate,
        }),
      });

      if (response.ok) {
        setEditingExpiryDate({ ...editingExpiryDate, [userId]: false });
        await fetchUsers();
        alert('Expiry date successfully updated');
      } else {
        const error = await response.json();
        alert('Error updating: ' + error.error);
      }
    } catch (error) {
      alert('Error updating: ' + error.message);
    } finally {
      setUpdatingExpiryDate({ ...updatingExpiryDate, [userId]: false });
    }
  };

  const handleEditFile = (file) => {
    setEditingFile(file);
    setEditFileLabels({
      productLabel: file.productLabel || '',
      versionLabel: file.versionLabel || '',
      languageLabel: file.languageLabel || ''
    });
    setShowEditFileModal(true);
  };

  const handleUpdateFileLabels = async () => {
    setUpdatingFile(true);
    try {
      const token = Cookies.get('auth_token');
      const response = await fetch('/.netlify/functions/admin-update-file-labels', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: editingFile.id,
          productLabel: editFileLabels.productLabel || null,
          versionLabel: editFileLabels.versionLabel || null,
          languageLabel: editFileLabels.languageLabel || null,
        }),
      });

      if (response.ok) {
        setShowEditFileModal(false);
        setEditingFile(null);
        await fetchFiles();
        alert('File labels successfully updated');
      } else {
        const error = await response.json();
        alert('Error updating: ' + error.error);
      }
    } catch (error) {
      alert('Error updating: ' + error.message);
    } finally {
      setUpdatingFile(false);
    }
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

  const formatExpiryDate = (dateString) => {
    if (!dateString) return 'No expiry date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const isUserExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  // Filter functions
  const filteredFiles = files.filter(file => {
    const matchesSearch = !searchTerm || 
      file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (file.description && file.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesProduct = !filterProduct || file.productLabel === filterProduct;
    const matchesVersion = !filterVersion || file.versionLabel === filterVersion;
    const matchesLanguage = !filterLanguage || file.languageLabel === filterLanguage;
    
    return matchesSearch && matchesProduct && matchesVersion && matchesLanguage;
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = !userSearchTerm || 
      user.username.toLowerCase().includes(userSearchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Get unique values for filter dropdowns
  const uniqueProducts = [...new Set(files.map(f => f.productLabel).filter(Boolean))];
  const uniqueVersions = [...new Set(files.map(f => f.versionLabel).filter(Boolean))];
  const uniqueLanguages = [...new Set(files.map(f => f.languageLabel).filter(Boolean))];

  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-byght-lightgray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-byght-gray hover:text-byght-turquoise transition-colors"
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>
              <h1 className="text-xl font-semibold text-byght-gray">Admin Panel</h1>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="text-byght-gray hover:text-red-500 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm p-1 mb-6 inline-flex">
          <button
            onClick={() => setActiveTab('files')}
            className={`px-6 py-2.5 rounded-md font-medium transition-colors ${
              activeTab === 'files'
                ? 'bg-byght-turquoise text-white'
                : 'text-byght-gray hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText size={18} />
              <span>Files</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2.5 rounded-md font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-byght-turquoise text-white'
                : 'text-byght-gray hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={18} />
              <span>Users</span>
            </div>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-byght-turquoise mx-auto mb-4"></div>
              <p className="text-gray-600">Loading data...</p>
            </div>
          </div>
        ) : activeTab === 'files' ? (
          <div className="space-y-6">
            {/* File Upload Form */}
            <div className="card">
              <h2 className="text-xl font-semibold text-byght-gray mb-4">Upload New File</h2>
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive
                      ? 'border-byght-turquoise bg-byght-turquoise/5'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-byght-gray mb-1">
                      Drop files here or click to select
                    </p>
                    <p className="text-xs text-gray-500">Multiple files possible</p>
                  </label>
                </div>

                {uploadFiles.length > 0 && (
                  <div className="mt-4 p-3 bg-byght-turquoise/10 rounded-lg border border-byght-turquoise/20">
                    <p className="font-medium text-byght-turquoise mb-2 text-sm">Selected files:</p>
                    <ul className="space-y-1">
                      {uploadFiles.map((file, index) => (
                        <li key={index} className="text-sm text-gray-600">
                          {file.name} ({formatFileSize(file.size)})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-byght-gray mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-field"
                    placeholder="Brief description of the file(s)"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-byght-gray mb-1">
                      Produkt (optional)
                    </label>
                    <select
                      value={productLabel}
                      onChange={(e) => setProductLabel(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Kein Produkt</option>
                      <option value="IMS SmartKit">IMS SmartKit</option>
                      <option value="ISMS SmartKit">ISMS SmartKit</option>
                      <option value="DSMS SmartKit">DSMS SmartKit</option>
                      <option value="Addon">Addon</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-byght-gray mb-1">
                      Version (optional)
                    </label>
                    <input
                      type="text"
                      value={versionLabel}
                      onChange={(e) => {
                        // Nur Zahlen und Punkte erlauben
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        setVersionLabel(value);
                      }}
                      className="input-field"
                      placeholder="z.B. 1.2.3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-byght-gray mb-1">
                      Sprache (optional)
                    </label>
                    <select
                      value={languageLabel}
                      onChange={(e) => setLanguageLabel(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Keine Sprache</option>
                      <option value="EN">EN</option>
                      <option value="DE">DE</option>
                      <option value="EN/DE">EN/DE</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploading || uploadFiles.length === 0}
                  className="btn-primary w-full sm:w-auto"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </form>
            </div>

            {/* Files List */}
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-byght-gray">Uploaded Files</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-600">{filteredFiles.length} of {files.length} file(s)</span>
                  <button
                    onClick={handleCleanupOrphanedFiles}
                    disabled={cleaningUp}
                    className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Clean up orphaned files from blob storage"
                  >
                    {cleaningUp ? 'Cleaning...' : 'Clean blobs'}
                  </button>
                </div>
              </div>

              {/* Filter Section */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Suche
                    </label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-byght-turquoise"
                      placeholder="Dateiname oder Beschreibung..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Produkt
                    </label>
                    <select
                      value={filterProduct}
                      onChange={(e) => setFilterProduct(e.target.value)}
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-byght-turquoise"
                    >
                      <option value="">Alle Produkte</option>
                      {uniqueProducts.map(product => (
                        <option key={product} value={product}>{product}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Version
                    </label>
                    <select
                      value={filterVersion}
                      onChange={(e) => setFilterVersion(e.target.value)}
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-byght-turquoise"
                    >
                      <option value="">Alle Versionen</option>
                      {uniqueVersions.map(version => (
                        <option key={version} value={version}>{version}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Sprache
                    </label>
                    <select
                      value={filterLanguage}
                      onChange={(e) => setFilterLanguage(e.target.value)}
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-byght-turquoise"
                    >
                      <option value="">Alle Sprachen</option>
                      {uniqueLanguages.map(language => (
                        <option key={language} value={language}>{language}</option>
                      ))}
                    </select>
                  </div>

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
                      Filter zurücksetzen
                    </button>
                  </div>
                </div>
              </div>
              
                              {filteredFiles.length === 0 ? (
                  <p className="text-gray-600 text-center py-6">
                    {files.length === 0 ? 'No files available' : 'No files match the current filters'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Filename
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                            Labels
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                            Size
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                            Date
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredFiles.map((file) => (
                        <tr key={file.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="text-xs font-medium text-byght-gray truncate max-w-xs">{file.filename}</div>
                            {file.description && (
                              <div className="text-xs text-gray-500 truncate max-w-xs">{file.description}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap hidden lg:table-cell">
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
                          <td className="px-3 py-2 whitespace-nowrap hidden sm:table-cell">
                            <span className="text-xs text-gray-600">{formatFileSize(file.size)}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap hidden md:table-cell">
                            <span className="text-xs text-gray-600">{formatDate(file.uploadedAt)}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            <div className="flex justify-end space-x-1">
                              <button
                                onClick={() => handleEditFile(file)}
                                className="text-byght-turquoise hover:text-byght-turquoise/80 transition-colors p-1"
                                title="Edit labels"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteFile(file.id)}
                                disabled={deletingFile === file.id}
                                className="text-red-500 hover:text-red-700 transition-colors p-1"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* User Creation Form */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-byght-gray">Create New User</h2>
                <button
                  onClick={() => setShowNewUserForm(!showNewUserForm)}
                  className="btn-secondary"
                >
                  {showNewUserForm ? <X size={18} /> : <Plus size={18} />}
                </button>
              </div>
              
              {showNewUserForm && (
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-byght-gray mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-byght-gray mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="input-field pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isAdmin"
                      checked={newUser.isAdmin}
                      onChange={(e) => setNewUser({ ...newUser, isAdmin: e.target.checked })}
                      className="h-4 w-4 text-byght-turquoise focus:ring-byght-turquoise border-gray-300 rounded"
                    />
                    <label htmlFor="isAdmin" className="ml-2 text-sm text-byght-gray">
                      Administrator rights
                    </label>
                  </div>
                  
                  {!newUser.isAdmin && (
                    <div>
                      <label className="block text-sm font-medium text-byght-gray mb-1">
                        Expiry date (Standard user)
                      </label>
                      <input
                        type="date"
                        value={newUser.expiryDate}
                        onChange={(e) => setNewUser({ ...newUser, expiryDate: e.target.value })}
                        className="input-field"
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Standard users can only log in until this date
                      </p>
                    </div>
                  )}
                  
                  <button type="submit" className="btn-primary w-full sm:w-auto">
                    Create User
                  </button>
                </form>
              )}
            </div>

            {/* Users List */}
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-byght-gray">Manage Users</h2>
                <span className="text-xs text-gray-600">{filteredUsers.length} of {users.length} users</span>
              </div>

              {/* User Search */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-byght-turquoise focus:border-transparent"
                    placeholder="Nach Benutzernamen suchen..."
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users size={16} className="text-gray-400" />
                  </div>
                  {userSearchTerm && (
                    <button
                      onClick={() => setUserSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
              
              {filteredUsers.length === 0 ? (
                <p className="text-gray-600 text-center py-6">
                  {users.length === 0 ? 'No users available' : 'No users match the current search'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-byght-gray">{user.username}</span>
                          {user.isAdmin ? (
                            <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-byght-yellow/20 text-byght-gray">
                              Admin
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-700">
                              User
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          {!user.isAdmin && (
                            <button
                              onClick={() => handleEditUserFiles(user)}
                              className="text-byght-turquoise hover:text-byght-turquoise/80 transition-colors p-1"
                              title="Assign files"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            className="text-red-500 hover:text-red-700 transition-colors p-1"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Expiry date for standard users */}
                      {!user.isAdmin && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-600">Expiry date:</span>
                            {editingExpiryDate[user.id] ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="date"
                                  defaultValue={user.expiryDate || ''}
                                  className="text-xs border border-gray-300 rounded px-2 py-1"
                                  min={new Date().toISOString().split('T')[0]}
                                  data-user-id={user.id}
                                />
                                <button
                                  onClick={() => {
                                    const input = document.querySelector(`input[type="date"][data-user-id="${user.id}"]`);
                                    if (input && input.value) {
                                      handleUpdateExpiryDate(user.id, input.value);
                                    }
                                  }}
                                  disabled={updatingExpiryDate[user.id]}
                                  className="text-green-600 hover:text-green-700 transition-colors p-1"
                                  title="Save"
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  onClick={() => setEditingExpiryDate({ ...editingExpiryDate, [user.id]: false })}
                                  className="text-gray-500 hover:text-gray-700 transition-colors p-1"
                                  title="Cancel"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className={`text-xs ${
                                  isUserExpired(user.expiryDate) 
                                    ? 'text-red-600 font-medium' 
                                    : getDaysUntilExpiry(user.expiryDate) <= 7 
                                      ? 'text-orange-600 font-medium'
                                      : 'text-gray-700'
                                }`}>
                                  {formatExpiryDate(user.expiryDate)}
                                  {!isUserExpired(user.expiryDate) && getDaysUntilExpiry(user.expiryDate) !== null && (
                                    <span className="ml-1">
                                      ({getDaysUntilExpiry(user.expiryDate)} days)
                                    </span>
                                  )}
                                </span>
                                <button
                                  onClick={() => setEditingExpiryDate({ ...editingExpiryDate, [user.id]: true })}
                                  className="text-byght-turquoise hover:text-byght-turquoise/80 transition-colors p-1"
                                  title="Edit expiry date"
                                >
                                  <Edit2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                          {isUserExpired(user.expiryDate) && (
                            <div className="text-xs text-red-600 font-medium mt-1">
                              ⚠️ User has expired and can no longer log in
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Assigned files */}
                      <div className="mt-2">
                        {loadingUserFiles[user.id] ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-byght-turquoise"></div>
                            <span className="text-xs text-gray-500">Loading files...</span>
                          </div>
                        ) : user.isAdmin ? (
                          <div className="text-xs text-gray-600 italic">
                            Admins always have access to all files
                          </div>
                        ) : userFiles[user.id] && userFiles[user.id].length > 0 ? (
                          <div>
                            <div className="text-xs font-medium text-gray-600 mb-1">
                              Assigned files ({userFiles[user.id].length}):
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                              {userFiles[user.id].map((file) => (
                                <div key={file.id} className="flex items-center space-x-2 p-1 bg-gray-100 rounded text-xs">
                                  <FileText className="h-3 w-3 text-byght-turquoise flex-shrink-0" />
                                  <span className="text-gray-700 truncate">{file.filename}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 italic">
                            No files assigned
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit User Files Modal */}
        {showEditUserFiles && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-byght-gray">
                    File assignments for {editingUser.username}
                  </h3>
                  <button
                    onClick={() => setShowEditUserFiles(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-2 mb-4">
                  {files.map((file) => (
                    <label key={file.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={editSelectedFiles.includes(file.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditSelectedFiles([...editSelectedFiles, file.id]);
                          } else {
                            setEditSelectedFiles(editSelectedFiles.filter(id => id !== file.id));
                          }
                        }}
                        className="h-4 w-4 text-byght-turquoise focus:ring-byght-turquoise border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm text-byght-gray">{file.filename}</span>
                    </label>
                  ))}
                </div>
                
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowEditUserFiles(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateUserFiles}
                    disabled={updatingUserFiles}
                    className="btn-primary"
                  >
                    {updatingUserFiles ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit File Labels Modal */}
        {showEditFileModal && editingFile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-byght-gray">
                    Labels bearbeiten: {editingFile.filename}
                  </h3>
                  <button
                    onClick={() => setShowEditFileModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-byght-gray mb-1">
                      Produkt
                    </label>
                    <select
                      value={editFileLabels.productLabel}
                      onChange={(e) => setEditFileLabels({ ...editFileLabels, productLabel: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Kein Produkt</option>
                      <option value="IMS SmartKit">IMS SmartKit</option>
                      <option value="ISMS SmartKit">ISMS SmartKit</option>
                      <option value="DSMS SmartKit">DSMS SmartKit</option>
                      <option value="Addon">Addon</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-byght-gray mb-1">
                      Version
                    </label>
                    <input
                      type="text"
                      value={editFileLabels.versionLabel}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        setEditFileLabels({ ...editFileLabels, versionLabel: value });
                      }}
                      className="input-field"
                      placeholder="z.B. 1.2.3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-byght-gray mb-1">
                      Sprache
                    </label>
                    <select
                      value={editFileLabels.languageLabel}
                      onChange={(e) => setEditFileLabels({ ...editFileLabels, languageLabel: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Keine Sprache</option>
                      <option value="EN">EN</option>
                      <option value="DE">DE</option>
                      <option value="EN/DE">EN/DE</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => setShowEditFileModal(false)}
                    className="btn-secondary"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleUpdateFileLabels}
                    disabled={updatingFile}
                    className="btn-primary"
                  >
                    {updatingFile ? 'Speichern...' : 'Speichern'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;