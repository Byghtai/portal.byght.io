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
  Save
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

  const handleDeleteUser = async (userId) => {
    if (!confirm('Möchten Sie diesen Benutzer wirklich löschen?')) return;

    try {
      const token = Cookies.get('auth_token');
      const response = await fetch(`/.netlify/functions/admin-delete-user`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      alert('Fehler beim Löschen: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft size={20} />
                Zurück
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('files')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'files'
                  ? 'border-[#0066CC] text-[#0066CC]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText size={18} />
                Dateiverwaltung
              </div>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-[#0066CC] text-[#0066CC]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users size={18} />
                Benutzerverwaltung
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC]"></div>
          </div>
        ) : activeTab === 'files' ? (
          <div className="space-y-8">
            {/* Upload Form */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Neue Datei hochladen</h2>
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Datei auswählen
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Benutzer auswählen
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {users.filter(u => !u.isAdmin).map((user) => (
                      <label key={user.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
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
                          className="rounded border-gray-300 text-[#0066CC] focus:ring-[#0066CC]"
                        />
                        <span className="text-sm text-gray-700">{user.username}</span>
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Alle Dateien</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dateiname
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Zugewiesen an
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hochgeladen am
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {files.map((file) => (
                      <tr key={file.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {file.filename}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {file.assignedUsers?.join(', ') || 'Niemand'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(file.uploadedAt).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 size={18} />
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Benutzerverwaltung</h2>
                <button
                  onClick={() => setShowNewUserForm(!showNewUserForm)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={18} />
                  Neuer Benutzer
                </button>
              </div>

              {showNewUserForm && (
                <form onSubmit={handleCreateUser} className="space-y-4 border-t pt-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newUser.isAdmin}
                          onChange={(e) => setNewUser({ ...newUser, isAdmin: e.target.checked })}
                          className="rounded border-gray-300 text-[#0066CC] focus:ring-[#0066CC]"
                        />
                        <span className="text-sm text-gray-700">Admin-Rechte</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Benutzername
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rolle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Erstellt am
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.isAdmin ? (
                            <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                              Admin
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              Benutzer
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900"
                            disabled={user.username === 'admin'}
                          >
                            <Trash2 size={18} />
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
      </main>
    </div>
  );
};

export default AdminPanel;
