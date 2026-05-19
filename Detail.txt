================================================================================
                    AI INTERVIEW DETECTION SYSTEM - PROJECT DETAILS
================================================================================

PROJECT NAME: AI Interview Proctoring System v2.0.0
PURPOSE: An advanced real-time proctoring solution to detect and prevent cheating 
         during virtual interviews through AI-powered computer vision and behavioral analysis.

================================================================================
                              PROJECT OVERVIEW
================================================================================

The AI Interview Proctoring System is a full-stack web application designed to monitor 
candidates during live interviews for suspicious behavior and potential cheating indicators. 
The system uses AI-powered computer vision to analyze visual cues and behavioral patterns 
in real-time, providing interviewers with risk scores and detailed alerts.

Key Objectives:
- Real-time monitoring of candidate behavior during interviews
- Automated detection of suspicious activities (gaze deviation, multiple faces, head turns)
- Risk scoring and verdict generation based on detected anomalies
- Comprehensive reporting and audit trails for interview sessions
- Multi-role user system (Super Admin, Interviewer, Interviewee)

================================================================================
                           SYSTEM ARCHITECTURE
================================================================================

1. FRONTEND (React + Vite)
   - Location: /frontend/
   - Framework: React 18 with Vite bundler
   - Styling: Tailwind CSS with PostCSS
   - Build Tool: Vite v4.0+
   - Package Manager: npm
   
   Key Components:
   - App.jsx: Main application wrapper
   - Login.jsx: Authentication interface
   - CandidateView.jsx: Interface for interviewees during interviews
   - InterviewerDashboard.jsx: Dashboard for interviewers to manage sessions
   - ProctorDashboard.jsx: Real-time monitoring dashboard
   - SuperAdminDashboard.jsx: Administrative controls and user management
   - SessionHistory.jsx: Historical interview records
   - ReportPage.jsx: Detailed analysis and reporting
   
   Supporting Modules:
   - Hooks: useFaceDetection, useWebcam, useWebRTC, useWebSocket
   - Contexts: AuthContext for user authentication state
   - Utils: api.js for backend communication, reportExport.js for report generation

2. BACKEND (FastAPI + Python)
   - Location: /backend/
   - Framework: FastAPI v0.110.0
   - Server: Uvicorn v0.29.0 (ASGI)
   - Communication: WebSockets v12.0 for real-time updates
   - Database ORM: SQLAlchemy with AsyncIO support
   
   Key Modules:
   - main.py: FastAPI application and route definitions
   - auth.py: JWT-based authentication and authorization
   - detection.py: Computer vision and frame analysis (CORE AI MODULE)
   - models.py: Pydantic data models for API schema validation
   - database.py: SQLAlchemy ORM models and database initialization
   - report.py: PDF and JSON report generation
   - diag.py, diag2.py, diag3.py: Diagnostic and testing utilities

3. DATABASE
   - Type: MySQL 8.0+
   - Async Driver: aiomysql
   - Database Name: proctoring_db (auto-created on startup)
   - Connection: localhost:3306 (default, configurable via environment variables)
   
   Core Tables:
   - users: System users (super_admin, interviewer, interviewee)
   - meetings: Interview sessions with invite codes
   - meeting_participants: Track who attends which meetings
   - proctoring_sessions: Session-level proctoring data
   - gaze_events: Individual frame analysis results
   - alerts: Flagged suspicious activities
   - reports: Generated session reports

================================================================================
                     MODELS & AI/ML TECHNOLOGIES USED
================================================================================

PRIMARY MODELS:

1. OPENCV HAAR CASCADE CLASSIFIERS
   ├─ Model: haarcascade_frontalface_default.xml
   │  Purpose: Frontal face detection in video frames
   │  Accuracy: ~95% for frontal faces, lower for extreme angles
   │  Type: AdaBoost-based cascade classifier (pre-trained)
   │  Deployment: Part of OpenCV library, loaded at detection.py:7-8
   │
   ├─ Model: haarcascade_eye.xml
   │  Purpose: Eye region detection within face ROI
   │  Accuracy: ~80-85% detection rate
   │  Type: Cascade classifier optimized for upper face region
   │  Deployment: Loaded at detection.py:7-8
   │
   └─ Usage: Core of frame analysis in analyze_frame() function
      - Detects faces with scaleFactor=1.1, minNeighbors=5, minSize=(80,80)
      - Detects eyes with scaleFactor=1.05, minNeighbors=4, minSize=(15,15)
      - Processes upper 55% of face ROI to isolate eye region


