import jwt from 'jsonwebtoken';
import { deleteUser, findUserById } from './db.js';

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

    const { userId, forceDeleteAdmin } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Benutzer finden, der gelöscht werden soll
    const userToDelete = await findUserById(userId);
    if (!userToDelete) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prüfen ob es sich um den Standard-Admin handelt
    if (userToDelete.username === 'admin') {
      // Wenn forceDeleteAdmin nicht explizit auf true gesetzt ist, verhindern
      if (!forceDeleteAdmin) {
        return new Response(JSON.stringify({ 
          error: 'Cannot delete default admin user without confirmation',
          requiresConfirmation: true 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Prüfen ob es andere Admin-User gibt
      const { getAllUsers } = await import('./db.js');
      const allUsers = await getAllUsers();
      const otherAdmins = allUsers.filter(user => 
        user.is_admin && user.id !== userId && user.username !== 'admin'
      );
      
      if (otherAdmins.length === 0) {
        return new Response(JSON.stringify({ 
          error: 'Cannot delete the last admin user. Please create another admin user first.' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Benutzer löschen (CASCADE löscht automatisch alle Datei-Zuordnungen)
    await deleteUser(userId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
