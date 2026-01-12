const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    filename: {
        type: String,
        required: true
    },
    uploaderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    sensitivityStatus: {
        type: String,
        enum: ['pending', 'safe', 'flagged'],
        default: 'pending'
    },
    sensitivityReason: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        default: 'Uncategorized'
    },
    processingProgress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    size: {
        type: Number,
        required: true
    },
    duration: {
        type: Number, // seconds
        default: 0
    },
    mimeType: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Video', videoSchema);
