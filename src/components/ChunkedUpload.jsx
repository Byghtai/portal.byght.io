import React, { useState, useRef } from 'react';
import Cookies from 'js-cookie';

const ChunkedUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [totalChunks, setTotalChunks] = useState(0);
  const [uploadedChunks, setUploadedChunks] = useState(0);
  const abortControllerRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setResult(null);
    setError(null);
    setProgress(0);
    setSessionId(null);
    setTotalChunks(0);
    setUploadedChunks(0);
  };

  const uploadFile = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);
    setProgress(0);
    abortControllerRef.current = new AbortController();

    try {
      const token = Cookies.get('auth_token');
             const chunkSize = 3 * 1024 * 1024; // 3MB chunks
      const totalChunks = Math.ceil(file.size / chunkSize);

      console.log(`Starting chunked upload: ${file.name} (${file.size} bytes, ${totalChunks} chunks)`);

      // Step 1: Initialize upload session
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        originalSize: file.size,
        originalType: file.type,
        uploadedAt: new Date().toISOString()
      }));

      const initResponse = await fetch('/.netlify/functions/chunked-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
        signal: abortControllerRef.current.signal
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json();
        throw new Error(errorData.error || 'Failed to initialize upload');
      }

      const initData = await initResponse.json();
      setSessionId(initData.sessionId);
      setTotalChunks(initData.totalChunks);

      console.log('Upload session initialized:', initData);

      // Step 2: Upload chunks
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        if (abortControllerRef.current.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        // Convert chunk to base64
        const chunkArrayBuffer = await chunk.arrayBuffer();
        const chunkBase64 = btoa(String.fromCharCode(...new Uint8Array(chunkArrayBuffer)));

        const chunkData = {
          action: 'upload_chunk',
          sessionId: initData.sessionId,
          chunkIndex: chunkIndex,
          chunkData: chunkBase64,
          fileName: file.name,
          totalSize: file.size
        };

        const chunkResponse = await fetch('/.netlify/functions/chunked-upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunkData),
          signal: abortControllerRef.current.signal
        });

        if (!chunkResponse.ok) {
          const errorData = await chunkResponse.json();
          throw new Error(errorData.error || `Failed to upload chunk ${chunkIndex}`);
        }

        const chunkResult = await chunkResponse.json();
        setUploadedChunks(chunkResult.uploadedChunks);
        setProgress((chunkResult.uploadedChunks / totalChunks) * 100);

        console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded`);

        // Check if upload is complete
        if (chunkResult.fileKey) {
          setResult(chunkResult);
          console.log('Upload completed successfully:', chunkResult);
          break;
        }
      }

    } catch (err) {
      console.error('Chunked upload error:', err);
      setError({ 
        error: err.message,
        details: err.name === 'AbortError' ? 'Upload was cancelled' : 'Upload failed'
      });
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Chunked Upload (Large Files)</h2>
      <p className="text-gray-600 mb-4">
                 Upload large files by splitting them into 3MB chunks. This safely bypasses the 6MB Netlify Functions limit.
      </p>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select file to upload
        </label>
        <input
          type="file"
          onChange={handleFileSelect}
          disabled={uploading}
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
                         <div>Chunks: {Math.ceil(file.size / (3 * 1024 * 1024))} (3MB each)</div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={uploadFile}
          disabled={!file || uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Start Upload'}
        </button>
        
        {uploading && (
          <button
            onClick={cancelUpload}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Cancel
          </button>
        )}
      </div>

      {uploading && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{uploadedChunks}/{totalChunks} chunks ({progress.toFixed(1)}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          {sessionId && (
            <div className="text-xs text-gray-500 mt-1">
              Session: {sessionId}
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="mt-6 bg-green-50 p-4 rounded border border-green-200">
          <h3 className="text-lg font-semibold text-green-700 mb-2">Upload Successful!</h3>
          <div className="text-sm">
            <div>File: {result.fileName}</div>
            <div>Size: {formatFileSize(result.fileSize)}</div>
            <div>Key: {result.fileKey}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 bg-red-50 p-4 rounded border border-red-200">
          <h3 className="text-lg font-semibold text-red-700 mb-2">Upload Failed</h3>
          <div className="text-sm text-red-600">
            <div>{error.error}</div>
            {error.details && <div className="mt-1">{error.details}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChunkedUpload;
