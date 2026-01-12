const { GoogleAIFileManager } = require("@google/generative-ai/server");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
const Video = require('../models/Video');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

/**
 * Uploads file to Gemini, analyzes it, updates DB and cleans up.
 * This runs asynchronously.
 * 
 * @param {string} videoId - MongoDB Video ID
 * @param {string} filePath - Local path to video file
 * @param {object} io - Socket.io instance
 */
const analyzeVideoSensitivity = async (videoId, filePath, io) => {
    try {
        console.log(`[Analysis] Starting for video ${videoId}`);

        io.to(videoId.toString()).emit('videoProcessingStart', { videoId });

        // 1. Upload to Google AI File Manager
        const uploadResponse = await fileManager.uploadFile(filePath, {
            mimeType: "video/mp4",
            displayName: `Video-${videoId}`,
        });

        console.log(`[Analysis] Uploaded to Gemini: ${uploadResponse.file.uri}`);
        io.to(videoId.toString()).emit('videoProcessingProgress', { videoId, progress: 30 });

        let file = await fileManager.getFile(uploadResponse.file.name);
        while (file.state === "PROCESSING") {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            file = await fileManager.getFile(uploadResponse.file.name);
        }

        if (file.state === "FAILED") {
            throw new Error("Video processing failed on Gemini side.");
        }

        io.to(videoId.toString()).emit('videoProcessingProgress', { videoId, progress: 60 }); // File Ready on Gemini

        // 2. Analyze
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        console.log(`[Analysis] Asking Gemini for analysis...`);
        io.to(videoId.toString()).emit('videoProcessingProgress', { videoId, progress: 80 }); // Analyzing

        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: file.mimeType,
                    fileUri: file.uri
                }
            },
            { text: "Is this video safe for work? Return strictly a JSON object: { \"safe\": boolean, \"reason\": string }. Do not use markdown." }
        ]);

        const responseText = result.response.text();
        const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(jsonStr);

        console.log(`[Analysis] Result:`, analysis);

        // 3. Update MongoDB
        const status = analysis.safe ? 'safe' : 'flagged';
        await Video.findByIdAndUpdate(videoId, {
            sensitivityStatus: status,
            sensitivityReason: analysis.reason,
            processingProgress: 100
        });

        // 4. Notify Completion
        io.to(videoId.toString()).emit('videoProcessed', {
            videoId,
            status,
            reason: analysis.reason
        });

        // 5. Cleanup Remote File
        await fileManager.deleteFile(uploadResponse.file.name);
        console.log(`[Analysis] Remote file deleted`);

    } catch (error) {
        console.error(`[Analysis Error]`, error);
        await Video.findByIdAndUpdate(videoId, { sensitivityStatus: 'flagged' }); // Fail safe to flagged? or error
        io.to(videoId.toString()).emit('videoProcessingError', { videoId, error: error.message });
    }
};

module.exports = { analyzeVideoSensitivity };
