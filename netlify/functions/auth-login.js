import jwt from 'jsonwebtoken';
import { findUserByUsername, initDatabase } from './db.js';

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
    // Datenbank initialisieren (erstellt Tabellen falls nicht vorhanden)
    await initDatabase();

    const { username, password } = await req.json();

    // Benutzer in der Datenbank suchen
    const user = await findUserByUsername(username);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Ungültige Anmeldedaten' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Passwort verifizieren
    const bcrypt = await import('bcryptjs');
    const isValidPassword = await bcrypt.default.compare(password, user.password_hash);
    if (!isValidPassword) {
      return new Response(JSON.stringify({ error: 'Ungültige Anmeldedaten' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // JWT Token generieren
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        isAdmin: user.is_admin 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return new Response(JSON.stringify({
      token,
      username: user.username,
      userId: user.id,
      isAdmin: user.is_admin
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack,
      step: 'login_error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
