import { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import Upload from '../components/Upload';
import VideoPlayer from '../components/VideoPlayer';
import UserManagement from '../components/UserManagement';

export default function Dashboard() {
    const [videos, setVideos] = useState([]);
    const { user, logout } = useAuth();
    const [socket, setSocket] = useState(null);

    // Initialize Socket
    useEffect(() => {
        const newSocket = io('/', { path: '/socket.io' });
        setSocket(newSocket);
        return () => newSocket.close();
    }, []);

    const [filter, setFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('newest');
    const [categoriesList, setCategoriesList] = useState([]);

    const [extraFilters, setExtraFilters] = useState({});

    // Fetch Categories
    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/videos/categories', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Fetched Categories Frontend:", res.data);
            const uniqueCats = res.data.filter(c => c !== 'Uncategorized');
            setCategoriesList(uniqueCats);
        } catch (err) {
            console.error("Failed to fetch categories", err);
        }
    };

    // Initial Fetch
    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchVideos = async (statusOverride, sortOverride, newExtraFilters) => {
        try {
            const currentFilter = statusOverride || filter;
            const currentSort = sortOverride || sortOrder;
            const currentExtras = newExtraFilters ? { ...extraFilters, ...newExtraFilters } : extraFilters;
            if (newExtraFilters) setExtraFilters(currentExtras);

            const token = localStorage.getItem('token');
            const params = {
                sort: currentSort,
                ...currentExtras
            };
            if (currentFilter !== 'all') {
                params.status = currentFilter;
            }

            const res = await axios.get('/api/videos', {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
            setVideos(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this video?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/videos/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Optimistic update
            setVideos(prev => prev.filter(v => v._id !== id));
        } catch (err) {
            console.error("Delete failed", err);
            alert("Failed to delete video");
        }
    };

    const [users, setUsers] = useState([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [selectedUserIds, setSelectedUserIds] = useState([]);

    useEffect(() => {
        fetchVideos();
        // Fetch users if admin
        if (user && user.role === 'admin') {
            const token = localStorage.getItem('token');
            axios.get('/api/auth/users', { headers: { Authorization: `Bearer ${token}` } })
                .then(res => setUsers(res.data))
                .catch(err => console.error("Failed to fetch users", err));
        }
    }, [user]);

    const openAssignModal = (video) => {
        setSelectedVideo(video);
        setSelectedUserIds([]);
        setIsModalOpen(true);
    };

    const handleCheckboxChange = (userId) => {
        setSelectedUserIds(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    };

    const submitAssignment = async () => {
        if (!selectedUserIds.length) {
            alert("Please select at least one user.");
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/videos/assign/${selectedVideo._id}`, { userIds: selectedUserIds }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`Video assigned successfully!`);
            setIsModalOpen(false);
            fetchVideos();
        } catch (error) {
            console.error(error);
            alert("Failed to assign video");
        }
    };

    // Socket Listeners
    useEffect(() => {
        if (!socket) return;

        socket.on('videoProcessingStart', ({ videoId }) => {
            setVideos(prev => prev.map(v =>
                v._id === videoId ? { ...v, sensitivityStatus: 'processing', processingProgress: 10 } : v
            ));
        });

        socket.on('videoProcessingProgress', ({ videoId, progress }) => {
            setVideos(prev => prev.map(v =>
                v._id === videoId ? { ...v, sensitivityStatus: 'processing', processingProgress: progress } : v
            ));
        });

        socket.on('videoProcessed', ({ videoId, status }) => {
            setVideos(prev => prev.map(v =>
                v._id === videoId ? { ...v, sensitivityStatus: status, processingProgress: 100 } : v
            ));
        });

        videos.forEach(v => {
            if (v.sensitivityStatus === 'pending' || v.sensitivityStatus === 'processing') {
                socket.emit('joinVideoRoom', v._id);
            }
        });

    }, [socket, videos]);

    const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

    return (
        <div className="container">
            <header className="dashboard-header animate-fade-in">
                <h1>Video Flow</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: '#94a3b8' }}>{user.email} <span style={{ color: '#fff', background: '#334155', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{user.role}</span></span>
                    {user.role === 'admin' && (
                        <button
                            onClick={() => setIsUserManagementOpen(true)}
                            style={{ backgroundColor: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6' }}
                        >
                            Manage Users
                        </button>
                    )}
                    <button onClick={logout} style={{ backgroundColor: 'transparent', border: '1px solid #dc3545', color: '#dc3545' }}>Logout</button>
                </div>
            </header>

            {isUserManagementOpen && <UserManagement onClose={() => setIsUserManagementOpen(false)} />}

            {/* Upload Section: Hidden for Viewers */}
            {user.role !== 'viewer' && (
                <div className="animate-fade-in">
                    <Upload onUploadSuccess={() => { fetchVideos(); fetchCategories(); }} />
                </div>
            )}

            {/* Video List */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Recent Videos</h2>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Search Input */}
                    <input
                        type="text"
                        placeholder="Search videos..."
                        onChange={(e) => fetchVideos(null, null, { search: e.target.value })}
                        style={{ padding: '0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', width: '150px' }}
                    />

                    {/* Category Filter */}
                    <select
                        onChange={(e) => {
                            const val = e.target.value;
                            fetchVideos(null, null, { category: val });
                        }}
                        style={{ padding: '0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                    >
                        <option value="" style={{ color: 'black' }}>All Categories</option>
                        {categoriesList.map(cat => (
                            <option key={cat} value={cat} style={{ color: 'black' }}>{cat}</option>
                        ))}
                        <option value="Uncategorized" style={{ color: 'black' }}>Uncategorized</option>
                    </select>

                    {/* Date Filter */}
                    <input
                        type="date"
                        onChange={(e) => fetchVideos(null, null, { fromDate: e.target.value })}
                        style={{ padding: '0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                        title="Filter by Upload Date"
                    />

                    <select
                        onChange={(e) => {
                            const val = e.target.value;
                            let sizeFilters = { minSize: null, maxSize: null };
                            if (val === 'small') sizeFilters = { maxSize: 50 * 1024 * 1024, minSize: null };
                            else if (val === 'medium') sizeFilters = { minSize: 50 * 1024 * 1024, maxSize: 500 * 1024 * 1024 };
                            else if (val === 'large') sizeFilters = { minSize: 500 * 1024 * 1024, maxSize: null };

                            fetchVideos(null, null, sizeFilters);
                        }}
                        style={{ padding: '0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                    >
                        <option value="" style={{ color: 'black' }}>Any Size</option>
                        <option value="small" style={{ color: 'black' }}>Small (&lt;50MB)</option>
                        <option value="medium" style={{ color: 'black' }}>Medium (50-500MB)</option>
                        <option value="large" style={{ color: 'black' }}>Large (&gt;500MB)</option>
                    </select>

                    {/* Duration Filter */}
                    <select
                        onChange={(e) => {
                            const val = e.target.value;
                            let durFilters = { minDuration: null, maxDuration: null };
                            if (val === 'short') durFilters = { maxDuration: 60, minDuration: null }; // < 1 min
                            else if (val === 'medium') durFilters = { minDuration: 60, maxDuration: 300 }; // 1 - 5 mins
                            else if (val === 'long') durFilters = { minDuration: 300, maxDuration: null }; // > 5 mins

                            fetchVideos(null, null, durFilters);
                        }}
                        style={{ padding: '0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                    >
                        <option value="" style={{ color: 'black' }}>Any Duration</option>
                        <option value="short" style={{ color: 'black' }}>Short (&lt;1 min)</option>
                        <option value="medium" style={{ color: 'black' }}>Medium (1-5 min)</option>
                        <option value="long" style={{ color: 'black' }}>Long (&gt;5 min)</option>
                    </select>

                    {['all', 'safe', 'flagged'].map(status => (
                        <button
                            key={status}
                            onClick={() => {
                                setFilter(status);
                                fetchVideos(status);
                            }}
                            style={{
                                background: filter === status ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                textTransform: 'capitalize',
                                fontSize: '0.9rem',
                                padding: '0.4rem 1rem'
                            }}
                        >
                            {status}
                        </button>
                    ))}
                    <select
                        value={sortOrder}
                        onChange={(e) => {
                            setSortOrder(e.target.value);
                            fetchVideos(null, e.target.value);
                        }}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.2)',
                            padding: '0.4rem',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="newest" style={{ color: '#000' }}>Newest First</option>
                        <option value="oldest" style={{ color: '#000' }}>Oldest First</option>
                    </select>
                </div>
            </div>
            <div className="video-grid animate-fade-in">
                {videos.map(video => (
                    <div key={video._id} className="video-card">
                        {/* Video Area */}
                        <div style={{ background: '#000', minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {video.sensitivityStatus === 'pending' || video.sensitivityStatus === 'processing' ? (
                                <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                                    <div style={{ marginBottom: '0.5rem', fontSize: '1.5rem', animation: 'spin 1s linear infinite' }}>⏳</div>
                                    Processing... {video.processingProgress}%
                                </div>
                            ) : video.sensitivityStatus === 'flagged' ? (
                                <div style={{ textAlign: 'center', color: '#ef4444', padding: '2rem' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                                    Content Flagged
                                </div>
                            ) : (
                                <VideoPlayer videoId={video._id} mimeType={video.mimeType} />
                            )}
                        </div>

                        <div className="video-info">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{video.title}</h3>
                                    <span style={{ fontSize: '0.75rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px', marginTop: '0.25rem', display: 'inline-block', border: '1px solid rgba(255,255,255,0.2)' }}>
                                        {video.category || 'Uncategorized'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span className={`status-badge status-${video.sensitivityStatus || 'pending'}`}>
                                        {video.sensitivityStatus || 'PENDING'}
                                    </span>

                                    {(user.role === 'admin' || user._id === video.uploaderId) && (
                                        <>
                                            <button
                                                onClick={() => handleDelete(video._id)}
                                                style={{ background: '#ef4444', padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                                                title="Delete Video"
                                            >
                                                Del
                                            </button>
                                            {user.role === 'admin' && (
                                                <button
                                                    onClick={() => openAssignModal(video)}
                                                    style={{ background: '#3b82f6', padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                                                    title="Assign Video"
                                                >
                                                    Assign
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                                {new Date(video.createdAt).toLocaleDateString()}
                            </p>
                            {video.sensitivityReason && (
                                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                                    <strong>Analysis:</strong> {video.sensitivityReason}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            {videos.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '3rem' }}>No videos yet. Upload one to get started!</p>}

            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Assign Video</h2>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>{selectedVideo?.title}</p>
                        </div>

                        <div className="user-list">
                            {users.map(u => {
                                const isAssigned = selectedVideo?.assignedTo?.includes(u._id) || u.role === 'admin' || u._id === selectedVideo?.uploaderId;
                                if (isAssigned) return null;

                                return (
                                    <div key={u._id} className="user-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={selectedUserIds.includes(u._id)}
                                                onChange={() => handleCheckboxChange(u._id)}
                                            />
                                            <span>
                                                {u.email}
                                                <span style={{ fontSize: '0.8em', color: '#94a3b8', marginLeft: '0.5rem' }}>({u.role})</span>
                                            </span>
                                        </label>
                                    </div>
                                );
                            })}
                            {users.every(u => selectedVideo?.assignedTo?.includes(u._id) || u.role === 'admin' || u._id === selectedVideo?.uploaderId) && (
                                <p style={{ textAlign: 'center', color: '#94a3b8' }}>All users are already assigned.</p>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{ background: 'transparent', border: '1px solid #475569' }}
                            >
                                Cancel
                            </button>
                            <button onClick={submitAssignment}>
                                Assign Selected
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
