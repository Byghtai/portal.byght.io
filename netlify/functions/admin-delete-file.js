import { getStore } from "@netlify/blobs";
import jwt from 'jsonwebtoken';
import { deleteFile, getFileById } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export default async (req, context) => {
  if (req.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Token und Admin-Status verifizieren
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!decoded.isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { fileId } = await req.json();

    if (!fileId) {
      return new Response(JSON.stringify({ error: 'File ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Datei-Metadaten abrufen um den Blob-Key zu bekommen
    const fileMetadata = await getFileById(fileId);
    
    if (!fileMetadata) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Store blob key for later deletion
    const blobKey = fileMetadata.blobKey;
    
    console.log(`Starting deletion of file ${fileId} with blob key: ${blobKey}`);
    
    // Delete file from blob storage (BEFORE DB deletion)
    let blobDeleted = false;
    let blobExistedBefore = false;
    let blobExistsAfter = false;
    
    if (blobKey) {
      try {
        const filesStore = getStore({ name: 'portal-files', siteID: context.site.id });
        console.log(`Attempting to delete blob: ${blobKey}`);
        
        // Check if blob exists before deletion
        try {
          const blobBefore = await filesStore.get(blobKey);
          blobExistedBefore = !!blobBefore;
          console.log(`Blob exists before deletion: ${blobExistedBefore}`);
        } catch (e) {
          console.log(`Blob does not exist before deletion: ${blobKey}`);
          blobExistedBefore = false;
        }
        
        // Delete blob - with explicit await and try-catch
        if (blobExistedBefore) {
          try {
            await filesStore.delete(blobKey);
            console.log(`Blob deletion command executed for: ${blobKey}`);
          } catch (deleteError) {
            console.error(`Error on first deletion attempt: ${deleteError.message}`);
            // Continue anyway and check
          }
        }
        
        // Only check if blob existed before
        if (blobExistedBefore) {
          // Wait briefly for deletion to take effect
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Check if blob still exists after deletion
          try {
            const blobAfter = await filesStore.get(blobKey);
            blobExistsAfter = !!blobAfter;
            console.log(`Blob still exists after deletion: ${blobExistsAfter}`);
            
            // If blob still exists, try deleting again
            if (blobExistsAfter) {
              console.log(`Second deletion attempt for stubborn blob: ${blobKey}`);
              try {
                await filesStore.delete(blobKey);
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (deleteError2) {
                console.error(`Error on second deletion attempt: ${deleteError2.message}`);
              }
              
              // Check again
              try {
                const blobAfterSecond = await filesStore.get(blobKey);
                blobExistsAfter = !!blobAfterSecond;
                console.log(`Blob exists after second deletion attempt: ${blobExistsAfter}`);
              } catch (e) {
                blobExistsAfter = false;
                console.log(`Blob successfully removed after second deletion attempt`);
              }
            }
          } catch (e) {
            console.log(`Blob no longer exists after deletion: ${blobKey}`);
            blobExistsAfter = false;
          }
          
          blobDeleted = !blobExistsAfter;
        } else {
          // Blob didn't exist, so mark as "deleted"
          blobDeleted = true;
          console.log(`Blob did not exist, no deletion necessary`);
        }
        
        console.log(`Blob deletion status - Existed before: ${blobExistedBefore}, Exists after: ${blobExistsAfter}, Deleted: ${blobDeleted}`);
        
      } catch (blobError) {
        console.error('Error deleting from blob storage:', blobError);
        // We continue despite blob error, as DB deletion is more important
      }
    } else {
      console.warn(`No blob key found for file ${fileId}`);
    }
    
    // Delete file from database (including all assignments)
    await deleteFile(fileId);
    console.log(`File successfully deleted from database: ${fileId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: blobDeleted 
        ? 'File and associated blob data successfully deleted' 
        : blobExistedBefore 
          ? 'File deleted from database, but blob deletion failed'
          : 'File deleted from database (no blob present)',
      blobDeleted: blobDeleted,
      blobKey: blobKey,
      fileId: fileId,
      debugInfo: {
        blobExistedBefore: blobExistedBefore,
        blobExistsAfter: blobExistsAfter,
        blobDeleted: blobDeleted
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete file error:', error);
    
    // Spezifische Fehlermeldungen für verschiedene Fehlertypen
    if (error.message === 'File not found') {
      return new Response(JSON.stringify({ error: 'Datei nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      error: 'Server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
