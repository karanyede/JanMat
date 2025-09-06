import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const AdminPanel = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      // Update public.users table
      const { error: publicError } = await supabase
        .from('users')
        .update({ 
          role: newRole,
          department: newRole === 'government' ? 'Municipal Corporation' : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (publicError) throw publicError;

      // Update auth.users metadata (requires RLS bypass or admin privileges)
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { role: newRole }
      });

      if (authError) {
        console.warn('Could not update auth metadata (may require admin privileges):', authError);
      }

      setMessage(`✅ Successfully updated user role to ${newRole}`);
      fetchUsers(); // Refresh the list
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating user role:', error);
      setMessage(`❌ Error updating role: ${error}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">👩‍💼 User Role Management</h1>
          
          {message && (
            <div className={`mb-4 p-3 rounded ${message.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message}
            </div>
          )}

          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-semibold text-blue-800 mb-2">🔧 Quick Actions for Current User:</h3>
            {user && (
              <div className="flex space-x-2">
                <button
                  onClick={() => updateUserRole(user.id, 'government')}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  Make Me Government Official
                </button>
                <button
                  onClick={() => updateUserRole(user.id, 'admin')}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm"
                >
                  Make Me Admin
                </button>
                <button
                  onClick={() => updateUserRole(user.id, 'journalist')}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                >
                  Make Me Journalist
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Current Role</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Department</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 text-sm">{user.email}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">{user.full_name}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.role === 'government' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'journalist' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role || 'citizen'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">{user.department || '-'}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => updateUserRole(user.id, 'government')}
                          className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                          disabled={user.role === 'government'}
                        >
                          Gov
                        </button>
                        <button
                          onClick={() => updateUserRole(user.id, 'admin')}
                          className="px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 transition-colors"
                          disabled={user.role === 'admin'}
                        >
                          Admin
                        </button>
                        <button
                          onClick={() => updateUserRole(user.id, 'journalist')}
                          className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                          disabled={user.role === 'journalist'}
                        >
                          Journalist
                        </button>
                        <button
                          onClick={() => updateUserRole(user.id, 'citizen')}
                          className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors"
                          disabled={user.role === 'citizen' || !user.role}
                        >
                          Citizen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
