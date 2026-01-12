import { useState, useRef } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

export default function Upload({ onUploadSuccess }) {
    const [file, setFile] = useState(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [category, setCategory] = useState('');
    const [duration, setDuration] = useState(0);
    const [existingCategories, setExistingCategories] = useState([]);
    const abortControllerRef = useRef(null);

    // Fetch existing categories for suggestions
    useState(() => {
        const fetchCats = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/videos/categories', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setExistingCategories(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchCats();
    }, []);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected && !selected.type.startsWith('video/')) {
            setError('Please select a video file');
            setFile(null);
            return;
        }
        setFile(selected);
        setError('');

        // Try to calculate duration
        try {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = function () {
                window.URL.revokeObjectURL(video.src);
                setDuration(video.duration);
            }
            video.onerror = function () {
                setDuration(0);
            }
            video.src = URL.createObjectURL(selected);
        } catch (err) {
            console.warn("Duration calc failed", err);
            setDuration(0);
        }
    };

    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setUploading(false);
        setFile(null);
        setProgress(0);
        setError('');
        setCategory('');
        setDuration(0);
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setError('');
        const formData = new FormData();
        formData.append('category', category || 'Uncategorized');
        formData.append('duration', duration || 0);
        formData.append('title', file.name);
        formData.append('video', file);

        // Create a new AbortController for this request
        abortControllerRef.current = new AbortController();

        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/videos/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                },
                timeout: 3600000, // 1 hour locally
                signal: abortControllerRef.current.signal,
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setProgress(percentCompleted);
                }
            });

            setFile(null);
            setProgress(0);
            setUploading(false);
            setCategory('');
            setDuration(0);
            if (onUploadSuccess) onUploadSuccess();

        } catch (err) {
            if (axios.isCancel(err)) {
                console.log('Upload cancelled');
                setError('');
            } else {
                console.error(err);
                setError('Upload failed: ' + (err.response?.data?.message || err.message));
            }
            setUploading(false);
        }
    };

    return (
        <div className="upload-zone" style={{ position: 'relative' }}>
            <h3 style={{ marginBottom: '1rem' }}>Upload Video</h3>
            {error && <p style={{ color: '#ef4444' }}>{error}</p>}

            {!uploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '100%', maxWidth: '300px' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', textAlign: 'left' }}>
                            Category (Select or Type):
                        </label>
                        <input
                            list="category-options"
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="e.g. Work, Fun, Project"
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                background: '#1e293b',
                                border: '1px solid #475569',
                                color: 'white',
                                borderRadius: '4px'
                            }}
                        />
                        <datalist id="category-options">
                            {existingCategories.map(cat => (
                                <option key={cat} value={cat} />
                            ))}
                        </datalist>
                    </div>
                    <p style={{ color: '#94a3b8' }}>Drag and drop your video file here, or click to select</p>
                    <input
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="file-input"
                        style={{ maxWidth: '300px' }}
                    />
                    <button
                        onClick={handleUpload}
                        disabled={!file}
                        style={{ marginTop: '1rem' }}
                    >
                        Upload Video
                    </button>
                </div>
            ) : (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span>Uploading & Processing... {progress}%</span>
                        <button
                            onClick={handleCancel}
                            title="Cancel Upload"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                fontSize: '1.2rem',
                                padding: '0 0.5rem',
                                cursor: 'pointer'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                    <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}
        </div>
    );
}

Upload.propTypes = {
    onUploadSuccess: PropTypes.func
};
