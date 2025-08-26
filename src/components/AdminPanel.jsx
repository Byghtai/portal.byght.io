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
import TestUpload from './TestUpload';
import ZipDebugTest from './ZipDebugTest';
import BasicFileTest from './BasicFileTest';
import ChunkedUpload from './ChunkedUpload';
import LazyUpload from './LazyUpload';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('files');
  const [files, setFiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [newUser, setNewUser] = useState({ 
    username: '', 
    password: '', 
    isAdmin: false,
    customer: '',
    expiryDate: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 4 weeks from today
  });
  const [showNewUserModal, setShowNewUserModal] = useState(false);
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
  const [fixingConfluence, setFixingConfluence] = useState(false);
  const [testingConfluence, setTestingConfluence] = useState(false);
  
  // New states for inline editing
  const [editingUsername, setEditingUsername] = useState({});
  const [editingCompany, setEditingCompany] = useState({});
  const [editingUsernameValue, setEditingUsernameValue] = useState({});
  const [editingCompanyValue, setEditingCompanyValue] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalUserId, setPasswordModalUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [updatingUser, setUpdatingUser] = useState({});
  
  // File editing states
  const [editingFile, setEditingFile] = useState(null);
  const [showEditFileModal, setShowEditFileModal] = useState(false);
  const [editFileData, setEditFileData] = useState({ 
    description: '', 
    productLabel: '', 
    versionLabel: '', 
    languageLabel: '',
    confluenceLabel: '' 
  });
  const [updatingFile, setUpdatingFile] = useState(false);

  // Label popup states for newly uploaded files
  const [showLabelPopup, setShowLabelPopup] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileLabels, setFileLabels] = useState({});
  const [savingLabels, setSavingLabels] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterVersion, setFilterVersion] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterConfluence, setFilterConfluence] = useState('');
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
        console.log('Users data from API:', data.users); // Debug-Ausgabe
        setUsers(data.users || []);
        // Load files for all users
        await fetchAllUserFiles(data.users || []);
        
        // Test customer data
        try {
          const testResponse = await fetch('/.netlify/functions/test-customer-data');
          if (testResponse.ok) {
            const testData = await testResponse.json();
            console.log('Customer data test:', testData);
          }
        } catch (error) {
          console.error('Error testing customer data:', error);
        }
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
    const uploadedFileData = [];
    
    for (const file of uploadFiles) {
      const formData = new FormData();
      formData.append('file', file);

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
          const result = await response.json();
          uploadedFileData.push({
            id: result.file.id,
            filename: file.name,
            size: file.size,
            productLabel: '',
            versionLabel: '',
            languageLabel: ''
          });
        } else {
          let errorMessage = 'Unknown error occurred';
          let errorDetails = '';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
            if (errorData.details) {
              errorDetails = `\nDetails: ${errorData.details}`;
            }
            if (errorData.fallbackError) {
              errorDetails += `\nFallback error: ${errorData.fallbackError}`;
            }
          } catch (jsonError) {
            // Wenn JSON-Parsing fehlschlägt, versuche den Text zu lesen
            try {
              const errorText = await response.text();
              errorMessage = errorText || errorMessage;
            } catch (textError) {
              errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
          }
          console.error(`Upload error for ${file.name}:`, errorMessage, errorDetails);
          alert(`Error uploading ${file.name}: ${errorMessage}${errorDetails}`);
        }
      } catch (error) {
        alert(`Error uploading ${file.name}: ${error.message}`);
      }
    }

    setUploadFiles([]);
    setUploading(false);
    
    // Show label popup if files were uploaded successfully
    if (uploadedFileData.length > 0) {
      setUploadedFiles(uploadedFileData);
      setFileLabels({});
      setShowLabelPopup(true);
    }
    
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

  const handleFixConfluenceColumn = async () => {
    if (!confirm('Do you want to fix the Confluence label column in the database? This will extend the column size to support longer values.')) return;
    
    setFixingConfluence(true);
    try {
      const token = Cookies.get('auth_token');
      const response = await fetch('/.netlify/functions/admin-fix-confluence-column', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Database fix completed!\n\n${result.message}`);
      } else {
        const error = await response.json();
        alert('Error fixing database: ' + error.error);
      }
    } catch (error) {
      alert('Error fixing database: ' + error.message);
    } finally {
      setFixingConfluence(false);
    }
  };

  const handleTestConfluenceUpdate = async () => {
    setTestingConfluence(true);
    try {
      const token = Cookies.get('auth_token');
      const response = await fetch('/.netlify/functions/test-confluence-update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Test completed successfully!\n\nTest file: ${result.testFile}\nTest value: ${result.testValue}\nInitial column length: ${result.initialLength}\nFinal column length: ${result.finalLength}`);
      } else {
        const error = await response.json();
        alert('Test failed: ' + (error.details || error.error));
      }
    } catch (error) {
      alert('Test failed: ' + error.message);
    } finally {
      setTestingConfluence(false);
    }
  };





  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    // Validate password before sending
    const validation = validatePassword(newUser.password);
    if (!validation.isValid) {
      alert(validation.message);
      return;
    }
    
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
          customer: '',
          expiryDate: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        setShowNewUserModal(false);
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

  const handleUpdateUsername = async (userId, newUsername) => {
    if (!newUsername || newUsername.trim() === '') {
      alert('Username cannot be empty');
      return;
    }
    
    console.log('Updating username for user:', userId, 'with value:', newUsername);
    setUpdatingUser({ ...updatingUser, [userId]: true });
    try {
      const token = Cookies.get('auth_token');
      const requestBody = {
        userId,
        username: newUsername.trim(),
      };
      console.log('Sending request:', requestBody);
      
      const response = await fetch('/.netlify/functions/admin-update-user', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        setEditingUsername({ ...editingUsername, [userId]: false });
        await fetchUsers();
        alert('Username successfully updated');
      } else {
        const error = await response.json();
        console.error('Server error:', error);
        alert('Error updating username: ' + error.error);
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('Error updating username: ' + error.message);
    } finally {
      setUpdatingUser({ ...updatingUser, [userId]: false });
    }
  };

  const handleUpdateCompany = async (userId, newCompany) => {
    console.log('Updating company for user:', userId, 'with value:', newCompany);
    setUpdatingUser({ ...updatingUser, [userId]: true });
    try {
      const token = Cookies.get('auth_token');
      const requestBody = {
        userId,
        customer: newCompany.trim(),
      };
      console.log('Sending request:', requestBody);
      
      const response = await fetch('/.netlify/functions/admin-update-user', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        setEditingCompany({ ...editingCompany, [userId]: false });
        await fetchUsers();
        alert('Company successfully updated');
      } else {
        const error = await response.json();
        console.error('Server error:', error);
        alert('Error updating company: ' + error.error);
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('Error updating company: ' + error.message);
    } finally {
      setUpdatingUser({ ...updatingUser, [userId]: false });
    }
  };

  const validatePassword = (password) => {
    if (!password || password.length < 12) {
      return { isValid: false, message: 'Password must be at least 12 characters long' };
    }

    let criteriaCount = 0;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (hasUppercase) criteriaCount++;
    if (hasLowercase) criteriaCount++;
    if (hasNumbers) criteriaCount++;
    if (hasSpecialChars) criteriaCount++;

    if (criteriaCount < 3) {
      return { 
        isValid: false, 
        message: 'Password must contain at least 3 of the following: uppercase letters, lowercase letters, numbers, special characters' 
      };
    }

    return { isValid: true };
  };

  const handlePasswordReset = async () => {
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setPasswordError(validation.message);
      return;
    }

    try {
      const token = Cookies.get('auth_token');
      const response = await fetch('/.netlify/functions/admin-update-user', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: passwordModalUserId,
          password: newPassword,
        }),
      });

      if (response.ok) {
        setShowPasswordModal(false);
        setNewPassword('');
        setPasswordError('');
        alert('Password successfully updated');
      } else {
        const error = await response.json();
        setPasswordError(error.error);
      }
    } catch (error) {
      setPasswordError('Error updating password: ' + error.message);
    }
  };

  const openPasswordModal = (userId) => {
    setPasswordModalUserId(userId);
    setShowPasswordModal(true);
    setNewPassword('');
    setPasswordError('');
  };

  const handleEditFile = (file) => {
    setEditingFile(file);
    setEditFileData({
      productLabel: file.productLabel || '',
      versionLabel: file.versionLabel || '',
      languageLabel: file.languageLabel || '',
      confluenceLabel: file.confluenceLabel || ''
    });
    setShowEditFileModal(true);
  };

  const handleUpdateFileData = async () => {
    // Frontend-Validierung
    const validationErrors = [];
    
    if (editFileData.confluenceLabel && editFileData.confluenceLabel.length > 50) {
      validationErrors.push(`Confluence label is too long (${editFileData.confluenceLabel.length} characters). Maximum is 50 characters.`);
    }
    
    if (editFileData.productLabel && editFileData.productLabel.length > 50) {
      validationErrors.push(`Product label is too long (${editFileData.productLabel.length} characters). Maximum is 50 characters.`);
    }
    
    if (editFileData.versionLabel && editFileData.versionLabel.length > 20) {
      validationErrors.push(`Version label is too long (${editFileData.versionLabel.length} characters). Maximum is 20 characters.`);
    }
    
    if (editFileData.languageLabel && editFileData.languageLabel.length > 20) {
      validationErrors.push(`Language label is too long (${editFileData.languageLabel.length} characters). Maximum is 20 characters.`);
    }
    
    if (validationErrors.length > 0) {
      alert('Validation errors:\n\n' + validationErrors.join('\n'));
      return;
    }
    
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
          productLabel: editFileData.productLabel || null,
          versionLabel: editFileData.versionLabel || null,
          languageLabel: editFileData.languageLabel || null,
          confluenceLabel: editFileData.confluenceLabel || null,
        }),
      });

      if (response.ok) {
        setShowEditFileModal(false);
        setEditingFile(null);
        await fetchFiles();
        alert('File data successfully updated');
      } else {
        const error = await response.json();
        let errorMessage = error.error;
        
        // Detailliertere Fehlermeldungen für Benutzer
        if (error.details) {
          if (error.details.includes('value too long for type')) {
            errorMessage = 'One of the labels is too long. Please use shorter values.';
          } else if (error.details.includes('column') && error.details.includes('does not exist')) {
            errorMessage = 'Database issue detected. Please try the "Fix Confluence" button first.';
          }
        }
        
        // Spezielle Behandlung für Längenfehler
        if (error.currentLength && error.maxLength) {
          errorMessage += `\n\nCurrent length: ${error.currentLength} characters\nMaximum allowed: ${error.maxLength} characters`;
        }
        
        alert('Error updating file: ' + errorMessage);
      }
    } catch (error) {
      alert('Error updating file: ' + error.message);
    } finally {
      setUpdatingFile(false);
    }
  };

  const handleSaveLabels = async () => {
    setSavingLabels(true);
    try {
      const token = Cookies.get('auth_token');
      let successCount = 0;
      let errorCount = 0;
      let errorMessages = [];

      for (const file of uploadedFiles) {
        const labels = fileLabels[file.id] || {};
        try {
          const response = await fetch('/.netlify/functions/admin-update-file-labels', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileId: file.id,
              productLabel: labels.productLabel || null,
              versionLabel: labels.versionLabel || null,
              languageLabel: labels.languageLabel || null,
              confluenceLabel: labels.confluenceLabel || null,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            const error = await response.json();
            let errorMessage = error.error;
            
            // Detailliertere Fehlermeldungen
            if (error.details) {
              if (error.details.includes('value too long for type')) {
                errorMessage = 'One of the labels is too long. Please use shorter values.';
              } else if (error.details.includes('column') && error.details.includes('does not exist')) {
                errorMessage = 'Database issue detected. Please try the "Fix Confluence" button first.';
              }
            }
            
            // Spezielle Behandlung für Längenfehler
            if (error.currentLength && error.maxLength) {
              errorMessage += `\n\nCurrent length: ${error.currentLength} characters\nMaximum allowed: ${error.maxLength} characters`;
            }
            
            errorMessages.push(`${file.filename}: ${errorMessage}`);
            console.error(`Failed to update labels for ${file.filename}:`, error);
          }
        } catch (error) {
          errorCount++;
          errorMessages.push(`${file.filename}: ${error.message}`);
          console.error(`Error updating labels for ${file.filename}:`, error);
        }
      }

      if (successCount > 0) {
        let message = `${successCount} file(s) successfully updated with labels!`;
        if (errorCount > 0) {
          message += `\n\n${errorCount} file(s) could not be updated:\n${errorMessages.slice(0, 3).join('\n')}`;
          if (errorMessages.length > 3) {
            message += `\n... and ${errorMessages.length - 3} more errors`;
          }
        }
        alert(message);
        setShowLabelPopup(false);
        setUploadedFiles([]);
        setFileLabels({});
        await fetchFiles();
      } else {
        throw new Error('All label updates failed. Please check the error messages above.');
      }
    } catch (error) {
      alert('Error saving labels: ' + error.message);
    } finally {
      setSavingLabels(false);
    }
  };

  const handleLabelChange = (fileId, field, value) => {
    setFileLabels(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        [field]: value
      }
    }));
  };

  const handleSkipLabels = () => {
    setShowLabelPopup(false);
    setUploadedFiles([]);
    setFileLabels({});
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
      file.filename.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProduct = !filterProduct || file.productLabel === filterProduct;
    const matchesVersion = !filterVersion || file.versionLabel === filterVersion;
    const matchesLanguage = !filterLanguage || file.languageLabel === filterLanguage;
    const matchesConfluence = !filterConfluence || file.confluenceLabel === filterConfluence;
    
    return matchesSearch && matchesProduct && matchesVersion && matchesLanguage && matchesConfluence;
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = !userSearchTerm || 
      user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (user.customer && user.customer.toLowerCase().includes(userSearchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  // Get unique values for filter dropdowns
  const uniqueProducts = [...new Set(files.map(f => f.productLabel).filter(Boolean))];
  const uniqueVersions = [...new Set(files.map(f => f.versionLabel).filter(Boolean))];
  const uniqueLanguages = [...new Set(files.map(f => f.languageLabel).filter(Boolean))];
  const uniqueConfluences = [...new Set(files.map(f => f.confluenceLabel).filter(Boolean))];

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
          <button
            onClick={() => setActiveTab('test')}
            className={`px-6 py-2.5 rounded-md font-medium transition-colors ${
              activeTab === 'test'
                ? 'bg-byght-turquoise text-white'
                : 'text-byght-gray hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Upload size={18} />
              <span>Test Upload</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('debug')}
            className={`px-6 py-2.5 rounded-md font-medium transition-colors ${
              activeTab === 'debug'
                ? 'bg-byght-turquoise text-white'
                : 'text-byght-gray hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText size={18} />
              <span>ZIP Debug</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-6 py-2.5 rounded-md font-medium transition-colors ${
              activeTab === 'basic'
                ? 'bg-byght-turquoise text-white'
                : 'text-byght-gray hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText size={18} />
              <span>Basic Test</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('chunked')}
            className={`px-6 py-2.5 rounded-md font-medium transition-colors ${
              activeTab === 'chunked'
                ? 'bg-byght-turquoise text-white'
                : 'text-byght-gray hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Upload size={18} />
              <span>Large Files</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('lazy')}
            className={`px-6 py-2.5 rounded-md font-medium transition-colors ${
              activeTab === 'lazy'
                ? 'bg-byght-turquoise text-white'
                : 'text-byght-gray hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Upload size={18} />
              <span>Lazy Upload</span>
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
                    onClick={handleFixConfluenceColumn}
                    disabled={fixingConfluence}
                    className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Fix Confluence label column in database"
                  >
                    {fixingConfluence ? 'Fixing...' : 'Fix Confluence'}
                  </button>
                  <button
                    onClick={handleTestConfluenceUpdate}
                    disabled={testingConfluence}
                    className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Test Confluence label update"
                  >
                    {testingConfluence ? 'Testing...' : 'Test Confluence'}
                  </button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Search
                    </label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-byght-turquoise"
                      placeholder="Filename..."
                    />
                  </div>

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

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Confluence
                    </label>
                    <select
                      value={filterConfluence}
                      onChange={(e) => setFilterConfluence(e.target.value)}
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-byght-turquoise"
                    >
                      <option value="">All Confluence</option>
                      {uniqueConfluences.map(confluence => (
                        <option key={confluence} value={confluence}>{confluence}</option>
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
                        setFilterConfluence('');
                      }}
                      className="w-full px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors"
                    >
                      Reset Filters
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
                            Product
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                            Version
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                            Language
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                            Confluence
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
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap hidden lg:table-cell">
                            <span className="text-xs text-gray-700">
                              {file.productLabel || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap hidden lg:table-cell">
                            <span className="text-xs text-gray-700">
                              {file.versionLabel ? `v${file.versionLabel}` : '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap hidden lg:table-cell">
                            <span className="text-xs text-gray-700">
                              {file.languageLabel || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap hidden lg:table-cell">
                            <span className="text-xs text-gray-700">
                              {file.confluenceLabel || '-'}
                            </span>
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
        ) : activeTab === 'test' ? (
          <TestUpload />
        ) : activeTab === 'debug' ? (
          <ZipDebugTest />
        ) : activeTab === 'basic' ? (
          <BasicFileTest />
        ) : activeTab === 'chunked' ? (
          <ChunkedUpload />
        ) : activeTab === 'lazy' ? (
          <LazyUpload />
        ) : (
          <div className="space-y-6">
            {/* User Creation Button */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-byght-gray">Manage Users</h2>
                <button
                  onClick={() => setShowNewUserModal(true)}
                  className="btn-secondary flex items-center whitespace-nowrap py-3 px-6"
                >
                  <Plus size={18} />
                  <span className="ml-2">Create New User</span>
                </button>
              </div>
            </div>

            {/* Users List */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-byght-gray">Manage Users</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{filteredUsers.length} of {users.length} users</span>
                </div>
              </div>

              {/* User Search */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-byght-turquoise focus:border-transparent"
                    placeholder="Search by username or company..."
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
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Username
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expiry Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Files
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Password
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 group">
                          <td className="px-4 py-3 whitespace-nowrap">
                            {editingUsername[user.id] ? (
                              <div className="flex items-center space-x-1">
                                <input
                                  type="text"
                                  value={editingUsernameValue[user.id] || user.username}
                                  onChange={(e) => setEditingUsernameValue({ ...editingUsernameValue, [user.id]: e.target.value })}
                                  className="text-sm border border-gray-300 rounded px-2 py-1 w-32"
                                  autoFocus
                                />
                                <button
                                  onClick={() => {
                                    const newValue = editingUsernameValue[user.id] || '';
                                    if (newValue.trim() !== user.username && newValue.trim() !== '') {
                                      handleUpdateUsername(user.id, newValue);
                                    } else {
                                      setEditingUsername({ ...editingUsername, [user.id]: false });
                                      setEditingUsernameValue({ ...editingUsernameValue, [user.id]: '' });
                                    }
                                  }}
                                  disabled={updatingUser[user.id]}
                                  className="text-green-600 hover:text-green-700"
                                  title="Save"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingUsername({ ...editingUsername, [user.id]: false });
                                    setEditingUsernameValue({ ...editingUsernameValue, [user.id]: '' });
                                  }}
                                  className="text-gray-500 hover:text-gray-700"
                                  title="Cancel"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-byght-gray">{user.username}</span>
                                <button
                                  onClick={() => {
                                    setEditingUsername({ ...editingUsername, [user.id]: true });
                                    setEditingUsernameValue({ ...editingUsernameValue, [user.id]: user.username });
                                  }}
                                  className="text-gray-400 hover:text-byght-turquoise opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Edit username"
                                >
                                  <Edit2 size={12} />
                                </button>
                              </div>
                            )}
                          </td>
                          
                          <td className="px-4 py-3 whitespace-nowrap">
                            {editingCompany[user.id] ? (
                              <div className="flex items-center space-x-1">
                                <input
                                  type="text"
                                  value={editingCompanyValue[user.id] || user.customer || ''}
                                  onChange={(e) => setEditingCompanyValue({ ...editingCompanyValue, [user.id]: e.target.value })}
                                  className="text-sm border border-gray-300 rounded px-2 py-1 w-32"
                                  autoFocus
                                />
                                <button
                                  onClick={() => {
                                    const newValue = editingCompanyValue[user.id] || '';
                                    if (newValue.trim() !== (user.customer || '')) {
                                      handleUpdateCompany(user.id, newValue);
                                    } else {
                                      setEditingCompany({ ...editingCompany, [user.id]: false });
                                      setEditingCompanyValue({ ...editingCompanyValue, [user.id]: '' });
                                    }
                                  }}
                                  disabled={updatingUser[user.id]}
                                  className="text-green-600 hover:text-green-700"
                                  title="Save"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCompany({ ...editingCompany, [user.id]: false });
                                    setEditingCompanyValue({ ...editingCompanyValue, [user.id]: '' });
                                  }}
                                  className="text-gray-500 hover:text-gray-700"
                                  title="Cancel"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-600">{user.customer || '-'}</span>
                                <button
                                  onClick={() => {
                                    setEditingCompany({ ...editingCompany, [user.id]: true });
                                    setEditingCompanyValue({ ...editingCompanyValue, [user.id]: user.customer || '' });
                                  }}
                                  className="text-gray-400 hover:text-byght-turquoise opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Edit company"
                                >
                                  <Edit2 size={12} />
                                </button>
                              </div>
                            )}
                          </td>
                          
                          <td className="px-4 py-3 whitespace-nowrap">
                            {user.isAdmin ? (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-byght-yellow/20 text-byght-gray">
                                Admin
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-700">
                                User
                              </span>
                            )}
                          </td>
                          
                          <td className="px-4 py-3 whitespace-nowrap">
                            {!user.isAdmin && (
                              <div>
                                {editingExpiryDate[user.id] ? (
                                  <div className="flex items-center space-x-1">
                                    <input
                                      type="date"
                                      defaultValue={user.expiryDate || ''}
                                      className="text-sm border border-gray-300 rounded px-2 py-1"
                                      min={new Date().toISOString().split('T')[0]}
                                      data-expiry-id={user.id}
                                    />
                                    <button
                                      onClick={() => {
                                        const input = document.querySelector(`input[data-expiry-id="${user.id}"]`);
                                        if (input && input.value) {
                                          handleUpdateExpiryDate(user.id, input.value);
                                        }
                                      }}
                                      disabled={updatingExpiryDate[user.id]}
                                      className="text-green-600 hover:text-green-700"
                                      title="Save"
                                    >
                                      <Check size={14} />
                                    </button>
                                    <button
                                      onClick={() => setEditingExpiryDate({ ...editingExpiryDate, [user.id]: false })}
                                      className="text-gray-500 hover:text-gray-700"
                                      title="Cancel"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    <span className={`text-sm ${
                                      isUserExpired(user.expiryDate) 
                                        ? 'text-red-600 font-medium' 
                                        : getDaysUntilExpiry(user.expiryDate) <= 7 
                                          ? 'text-orange-600 font-medium'
                                          : 'text-gray-700'
                                    }`}>
                                      {formatExpiryDate(user.expiryDate)}
                                      {!isUserExpired(user.expiryDate) && getDaysUntilExpiry(user.expiryDate) !== null && getDaysUntilExpiry(user.expiryDate) <= 30 && (
                                        <span className="ml-1 text-xs">
                                          ({getDaysUntilExpiry(user.expiryDate)}d)
                                        </span>
                                      )}
                                    </span>
                                    <button
                                      onClick={() => setEditingExpiryDate({ ...editingExpiryDate, [user.id]: true })}
                                      className="text-gray-400 hover:text-byght-turquoise opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Edit expiry date"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                  </div>
                                )}
                                {isUserExpired(user.expiryDate) && (
                                  <div className="text-xs text-red-600 font-medium mt-1">
                                    Expired
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          
                          <td className="px-4 py-3">
                            {user.isAdmin ? (
                              <span className="text-xs text-gray-500 italic">All files</span>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-700">
                                  {userFiles[user.id]?.length || 0} files
                                </span>
                                <button
                                  onClick={() => handleEditUserFiles(user)}
                                  className="text-byght-turquoise hover:text-byght-turquoise/80"
                                  title="Manage files"
                                >
                                  <FileText size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                          
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => openPasswordModal(user.id)}
                              className="text-sm text-byght-turquoise hover:text-byght-turquoise/80"
                            >
                              Reset
                            </button>
                          </td>
                          
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleDeleteUser(user.id, user.username)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 size={16} />
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
                    Edit File: {editingFile.filename}
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
                      Product
                    </label>
                    <select
                      value={editFileData.productLabel}
                      onChange={(e) => setEditFileData({ ...editFileData, productLabel: e.target.value })}
                      className="input-field"
                    >
                      <option value="">No Product</option>
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
                      value={editFileData.versionLabel}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        setEditFileData({ ...editFileData, versionLabel: value });
                      }}
                      className="input-field"
                      placeholder="e.g. 1.2.3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-byght-gray mb-1">
                      Language
                    </label>
                    <select
                      value={editFileData.languageLabel}
                      onChange={(e) => setEditFileData({ ...editFileData, languageLabel: e.target.value })}
                      className="input-field"
                    >
                      <option value="">No Language</option>
                      <option value="EN">EN</option>
                      <option value="DE">DE</option>
                      <option value="EN/DE">EN/DE</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-byght-gray mb-1">
                      Confluence
                    </label>
                    <select
                      value={editFileData.confluenceLabel}
                      onChange={(e) => setEditFileData({ ...editFileData, confluenceLabel: e.target.value })}
                      className="input-field"
                    >
                      <option value=""></option>
                      <option value="Cloud">Cloud</option>
                      <option value="Server">Server</option>
                    </select>
                    {editFileData.confluenceLabel && (
                      <div className={`text-xs mt-1 ${
                        editFileData.confluenceLabel.length > 50 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {editFileData.confluenceLabel.length}/50 characters
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => setShowEditFileModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateFileData}
                    disabled={updatingFile}
                    className="btn-primary"
                  >
                    {updatingFile ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Password Reset Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-byght-gray">
                    Set New Password
                  </h3>
                  <button
                    onClick={() => {
                      setShowPasswordModal(false);
                      setNewPassword('');
                      setPasswordError('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {passwordError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                      {passwordError}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-byght-gray mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPasswordError('');
                        }}
                        className="input-field pr-10"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  

                  
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 font-medium">Password Requirements:</p>
                    <ul className="text-xs text-gray-500 mt-1 space-y-0.5">
                      <li className={`${newPassword.length >= 12 ? 'text-green-600' : ''}`}>
                        • At least 12 characters
                      </li>
                      <li className={`${newPassword && (/[A-Z]/.test(newPassword) + /[a-z]/.test(newPassword) + /\d/.test(newPassword) + /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) >= 3 ? 'text-green-600' : ''}`}>
                        • At least 3 of: uppercase, lowercase, numbers, special characters
                      </li>

                    </ul>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => {
                      setShowPasswordModal(false);
                      setNewPassword('');
                      setPasswordError('');
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasswordReset}
                    className="btn-primary"
                  >
                    Set Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Label Popup Modal for newly uploaded files */}
        {showLabelPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-byght-gray">
                    Add Labels to Uploaded Files
                  </h3>
                  <button
                    onClick={handleSkipLabels}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto space-y-6">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-[rgb(255,179,0)] to-[rgb(56,184,189)] rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-byght-gray">{file.filename}</h4>
                            <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-byght-gray mb-1">
                            Product
                          </label>
                          <select
                            value={fileLabels[file.id]?.productLabel || ''}
                            onChange={(e) => handleLabelChange(file.id, 'productLabel', e.target.value)}
                            className="input-field"
                          >
                            <option value="">No Product</option>
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
                            value={fileLabels[file.id]?.versionLabel || ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9.]/g, '');
                              handleLabelChange(file.id, 'versionLabel', value);
                            }}
                            className="input-field"
                            placeholder="e.g. 1.2.3"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-byght-gray mb-1">
                            Language
                          </label>
                          <select
                            value={fileLabels[file.id]?.languageLabel || ''}
                            onChange={(e) => handleLabelChange(file.id, 'languageLabel', e.target.value)}
                            className="input-field"
                          >
                            <option value="">No Language</option>
                            <option value="EN">EN</option>
                            <option value="DE">DE</option>
                            <option value="EN/DE">EN/DE</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-byght-gray mb-1">
                            Confluence
                          </label>
                          <select
                            value={fileLabels[file.id]?.confluenceLabel || ''}
                            onChange={(e) => handleLabelChange(file.id, 'confluenceLabel', e.target.value)}
                            className="input-field"
                          >
                            <option value=""></option>
                            <option value="Cloud">Cloud</option>
                            <option value="Server">Server</option>
                          </select>
                          {fileLabels[file.id]?.confluenceLabel && (
                            <div className={`text-xs mt-1 ${
                              fileLabels[file.id].confluenceLabel.length > 50 ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              {fileLabels[file.id].confluenceLabel.length}/50 characters
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSkipLabels}
                    className="btn-secondary"
                  >
                    Skip
                  </button>
                  <div className="flex gap-2">
                    <span className="text-sm text-gray-500 self-center">
                      {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} uploaded
                    </span>
                    <button
                      onClick={handleSaveLabels}
                      disabled={savingLabels}
                      className="btn-primary"
                    >
                      {savingLabels ? 'Saving...' : 'Save Labels'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create New User Modal */}
        {showNewUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-byght-gray">
                    Create New User
                  </h3>
                  <button
                    onClick={() => {
                      setShowNewUserModal(false);
                      setNewUser({ 
                        username: '', 
                        password: '', 
                        isAdmin: false,
                        customer: '',
                        expiryDate: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                      });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
                
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
                    <div className="mt-1">
                      <p className="text-xs text-gray-600">Requirements:</p>
                      <ul className="text-xs text-gray-500 mt-1 space-y-0.5">
                        <li className={`${newUser.password.length >= 12 ? 'text-green-600' : ''}`}>
                          • At least 12 characters
                        </li>
                        <li className={`${newUser.password && (/[A-Z]/.test(newUser.password) + /[a-z]/.test(newUser.password) + /\d/.test(newUser.password) + /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newUser.password)) >= 3 ? 'text-green-600' : ''}`}>
                          • At least 3 of: uppercase, lowercase, numbers, special characters
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-byght-gray mb-1">
                      Customer (optional)
                    </label>
                    <input
                      type="text"
                      value={newUser.customer}
                      onChange={(e) => setNewUser({ ...newUser, customer: e.target.value })}
                      className="input-field"
                      placeholder="Customer name"
                    />
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
                  
                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewUserModal(false);
                        setNewUser({ 
                          username: '', 
                          password: '', 
                          isAdmin: false,
                          customer: '',
                          expiryDate: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                        });
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Create User
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;