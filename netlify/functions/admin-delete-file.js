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
    
    // Blob-Key für spätere Löschung speichern
    const blobKey = fileMetadata.blobKey;
    
    console.log(`Starte Löschung von Datei ${fileId} mit Blob-Key: ${blobKey}`);
    
    // Datei aus Blob Storage löschen (VOR der DB-Löschung)
    let blobDeleted = false;
    let blobExistedBefore = false;
    let blobExistsAfter = false;
    
    if (blobKey) {
      try {
        const filesStore = getStore({ name: 'portal-files', siteID: context.site.id });
        console.log(`Versuche Blob zu löschen: ${blobKey}`);
        
        // Prüfen ob Blob vor Löschung existiert
        try {
          const blobBefore = await filesStore.get(blobKey);
          blobExistedBefore = !!blobBefore;
          console.log(`Blob existiert vor Löschung: ${blobExistedBefore}`);
        } catch (e) {
          console.log(`Blob existiert nicht vor Löschung: ${blobKey}`);
          blobExistedBefore = false;
        }
        
        // Blob löschen - mit explizitem await und try-catch
        if (blobExistedBefore) {
          try {
            await filesStore.delete(blobKey);
            console.log(`Blob-Löschbefehl ausgeführt für: ${blobKey}`);
          } catch (deleteError) {
            console.error(`Fehler beim ersten Löschversuch: ${deleteError.message}`);
            // Trotzdem fortfahren und prüfen
          }
        }
        
        // Nur prüfen wenn Blob vorher existierte
        if (blobExistedBefore) {
          // Kurz warten, damit die Löschung wirksam wird
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Prüfen ob Blob nach Löschung noch existiert
          try {
            const blobAfter = await filesStore.get(blobKey);
            blobExistsAfter = !!blobAfter;
            console.log(`Blob existiert nach Löschung noch: ${blobExistsAfter}`);
            
            // Falls Blob noch existiert, nochmal versuchen zu löschen
            if (blobExistsAfter) {
              console.log(`Zweiter Löschversuch für hartnäckigen Blob: ${blobKey}`);
              try {
                await filesStore.delete(blobKey);
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (deleteError2) {
                console.error(`Fehler beim zweiten Löschversuch: ${deleteError2.message}`);
              }
              
              // Nochmal prüfen
              try {
                const blobAfterSecond = await filesStore.get(blobKey);
                blobExistsAfter = !!blobAfterSecond;
                console.log(`Blob existiert nach zweitem Löschversuch: ${blobExistsAfter}`);
              } catch (e) {
                blobExistsAfter = false;
                console.log(`Blob nach zweitem Löschversuch erfolgreich entfernt`);
              }
            }
          } catch (e) {
            console.log(`Blob existiert nicht mehr nach Löschung: ${blobKey}`);
            blobExistsAfter = false;
          }
          
          blobDeleted = !blobExistsAfter;
        } else {
          // Blob existierte nicht, also als "gelöscht" markieren
          blobDeleted = true;
          console.log(`Blob existierte nicht, keine Löschung notwendig`);
        }
        
        console.log(`Blob-Löschung Status - Existierte vorher: ${blobExistedBefore}, Existiert nachher: ${blobExistsAfter}, Gelöscht: ${blobDeleted}`);
        
      } catch (blobError) {
        console.error('Fehler beim Löschen aus Blob Storage:', blobError);
        // Wir fahren trotz Blob-Fehler fort, da die DB-Löschung wichtiger ist
      }
    } else {
      console.warn(`Kein Blob-Key für Datei ${fileId} gefunden`);
    }
    
    // Datei aus der Datenbank löschen (inklusive aller Zuordnungen)
    await deleteFile(fileId);
    console.log(`Datei erfolgreich aus Datenbank gelöscht: ${fileId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: blobDeleted 
        ? 'Datei und zugehörige Blob-Daten erfolgreich gelöscht' 
        : blobExistedBefore 
          ? 'Datei aus Datenbank gelöscht, aber Blob-Löschung fehlgeschlagen'
          : 'Datei aus Datenbank gelöscht (kein Blob vorhanden)',
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
