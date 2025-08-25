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
  Shield,
  Settings
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-white hover:text-white text-opacity-90 hover:text-opacity-100 transition-all duration-300"
              >
                <ArrowLeft size={20} />
                Zurück
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <Settings className="w-6 h-6 text-[rgb(10,16,69)]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                  <p className="text-white text-opacity-80 text-sm">Systemverwaltung</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="text-white hover:text-red-200 font-medium transition-all duration-300"
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="glass-effect rounded-2xl p-2 mb-8">
          <nav className="flex space-x-2">
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-300 ${
                activeTab === 'files'
                  ? 'bg-white text-[rgb(10,16,69)] shadow-lg'
                  : 'text-white text-opacity-70 hover:text-opacity-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText size={18} />
                Dateiverwaltung
              </div>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-300 ${
                activeTab === 'users'
                  ? 'bg-white text-[rgb(10,16,69)] shadow-lg'
                  : 'text-white text-opacity-70 hover:text-opacity-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users size={18} />
                Benutzerverwaltung
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-2xl p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white text-center">Lade Daten...</p>
            </div>
          </div>
        ) : activeTab === 'files' ? (
          <div className="space-y-8">
            {/* Upload Form */}
            <div className="card">
              <h2 className="text-2xl font-bold text-primary mb-6">Neue Datei hochladen</h2>
              <form onSubmit={handleFileUpload} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-primary mb-3">
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
                  <label className="block text-sm font-semibold text-primary mb-3">
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
                  <label className="block text-sm font-semibold text-primary mb-3">
                    Benutzer auswählen
                  </label>
                  <div className="space-y-3 max-h-48 overflow-y-auto border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
                    {users.filter(u => !u.isAdmin).map((user) => (
                      <label key={user.id} className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors duration-200">
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
                        <span className="text-sm font-medium text-primary">{user.username}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="btn-primary flex items-center gap-2"
                >
                  <Upload size={18} />
                  {uploading ? 'Wird hochgeladen...' : 'Datei hochladen'}
                </button>
              </form>
            </div>

            {/* Files List */}
            <div className="card">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-primary">Alle Dateien</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                        Dateiname
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                        Zugewiesen an
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                        Hochgeladen am
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
                            <span className="text-sm font-semibold text-primary">{file.filename}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-sm text-gray-600">
                          {file.assignedUsers?.join(', ') || 'Niemand'}
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-600">
                          {new Date(file.uploadedAt).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="btn-danger flex items-center gap-2"
                          >
                            <Trash2 size={16} />
                            Löschen
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
          <div className="space-y-8">
            {/* Create User Form */}
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-primary">Benutzerverwaltung</h2>
                <button
                  onClick={() => setShowNewUserForm(!showNewUserForm)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={18} />
                  Neuer Benutzer
                </button>
              </div>

              {showNewUserForm && (
                <form onSubmit={handleCreateUser} className="space-y-6 border-t pt-6 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-primary mb-3">
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
                      <label className="block text-sm font-semibold text-primary mb-3">
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
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={newUser.isAdmin}
                          onChange={(e) => setNewUser({ ...newUser, isAdmin: e.target.checked })}
                          className="rounded border-gray-300 text-[rgb(255,179,0)] focus:ring-[rgb(255,179,0)]"
                        />
                        <span className="text-sm font-semibold text-primary">Admin-Rechte</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" className="btn-primary flex items-center gap-2">
                      <Save size={18} />
                      Benutzer erstellen
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewUserForm(false);
                        setNewUser({ username: '', password: '', isAdmin: false });
                      }}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <X size={18} />
                      Abbrechen
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Users List */}
            <div className="card">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                        Benutzername
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                        Rolle
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                        Erstellt am
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-primary uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-6 py-6 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-r from-[rgb(255,179,0)] to-[rgb(56,184,189)] rounded-xl flex items-center justify-center mr-4">
                              <Users className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-primary">{user.username}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
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
                        <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="btn-danger flex items-center gap-2"
                          >
                            <Trash2 size={16} />
                            Löschen
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
            <div className="card max-w-md w-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <Trash2 className="text-red-600" size={24} />
                </div>
                <h3 className="text-xl font-bold text-primary">
                  Standard-Admin löschen
                </h3>
              </div>
              
              <div className="mb-8">
                <p className="text-gray-700 mb-4">
                  Sie sind dabei, den Standard-Admin-User <strong>"{userToDelete.username}"</strong> zu löschen.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-yellow-800 text-sm font-medium">
                    <strong>Warnung:</strong> Diese Aktion kann nicht rückgängig gemacht werden. 
                    Stellen Sie sicher, dass mindestens ein anderer Admin-User existiert.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelAdminDelete}
                  className="btn-secondary"
                >
                  Abbrechen
                </button>
                <button
                  onClick={confirmAdminDelete}
                  className="btn-danger flex items-center gap-2"
                >
                  <Trash2 size={16} />
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
