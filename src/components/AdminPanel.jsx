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
  const [uploadFile, setUploadFile] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', isAdmin: false });
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [showAdminDeleteConfirm, setShowAdminDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
    if (!uploadFile || selectedUsers.length === 0) {
      alert('Bitte wählen Sie eine Datei und mindestens einen Benutzer aus.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('users', JSON.stringify(selectedUsers));
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

      if (response.ok) {
        alert('Datei erfolgreich hochgeladen!');
        setUploadFile(null);
        setSelectedUsers([]);
        setDescription('');
        fetchFiles();
      } else {
        throw new Error('Upload fehlgeschlagen');
      }
    } catch (error) {
      alert('Fehler beim Upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Möchten Sie diese Datei wirklich löschen?')) return;

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
        fetchFiles();
      }
    } catch (error) {
      alert('Fehler beim Löschen: ' + error.message);
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

  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (file.description && file.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-40 h-40 bg-white/5 rounded-full animate-float"></div>
        <div className="absolute bottom-10 left-10 w-32 h-32 bg-white/5 rounded-full animate-float" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute top-1/3 left-1/2 w-20 h-20 bg-white/3 rounded-full animate-float" style={{animationDelay: '3s'}}></div>
      </div>

      {/* Header */}
      <header className="glass-effect border-b border-white/20 relative z-10">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex justify-between items-center py-4 sm:py-6 lg:py-8">
            <div className="flex items-center space-x-3 sm:space-x-4">
                              <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 text-white hover:text-white text-opacity-90 hover:text-opacity-100 transition-all duration-500 text-sm sm:text-base lg:text-lg hover:scale-105"
                >
                <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
                <span className="hidden sm:inline">Zurück</span>
              </button>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-xl p-2 sm:p-3 border border-white/30">
                  <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-black text-white drop-shadow-lg">Admin Panel</h1>
                  <p className="text-sm sm:text-base lg:text-lg text-white/80 font-medium hidden sm:block">Systemverwaltung</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="text-white hover:text-red-200 font-semibold transition-all duration-500 text-sm sm:text-base lg:text-lg hover:scale-105"
            >
              <span className="hidden sm:inline">Abmelden</span>
              <span className="sm:hidden">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 sm:px-6 lg:px-8 xl:px-12 pt-6 sm:pt-8 relative z-10">
        <div className="glass-effect rounded-3xl p-2 mb-6 sm:mb-8">
          <nav className="flex space-x-2">
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-2xl font-bold text-sm sm:text-base lg:text-lg transition-all duration-500 ${
                activeTab === 'files'
                  ? 'bg-white/90 backdrop-blur-sm text-[rgb(10,16,69)] shadow-xl'
                  : 'text-white text-opacity-70 hover:text-opacity-100 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <FileText size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Dateiverwaltung</span>
                <span className="sm:hidden">Dateien</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-2xl font-bold text-sm sm:text-base lg:text-lg transition-all duration-500 ${
                activeTab === 'users'
                  ? 'bg-white/90 backdrop-blur-sm text-[rgb(10,16,69)] shadow-xl'
                  : 'text-white text-opacity-70 hover:text-opacity-100 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <Users size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Benutzerverwaltung</span>
                <span className="sm:hidden">Benutzer</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="px-4 sm:px-6 lg:px-8 xl:px-12 pb-6 sm:pb-8 relative z-10">
        {loading ? (
          <div className="flex justify-center py-16 sm:py-20">
            <div className="glass-effect rounded-3xl p-6 sm:p-8 lg:p-10 text-center">
              <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-white mx-auto mb-6"></div>
              <p className="text-white font-semibold text-sm sm:text-base lg:text-lg">Lade Daten...</p>
            </div>
          </div>
        ) : activeTab === 'files' ? (
          <div className="space-y-6 sm:space-y-8 lg:space-y-10">
            {/* Upload Form */}
            <div className="card">
              <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-black text-primary mb-6 sm:mb-8">Neue Datei hochladen</h2>
              <form onSubmit={handleFileUpload} className="space-y-6 sm:space-y-8">
                <div>
                  <label className="block text-sm sm:text-base lg:text-lg font-bold text-primary mb-3 sm:mb-4">
                    Datei auswählen
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-base lg:text-lg font-bold text-primary mb-3 sm:mb-4">
                    Beschreibung (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-field"
                    rows="3"
                    placeholder="Beschreibung der Datei..."
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-base lg:text-lg font-bold text-primary mb-3 sm:mb-4">
                    Benutzer auswählen
                  </label>
                  <div className="space-y-3 sm:space-y-4 max-h-40 sm:max-h-56 overflow-y-auto border-2 border-gray-200/50 rounded-2xl p-4 sm:p-5 bg-gray-50/50 backdrop-blur-sm">
                    {users.filter(u => !u.isAdmin).map((user) => (
                      <label key={user.id} className="flex items-center space-x-3 sm:space-x-4 cursor-pointer hover:bg-white/50 p-3 rounded-xl transition-all duration-300">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                          className="rounded border-gray-300 text-[rgb(255,179,0)] focus:ring-[rgb(255,179,0)]"
                        />
                        <span className="text-sm sm:text-base lg:text-lg font-semibold text-primary">{user.username}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="btn-primary flex items-center gap-3 mobile-button"
                >
                  <Upload size={18} className="sm:w-5 sm:h-5" />
                  {uploading ? 'Wird hochgeladen...' : 'Datei hochladen'}
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
                          {new Date(file.uploadedAt).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-4 py-5 sm:px-6 sm:py-6 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="btn-danger flex items-center gap-2 text-xs sm:text-sm py-2 px-4 sm:py-3 sm:px-6 group-hover:scale-105 transition-transform duration-300"
                          >
                            <Trash2 size={16} className="sm:w-5 sm:h-5" />
                            <span className="hidden sm:inline">Löschen</span>
                            <span className="sm:hidden">Del</span>
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
                          {new Date(user.createdAt).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-4 py-5 sm:px-6 sm:py-6 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="btn-danger flex items-center gap-2 mobile-button group-hover:scale-105 transition-transform duration-300"
                          >
                            <Trash2 size={16} className="sm:w-5 sm:h-5" />
                            <span className="hidden sm:inline">Löschen</span>
                            <span className="sm:hidden">Del</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
