import React, { useState } from 'react';
import Cookies from 'js-cookie';

const BasicFileTest = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setResult(null);
    setError(null);
  };

  const runBasicTest = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = Cookies.get('auth_token');
      const response = await fetch('/.netlify/functions/basic-file-test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        data = {
          error: 'Server response is not valid JSON',
          details: responseText,
          statusCode: response.status
        };
      }
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data);
      }
    } catch (err) {
      console.error('Basic test error:', err);
      setError({ 
        error: err.message,
        details: 'Failed to communicate with server'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Basic File Test</h2>
      <p className="text-gray-600 mb-4">
        This test checks if file handling works in the Netlify Functions environment.
      </p>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select any file
        </label>
        <input
          type="file"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
        {file && (
          <div className="mt-2 text-sm text-gray-600">
            Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
          </div>
        )}
      </div>

      <button
        onClick={runBasicTest}
        disabled={!file || loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Testing...' : 'Run Basic Test'}
      </button>

      {result && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Test Results:</h3>
          
          <div className="bg-gray-50 p-4 rounded mb-4">
            <h4 className="font-semibold mb-2">File Info:</h4>
            <div className="text-sm">
              <div>Name: {result.fileInfo.name}</div>
              <div>Size: {result.fileInfo.size} bytes</div>
              <div>Type: {result.fileInfo.type}</div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-semibold mb-2">Method Tests:</h4>
            
            <div className="space-y-2">
              <div className={`p-2 rounded ${result.tests.arrayBuffer.success ? 'bg-green-100' : 'bg-red-100'}`}>
                <strong>arrayBuffer():</strong> 
                {result.tests.arrayBuffer.available ? 
                  (result.tests.arrayBuffer.success ? '✅ Success' : '❌ Failed') : 
                  '⏭️ Not available'}
                {result.tests.arrayBuffer.error && (
                  <div className="text-sm text-red-600 mt-1">{result.tests.arrayBuffer.error}</div>
                )}
              </div>

              <div className={`p-2 rounded ${result.tests.stream.success ? 'bg-green-100' : 'bg-red-100'}`}>
                <strong>stream():</strong> 
                {result.tests.stream.available ? 
                  (result.tests.stream.success ? '✅ Success' : '❌ Failed') : 
                  '⏭️ Not available'}
                {result.tests.stream.error && (
                  <div className="text-sm text-red-600 mt-1">{result.tests.stream.error}</div>
                )}
              </div>

              <div className={`p-2 rounded ${result.tests.text.success ? 'bg-green-100' : 'bg-red-100'}`}>
                <strong>text():</strong> 
                {result.tests.text.available ? 
                  (result.tests.text.success ? '✅ Success' : '❌ Failed') : 
                  '⏭️ Not available'}
                {result.tests.text.error && (
                  <div className="text-sm text-red-600 mt-1">{result.tests.text.error}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 bg-red-50 p-4 rounded border border-red-200">
          <h3 className="text-lg font-semibold text-red-700 mb-2">Error:</h3>
          <pre className="text-xs text-red-600 overflow-x-auto">
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default BasicFileTest;
