# Technical Design Document: Video Upload & Streaming Service

## 1. Executive Summary
This document outlines the architectural design for a scalable, secure, and efficient video upload and streaming service. The system is designed to handle high-throughput video data, ensure content security via Role-Based Access Control (RBAC), and provide a seamless streaming experience using standard HTTP protocols. The architecture prioritizes separation of concerns, testability, and memory efficiency.

## 2. System Architecture

We adhere to a **Clean Layered Architecture** to ensure separation of concerns. This decoupling allows for independent testing, easier maintenance, and flexibility to swap out implementations (e.g., changing the database) with minimal impact on business logic.

### 2.1 High-Level Layers & Tech Stack

**Stack**: Node.js + Express + MongoDB (Backend) | React + Vite (Frontend)

### 2.2 Component Responsibilities

1.  **Route Layer (`/routes`)**:
    *   **Responsibility**: Defines API endpoints and maps HTTP methods to specific Controller functions. Applies middleware (Auth/Upload).
    *   **Rule**: No logic here. Just routing and middleware attachment.
    *   **Example**: `router.post('/upload', protect, upload.single('video'), uploadVideo)`

2.  **Controller Layer (`/controllers`)**:
    *   **Responsibility**: Core request handling, validation, and streaming logic.
    *   **Rule**: Manages HTTP responses directly.
    *   **Example**: `VideoController.streamVideo()` handles the HTTP 206 Partial Content logic and file piping directly to ensure optimal performance without extra abstraction layers.

2.  **Service Layer (`/services`)**:
    *   **Responsibility**: Encapsulates external integrations and long-running async jobs.
    *   **Rule**: Decoupled from HTTP implementation details.
    *   **Example**: `AnalysisService.analyzeVideoSensitivity()` handles the Google Gemini API integration and async database updates.

3.  **Data Access Layer (Mongoose Models)**:
    *   **Responsibility**: Direct interaction with the MongoDB database.
    *   **Rule**: Defines schema validation and returns Domain Entities.
    *   **Example**: `Video.create()` or `User.findById()`.

## 3. Streaming Strategy

### 3.1 HTTP 206 & Range Requests
To support seeking and efficient playback, we implement **HTTP 206 Partial Content**. This allows the client to request specific byte ranges of the video file.

*   **Mechanism**:
    1.  Client sends `Range: bytes=0-` (or specific range).
    2.  Server parses the `Range` header.
    3.  Server opens a file stream specifically for that range options: `{ start, end }`.
    4.  Server responds with `206 Partial Content`, `Content-Range` header, and the binary stream.

### 3.2 Memory Leak Prevention (Backpressure)
Reading large video files into memory (e.g., `fs.readFile`) can crash Node.js event loops.

*   **Solution**: **Streams & Pipes**.
    *   We use `fs.createReadStream()`.
    *   We **pipe** the read stream directly to the HTTP response object (which is a write stream).
    *   **Backpressure Handling**: `stream.pipe(res)` handles backpressure automatically. If the client (network) is slow, the file system read pauses, preventing memory spikes.

## 4. Multi-Tenancy & Security

### 4.1 Access Control & Data Isolation
*   **Roles**:
    *   `Admin`: Full system access (can manage all videos/users).
    *   `Editor`: Can upload/manage **only their own** videos.
    *   `Viewer`: Read-only access to assigned videos.
*   **Multi-tenancy Strategy**: **Row-Level Security** via `uploaderId`.
    *   Every video document has an `uploaderId`.
    *   **Enforcement**: Controller logic verifies `req.user.id === video.uploaderId` before allowing updates/deletion (unless user is Admin).

### 4.2 Sensitivity Analysis (Content Security)
To detect "unsafe" content, we implement an asynchronous processing pipeline.
1.  **Trigger**: On upload completion, `VideoService` calls `SensitivityService.analyze(videoId)`.
2.  **Implementation**: **Google Gemini 2.5 Flash**.
    *   Uploads video to Gemini File API.
    *   Prompts Gemini to analyze for NSFW/Violence/Safety.
    *   **Feedback**: Updates `Video.status` -> `processing` -> `safe/flagged`. EMITS Socket.io event to frontend.

## 5. Trade-offs & Technology Decisions

| Decision | Choice | Alternative | Rationale |
| :--- | :--- | :--- | :--- |
| **I/O Model** | **Node.js Streams** | Buffer/In-Memory | **Critically Important**. Videos are large (GBs). Buffering crashes the heap. Streams keep memory footprint constant (~chunk size) regardless of file size. |
| **Progress Updates** | **Socket.io** | Short Polling | Video processing (transcoding/upload) is long-running. Polling wastes resources with empty checks. **Socket.io** provides an event-driven, real-time UX (e.g., "Processing: 45%") which is superior for engagement. |

