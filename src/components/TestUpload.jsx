import React, { useState } from 'react';
import Cookies from 'js-cookie';

const TestUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [testingDb, setTestingDb] = useState(false);
  const [analyzingZip, setAnalyzingZip] = useState(false);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setResult(null);
    setError(null);
  };

  const handleTestUpload = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    setUploading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = Cookies.get('auth_token');
      console.log('Testing upload with file:', file.name, file.size, file.type);
      
      const response = await fetch('/.netlify/functions/test-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          setResult(data);
        } catch (jsonError) {
          setError(`JSON parsing failed: ${jsonError.message}. Response: ${responseText}`);
        }
      } else {
        try {
          const errorData = JSON.parse(responseText);
          setError(errorData.error || 'Upload failed');
        } catch (jsonError) {
          setError(`HTTP ${response.status}: ${responseText}`);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleTestDatabase = async () => {
    setTestingDb(true);
    setResult(null);
    setError(null);

    try {
      const token = Cookies.get('auth_token');
      console.log('Testing database connection...');
      
      const response = await fetch('/.netlify/functions/test-db', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          setResult(data);
        } catch (jsonError) {
          setError(`JSON parsing failed: ${jsonError.message}. Response: ${responseText}`);
        }
      } else {
        try {
          const errorData = JSON.parse(responseText);
          setError(errorData.error || 'Database test failed');
        } catch (jsonError) {
          setError(`HTTP ${response.status}: ${responseText}`);
        }
      }
    } catch (error) {
      console.error('Database test error:', error);
      setError(error.message);
    } finally {
      setTestingDb(false);
    }
  };

  const handleAnalyzeZip = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    setAnalyzingZip(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = Cookies.get('auth_token');
      console.log('Analyzing ZIP file:', file.name, file.size, file.type);
      
      const response = await fetch('/.netlify/functions/test-zip-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          setResult(data);
        } catch (jsonError) {
          setError(`JSON parsing failed: ${jsonError.message}. Response: ${responseText}`);
        }
      } else {
        try {
          const errorData = JSON.parse(responseText);
          setError(errorData.error || 'ZIP analysis failed');
        } catch (jsonError) {
          setError(`HTTP ${response.status}: ${responseText}`);
        }
      }
    } catch (error) {
      console.error('ZIP analysis error:', error);
      setError(error.message);
    } finally {
      setAnalyzingZip(false);
    }
  };

  const handleRealUpload = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    setUploading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = Cookies.get('auth_token');
      console.log('Real upload with file:', file.name, file.size, file.type);
      
      const response = await fetch('/.netlify/functions/admin-upload-file', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          setResult(data);
        } catch (jsonError) {
          setError(`JSON parsing failed: ${jsonError.message}. Response: ${responseText}`);
        }
      } else {
        try {
          const errorData = JSON.parse(responseText);
          setError(errorData.error || 'Upload failed');
        } catch (jsonError) {
          setError(`HTTP ${response.status}: ${responseText}`);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Upload Test</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select File
        </label>
        <input
          type="file"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {file && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p><strong>Selected file:</strong> {file.name}</p>
          <p><strong>Size:</strong> {file.size} bytes</p>
          <p><strong>Type:</strong> {file.type}</p>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <button
          onClick={handleTestDatabase}
          disabled={testingDb}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {testingDb ? 'Testing...' : 'Test Database'}
        </button>
        
        <button
          onClick={handleTestUpload}
          disabled={!file || uploading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {uploading ? 'Testing...' : 'Test Upload'}
        </button>
        
        <button
          onClick={handleAnalyzeZip}
          disabled={!file || analyzingZip}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
        >
          {analyzingZip ? 'Analyzing...' : 'Analyze ZIP'}
        </button>
        
        <button
          onClick={handleRealUpload}
          disabled={!file || uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Real Upload'}
        </button>
      </div>

      {result && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
          <h3 className="font-semibold text-green-800 mb-2">Success:</h3>
          <pre className="text-sm text-green-700 overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="font-semibold text-red-800 mb-2">Error:</h3>
          <pre className="text-sm text-red-700 overflow-auto">
            {error}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TestUpload;
