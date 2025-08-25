import jwt from 'jsonwebtoken';
import { findUserByUsername, initDatabase } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export default async (req, context) => {
  try {
    // Schritt 1: Datenbank initialisieren
    console.log('Initialisiere Datenbank...');
    await initDatabase();
    console.log('Datenbank initialisiert');

    // Schritt 2: Admin-Benutzer suchen
    console.log('Suche Admin-Benutzer...');
    const user = await findUserByUsername('admin');
    console.log('Admin-Benutzer gefunden:', user ? 'JA' : 'NEIN');

    if (!user) {
      return new Response(JSON.stringify({ 
        error: 'Admin-Benutzer nicht gefunden',
        step: 'user_lookup_failed'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Schritt 3: Passwort testen
    console.log('Teste Passwort...');
    const testPassword = 'admin123';
    const bcrypt = await import('bcryptjs');
    const isValidPassword = await bcrypt.default.compare(testPassword, user.password_hash);
    console.log('Passwort gültig:', isValidPassword);

    if (!isValidPassword) {
      return new Response(JSON.stringify({ 
        error: 'Passwort ungültig',
        step: 'password_verification_failed'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Schritt 4: JWT Token generieren
    console.log('Generiere JWT Token...');
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        isAdmin: user.is_admin 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('JWT Token generiert');

    return new Response(JSON.stringify({
      success: true,
      token,
      username: user.username,
      userId: user.id,
      isAdmin: user.is_admin,
      step: 'login_successful'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Login test error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      step: 'error_occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
