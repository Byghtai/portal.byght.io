import React, { useState, useRef } from 'react';
import Cookies from 'js-cookie';

const LazyUpload = () => {
  const [file, setFile] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingChunk, setLoadingChunk] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [uploadedChunks, setUploadedChunks] = useState(new Set());
  const abortControllerRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setResult(null);
    setError(null);
    setSessionId(null);
    setSessionInfo(null);
    setUploadedChunks(new Set());
  };

  const initializeSession = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const token = Cookies.get('auth_token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        originalSize: file.size,
        originalType: file.type,
        uploadedAt: new Date().toISOString()
      }));

      const response = await fetch('/.netlify/functions/lazy-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize session');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      setSessionInfo({
        totalChunks: data.totalChunks,
        chunkSize: data.chunkSize
      });

      console.log('Lazy upload session initialized:', data);
    } catch (err) {
      console.error('Session initialization error:', err);
      setError({ 
        error: err.message,
        details: 'Failed to initialize lazy upload session'
      });
    } finally {
      setUploading(false);
    }
  };

  const uploadChunk = async (chunkIndex) => {
    if (!sessionId || !file) return;

    setLoadingChunk(chunkIndex);
    setError(null);

    try {
      const token = Cookies.get('auth_token');
      const chunkSize = 5 * 1024 * 1024; // 5MB chunks
      
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      // Convert chunk to base64
      const chunkArrayBuffer = await chunk.arrayBuffer();
      const chunkBase64 = btoa(String.fromCharCode(...new Uint8Array(chunkArrayBuffer)));

      const chunkData = {
        action: 'upload_chunk',
        sessionId: sessionId,
        chunkIndex: chunkIndex,
        chunkData: chunkBase64,
        fileName: file.name,
        totalSize: file.size
      };

      const response = await fetch('/.netlify/functions/lazy-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunkData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to upload chunk ${chunkIndex}`);
      }

      const result = await response.json();
      setUploadedChunks(prev => new Set([...prev, chunkIndex]));
      
      console.log(`Chunk ${chunkIndex} uploaded successfully`);
      
      // Update session info
      if (sessionInfo) {
        setSessionInfo(prev => ({
          ...prev,
          uploadedChunks: result.uploadedChunks
        }));
      }

    } catch (err) {
      console.error(`Chunk ${chunkIndex} upload error:`, err);
      setError({ 
        error: err.message,
        details: `Failed to upload chunk ${chunkIndex}`
      });
    } finally {
      setLoadingChunk(null);
    }
  };

  const loadChunk = async (chunkIndex) => {
    if (!sessionId) return;

    setLoadingChunk(chunkIndex);
    setError(null);

    try {
      const token = Cookies.get('auth_token');
      
      const chunkData = {
        action: 'get_chunk',
        sessionId: sessionId,
        chunkIndex: chunkIndex
      };

      const response = await fetch('/.netlify/functions/lazy-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunkData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to load chunk ${chunkIndex}`);
      }

      const result = await response.json();
      
      // Konvertiere base64 zurück zu Blob
      const chunkBytes = atob(result.chunkData);
      const chunkArray = new Uint8Array(chunkBytes.length);
      for (let i = 0; i < chunkBytes.length; i++) {
        chunkArray[i] = chunkBytes.charCodeAt(i);
      }
      
      const chunkBlob = new Blob([chunkArray]);
      
      // Erstelle Download-Link
      const url = URL.createObjectURL(chunkBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name}.part${chunkIndex}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`Chunk ${chunkIndex} loaded and downloaded`);
      
    } catch (err) {
      console.error(`Chunk ${chunkIndex} load error:`, err);
      setError({ 
        error: err.message,
        details: `Failed to load chunk ${chunkIndex}`
      });
    } finally {
      setLoadingChunk(null);
    }
  };

  const completeSession = async () => {
    if (!sessionId) return;

    try {
      const token = Cookies.get('auth_token');
      
      const data = {
        action: 'complete_session',
        sessionId: sessionId
      };

      const response = await fetch('/.netlify/functions/lazy-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete session');
      }

      const result = await response.json();
      setResult(result);
      console.log('Session completed:', result);
      
    } catch (err) {
      console.error('Session completion error:', err);
      setError({ 
        error: err.message,
        details: 'Failed to complete session'
      });
    }
  };

  const combineChunks = async () => {
    if (!sessionId) return;

    try {
      const token = Cookies.get('auth_token');
      
      const response = await fetch('/.netlify/functions/combine-chunks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to combine chunks');
      }

      const result = await response.json();
      setResult(result);
      console.log('Chunks combined successfully:', result);
      
    } catch (err) {
      console.error('Combine chunks error:', err);
      setError({ 
        error: err.message,
        details: 'Failed to combine chunks into final file'
      });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderChunkGrid = () => {
    if (!sessionInfo) return null;

    const chunks = [];
    for (let i = 0; i < sessionInfo.totalChunks; i++) {
      const isUploaded = uploadedChunks.has(i);
      const isLoading = loadingChunk === i;
      
      chunks.push(
        <div 
          key={i} 
          className={`p-3 border rounded-lg text-center cursor-pointer transition-colors ${
            isUploaded 
              ? 'bg-green-100 border-green-300 text-green-800' 
              : isLoading
              ? 'bg-blue-100 border-blue-300 text-blue-800'
              : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
          }`}
          onClick={() => isUploaded ? loadChunk(i) : uploadChunk(i)}
        >
          <div className="font-semibold">Chunk {i + 1}</div>
          <div className="text-sm">
            {isUploaded ? '✅ Uploaded' : isLoading ? '⏳ Loading...' : '📤 Upload'}
          </div>
          <div className="text-xs mt-1">
            {formatFileSize(sessionInfo.chunkSize)}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {chunks}
      </div>
    );
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Lazy Upload (5MB Chunks)</h2>
      <p className="text-gray-600 mb-4">
        Upload large files in 5MB chunks with lazy loading. Chunks can be uploaded and downloaded individually.
      </p>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select file to upload
        </label>
        <input
          type="file"
          onChange={handleFileSelect}
          disabled={uploading || sessionId}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50"
        />
        {file && (
          <div className="mt-2 text-sm text-gray-600">
            <div>Name: {file.name}</div>
            <div>Size: {formatFileSize(file.size)}</div>
            <div>Type: {file.type || 'Unknown'}</div>
            <div>Chunks: {Math.ceil(file.size / (5 * 1024 * 1024))} (5MB each)</div>
          </div>
        )}
      </div>

      {!sessionId && (
        <button
          onClick={initializeSession}
          disabled={!file || uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Initializing...' : 'Initialize Session'}
        </button>
      )}

      {sessionId && sessionInfo && (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">Session Info</h3>
            <div className="text-sm text-blue-700">
              <div>Session ID: {sessionId}</div>
              <div>Total Chunks: {sessionInfo.totalChunks}</div>
              <div>Uploaded Chunks: {sessionInfo.uploadedChunks || 0}</div>
              <div>Chunk Size: {formatFileSize(sessionInfo.chunkSize)}</div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Chunk Management</h3>
            <p className="text-sm text-gray-600 mb-3">
              Click on chunks to upload them. Green chunks are uploaded and can be downloaded.
            </p>
            {renderChunkGrid()}
          </div>

          <div className="flex gap-2">
            <button
              onClick={completeSession}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Complete Session
            </button>
            <button
              onClick={combineChunks}
              disabled={uploadedChunks.size < sessionInfo.totalChunks}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Combine Chunks
            </button>
            <button
              onClick={() => {
                setSessionId(null);
                setSessionInfo(null);
                setUploadedChunks(new Set());
                setResult(null);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Reset Session
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-6 bg-green-50 p-4 rounded border border-green-200">
          <h3 className="text-lg font-semibold text-green-700 mb-2">
            {result.fileKey ? 'File Successfully Combined!' : 'Session Completed!'}
          </h3>
          <div className="text-sm">
            {result.fileKey ? (
              <>
                <div>File: {result.fileName}</div>
                <div>Size: {formatFileSize(result.fileSize)}</div>
                <div>Key: {result.fileKey}</div>
                <div>Original Chunks: {result.originalChunks}</div>
              </>
            ) : (
              <>
                <div>Session ID: {result.sessionId}</div>
                <div>Total Chunks: {result.totalChunks}</div>
                <div>Uploaded Chunks: {result.uploadedChunks}</div>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 bg-red-50 p-4 rounded border border-red-200">
          <h3 className="text-lg font-semibold text-red-700 mb-2">Error</h3>
          <div className="text-sm text-red-600">
            <div>{error.error}</div>
            {error.details && <div className="mt-1">{error.details}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default LazyUpload;
