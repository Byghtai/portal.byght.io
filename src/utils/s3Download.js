/**
 * S3 Download Handler - Best Practice Implementation
 * Nutzt Presigned URLs für sichere, direkte Downloads von S3
 */

/**
 * Lädt eine Datei von S3 über eine Presigned URL herunter
 * @param {string} fileId - Die ID der Datei
 * @param {string} filename - Der Dateiname für den Download
 * @param {string} token - Das Auth-Token
 * @returns {Promise<boolean>} - true bei Erfolg, false bei Fehler
 */
export async function downloadFileFromS3(fileId, filename, token) {
  console.log(`[S3 Download] Starting download for file: ${filename} (ID: ${fileId})`);
  
  try {
    // 1. Presigned URL vom Backend abrufen
    console.log(`[S3 Download] Requesting presigned URL from backend...`);
    const response = await fetch(`/.netlify/functions/files-download?fileId=${fileId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    console.log(`[S3 Download] Backend response status: ${response.status}`);

    // 2. Response validieren
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.details || errorMessage;
        console.error(`[S3 Download] Server error details:`, errorData);
      } catch (e) {
        console.error(`[S3 Download] Failed to parse error response:`, e);
      }
      
      throw new Error(errorMessage);
    }

    // 3. JSON-Response mit Presigned URL parsen
    const data = await response.json();
    console.log(`[S3 Download] Backend response data:`, data);
    
    if (!data.downloadUrl) {
      throw new Error(data.error || 'No download URL received from backend');
    }

    console.log(`[S3 Download] Received presigned URL, expires in ${data.expiresIn || 'unknown'} seconds`);
    console.log(`[S3 Download] File info:`, {
      filename: data.filename,
      size: formatFileSize(data.size),
      mimeType: data.mimeType
    });

    // 4. Download über Presigned URL starten
    const downloadSuccess = await initiateDownload(data.downloadUrl, filename || data.filename);
    
    if (downloadSuccess) {
      console.log(`[S3 Download] Download initiated successfully for: ${filename}`);
      return true;
    } else {
      throw new Error('Failed to initiate download from S3');
    }
    
  } catch (error) {
    console.error(`[S3 Download] Download failed:`, error);
    throw error;
  }
}

/**
 * Initiiert den Download über verschiedene Methoden
 * @param {string} url - Die Presigned URL
 * @param {string} filename - Der Dateiname
 * @returns {Promise<boolean>} - true bei Erfolg
 */
async function initiateDownload(url, filename) {
  // Methode 1: Fetch + Blob (Best Practice für moderne Browser)
  try {
    console.log(`[S3 Download] Attempting fetch + blob download...`);
    
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit' // Wichtig: Keine Credentials für S3
    });

    if (!response.ok) {
      console.error(`[S3 Download] S3 returned status ${response.status}`);
      throw new Error(`S3 download failed: ${response.status}`);
    }

    // Datei als Blob herunterladen
    const blob = await response.blob();
    console.log(`[S3 Download] Downloaded ${formatFileSize(blob.size)} from S3`);

    // Blob als Download anbieten
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup nach kurzer Verzögerung
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 100);
    
    return true;
    
  } catch (fetchError) {
    console.error(`[S3 Download] Fetch method failed:`, fetchError);
    
    // Methode 2: Direkter Link (Fallback)
    try {
      console.log(`[S3 Download] Attempting direct link download...`);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
      return true;
      
    } catch (linkError) {
      console.error(`[S3 Download] Direct link method failed:`, linkError);
      
      // Methode 3: Window.open (letzter Fallback)
      try {
        console.log(`[S3 Download] Attempting window.open...`);
        window.open(url, '_blank');
        return true;
      } catch (openError) {
        console.error(`[S3 Download] All download methods failed:`, openError);
        return false;
      }
    }
  }
}

/**
 * Formatiert Dateigrößen in lesbare Einheiten
 * @param {number} bytes - Größe in Bytes
 * @returns {string} - Formatierte Größe
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Überprüft ob der Browser moderne Download-Features unterstützt
 * @returns {boolean}
 */
export function supportsModernDownload() {
  return !!(window.fetch && window.URL && window.URL.createObjectURL && window.Blob);
}
