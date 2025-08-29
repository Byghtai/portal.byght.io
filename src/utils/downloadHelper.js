/**
 * Download Helper - Intelligenter Download mit Fallback-Mechanismen
 */

/**
 * Versucht einen Download mit verschiedenen Methoden
 * 1. Direct Download (für kleine Dateien)
 * 2. Presigned URL (für große Dateien oder bei Fehlern)
 * 
 * @param {string} fileId - Die ID der Datei
 * @param {string} filename - Der Dateiname für den Download
 * @param {number} fileSize - Die Dateigröße in Bytes
 * @param {string} token - Das Auth-Token
 * @returns {Promise<void>}
 */
export async function downloadFile(fileId, filename, fileSize, token) {
  console.log(`Starting intelligent download for: ${filename} (${fileSize} bytes)`);
  
  // Strategie basierend auf Dateigröße wählen
  const MAX_DIRECT_SIZE = 10 * 1024 * 1024; // 10MB
  const preferDirect = fileSize <= MAX_DIRECT_SIZE;
  
  try {
    // Methode 1: Versuche direkten Download für kleine Dateien
    if (preferDirect) {
      console.log('Attempting direct download...');
      const directSuccess = await attemptDirectDownload(fileId, filename, token);
      if (directSuccess) {
        console.log('Direct download successful');
        return;
      }
      console.log('Direct download failed, falling back to presigned URL');
    }
    
    // Methode 2: Verwende presigned URL
    console.log('Using presigned URL download...');
    const presignedSuccess = await attemptPresignedDownload(fileId, filename, token);
    if (presignedSuccess) {
      console.log('Presigned URL download successful');
      return;
    }
    
    // Wenn beide Methoden fehlschlagen
    throw new Error('All download methods failed');
    
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}

/**
 * Versucht einen direkten Download über den Server
 */
async function attemptDirectDownload(fileId, filename, token) {
  try {
    const response = await fetch(`/.netlify/functions/files-download-direct?fileId=${fileId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get('content-type');
    
    // Check if response is JSON (presigned URL fallback)
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (data.downloadUrl) {
        // Server returned presigned URL instead
        return downloadViaUrl(data.downloadUrl, filename);
      }
      return false;
    }

    // Direct file download
    const blob = await response.blob();
    
    if (blob.size === 0) {
      return false;
    }
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return true;
    
  } catch (error) {
    console.error('Direct download error:', error);
    return false;
  }
}

/**
 * Versucht einen Download über presigned URL
 */
async function attemptPresignedDownload(fileId, filename, token) {
  try {
    const response = await fetch(`/.netlify/functions/files-download?fileId=${fileId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    
    if (!data.downloadUrl) {
      return false;
    }
    
    return downloadViaUrl(data.downloadUrl, filename);
    
  } catch (error) {
    console.error('Presigned download error:', error);
    return false;
  }
}

/**
 * Download über eine URL (presigned oder direkt)
 */
function downloadViaUrl(url, filename) {
  try {
    // Methode 1: Versteckter Link (funktioniert meist)
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
    
  } catch (error) {
    // Methode 2: Window.open als Fallback
    try {
      window.open(url, '_blank');
      return true;
    } catch (openError) {
      console.error('URL download failed:', openError);
      return false;
    }
  }
}

/**
 * Hilfsfunktion zum Formatieren von Dateigrößen
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