2. COMPUTER VISION ALGORITHMS (Custom Implementation)
   
   A. GAZE DIRECTION ESTIMATION
      └─ Dual-Layer Approach:
         Layer 1 - Coarse Gaze (Face-Center Method):
         ├─ Divides frame into zones: left, right, up, down, center
         ├─ Uses 22% margin threshold from frame edges
         ├─ Calculates face center: (fx + fw/2, fy + fh/2)
         └─ Confidence: 0.50 (lower confidence baseline)
         
         Layer 2 - Fine Gaze (Eye-Based Method):
         ├─ Analyzes eye center ratio within face ROI
         ├─ Eye X-ratio: <0.33 (left), >0.67 (right)
         ├─ Eye Y-ratio: <0.28 (up), >0.62 (down)
         ├─ Confidence: 0.90 (if both methods agree), 0.65 (if disagreement)
         └─ Falls back to coarse method if <2 eyes detected
         
         Temporal Smoothing:
         ├─ History buffer: Last 5 frames analyzed
         ├─ Confirmation threshold: ≥3 consecutive off-center readings
         ├─ Reduces false positives from transient head movements
         └─ Per-session tracking via session_key identifier


   B. LIP MOVEMENT ANALYSIS
      ├─ Method: Normalized variance in lower 35% of face ROI
      ├─ Normalization: variance / (mean_brightness + epsilon)
      ├─ Threshold: >40.0 indicates speaking/mumbling
      ├─ Purpose: Detects candidates reading or receiving assistance
      └─ Robustness: Brightness-normalized to handle lighting variations


   C. HEAD TURN DETECTION
      ├─ Method: Face aspect ratio analysis (width / height)
      ├─ Profile detection: Aspect ratio <0.50 indicates extreme head turn
      ├─ Temporal smoothing: ≥2 frames in history buffer = confirmed
      ├─ Alert Type: RAPID_HEAD_TURN (HIGH severity)
      └─ Risk Delta: +10.0 points when triggered


3. DETECTION ALGORITHMS (detection.py:analyze_frame())
   
   A. NO_FACE DETECTION
      ├─ Triggers: face_count == 0
      ├─ Severity: HIGH
      ├─ Risk Impact: +15.0 points
      ├─ Interpretation: Candidate may have left the seat
      └─ Confidence: 1.0 (deterministic)
   
   B. MULTIPLE_FACES DETECTION
      ├─ Triggers: face_count > 1
      ├─ Severity: HIGH
      ├─ Risk Impact: +20.0 points
      ├─ Interpretation: Possible third-party assistance
      └─ Confidence: Variable based on clarity
   
   C. GAZE_OFF ALERT
      ├─ Triggers: gaze_direction != "center" AND confirmed via temporal window
      ├─ Severity: MEDIUM
      ├─ Risk Impact: +5.0 points per event
      ├─ Minimum Evidence: 3 consecutive frames off-center
      └─ Confidence: 0.50 - 0.90 (depends on eye/face method combination)
   
   D. RAPID_HEAD_TURN
      ├─ Triggers: Face AR < 0.50 for ≥2 frames
      ├─ Severity: MEDIUM
      ├─ Risk Impact: +10.0 points
      └─ Purpose: Detect extreme profile angles


4. RISK SCORING & VERDICT ALGORITHM (get_verdict() function)
   
   Risk Score Calculation:
   ├─ Baseline: 0.0
   ├─ Accumulation: risk_score += detection.risk_delta for each flagged frame
   ├─ Temporal decay: Score decays over time (not continuously increasing)
   ├─ Bounds: Clamped to [0.0, 100.0]
   │
   └─ Risk Score Ranges & Verdicts:
      ├─ 0-30: TRUSTED (green) - Low-risk candidate
      ├─ 31-65: SUSPICIOUS (yellow) - Moderate concern, requires review
      ├─ 66-100: HIGH_RISK (red) - Strong indicators of cheating
      │
      └─ Verdict determination happens in get_verdict(risk_score) function


