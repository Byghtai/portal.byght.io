import { getStore } from "@netlify/blobs";
import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export default async (req, context) => {
  if (req.method !== 'POST') {
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

    const client = await pool.connect();
    const filesStore = getStore({ name: 'portal-files', siteID: context.site.id });
    
    try {
      // Alle Blob-Keys aus dem Blob Storage abrufen
      const blobs = await filesStore.list();
      const blobKeys = blobs.blobs.map(blob => blob.key);
      
      // Alle Blob-Keys aus der Datenbank abrufen
      const result = await client.query('SELECT blob_key FROM files');
      const dbBlobKeys = result.rows.map(row => row.blob_key);
      
      // Waisen-Dateien finden (Blob-Keys, die nicht in der DB sind)
      const orphanedBlobKeys = blobKeys.filter(key => !dbBlobKeys.includes(key));
      
      let deletedCount = 0;
      const errors = [];
      
      // Waisen-Dateien aus dem Blob Storage löschen
      for (const blobKey of orphanedBlobKeys) {
        try {
          await filesStore.delete(blobKey);
          deletedCount++;
          console.log(`Waisen-Datei gelöscht: ${blobKey}`);
        } catch (error) {
          console.error(`Fehler beim Löschen der Waisen-Datei ${blobKey}:`, error);
          errors.push({ blobKey, error: error.message });
        }
      }
      
      return new Response(JSON.stringify({ 
        success: true,
        message: `Bereinigung abgeschlossen`,
        deletedCount,
        totalOrphaned: orphanedBlobKeys.length,
        errors: errors.length > 0 ? errors : undefined
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Cleanup orphaned files error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
