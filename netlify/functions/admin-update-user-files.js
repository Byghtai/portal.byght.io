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

    // Request-Body parsen
    const { userId, fileIds } = await req.json();

    if (!userId || !Array.isArray(fileIds)) {
      return new Response(JSON.stringify({ error: 'Invalid request data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const client = await pool.connect();
    try {
      // Transaktion starten
      await client.query('BEGIN');

      // Alle bestehenden Zuweisungen für diesen Benutzer löschen
      await client.query('DELETE FROM file_user_assignments WHERE user_id = $1', [userId]);

      // Neue Zuweisungen erstellen
      for (const fileId of fileIds) {
        await client.query(
          'INSERT INTO file_user_assignments (file_id, user_id) VALUES ($1, $2)',
          [fileId, userId]
        );
      }

      // Transaktion bestätigen
      await client.query('COMMIT');

      return new Response(JSON.stringify({ success: true, message: 'Datei-Zuweisungen erfolgreich aktualisiert' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      // Transaktion rückgängig machen bei Fehler
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update user files error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
