# Video Flow - Video Streaming Service

A full-stack application for secure video uploading, AI-powered sensitivity analysis, and memory-efficient streaming.

## 🌍 Deployment

**Live Application:** [https://video-flow-xi.vercel.app](https://video-flow-xi.vercel.app)

*   **Frontend**: Vercel
*   **Backend**: Render
*   **Database**: MongoDB Atlas

### Storage Note
Uploaded videos are stored on the backend server’s local filesystem.
For sensitivity analysis, videos are temporarily uploaded to Google Gemini and deleted immediately after analysis.
This approach satisfies the assignment requirement for local file storage.

> **⚠️ Deployment Note (Ephemeral Storage)**
> This demo is hosted on **Render's Free Tier**. Since the assignment permits "Local Storage," videos are saved to the server's ephemeral filesystem.
> *   **Note:** Uploaded videos **will be deleted** when the server spins down (after ~15 minutes of inactivity).

---

## 🚀 Features

### Core Functionality
*   **Secure Video Uploads**: Drag-and-drop interface with progress tracking.
*   **AI Content Moderation**: Integrated with **Google Gemini 2.5 Flash** to automatically detect and flag unsafe/NSFW content.
*   **Smart Streaming**: HTTP 206 Partial Content support for efficient seeking and playback.
*   **Real-time Updates**: Live processing status notifications using **Socket.io**.

### Advanced Features
*   **Multi-Tenancy**: Users only see their own videos (unless shared).
*   **RBAC (Role-Based Access Control)**:
    *   **Viewer**: Read-only access to assigned videos.
    *   **User/Editor**: Can upload, edit, and delete their own videos.
    *   **Admin**: Full access to all videos and user management.
*   **Advanced Filtering**: Filter by Category, Date, Size, Duration, and Safety Status.
*   **Video Assignment**: Admins can assign specific videos to Viewers.
*   **Custom Categories**: Users can tag videos with custom categories during upload.

---

## 🛠️ Tech Stack

*   **Frontend**: React (Vite) on **Vercel**
*   **Backend**: Node.js, Express.js on **Render**
*   **Database**: MongoDB Atlas (Cloud)
*   **Storage**: Local filesystem (Render Free Tier – ephemeral)
*   **AI Service**: Google Gemini Flash
*   **Real-time**: Socket.io

---

## 📥 Installation & Setup

### Prerequisites
*   Node.js (v18 or higher)
*   MongoDB (Running locally on port 27017 or a valid connection URI)

### 1. Backend Setup
1.  Navigate to the server directory:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  **AFTER installing**, navigate into the `src` folder:
    ```bash
    cd src
    ```
4.  Create a `.env` file in the `server` directory (one level up) and configure:
    ```env
    PORT=5000
    MONGO_URI=mongodb://localhost:27017/video-flow
    JWT_SECRET=your_secure_jwt_secret_key
    GEMINI_API_KEY=your_google_gemini_api_key
    ```
5.  Start the server from the `src` folder:
    ```bash
    node server.js
    ```

### 2. Frontend Setup
1.  Open a new terminal and navigate to the client directory:
    ```bash
    cd client
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open `http://localhost:5173`.

---

## 📖 User Manual

### User Roles
*   **Viewer**: Read-only user.
    *   *Note: Viewer accounts are read-only and can view videos only when assigned by an Admin. If no videos are assigned, the Viewer dashboard will be empty by design.*
*   **Editor**: Standard user with upload capabilities.
*   **Admin**: Superuser with dashboard management features.

### Workflow
1.  **Register/Login**: Create an account.
2.  **Upload**:
    *   Click the "Upload Area" or drag a file.
    *   Enter a Title and select/type a Category.
    *   Wait for the upload to complete.
3.  **Processing**:
    *   The video will appear in your dashboard with a "Pending" status.
    *   **Live Progress**: You will see a real-time percentage (e.g., "Processing: 80%") while video is being processed.
    *   The AI will analyze the content in the background.
    *   Once complete, it will be marked **SAFE** or **FLAGGED**.
4.  **Filtering**:
    *   Use the top bar filters to sort by Category, Date or Status.
5.  **Admin Features**:
    *   Admins see a "Manage Users" button to manage users.
    *   Admins can see a "Delete" and "Assign" button on ALL videos.

---

## 📡 API Documentation

### Authentication
*   `POST /api/auth/register` - Create new user.
    *   Body: `{ email, password, role }`
*   `POST /api/auth/login` - Authenticate user.
    *   Body: `{ email, password }`
*   `GET /api/auth/me` - Get current user profile.
*   `GET /api/auth/users` - List all users (Admin only).
*   `DELETE /api/auth/users/:id` - Delete user (Admin only).
*   `PUT /api/auth/users/:id` - Update user (Admin only).

### Videos
*   `GET /api/videos` - List videos.
    *   Query Params: `status`, `category`, `fromDate`, `minSize`, `maxSize`, `minDuration`, `maxDuration`, `search`.
*   `POST /api/videos/upload` - Upload video.
    *   FormData: `video` (file), `title`, `category`, `duration`.
*   `DELETE /api/videos/:id` - Delete video (Owner/Admin only).
*   `POST /api/videos/assign/:id` - Assign video to user (Admin only).
    *   Body: `{ userIds: ["userId1", "userId2"] }`
*   `GET /api/videos/categories` - Get list of unique categories.

### Streaming
*   `GET /api/videos/stream/:id` - Stream video content (supports Range headers).

---

## 🏗️ Architecture & Design Decisions

For a detailed deep-dive into the system architecture, please refer to [ARCHITECTURE.md](./ARCHITECTURE.md).

### Key Constraints & Decisions
*   **Memory Efficiency**: Used Node.js Streams for video playback to prevent server memory crashes with large files.
*   **Scalability**: Logic is separated into Controllers and Services.
*   **Security**: All endpoints requiring data access are protected by JWT authentication middleware.
*   **User Experience**: Socket.io was chosen over polling to provide immediate feedback on video analysis results.

---

## 🧪 Testing

To manually verify the system:
1.  **Upload**: Upload a standard MP4 file. Watch the progress bar.
2.  **Refresh**: Note that you *don't* need to refresh the page to see the new video appear; Socket.io handles it.
3.  **Stream**: Click the play button. Try seeking to the middle of the video (verifies Range requests).
4.  **Filter**: Type a custom category during upload (e.g., "Demo"). Use the category filter to find it.

---

## ⚠️ Assumptions and Limitations

1.  **Ephemeral Storage (Assignment Scope)**:
    *   This demo is hosted on **Render's Free Tier** which uses an ephemeral filesystem.
    *   **Limitation**: All uploaded videos are **automatically deleted** when the server spins down due to inactivity (~15 minutes).
    *   **Production Solution**: In a real-world scenario, this would be replaced by persistent cloud storage like **AWS S3** or **Google Cloud Storage**.

2.  **Scalability & AI Processing**:
    *   **Current State**: Video analysis is triggered synchronously after upload.
    *   **Limitation**: Heavy traffic could hit Gemini API rate limits or block the Node.js event loop.
    *   **Production Solution**: A robust system would implement a **Message Queue** (e.g., RabbitMQ) to decouple uploads from analysis, allowing for horizontal scaling and better fault tolerance.


