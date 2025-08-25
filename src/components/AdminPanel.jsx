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
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [newUser, setNewUser] = useState({ 
    username: '', 
    password: '', 
    isAdmin: false,
    expiryDate: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 4 Wochen ab heute
  });
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // States für Benutzer-Datei-Zuweisungsverwaltung
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
        // Lade Dateien für alle Benutzer
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
      alert('Bitte wählen Sie mindestens eine Datei aus.');
      return;
    }

    setUploading(true);
    
    for (const file of uploadFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', description);

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
          alert(`Fehler beim Hochladen von ${file.name}: ${error.error}`);
        }
      } catch (error) {
        alert(`Fehler beim Hochladen von ${file.name}: ${error.message}`);
      }
    }

    setUploadFiles([]);
    setDescription('');
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
    if (!confirm('Möchten Sie diese Datei wirklich löschen?')) return;
    
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
        fetchFiles();
      } else {
        const error = await response.json();
        alert('Fehler beim Löschen: ' + error.error);
      }
    } catch (error) {
      alert('Fehler beim Löschen: ' + error.message);
    } finally {
      setDeletingFile(null);
    }
  };

  const handleCleanupOrphanedFiles = async () => {
    if (!confirm('Möchten Sie wirklich alle Waisen-Dateien aus dem Blob Storage bereinigen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    
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
        alert(`Bereinigung abgeschlossen!\n\nGelöschte Dateien: ${result.deletedCount}\nWaisen-Dateien gefunden: ${result.totalOrphaned}${result.errors ? '\n\nFehler aufgetreten: ' + result.errors.length : ''}`);
      } else {
        const error = await response.json();
        alert('Fehler bei der Bereinigung: ' + error.error);
      }
    } catch (error) {
      alert('Fehler bei der Bereinigung: ' + error.message);
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
        alert('Fehler beim Erstellen: ' + error.error);
      }
    } catch (error) {
      alert('Fehler beim Erstellen: ' + error.message);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Möchten Sie den Benutzer "${username}" wirklich löschen?`)) return;
    
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
        alert('Fehler beim Löschen: ' + error.error);
      }
    } catch (error) {
      alert('Fehler beim Löschen: ' + error.message);
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
        // Aktualisiere die Benutzerliste
        await fetchUsers();
        alert('Dateizuweisungen erfolgreich aktualisiert');
      } else {
        const error = await response.json();
        alert('Fehler beim Aktualisieren: ' + error.error);
      }
    } catch (error) {
      alert('Fehler beim Aktualisieren: ' + error.message);
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
        alert('Ablaufdatum erfolgreich aktualisiert');
      } else {
        const error = await response.json();
        alert('Fehler beim Aktualisieren: ' + error.error);
      }
    } catch (error) {
      alert('Fehler beim Aktualisieren: ' + error.message);
    } finally {
      setUpdatingExpiryDate({ ...updatingExpiryDate, [userId]: false });
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
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatExpiryDate = (dateString) => {
    if (!dateString) return 'Kein Ablaufdatum';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const isUserExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

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
                <span>Zurück</span>
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
              Abmelden
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
              <span>Dateien</span>
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
              <span>Benutzer</span>
            </div>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-byght-turquoise mx-auto mb-4"></div>
              <p className="text-gray-600">Lade Daten...</p>
            </div>
          </div>
        ) : activeTab === 'files' ? (
          <div className="space-y-6">
            {/* File Upload Form */}
            <div className="card">
              <h2 className="text-xl font-semibold text-byght-gray mb-4">Neue Datei hochladen</h2>
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
                      Dateien hier ablegen oder klicken zum Auswählen
                    </p>
                    <p className="text-xs text-gray-500">Mehrere Dateien möglich</p>
                  </label>
                </div>

                {uploadFiles.length > 0 && (
                  <div className="mt-4 p-3 bg-byght-turquoise/10 rounded-lg border border-byght-turquoise/20">
                    <p className="font-medium text-byght-turquoise mb-2 text-sm">Ausgewählte Dateien:</p>
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
                    Beschreibung (optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-field"
                    placeholder="Kurze Beschreibung der Datei(en)"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading || uploadFiles.length === 0}
                  className="btn-primary w-full sm:w-auto"
                >
                  {uploading ? 'Lade hoch...' : 'Hochladen'}
                </button>
              </form>
            </div>

            {/* Files List */}
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-byght-gray">Hochgeladene Dateien</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-600">{files.length} Datei(en)</span>
                  <button
                    onClick={handleCleanupOrphanedFiles}
                    disabled={cleaningUp}
                    className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Waisen-Dateien aus Blob Storage bereinigen"
                  >
                    {cleaningUp ? 'Bereinige...' : 'Blob bereinigen'}
                  </button>
                </div>
              </div>
              
              {files.length === 0 ? (
                <p className="text-gray-600 text-center py-6">Keine Dateien vorhanden</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dateiname
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                          Größe
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                          Datum
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aktionen
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {files.map((file) => (
                        <tr key={file.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="text-xs font-medium text-byght-gray truncate max-w-xs">{file.filename}</div>
                            {file.description && (
                              <div className="text-xs text-gray-500 truncate max-w-xs">{file.description}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap hidden sm:table-cell">
                            <span className="text-xs text-gray-600">{formatFileSize(file.size)}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap hidden md:table-cell">
                            <span className="text-xs text-gray-600">{formatDate(file.uploadedAt)}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              disabled={deletingFile === file.id}
                              className="text-red-500 hover:text-red-700 transition-colors p-1"
                              title="Löschen"
                            >
                              <Trash2 size={14} />
                            </button>
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
                <h2 className="text-xl font-semibold text-byght-gray">Neuen Benutzer erstellen</h2>
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
                    <label className="block text-sm font-medium text-byght-gray mb-1">
                      Passwort
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
                      Administrator-Rechte
                    </label>
                  </div>
                  
                  {!newUser.isAdmin && (
                    <div>
                      <label className="block text-sm font-medium text-byght-gray mb-1">
                        Ablaufdatum (Standard-Benutzer)
                      </label>
                      <input
                        type="date"
                        value={newUser.expiryDate}
                        onChange={(e) => setNewUser({ ...newUser, expiryDate: e.target.value })}
                        className="input-field"
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Standard-Benutzer können sich nur bis zu diesem Datum anmelden
                      </p>
                    </div>
                  )}
                  
                  <button type="submit" className="btn-primary w-full sm:w-auto">
                    Benutzer erstellen
                  </button>
                </form>
              )}
            </div>

            {/* Users List */}
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-byght-gray">Benutzer verwalten</h2>
                <span className="text-xs text-gray-600">{users.length} Benutzer</span>
              </div>
              
              {users.length === 0 ? (
                <p className="text-gray-600 text-center py-6">Keine Benutzer vorhanden</p>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
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
                              Benutzer
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          {!user.isAdmin && (
                            <button
                              onClick={() => handleEditUserFiles(user)}
                              className="text-byght-turquoise hover:text-byght-turquoise/80 transition-colors p-1"
                              title="Dateien zuweisen"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            className="text-red-500 hover:text-red-700 transition-colors p-1"
                            title="Löschen"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Ablaufdatum für Standard-Benutzer */}
                      {!user.isAdmin && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-600">Ablaufdatum:</span>
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
                                  title="Speichern"
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  onClick={() => setEditingExpiryDate({ ...editingExpiryDate, [user.id]: false })}
                                  className="text-gray-500 hover:text-gray-700 transition-colors p-1"
                                  title="Abbrechen"
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
                                      ({getDaysUntilExpiry(user.expiryDate)} Tage)
                                    </span>
                                  )}
                                </span>
                                <button
                                  onClick={() => setEditingExpiryDate({ ...editingExpiryDate, [user.id]: true })}
                                  className="text-byght-turquoise hover:text-byght-turquoise/80 transition-colors p-1"
                                  title="Ablaufdatum bearbeiten"
                                >
                                  <Edit2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                          {isUserExpired(user.expiryDate) && (
                            <div className="text-xs text-red-600 font-medium mt-1">
                              ⚠️ Benutzer ist abgelaufen und kann sich nicht mehr anmelden
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Zugewiesene Dateien */}
                      <div className="mt-2">
                        {loadingUserFiles[user.id] ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-byght-turquoise"></div>
                            <span className="text-xs text-gray-500">Lade Dateien...</span>
                          </div>
                        ) : user.isAdmin ? (
                          <div className="text-xs text-gray-600 italic">
                            Admins sind immer alle Dateien zugewiesen
                          </div>
                        ) : userFiles[user.id] && userFiles[user.id].length > 0 ? (
                          <div>
                            <div className="text-xs font-medium text-gray-600 mb-1">
                              Zugewiesene Dateien ({userFiles[user.id].length}):
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
                            Keine Dateien zugewiesen
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
                    Dateizuweisungen für {editingUser.username}
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
                    Abbrechen
                  </button>
                  <button
                    onClick={handleUpdateUserFiles}
                    disabled={updatingUserFiles}
                    className="btn-primary"
                  >
                    {updatingUserFiles ? 'Speichern...' : 'Speichern'}
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