import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { updateUserExpiryDate, updateUserDetails } from './db.js';

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
  if (req.method !== 'PUT') {
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

    const { userId, username, customer, password, expiryDate } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build updates object
    const updates = {};
    
    if (username !== undefined) {
      updates.username = username;
    }
    
    if (customer !== undefined) {
      updates.customer = customer;
    }
    
    if (expiryDate !== undefined) {
      updates.expiryDate = expiryDate;
    }


    
    // Handle password update if provided
    if (password) {
      const validation = validatePassword(password);
      if (!validation.isValid) {
        return new Response(JSON.stringify({ error: validation.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.passwordHash = hashedPassword;
    }

    // Update user details if there are updates
    let updatedUser;
    if (Object.keys(updates).length > 0) {
      updatedUser = await updateUserDetails(userId, updates);
    } else {
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!updatedUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ user: updatedUser }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update user error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
