import { getStore } from "@netlify/blobs";
import jwt from 'jsonwebtoken';

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

    const { blobKey } = await req.json();

    if (!blobKey) {
      return new Response(JSON.stringify({ error: 'Blob key required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const filesStore = getStore({ name: 'portal-files', siteID: context.site.id });
    
    console.log(`Admin-Direktlöschung von Blob: ${blobKey}`);
    
    // Prüfen ob Blob existiert
    let blobExistsBefore = false;
    try {
      const blob = await filesStore.get(blobKey);
      blobExistsBefore = !!blob;
      console.log(`Blob existiert vor Löschung: ${blobExistsBefore}`);
    } catch (e) {
      console.log(`Blob existiert nicht: ${blobKey}`);
    }
    
    if (!blobExistsBefore) {
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Blob existiert nicht',
        blobKey: blobKey
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Mehrere Löschversuche
    let deleted = false;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!deleted && attempts < maxAttempts) {
      attempts++;
      console.log(`Löschversuch ${attempts} für Blob: ${blobKey}`);
      
      try {
        await filesStore.delete(blobKey);
        
        // Kurz warten
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Prüfen ob gelöscht
        try {
          const checkBlob = await filesStore.get(blobKey);
          if (!checkBlob) {
            deleted = true;
          } else {
            console.log(`Blob existiert noch nach Versuch ${attempts}`);
          }
        } catch (e) {
          // Blob nicht gefunden = erfolgreich gelöscht
          deleted = true;
        }
      } catch (error) {
        console.error(`Fehler bei Löschversuch ${attempts}:`, error);
      }
    }
    
    if (deleted) {
      console.log(`Blob erfolgreich gelöscht nach ${attempts} Versuch(en): ${blobKey}`);
      return new Response(JSON.stringify({ 
        success: true,
        message: `Blob erfolgreich gelöscht nach ${attempts} Versuch(en)`,
        blobKey: blobKey,
        attempts: attempts
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      console.error(`Blob konnte nicht gelöscht werden nach ${maxAttempts} Versuchen: ${blobKey}`);
      return new Response(JSON.stringify({ 
        success: false,
        message: `Blob konnte nicht gelöscht werden nach ${maxAttempts} Versuchen`,
        blobKey: blobKey,
        attempts: maxAttempts
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    console.error('Delete blob error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
