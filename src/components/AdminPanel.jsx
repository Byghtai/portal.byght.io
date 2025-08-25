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
  Settings,
  Menu,
  Search,
  Filter,
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
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', isAdmin: false });
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [showAdminDeleteConfirm, setShowAdminDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Neue States für Benutzer-Datei-Zuweisungsverwaltung
  const [editingUser, setEditingUser] = useState(null);
  const [showEditUserFiles, setShowEditUserFiles] = useState(false);
  const [editSelectedFiles, setEditSelectedFiles] = useState([]);
  const [updatingUserFiles, setUpdatingUserFiles] = useState(false);
  const [userFiles, setUserFiles] = useState([]);
  const [deletingFile, setDeletingFile] = useState(null);

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
        console.log('Users data from API:', data.users); // Debug-Ausgabe
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      alert('Bitte wählen Sie mindestens eine Datei aus.');
      return;
    }

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const token = Cookies.get('auth_token');
      
      for (const file of uploadFiles) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('users', JSON.stringify([]));
          formData.append('description', description);

          const response = await fetch('/.netlify/functions/admin-upload-file', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Upload failed for ${file.name}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`Upload error for ${file.name}:`, error);
        }
      }

      if (successCount > 0) {
        alert(`${successCount} Datei(en) erfolgreich hochgeladen!${errorCount > 0 ? ` ${errorCount} Datei(en) konnten nicht hochgeladen werden.` : ''}`);
        setUploadFiles([]);
        setDescription('');
        fetchFiles();
      } else {
        throw new Error('Alle Uploads fehlgeschlagen');
      }
    } catch (error) {
      alert('Fehler beim Upload: ' + error.message);
    } finally {
      setUploading(false);
    }
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
      const newFiles = Array.from(e.dataTransfer.files);
      setUploadFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setUploadFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Möchten Sie diese Datei wirklich löschen?')) return;

    setDeletingFile(fileId);
    try {
      const token = Cookies.get('auth_token');
      const response = await fetch(`/.netlify/functions/admin-delete-file`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message || 'Datei erfolgreich gelöscht!');
        await fetchFiles(); // Warten bis die Liste aktualisiert ist
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Löschen der Datei');
      }
    } catch (error) {
      console.error('Delete file error:', error);
      alert('Fehler beim Löschen: ' + error.message);
    } finally {
      setDeletingFile(null);
    }
  };

  // Neue Funktionen für Benutzer-Datei-Zuweisungsverwaltung
  const handleEditUserFiles = async (user) => {
    setEditingUser(user);
    setShowEditUserFiles(true);
    
    try {
      const token = Cookies.get('auth_token');
      const response = await fetch(`/.netlify/functions/admin-get-user-files?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserFiles(data.files || []);
        setEditSelectedFiles(data.files.map(file => file.id) || []);
      }
    } catch (error) {
      console.error('Error fetching user files:', error);
      setUserFiles([]);
      setEditSelectedFiles([]);
    }
  };

  const handleUpdateUserFiles = async () => {
    if (!editingUser) return;

    setUpdatingUserFiles(true);
    try {
      const token = Cookies.get('auth_token');
      const response = await fetch('/.netlify/functions/admin-update-user-files', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: editingUser.id,
          fileIds: editSelectedFiles
        }),
      });

      if (response.ok) {
        alert('Datei-Zuweisungen erfolgreich aktualisiert!');
        setShowEditUserFiles(false);
        setEditingUser(null);
        setEditSelectedFiles([]);
        setUserFiles([]);
        fetchFiles(); // Liste aktualisieren
      } else {
        throw new Error('Update fehlgeschlagen');
      }
    } catch (error) {
      alert('Fehler beim Aktualisieren: ' + error.message);
    } finally {
      setUpdatingUserFiles(false);
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
        alert('Benutzer erfolgreich erstellt!');
        setNewUser({ username: '', password: '', isAdmin: false });
        setShowNewUserForm(false);
        fetchUsers();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Fehler beim Erstellen des Benutzers');
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteUser = async (userId, forceDeleteAdmin = false) => {
    const user = users.find(u => u.id === userId);
    
    // Spezielle Behandlung für Standard-Admin
    if (user && user.username === 'admin') {
      if (!forceDeleteAdmin) {
        setUserToDelete(user);
        setShowAdminDeleteConfirm(true);
        return;
      }
    } else {
      // Normale Bestätigung für andere Benutzer
      if (!confirm('Möchten Sie diesen Benutzer wirklich löschen?')) return;
    }

    try {
      const token = Cookies.get('auth_token');
      const response = await fetch(`/.netlify/functions/admin-delete-user`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, forceDeleteAdmin }),
      });

      const data = await response.json();

      if (response.ok) {
        if (user && user.username === 'admin') {
          alert('Standard-Admin-User erfolgreich gelöscht!');
        }
        fetchUsers();
      } else {
        if (data.requiresConfirmation) {
          setUserToDelete(user);
          setShowAdminDeleteConfirm(true);
        } else {
          alert('Fehler beim Löschen: ' + data.error);
        }
      }
    } catch (error) {
      alert('Fehler beim Löschen: ' + error.message);
    }
  };

  const confirmAdminDelete = async () => {
    if (userToDelete) {
      await handleDeleteUser(userToDelete.id, true);
      setShowAdminDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const cancelAdminDelete = () => {
    setShowAdminDeleteConfirm(false);
    setUserToDelete(null);
  };

  // Hilfsfunktion für Datumsformatierung
  const formatDate = (dateString) => {
    if (!dateString) return 'Unbekannt';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Ungültiges Datum';
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Ungültiges Datum';
    }
  };

  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (file.description && file.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/3 rounded-full animate-float"></div>
        <div className="absolute bottom-10 left-10 w-24 h-24 bg-white/3 rounded-full animate-float" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute top-1/3 left-1/2 w-16 h-16 bg-white/2 rounded-full animate-float" style={{animationDelay: '3s'}}></div>
      </div>

      {/* Header - Cleaner */}
      <header className="glass-effect border-b border-white/15 relative z-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-white/85 hover:text-white transition-all duration-200 text-sm font-medium"
              >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline">Zurück</span>
              </button>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg p-3 sm:p-4 border border-white/30">
                  <Settings className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white drop-shadow-md">Admin Panel</h1>
                  <p className="text-sm sm:text-base text-white/80 font-medium hidden sm:block">Systemverwaltung</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="text-white/85 hover:text-red-200 font-medium transition-all duration-200 text-sm"
            >
              <span className="hidden sm:inline">Abmelden</span>
              <span className="sm:hidden">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs - Cleaner */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 relative z-10">
        <div className="glass-effect rounded-2xl p-1 mb-6">
          <nav className="flex space-x-1">
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === 'files'
                  ? 'bg-white/90 backdrop-blur-sm text-[rgb(10,16,69)] shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText size={16} />
                <span className="hidden sm:inline">Dateiverwaltung</span>
                <span className="sm:hidden">Dateien</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === 'users'
                  ? 'bg-white/90 backdrop-blur-sm text-[rgb(10,16,69)] shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users size={16} />
                <span className="hidden sm:inline">Benutzerverwaltung</span>
                <span className="sm:hidden">Benutzer</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Content - Cleaner */}
      <main className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 relative z-10">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="glass-effect rounded-2xl p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white font-medium text-sm">Lade Daten...</p>
            </div>
          </div>
        ) : activeTab === 'files' ? (
          <div className="space-y-6 sm:space-y-8 lg:space-y-10">
            {/* Upload Form - Drag & Drop */}
            <div className="card">
              <h2 className="text-xl sm:text-2xl font-bold text-primary mb-6">Dateien hochladen</h2>
              <form onSubmit={handleFileUpload} className="space-y-6 sm:space-y-8">
                {/* Drag & Drop Zone */}
                <div
                  className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 ${
                    dragActive 
                      ? 'border-[rgb(255,179,0)] bg-[rgb(255,179,0)]/10 scale-105' 
                      : 'border-gray-300 hover:border-[rgb(255,179,0)] hover:bg-gray-50/50'
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
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept="*/*"
                  />
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-[rgb(255,179,0)] to-[rgb(56,184,189)] rounded-2xl flex items-center justify-center">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-primary mb-2">
                        Dateien hier ablegen oder klicken zum Auswählen
                      </p>
                      <p className="text-sm text-gray-600">
                        Mehrere Dateien werden unterstützt
                      </p>
                    </div>
                  </div>
                </div>

                {/* Selected Files List */}
                {uploadFiles.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-primary">Ausgewählte Dateien ({uploadFiles.length})</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {uploadFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-[rgb(255,179,0)] to-[rgb(56,184,189)] rounded-lg flex items-center justify-center">
                              <FileText className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-primary">{file.name}</p>
                              <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm sm:text-base lg:text-lg font-bold text-primary mb-3 sm:mb-4">
                    Beschreibung (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-field"
                    rows="3"
                    placeholder="Beschreibung für alle ausgewählten Dateien..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading || uploadFiles.length === 0}
                  className="btn-primary flex items-center gap-3 mobile-button disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload size={18} className="sm:w-5 sm:h-5" />
                  {uploading ? `Wird hochgeladen... (${uploadFiles.length} Datei${uploadFiles.length > 1 ? 'en' : ''})` : `${uploadFiles.length} Datei${uploadFiles.length > 1 ? 'en' : ''} hochladen`}
                </button>
              </form>
            </div>

            {/* Search Bar */}
            {files.length > 0 && (
              <div className="mb-6">
                <div className="relative max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Dateien durchsuchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl text-[rgb(10,16,69)] placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-[rgb(255,179,0)]/20 focus:border-[rgb(255,179,0)] transition-all duration-300"
                  />
                </div>
              </div>
            )}

            {/* Files List */}
            <div className="card">
              <div className="mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-black text-primary">Alle Dateien</h2>
              </div>
              <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-2xl">
                <table className="min-w-full divide-y divide-gray-200/50">
                  <thead>
                    <tr>
                      <th className="px-4 py-4 sm:px-6 sm:py-5 text-left text-xs sm:text-sm lg:text-base font-bold text-primary uppercase tracking-wider">
                        Dateiname
                      </th>
                      <th className="px-4 py-4 sm:px-6 sm:py-5 text-left text-xs sm:text-sm lg:text-base font-bold text-primary uppercase tracking-wider hidden sm:table-cell">
                        Zugewiesen an
                      </th>
                      <th className="px-4 py-4 sm:px-6 sm:py-5 text-left text-xs sm:text-sm lg:text-base font-bold text-primary uppercase tracking-wider hidden lg:table-cell">
                        Hochgeladen am
                      </th>
                      <th className="px-4 py-4 sm:px-6 sm:py-5 text-right text-xs sm:text-sm lg:text-base font-bold text-primary uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50">
                    {filteredFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-gray-50/50 transition-all duration-300 group">
                        <td className="px-4 py-5 sm:px-6 sm:py-6 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[rgb(255,179,0)] to-[rgb(56,184,189)] rounded-2xl flex items-center justify-center mr-4 sm:mr-5 shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-sm sm:text-base lg:text-lg font-bold text-primary block truncate">{file.filename}</span>
                              <div className="sm:hidden mt-2">
                                <span className="text-sm sm:text-base lg:text-lg text-gray-500">{file.assignedUsers?.join(', ') || 'Niemand'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 sm:px-6 sm:py-6 text-sm text-gray-600 hidden sm:table-cell">
                          {file.assignedUsers?.join(', ') || 'Niemand'}
                        </td>
                        <td className="px-4 py-5 sm:px-6 sm:py-6 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                          {formatDate(file.uploadedAt)}
                        </td>
                        <td className="px-4 py-5 sm:px-6 sm:py-6 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            disabled={deletingFile === file.id}
                            className="btn-danger flex items-center gap-2 text-xs sm:text-sm py-2 px-3 sm:py-2 sm:px-4 group-hover:scale-105 transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingFile === file.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span className="hidden sm:inline">Wird gelöscht...</span>
                              </>
                            ) : (
                              <>
                                <Trash2 size={14} className="sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Löschen</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="mobile-spacing">
            {/* Create User Form */}
            <div className="card">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
                <h2 className="mobile-subtitle font-black text-primary">Benutzerverwaltung</h2>
                <button
                  onClick={() => setShowNewUserForm(!showNewUserForm)}
                  className="btn-primary flex items-center gap-3 mobile-button w-full sm:w-auto"
                >
                  <Plus size={18} className="sm:w-5 sm:h-5" />
                  Neuer Benutzer
                </button>
              </div>

              {showNewUserForm && (
                <form onSubmit={handleCreateUser} className="space-y-6 sm:space-y-8 border-t pt-6 sm:pt-8 mt-6 sm:mt-8">
                  <div className="mobile-form-grid">
                    <div>
                      <label className="block mobile-text font-bold text-primary mb-3 sm:mb-4">
                        Benutzername
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
                      <label className="block mobile-text font-bold text-primary mb-3 sm:mb-4">
                        Passwort
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          className="input-field pr-12"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-300"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center space-x-3 sm:space-x-4">
                        <input
                          type="checkbox"
                          checked={newUser.isAdmin}
                          onChange={(e) => setNewUser({ ...newUser, isAdmin: e.target.checked })}
                          className="rounded border-gray-300 text-[rgb(255,179,0)] focus:ring-[rgb(255,179,0)]"
                        />
                        <span className="mobile-text font-bold text-primary">Admin-Rechte</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button type="submit" className="btn-primary flex items-center gap-3 text-xs sm:text-sm py-2 px-4 sm:py-3 sm:px-6">
                      <Save size={18} className="sm:w-5 sm:h-5" />
                      Benutzer erstellen
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewUserForm(false);
                        setNewUser({ username: '', password: '', isAdmin: false });
                      }}
                      className="btn-secondary flex items-center gap-3 mobile-button"
                    >
                      <X size={18} className="sm:w-5 sm:h-5" />
                      Abbrechen
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Search Bar */}
            {users.length > 0 && (
              <div className="mb-6">
                <div className="relative max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Benutzer durchsuchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl text-[rgb(10,16,69)] placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-[rgb(255,179,0)]/20 focus:border-[rgb(255,179,0)] transition-all duration-300"
                  />
                </div>
              </div>
            )}

            {/* Users List */}
            <div className="card">
              <div className="mobile-table-container">
                <table className="mobile-table-wrapper">
                  <thead>
                    <tr>
                      <th className="px-4 py-4 sm:px-6 sm:py-5 text-left mobile-table font-bold text-primary uppercase tracking-wider">
                        Benutzername
                      </th>
                      <th className="px-4 py-4 sm:px-6 sm:py-5 text-left mobile-table font-bold text-primary uppercase tracking-wider hidden sm:table-cell">
                        Rolle
                      </th>
                      <th className="px-4 py-4 sm:px-6 sm:py-5 text-left mobile-table font-bold text-primary uppercase tracking-wider hidden lg:table-cell">
                        Erstellt am
                      </th>
                      <th className="px-4 py-4 sm:px-6 sm:py-5 text-right mobile-table font-bold text-primary uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50/50 transition-all duration-300 group">
                        <td className="px-4 py-5 sm:px-6 sm:py-6 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[rgb(255,179,0)] to-[rgb(56,184,189)] rounded-2xl flex items-center justify-center mr-4 sm:mr-5 shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="mobile-text font-bold text-primary block truncate">{user.username}</span>
                              <div className="sm:hidden mt-2">
                                {user.isAdmin ? (
                                  <span className="px-3 py-1 text-xs font-bold bg-gradient-to-r from-[rgb(255,179,0)] to-[rgb(56,184,189)] text-white rounded-full">
                                    Admin
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 text-xs font-bold bg-gray-100 text-gray-800 rounded-full">
                                    Benutzer
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 sm:px-6 sm:py-6 whitespace-nowrap hidden sm:table-cell">
                          {user.isAdmin ? (
                            <span className="px-3 py-1 text-xs font-bold bg-gradient-to-r from-[rgb(255,179,0)] to-[rgb(56,184,189)] text-white rounded-full">
                              Admin
                            </span>
                          ) : (
                            <span className="px-3 py-1 text-xs font-bold bg-gray-100 text-gray-800 rounded-full">
                              Benutzer
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-5 sm:px-6 sm:py-6 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-4 py-5 sm:px-6 sm:py-6 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!user.isAdmin && (
                              <button
                                onClick={() => handleEditUserFiles(user)}
                                className="btn-secondary flex items-center gap-2 text-xs sm:text-sm py-2 px-3 sm:py-2 sm:px-4 group-hover:scale-105 transition-transform duration-300"
                              >
                                <FileText size={14} className="sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Dateien</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="btn-danger flex items-center gap-2 text-xs sm:text-sm py-2 px-3 sm:py-2 sm:px-4 group-hover:scale-105 transition-transform duration-300"
                            >
                              <Trash2 size={14} className="sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">Löschen</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Files Modal */}
        {showEditUserFiles && editingUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="mobile-modal card max-w-2xl w-full">
              <div className="flex items-center gap-4 sm:gap-5 mb-6 sm:mb-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-[rgb(255,179,0)] to-[rgb(56,184,189)] rounded-2xl flex items-center justify-center">
                  <FileText className="text-white sm:w-7 sm:h-7" size={24} />
                </div>
                <h3 className="mobile-subtitle font-black text-primary">
                  Datei-Zuweisungen bearbeiten
                </h3>
              </div>
              
              <div className="mb-6 sm:mb-8">
                <p className="mobile-text text-gray-700 mb-4 sm:mb-5 font-medium">
                  Benutzer: <strong>"{editingUser.username}"</strong>
                </p>
                <p className="mobile-text text-gray-600 mb-6 sm:mb-8">
                  Wählen Sie die Dateien aus, die diesem Benutzer zugewiesen werden sollen:
                </p>
                
                <div className="space-y-3 sm:space-y-4 max-h-60 sm:max-h-80 overflow-y-auto border-2 border-gray-200/50 rounded-2xl p-4 sm:p-5 bg-gray-50/50 backdrop-blur-sm">
                  {files.map((file) => (
                    <label key={file.id} className="flex items-center space-x-3 sm:space-x-4 cursor-pointer hover:bg-white/50 p-3 rounded-xl transition-all duration-300">
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
                        className="rounded border-gray-300 text-[rgb(255,179,0)] focus:ring-[rgb(255,179,0)]"
                      />
                      <div className="flex-1">
                        <span className="text-sm sm:text-base lg:text-lg font-semibold text-primary block">{file.filename}</span>
                        {file.description && (
                          <span className="text-xs sm:text-sm text-gray-500 block">{file.description}</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <button
                  onClick={() => {
                    setShowEditUserFiles(false);
                    setEditingUser(null);
                    setEditSelectedFiles([]);
                    setUserFiles([]);
                  }}
                  className="btn-secondary mobile-button"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleUpdateUserFiles}
                  disabled={updatingUserFiles}
                  className="btn-primary flex items-center gap-3 mobile-button"
                >
                  <Save size={16} className="sm:w-5 sm:h-5" />
                  {updatingUserFiles ? 'Wird aktualisiert...' : 'Speichern'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Delete Confirmation Modal */}
        {showAdminDeleteConfirm && userToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="mobile-modal card">
              <div className="flex items-center gap-4 sm:gap-5 mb-6 sm:mb-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-100 rounded-2xl flex items-center justify-center">
                  <Trash2 className="text-red-600 sm:w-7 sm:h-7" size={24} />
                </div>
                <h3 className="mobile-subtitle font-black text-primary">
                  Standard-Admin löschen
                </h3>
              </div>
              
              <div className="mb-8 sm:mb-10">
                <p className="mobile-text text-gray-700 mb-4 sm:mb-5 font-medium">
                  Sie sind dabei, den Standard-Admin-User <strong>"{userToDelete.username}"</strong> zu löschen.
                </p>
                <div className="bg-yellow-50/80 backdrop-blur-sm border border-yellow-200/50 rounded-2xl p-4 sm:p-5">
                  <p className="mobile-text text-yellow-800 font-semibold">
                    <strong>Warnung:</strong> Diese Aktion kann nicht rückgängig gemacht werden. 
                    Stellen Sie sicher, dass mindestens ein anderer Admin-User existiert.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <button
                  onClick={cancelAdminDelete}
                  className="btn-secondary mobile-button"
                >
                  Abbrechen
                </button>
                <button
                  onClick={confirmAdminDelete}
                  className="btn-danger flex items-center gap-3 mobile-button"
                >
                  <Trash2 size={16} className="sm:w-5 sm:h-5" />
                  Endgültig löschen
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
