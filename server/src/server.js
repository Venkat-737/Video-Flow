const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Attach IO to request for controllers
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/video-flow')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

app.get('/', (req, res) => {
    res.send('Video Flow API is running');
});

const authRoutes = require('./routes/authRoutes');
const videoRoutes = require('./routes/videoRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);

// Socket Connection
io.on('connection', (socket) => {
    console.log('Socket Connected:', socket.id);

    // Client joins room, videoId to listen for updates on that specific video
    socket.on('joinVideoRoom', (videoId) => {
        socket.join(videoId);
    });
});

// Start Server
server.setTimeout(3600000); // 1 hour timeout for large uploads
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
