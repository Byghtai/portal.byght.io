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
  Menu
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

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="glass-effect border-b border-white border-opacity-20">
        <div className="mobile-container">
          <div className="flex justify-between items-center mobile-header">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-white hover:text-white text-opacity-90 hover:text-opacity-100 transition-all duration-300 mobile-text"
              >
                <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Zurück</span>
              </button>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-xl flex items-center justify-center shadow-lg p-1 sm:p-2">
                  <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-[rgb(10,16,69)]" />
                </div>
                <div>
                  <h1 className="mobile-subtitle font-bold text-white">Admin Panel</h1>
                  <p className="mobile-text text-white text-opacity-80 hidden sm:block">Systemverwaltung</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="text-white hover:text-red-200 font-medium transition-all duration-300 mobile-text"
            >
              <span className="hidden sm:inline">Abmelden</span>
              <span className="sm:hidden">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="mobile-container pt-6 sm:pt-8">
        <div className="glass-effect rounded-2xl p-2 mb-6 sm:mb-8">
          <nav className="flex space-x-2">
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 py-2 sm:py-3 px-3 sm:px-6 rounded-xl font-semibold mobile-text transition-all duration-300 ${
                activeTab === 'files'
                  ? 'bg-white text-[rgb(10,16,69)] shadow-lg'
                  : 'text-white text-opacity-70 hover:text-opacity-100'
              }`}
            >
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <FileText size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">Dateiverwaltung</span>
                <span className="sm:hidden">Dateien</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-2 sm:py-3 px-3 sm:px-6 rounded-xl font-semibold mobile-text transition-all duration-300 ${
                activeTab === 'users'
                  ? 'bg-white text-[rgb(10,16,69)] shadow-lg'
                  : 'text-white text-opacity-70 hover:text-opacity-100'
              }`}
            >
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <Users size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">Benutzerverwaltung</span>
                <span className="sm:hidden">Benutzer</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="mobile-container pb-6 sm:pb-8">
        {loading ? (
          <div className="flex justify-center py-12 sm:py-16">
            <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-2xl mobile-padding">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white text-center mobile-text">Lade Daten...</p>
            </div>
          </div>
        ) : activeTab === 'files' ? (
          <div className="mobile-spacing">
            {/* Upload Form */}
            <div className="card">
              <h2 className="mobile-subtitle font-bold text-primary mb-4 sm:mb-6">Neue Datei hochladen</h2>
              <form onSubmit={handleFileUpload} className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block mobile-text font-semibold text-primary mb-2 sm:mb-3">
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
                  <label className="block mobile-text font-semibold text-primary mb-2 sm:mb-3">
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
                  <label className="block mobile-text font-semibold text-primary mb-2 sm:mb-3">
                    Benutzer auswählen
                  </label>
                  <div className="space-y-2 sm:space-y-3 max-h-32 sm:max-h-48 overflow-y-auto border-2 border-gray-200 rounded-xl p-3 sm:p-4 bg-gray-50">
                    {users.filter(u => !u.isAdmin).map((user) => (
                      <label key={user.id} className="flex items-center space-x-2 sm:space-x-3 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors duration-200">
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
                        <span className="mobile-text font-medium text-primary">{user.username}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="btn-primary flex items-center gap-2 mobile-button"
                >
                  <Upload size={16} className="sm:w-[18px] sm:h-[18px]" />
                  {uploading ? 'Wird hochgeladen...' : 'Datei hochladen'}
                </button>
              </form>
            </div>

            {/* Files List */}
            <div className="card">
              <div className="mb-4 sm:mb-6">
                <h2 className="mobile-subtitle font-bold text-primary">Alle Dateien</h2>
              </div>
              <div className="mobile-table-container">
                <table className="mobile-table-wrapper">
                  <thead>
                    <tr>
                      <th className="px-3 py-3 sm:px-6 sm:py-4 text-left mobile-table font-bold text-primary uppercase tracking-wider">
                        Dateiname
                      </th>
                      <th className="px-3 py-3 sm:px-6 sm:py-4 text-left mobile-table font-bold text-primary uppercase tracking-wider hidden sm:table-cell">
                        Zugewiesen an
                      </th>
                      <th className="px-3 py-3 sm:px-6 sm:py-4 text-left mobile-table font-bold text-primary uppercase tracking-wider hidden lg:table-cell">
                        Hochgeladen am
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
                                <span className="mobile-text text-gray-500">{file.assignedUsers?.join(', ') || 'Niemand'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 sm:px-6 sm:py-6 text-sm text-gray-600 hidden sm:table-cell">
                          {file.assignedUsers?.join(', ') || 'Niemand'}
                        </td>
                        <td className="px-3 py-4 sm:px-6 sm:py-6 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                          {new Date(file.uploadedAt).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-3 py-4 sm:px-6 sm:py-6 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="btn-danger flex items-center gap-1 sm:gap-2 mobile-button"
                          >
                            <Trash2 size={14} className="sm:w-4 sm:h-4" />
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
                <h2 className="mobile-subtitle font-bold text-primary">Benutzerverwaltung</h2>
                <button
                  onClick={() => setShowNewUserForm(!showNewUserForm)}
                  className="btn-primary flex items-center gap-2 mobile-button w-full sm:w-auto"
                >
                  <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                  Neuer Benutzer
                </button>
              </div>

              {showNewUserForm && (
                <form onSubmit={handleCreateUser} className="space-y-4 sm:space-y-6 border-t pt-4 sm:pt-6 mt-4 sm:mt-6">
                  <div className="mobile-form-grid">
                    <div>
                      <label className="block mobile-text font-semibold text-primary mb-2 sm:mb-3">
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
                      <label className="block mobile-text font-semibold text-primary mb-2 sm:mb-3">
                        Passwort
                      </label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="input-field"
                        required
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center space-x-2 sm:space-x-3">
                        <input
                          type="checkbox"
                          checked={newUser.isAdmin}
                          onChange={(e) => setNewUser({ ...newUser, isAdmin: e.target.checked })}
                          className="rounded border-gray-300 text-[rgb(255,179,0)] focus:ring-[rgb(255,179,0)]"
                        />
                        <span className="mobile-text font-semibold text-primary">Admin-Rechte</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button type="submit" className="btn-primary flex items-center gap-2 mobile-button">
                      <Save size={16} className="sm:w-[18px] sm:h-[18px]" />
                      Benutzer erstellen
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewUserForm(false);
                        setNewUser({ username: '', password: '', isAdmin: false });
                      }}
                      className="btn-secondary flex items-center gap-2 mobile-button"
                    >
                      <X size={16} className="sm:w-[18px] sm:h-[18px]" />
                      Abbrechen
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Users List */}
            <div className="card">
              <div className="mobile-table-container">
                <table className="mobile-table-wrapper">
                  <thead>
                    <tr>
                      <th className="px-3 py-3 sm:px-6 sm:py-4 text-left mobile-table font-bold text-primary uppercase tracking-wider">
                        Benutzername
                      </th>
                      <th className="px-3 py-3 sm:px-6 sm:py-4 text-left mobile-table font-bold text-primary uppercase tracking-wider hidden sm:table-cell">
                        Rolle
                      </th>
                      <th className="px-3 py-3 sm:px-6 sm:py-4 text-left mobile-table font-bold text-primary uppercase tracking-wider hidden lg:table-cell">
                        Erstellt am
                      </th>
                      <th className="px-3 py-3 sm:px-6 sm:py-4 text-right mobile-table font-bold text-primary uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-3 py-4 sm:px-6 sm:py-6 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-[rgb(255,179,0)] to-[rgb(56,184,189)] rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="mobile-text font-semibold text-primary block truncate">{user.username}</span>
                              <div className="sm:hidden mt-1">
                                {user.isAdmin ? (
                                  <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-[rgb(255,179,0)] to-[rgb(56,184,189)] text-white rounded-full">
                                    Admin
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 text-xs font-bold bg-gray-100 text-gray-800 rounded-full">
                                    Benutzer
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 sm:px-6 sm:py-6 whitespace-nowrap hidden sm:table-cell">
                          {user.isAdmin ? (
                            <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-[rgb(255,179,0)] to-[rgb(56,184,189)] text-white rounded-full">
                              Admin
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-bold bg-gray-100 text-gray-800 rounded-full">
                              Benutzer
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-4 sm:px-6 sm:py-6 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                          {new Date(user.createdAt).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-3 py-4 sm:px-6 sm:py-6 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="btn-danger flex items-center gap-1 sm:gap-2 mobile-button"
                          >
                            <Trash2 size={14} className="sm:w-4 sm:h-4" />
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="mobile-modal card">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <Trash2 className="text-red-600 sm:w-6 sm:h-6" size={20} />
                </div>
                <h3 className="mobile-subtitle font-bold text-primary">
                  Standard-Admin löschen
                </h3>
              </div>
              
              <div className="mb-6 sm:mb-8">
                <p className="mobile-text text-gray-700 mb-3 sm:mb-4">
                  Sie sind dabei, den Standard-Admin-User <strong>"{userToDelete.username}"</strong> zu löschen.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 sm:p-4">
                  <p className="mobile-text text-yellow-800 font-medium">
                    <strong>Warnung:</strong> Diese Aktion kann nicht rückgängig gemacht werden. 
                    Stellen Sie sicher, dass mindestens ein anderer Admin-User existiert.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={cancelAdminDelete}
                  className="btn-secondary mobile-button"
                >
                  Abbrechen
                </button>
                <button
                  onClick={confirmAdminDelete}
                  className="btn-danger flex items-center gap-2 mobile-button"
                >
                  <Trash2 size={14} className="sm:w-4 sm:h-4" />
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
