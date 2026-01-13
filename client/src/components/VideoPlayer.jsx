import PropTypes from 'prop-types';

export default function VideoPlayer({ videoId, mimeType }) {
    const token = localStorage.getItem('token');
    const videoSrc = `${import.meta.env.VITE_API_URL || ''}/api/videos/stream/${videoId}?token=${token}`;

    return (
        <div style={{ marginTop: '1rem', background: '#000' }}>
            <video
                controls
                width="100%"
                height="auto"
                preload="metadata"
            >
                <source src={videoSrc} type={mimeType} />
                Your browser does not support the video tag.
            </video>
        </div>
    );
}

VideoPlayer.propTypes = {
    videoId: PropTypes.string.isRequired,
    mimeType: PropTypes.string.isRequired,
};
