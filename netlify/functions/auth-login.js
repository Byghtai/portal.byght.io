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
    // Initialize database (creates tables if not present)
    console.log('Initializing database on login...');
    await initDatabase();
    console.log('Database initialization completed');

    const { username, password } = await req.json();

    // Search for user in database
    const user = await findUserByUsername(username);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid login credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify password
    const bcrypt = await import('bcryptjs');
    const isValidPassword = await bcrypt.default.compare(password, user.password_hash);
    if (!isValidPassword) {
      return new Response(JSON.stringify({ error: 'Invalid login credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check expiry date for standard users
    if (!user.isAdmin && user.expiry_date) {
      const today = new Date();
      const expiryDate = new Date(user.expiry_date);
      
      if (today > expiryDate) {
        return new Response(JSON.stringify({ 
          error: 'Your user account has expired. Please contact the administrator.' 
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        isAdmin: user.isAdmin 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return new Response(JSON.stringify({
      token,
      username: user.username,
      userId: user.id,
      isAdmin: user.isAdmin
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
