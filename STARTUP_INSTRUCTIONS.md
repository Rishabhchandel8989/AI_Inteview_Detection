# AI Interview Proctoring System

This file outlines the steps required to successfully start the frontend and backend of the AI Interview Proctoring System.

## Prerequisites
- You must have MySQL installed and running on port `3306`.
- A database named `proctoring_db` will be automatically created on startup.

## Starting the Backend (FastAPI)

1. Open a new terminal instance.
2. Navigate to the `backend` directory:
   ```bash
   cd f:\AI_Inteview_Detection\backend
   ```
3. Activate the virtual environment (if it is not already activated):
   ```bash
   .\venv\Scripts\activate
   ```
4. Start the Uvicorn server:
   ```bash
   python -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```
   *Note: Ensure you run the sever without the `--reload` flag as it currently conflicts with Python 3.13 on Windows.*

The backend will be available at `http://localhost:8000`. You can test this by visiting the API documentation at `http://localhost:8000/docs`.

## Starting the Frontend (Vite/React)

1. Open a new terminal instance.
2. Navigate to the `frontend` directory:
   ```bash
   cd f:\AI_Inteview_Detection\frontend
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`. Open this URL in your browser to interact with the application.

## Common Issues & Troubleshooting
- **Backend Error: `[Errno 10048] error while attempting to bind on address`**: This means another instance of the backend is already running and occupying port `8000`. You can forcefully kill it with:
  ```bash
  Get-Process -Name python | Stop-Process -Force
  ```
- **Backend Error: `Can't connect to MySQL server on 'localhost'`**: Ensure that your MySQL database service is running and active.
