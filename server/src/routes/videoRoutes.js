const express = require('express');
const router = express.Router();
const { listVideos, uploadVideo, streamVideo, deleteVideo, assignVideo, getCategories } = require('../controllers/videoController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/categories', protect, getCategories);
router.get('/', protect, listVideos);
router.post('/upload', protect, upload.single('video'), uploadVideo);
router.get('/stream/:id', protect, streamVideo);
router.delete('/:id', protect, deleteVideo);
router.post('/assign/:id', protect, assignVideo);

module.exports = router;