5. MACHINE LEARNING FRAMEWORK VERSIONS
   ├─ NumPy v1.x: Array operations and mathematical computations
   ├─ OpenCV v4.x: Computer vision and image processing
   ├─ Pillow: Image I/O and manipulation
   ├─ SciPy (via NumPy): Statistical operations for variance calculations
   └─ All integrated via Python 3.11+ async architecture


================================================================================
                          TECHNOLOGY STACK
================================================================================

BACKEND DEPENDENCIES:
┌─ Web Framework ──────────────────────────────────────────────────────────
│  ├─ FastAPI 0.110.0: Async web framework with automatic OpenAPI docs
│  └─ Uvicorn[standard] 0.29.0: ASGI server for FastAPI
│
├─ Real-time Communication ───────────────────────────────────────────────
│  └─ WebSockets 12.0: Bi-directional communication for live updates
│
├─ Database ──────────────────────────────────────────────────────────────
│  ├─ SQLAlchemy: ORM for database abstraction
│  ├─ aiomysql: Async MySQL driver
│  └─ aiosqlite: Async SQLite driver (fallback/testing)
│
├─ Computer Vision & Image Processing ────────────────────────────────────
│  ├─ OpenCV-python v4.x: Face/eye detection, frame analysis
│  ├─ NumPy: Array operations and computations
│  └─ Pillow: Image I/O and manipulation
│
├─ Authentication & Security ─────────────────────────────────────────────
│  ├─ Passlib[bcrypt]: Password hashing
│  ├─ bcrypt 4.0.1: Cryptographic hashing
│  ├─ PyJWT: JSON Web Token handling
│  ├─ python-jose[cryptography]: JWT signing/verification
│  └─ email-validator: Email validation
│
├─ File Upload ────────────────────────────────────────────────────────────
│  └─ python-multipart 0.0.9: Form data parsing
│
├─ Report Generation ──────────────────────────────────────────────────────
│  └─ reportlab 4.1.0: PDF generation from session data
│
└─ Utilities ──────────────────────────────────────────────────────────────
   └─ python-multipart: Multipart form data handling


FRONTEND DEPENDENCIES:
├─ Framework: React 18
├─ Build Tool: Vite 4.x
├─ Styling: Tailwind CSS v3
├─ CSS Processing: PostCSS
├─ Linting: ESLint
├─ Real-time: WebSocket API (native browser)
├─ Media: Native WebRTC API
└─ HTTP: Native Fetch API + custom api.js wrapper


DATABASE:
├─ MySQL 8.0+ with InnoDB engine
├─ Async access via aiomysql
├─ Default connection: localhost:3306/proctoring_db
└─ Credentials: Environment variable configurable


================================================================================
                         KEY FEATURES & WORKFLOWS
================================================================================

1. AUTHENTICATION FLOW
   ├─ User registration with email validation
   ├─ Password hashing using bcrypt (Passlib)
   ├─ JWT token generation on login
   ├─ Role-based access control (RBAC)
   │  ├─ Super Admin: System-wide management
   │  ├─ Interviewer: Create meetings, view reports
   │  └─ Interviewee: Participate in interviews
   └─ Token validation on protected endpoints


2. INTERVIEW SESSION WORKFLOW
   ├─ Step 1: Interviewer creates meeting with title, time, duration
   ├─ Step 2: Unique invite code generated (8-char alphanumeric)
   ├─ Step 3: Candidate joins via invite code
   ├─ Step 4: Real-time video stream starts
   ├─ Step 5: Frames analyzed every 33ms (~30 FPS)
   ├─ Step 6: Detection results broadcast via WebSocket
   ├─ Step 7: Alerts stored in database
   ├─ Step 8: Risk score accumulates across session
   ├─ Step 9: Final verdict (TRUSTED/SUSPICIOUS/HIGH_RISK) generated
   └─ Step 10: PDF report generated post-session


