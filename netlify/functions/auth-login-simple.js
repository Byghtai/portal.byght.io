import jwt from 'jsonwebtoken';
import { findUserByUsername, initDatabase } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;

export default async (req, context) => {
  // CORS Headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers
    });
  }

  try {
    // Datenbank initialisieren
    await initDatabase();

    // Request Body parsen
    const body = await req.json();
    const { username, password } = body;

    console.log('Login attempt for username:', username);

    // Benutzer suchen
    const user = await findUserByUsername(username);
    if (!user) {
      console.log('User not found:', username);
      return new Response(JSON.stringify({ error: 'Ungültige Anmeldedaten' }), {
        status: 401,
        headers
      });
    }

    console.log('User found:', user.username, 'isAdmin:', user.is_admin);

    // Passwort verifizieren
    const bcrypt = await import('bcryptjs');
    const isValidPassword = await bcrypt.default.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log('Invalid password for user:', username);
      return new Response(JSON.stringify({ error: 'Ungültige Anmeldedaten' }), {
        status: 401,
        headers
      });
    }

    console.log('Password verified for user:', username);

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

    console.log('JWT token generated for user:', username);

    return new Response(JSON.stringify({
      token,
      username: user.username,
      userId: user.id,
      isAdmin: user.is_admin
    }), {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers
    });
  }
};
