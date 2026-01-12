const Video = require('../models/Video');
const { analyzeVideoSensitivity } = require('../services/analysisService');
const fs = require('fs');
const path = require('path');

// @desc    Upload a video
// @route   POST /api/videos/upload
// @access  Private
const uploadVideo = async (req, res) => {
    try {
        console.log('Upload Request Body:', req.body);
        console.log('Upload Request File:', req.file);

        if (!req.file) {
            return res.status(400).json({ message: 'No video file uploaded' });
        }

        // Create Video Record
        const video = await Video.create({
            title: req.body.title || req.file.originalname,
            filename: req.file.filename,
            uploaderId: req.user._id,
            size: req.file.size,
            mimeType: req.file.mimetype,
            sensitivityStatus: 'pending',
            processingProgress: 0,
            category: req.body.category || 'Uncategorized',
            duration: req.body.duration ? parseFloat(req.body.duration) : 0
        });

        // Trigger Async Analysis. It runs in background.
        analyzeVideoSensitivity(video._id, req.file.path, req.io);

        res.status(201).json(video);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error during upload' });
    }
};

// @desc    Get all videos
// @route   GET /api/videos
// @access  Private
const listVideos = async (req, res) => {
    try {
        const { status, search } = req.query;

        let query = {};

        // 1. Filter by Status
        if (status && status !== 'all') {
            query.sensitivityStatus = status;
        }

        // 2. Custom Filters (Category, Date, Size)
        // Category
        if (req.query.category) {
            query.category = req.query.category;
        }

        // Upload Date
        if (req.query.fromDate) {
            const startOfDay = new Date(req.query.fromDate);
            const endOfDay = new Date(req.query.fromDate);
            endOfDay.setDate(endOfDay.getDate() + 1);

            query.createdAt = {
                $gte: startOfDay,
                $lt: endOfDay
            };
        }

        // Size (minSize, maxSize)
        if (req.query.minSize || req.query.maxSize) {
            query.size = {};
            if (req.query.minSize) query.size.$gte = Number(req.query.minSize);
            if (req.query.maxSize) query.size.$lte = Number(req.query.maxSize);
        }

        // Duration (minDuration, maxDuration - in seconds)
        if (req.query.minDuration || req.query.maxDuration) {
            query.duration = {};
            if (req.query.minDuration) query.duration.$gte = Number(req.query.minDuration);
            if (req.query.maxDuration) query.duration.$lte = Number(req.query.maxDuration);
        }

        // 3. Search (Title/Filename)
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { filename: { $regex: search, $options: 'i' } }
            ];
        }

        // 3. Multi-tenancy Enforcement (RBAC)
        // If not Admin, ONLY show videos uploaded by this user OR assigned to this video
        if (req.user.role !== 'admin') {
            query.$or = [
                { uploaderId: req.user._id },
                { assignedTo: req.user._id }
            ];
            // Merging with search query if it exists
            if (search) {
                const searchCond = {
                    $or: [
                        { title: { $regex: search, $options: 'i' } },
                        { filename: { $regex: search, $options: 'i' } }
                    ]
                };
                const rbacCond = {
                    $or: [
                        { uploaderId: req.user._id },
                        { assignedTo: req.user._id }
                    ]
                };
                query = { $and: [query, searchCond, rbacCond] };
                if (query.sensitivityStatus === undefined) delete query.sensitivityStatus; // Cleanup if status wasn't set
            }
        }

        // 4. Sorting
        let sortOption = { createdAt: -1 };
        if (req.query.sort === 'oldest') {
            sortOption = { createdAt: 1 };
        }

        const videos = await Video.find(query).sort(sortOption);

        res.status(200).json(videos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching videos' });
    }
};

// @desc    Stream video
// @route   GET /api/videos/stream/:id
// @access  Private (or Public, depending on requirements, kept Private for RBAC)
const streamVideo = async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);

        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        const filePath = path.join(__dirname, '../../uploads', video.filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Video file missing' });
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            // Range request (Partial Content)
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (start >= fileSize) {
                res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
                return;
            }

            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': video.mimeType,
            };

            res.writeHead(206, head);
            file.pipe(res);

            // Cleanup
            req.on('close', () => {
                file.destroy();
            });

        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': video.mimeType,
            };

            if (req.query.download === 'true') {
                head['Content-Disposition'] = `attachment; filename="${video.title.replace(/[^a-zA-Z0-9.-]/g, '_')}${path.extname(video.filename)}"`;
            }

            res.writeHead(200, head);
            fs.createReadStream(filePath).pipe(res);
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error streaming video' });
    }
};

// @desc    Delete video
// @route   DELETE /api/videos/:id
// @access  Private
const deleteVideo = async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);

        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        // Check ownership or Admin role
        if (video.uploaderId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this video' });
        }

        // Delete file from filesystem
        const filePath = path.join(__dirname, '../../uploads', video.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete from DB
        await Video.deleteOne({ _id: video._id });

        res.status(200).json({ id: req.params.id, message: 'Video deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error deleting video' });
    }
};

// @desc    Assign video to user
// @route   POST /api/videos/assign/:id
// @access  Private/Admin
const assignVideo = async (req, res) => {
    const { userIds } = req.body; // Expecting array of userIds

    if (!userIds || !Array.isArray(userIds)) {
        return res.status(400).json({ message: 'Please provide a list of users to assign.' });
    }

    try {
        const video = await Video.findById(req.params.id);

        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        // Only Admin or Uploader can assign
        if (req.user.role !== 'admin' && video.uploaderId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to assign this video' });
        }

        // Add users to assignedTo if not already there
        let changesMade = false;
        userIds.forEach(uid => {
            if (!video.assignedTo.includes(uid)) {
                video.assignedTo.push(uid);
                changesMade = true;
            }
        });

        if (changesMade) {
            await video.save();
        }

        res.status(200).json({ message: 'Video assigned successfully', video });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error assigning video' });
    }
};

// @desc    Get distinct categories
// @route   GET /api/videos/categories
// @access  Private
const getCategories = async (req, res) => {
    try {
        const categories = await Video.distinct('category');
        console.log('Distinct Categories Found:', categories);
        res.status(200).json(categories.filter(c => c));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching categories' });
    }
};

module.exports = {
    listVideos,
    uploadVideo,
    streamVideo,
    deleteVideo,
    assignVideo,
    getCategories
};
