import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to login');
        }
    };

    return (
        <div className="card auth-container animate-fade-in">
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Welcome Back</h2>
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
                <button type="submit" style={{ marginTop: '0.5rem' }}>Login</button>
            </form>
            <p style={{ marginTop: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                New here? <Link to="/register">Create an account</Link>
            </p>
        </div>
    );
}
