import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('viewer');
    const { register } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register(email, password, role);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to register');
        }
    };

    return (
        <div className="card auth-container animate-fade-in">
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Create Account</h2>
            {error && <div style={{ color: '#ef4444', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: '4px' }}>{error}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email</label>
                    <input
                        type="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Password</label>
                    <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Role</label>
                    <select value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="viewer">Viewer (Watch only)</option>
                        <option value="editor">Editor (Upload)</option>
                        <option value="admin">Admin (Manage)</option>
                    </select>
                </div>
                <button type="submit" style={{ marginTop: '0.5rem', backgroundColor: '#10b981' }}>Sign Up</button>
            </form>
            <p style={{ marginTop: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                Already have an account? <Link to="/login">Login</Link>
            </p>
        </div>
    );
}