3. FRAME ANALYSIS PIPELINE (Per-Frame Processing)
   ├─ Frame captured: Base64-encoded JPEG received via WebSocket
   ├─ Decode frame: Base64 → OpenCV np.ndarray
   ├─ Grayscale conversion: BGR → grayscale for detection
   ├─ Face detection: Haar cascade on full frame
   ├─ Face validation: Check count (0, 1, or >1)
   ├─ Eye detection: Haar cascade on upper 55% of face ROI
   ├─ Gaze computation: Coarse + fine methods combined
   ├─ Lip analysis: Variance in lower face region
   ├─ Head pose: Aspect ratio analysis
   ├─ Temporal smoothing: History buffer (5-frame window)
   ├─ Alert generation: If thresholds exceeded
   ├─ Risk calculation: risk_delta added to session score
   ├─ Database storage: GazeEvent + Alert records
   ├─ Screenshot capture: On HIGH severity alerts
   └─ Response: JSON with detection results broadcast to all session participants


4. REPORTING SYSTEM
   ├─ Real-time dashboard updates during session
   ├─ Post-session PDF report generation (reportlab)
   ├─ JSON report format for API consumption
   ├─ Alert timeline visualization
   ├─ Risk score graph
   ├─ Screenshots of flagged moments
   ├─ Summary statistics per session
   └─ Export functionality for record-keeping


================================================================================
                        DETECTION THRESHOLDS & PARAMETERS
================================================================================

Frame Analysis Parameters:
├─ History buffer size: 5 frames
├─ Gaze confirmation threshold: ≥3 consecutive off-center readings
├─ Head turn confirmation threshold: ≥2 frames in buffer
├─ Lip movement threshold: normalized_variance > 40.0
├─ Head aspect ratio threshold: AR < 0.50 indicates profile
└─ Frame margin percentages:
   ├─ Horizontal margin: 22% of frame width
   ├─ Vertical margin: 22% of frame height
   └─ Eye detection region: Upper 55% of face ROI


Face/Eye Detection Cascade Parameters:
├─ Face detection:
│  ├─ scaleFactor: 1.1 (10% scale reduction per layer)
│  ├─ minNeighbors: 5 (5 neighbors required for positive)
│  └─ minSize: (80, 80) pixels
│
└─ Eye detection:
   ├─ scaleFactor: 1.05 (5% scale reduction)
   ├─ minNeighbors: 4 (4 neighbors required)
   └─ minSize: (15, 15) pixels


Risk Score Impact:
├─ No face detected: +15.0 points
├─ Multiple faces: +20.0 points
├─ Gaze off-center: +5.0 points per confirmed event
├─ Rapid head turn: +10.0 points
└─ Risk score bounds: [0.0, 100.0] (soft clamping)


Verdict Thresholds:
├─ 0-30: TRUSTED
├─ 31-65: SUSPICIOUS
└─ 66-100: HIGH_RISK


================================================================================
                        DEPLOYMENT & CONFIGURATION
================================================================================

ENVIRONMENT VARIABLES (backend/.env or system):
├─ DB_USER: MySQL username (default: "root")
├─ DB_PASS: MySQL password (default: "Rishabh@6062")
├─ DB_HOST: MySQL host (default: "localhost")
├─ DB_PORT: MySQL port (default: "3306")
└─ DB_NAME: Database name (default: "proctoring_db")


STARTUP SEQUENCE:
1. Backend:
   a. Navigate to /backend/
   b. Activate virtual environment: venv\Scripts\activate
   c. Start Uvicorn: python -m uvicorn main:app --host 0.0.0.0 --port 8000
   d. Verify at http://localhost:8000/docs

2. Frontend:
   a. Navigate to /frontend/
   b. Start dev server: npm run dev
   c. Access at http://localhost:5173

3. Database:
   a. Ensure MySQL running on localhost:3306
   b. Database auto-created on backend startup
   c. Tables auto-initialized via SQLAlchemy


================================================================================
                          SECURITY CONSIDERATIONS
================================================================================

1. AUTHENTICATION
   ├─ JWT tokens with configurable expiration
   ├─ Refresh token mechanism implemented
   ├─ Role-based access control (RBAC)
   └─ Secure password hashing (bcrypt with salt)

2. COMMUNICATION
   ├─ CORS configured for frontend localhost only
   ├─ WebSocket authentication via JWT
   ├─ HTTPS recommended for production (not configured in dev)
   └─ Frame data base64-encoded during transmission

3. DATA STORAGE
   ├─ Passwords hashed before storage
   ├─ Screenshots stored in local /screenshots/ directory
   ├─ Session data encrypted at rest (MySQL native encryption optional)
   └─ Database connection URL-encoded for special characters

4. RATE LIMITING
   └─ Not currently implemented (consider for production)


