import { useState, useEffect } from 'react';
import axios from 'axios';

export default function UserManagement({ onClose }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);

    const [showAddForm, setShowAddForm] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', role: 'viewer' });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/auth/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch users", error);
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/auth/register', newUser);
            alert("User created successfully");
            setShowAddForm(false);
            setNewUser({ email: '', password: '', role: 'viewer' });
            fetchUsers();
        } catch (error) {
            console.error("Failed to create user", error);
            alert(error.response?.data?.message || "Failed to create user");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/auth/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(prev => prev.filter(u => u._id !== id));
        } catch (error) {
            console.error("Failed to delete user", error);
            alert(error.response?.data?.message || "Failed to delete user");
        }
    };

    const handleRoleUpdate = async (id, newRole) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/auth/users/${id}`, { role: newRole }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(prev => prev.map(u => u._id === id ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error("Failed to update user", error);
            alert("Failed to update role");
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <h2 className="modal-title">Manage Users</h2>
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            style={{
                                fontSize: '0.8rem',
                                padding: '0.3rem 0.6rem',
                                background: showAddForm ? '#475569' : 'var(--primary)'
                            }}
                        >
                            {showAddForm ? 'Cancel' : '+ Add User'}
                        </button>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', color: '#94a3b8', padding: '0' }}>✕</button>
                </div>

                {showAddForm && (
                    <form onSubmit={handleCreateUser} style={{ marginBottom: '2rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem', color: '#94a3b8' }}>Email</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="user@example.com"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem', color: '#94a3b8' }}>Password</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="******"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem', color: '#94a3b8' }}>Role</label>
                                <select
                                    value={newUser.role}
                                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                >
                                    <option value="viewer">Viewer</option>
                                    <option value="editor">Editor</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <button type="submit">Create</button>
                        </div>
                    </form>
                )}

                {loading ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8' }}>Loading users...</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem' }}>Email</th>
                                    <th style={{ padding: '1rem' }}>Role</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem' }}>{user.email}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleUpdate(user._id, e.target.value)}
                                                style={{
                                                    padding: '0.3rem',
                                                    fontSize: '0.85rem',
                                                    background: '#0f172a',
                                                    width: 'auto'
                                                }}
                                            >
                                                <option value="viewer">Viewer</option>
                                                <option value="editor">Editor</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleDelete(user._id)}
                                                style={{
                                                    background: '#ef4444',
                                                    padding: '0.3rem 0.6rem',
                                                    fontSize: '0.8rem'
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
