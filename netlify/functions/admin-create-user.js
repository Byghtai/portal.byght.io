import jwt from 'jsonwebtoken';
import { createUser, findUserByUsername } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

// Password validation function
function validatePassword(password) {
  if (!password || password.length < 12) {
    return { isValid: false, message: 'Password must be at least 12 characters long' };
  }

  let criteriaCount = 0;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (hasUppercase) criteriaCount++;
  if (hasLowercase) criteriaCount++;
  if (hasNumbers) criteriaCount++;
  if (hasSpecialChars) criteriaCount++;

  if (criteriaCount < 3) {
    return { 
      isValid: false, 
      message: 'Password must contain at least 3 of the following: uppercase letters, lowercase letters, numbers, special characters' 
    };
  }

  return { isValid: true };
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

    const { username, password, isAdmin, expiryDate, customer } = await req.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate password
    const validation = validatePassword(password);
    if (!validation.isValid) {
      return new Response(JSON.stringify({ error: validation.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prüfen ob Benutzername bereits existiert
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Username already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Passwort hashen und neuen Benutzer erstellen
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash(password, 10);
    const newUser = await createUser(username, hashedPassword, isAdmin || false, expiryDate, customer);

    return new Response(JSON.stringify({ user: newUser }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create user error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