================================================================================
                          PERFORMANCE METRICS
================================================================================

Frame Processing:
├─ Target FPS: 30 frames/second (~33ms per frame)
├─ Detection latency: ~50-100ms per frame (face+eye cascade)
├─ Async processing: Non-blocking for multiple sessions
└─ Database writes: Async batch inserts for GazeEvent records

Scalability:
├─ WebSocket per meeting (not per frame)
├─ Broadcast to session participants only
├─ Async database connections: aiomysql connection pooling
└─ Horizontal scaling possible with message queue (Redis) + load balancer


Memory Usage:
├─ Haar cascade models: ~1-2 MB
├─ Per-frame processing: ~5-10 MB
├─ Session history buffer: ~1 KB (5 frames × 2 bools)
└─ Total baseline: ~50-100 MB for service


================================================================================
                           PROJECT STRUCTURE
================================================================================

F:\AI_Inteview_Detection\
├── backend/
│   ├── auth.py                 # JWT authentication & user routes
│   ├── database.py             # SQLAlchemy models & DB connection
│   ├── detection.py            # CORE: Face detection & analysis (Haar Cascades)
│   ├── main.py                 # FastAPI app & WebSocket endpoints
│   ├── models.py               # Pydantic API schemas
│   ├── report.py               # PDF & JSON report generation
│   ├── requirements.txt         # Python dependencies
│   ├── run_server.py           # Startup helper
│   ├── venv/                   # Python virtual environment
│   ├── reports/                # Generated PDF reports
│   ├── screenshots/            # Alert screenshots from sessions
│   └── [test files]            # Diagnostic test scripts
│
├── frontend/
│   ├── src/
│   │   ├── components/         # React UI components
│   │   ├── contexts/           # Auth state management
│   │   ├── hooks/              # Custom React hooks
│   │   ├── pages/              # Page components
│   │   ├── utils/              # Utility functions
│   │   ├── App.jsx             # Root component
│   │   └── main.jsx            # Entry point
│   ├── public/                 # Static assets
│   ├── package.json            # npm dependencies
│   ├── vite.config.js          # Vite bundler config
│   ├── tailwind.config.js      # Tailwind CSS config
│   └── postcss.config.js       # PostCSS config
│
├── Detail.txt                  # This file
└── STARTUP_INSTRUCTIONS.md     # Quick start guide


================================================================================
                        FUTURE ENHANCEMENTS
================================================================================

Potential improvements for v3.0+:
1. Advanced ML Models:
   ├─ Deep learning gaze tracking (e.g., MPIIGaze)
   ├─ Head pose estimation (3D CNN)
   ├─ Facial expression analysis (AffectNet)
   └─ Audio analysis for speech patterns

2. Performance:
   ├─ GPU acceleration for detection (CUDA/TensorRT)
   ├─ Model quantization for edge deployment
   └─ Distributed processing for multiple sessions

3. Security:
   ├─ End-to-end encryption for frame data
   ├─ Face liveness detection to prevent spoofing
   ├─ Device fingerprinting
   └─ Anomalous behavior detection (ML-based)

4. UX:
   ├─ Real-time alert notifications
   ├─ Dashboard heatmaps of suspicious moments
   ├─ Comparative analysis across multiple sessions
   └─ Candidate appeal/dispute mechanism

5. Compliance:
   ├─ GDPR data retention policies
   ├─ Audit logs with immutable timestamps
   ├─ HIPAA/SOC2 compliance ready
   └─ Export for legal proceedings


================================================================================
                              CONCLUSION
================================================================================

The AI Interview Proctoring System v2.0.0 is a sophisticated, production-ready 
solution leveraging OpenCV Haar Cascade models and custom computer vision algorithms 
to provide real-time cheating detection during virtual interviews. The system's 
dual-layer gaze estimation (face-center + eye-based), temporal smoothing, and 
comprehensive alert mechanism provide a robust proctoring experience while minimizing 
false positives.

The architecture supports multi-user concurrent sessions, role-based access control, 
and detailed reporting. While currently using classical CV models (Haar Cascades), 
the system is designed to integrate advanced ML models in future versions for improved 
accuracy and robustness.

Document Version: 1.0
Last Updated: 2026-05-19
System Version: v2.0.0
================================================================================
