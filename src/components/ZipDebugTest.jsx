import React, { useState } from 'react';
import Cookies from 'js-cookie';

const ZipDebugTest = () => {
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

  const runDebugTest = async () => {
    if (!file) {
      alert('Please select a ZIP file first');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = Cookies.get('auth_token');
      const response = await fetch('/.netlify/functions/test-zip-debug', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      // Versuche zuerst den Response-Text zu lesen
      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);
      
      // Versuche JSON zu parsen, falls möglich
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        // Wenn JSON-Parsing fehlschlägt, erstelle ein Error-Objekt mit dem Text
        data = {
          error: 'Server response is not valid JSON',
          details: responseText,
          statusCode: response.status,
          statusText: response.statusText
        };
      }
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data);
      }
    } catch (err) {
      console.error('Debug test error:', err);
      setError({ 
        error: err.message,
        details: 'Failed to communicate with server. Check console for details.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">ZIP File Debug Test</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select ZIP File
        </label>
        <input
          type="file"
          accept=".zip"
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
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </div>
        )}
      </div>

      <button
        onClick={runDebugTest}
        disabled={!file || loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Testing...' : 'Run Debug Test'}
      </button>

      {result && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Debug Results:</h3>
          
          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-semibold mb-2">File Info:</h4>
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(result.debugInfo, null, 2)}
            </pre>
          </div>

          <div className="mt-4 bg-gray-50 p-4 rounded">
            <h4 className="font-semibold mb-2">Test Results:</h4>
            
            <div className="space-y-2">
              <div className={`p-2 rounded ${result.tests.arrayBuffer.success ? 'bg-green-100' : 'bg-red-100'}`}>
                <strong>ArrayBuffer Test:</strong> {result.tests.arrayBuffer.success ? '✅ Success' : '❌ Failed'}
                {result.tests.arrayBuffer.error && (
                  <div className="text-sm text-red-600 mt-1">{result.tests.arrayBuffer.error}</div>
                )}
                {result.tests.arrayBuffer.headerHex && (
                  <div className="text-sm mt-1">
                    Header: {result.tests.arrayBuffer.headerHex} 
                    {result.tests.arrayBuffer.isValidZip ? ' (Valid ZIP)' : ' (Invalid ZIP)'}
                  </div>
                )}
              </div>

              <div className={`p-2 rounded ${result.tests.stream.success ? 'bg-green-100' : 'bg-red-100'}`}>
                <strong>Stream Test:</strong> {result.tests.stream.success ? '✅ Success' : '❌ Failed'}
                {result.tests.stream.success && (
                  <div className="text-sm mt-1">
                    Chunks: {result.tests.stream.chunks}, Total Size: {result.tests.stream.totalSize} bytes
                  </div>
                )}
                {result.tests.stream.error && (
                  <div className="text-sm text-red-600 mt-1">{result.tests.stream.error}</div>
                )}
              </div>

              <div className={`p-2 rounded ${
                !result.tests.blobStorage.attempted ? 'bg-gray-100' : 
                result.tests.blobStorage.success ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <strong>Blob Storage Test:</strong> 
                {!result.tests.blobStorage.attempted ? ' ⏭️ Skipped' : 
                 result.tests.blobStorage.success ? ' ✅ Success' : ' ❌ Failed'}
                {result.tests.blobStorage.reason && (
                  <div className="text-sm mt-1">{result.tests.blobStorage.reason}</div>
                )}
                {result.tests.blobStorage.error && (
                  <div className="text-sm text-red-600 mt-1">{result.tests.blobStorage.error}</div>
                )}
              </div>
            </div>
          </div>

          {result.recommendation && result.recommendation.length > 0 && (
            <div className="mt-4 bg-yellow-50 p-4 rounded border border-yellow-200">
              <h4 className="font-semibold mb-2">Recommendations:</h4>
              <ul className="list-disc list-inside space-y-1">
                {result.recommendation.map((rec, index) => (
                  <li key={index} className="text-sm">{rec}</li>
                ))}
              </ul>
            </div>
          )}
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

export default ZipDebugTest;
