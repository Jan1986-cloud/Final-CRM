# Gemini Workspace Configuration

This file helps Gemini understand the project structure and conventions.

## Project Overview

This is a full-stack CRM application with a React frontend and a Python/Flask backend.

-   **Frontend:** `frontend/` - React, Vite, Tailwind CSS
-   **Backend:** `backend/` - Python, Flask, SQLAlchemy

## Deployment Architecture (Railway)

The project is configured for deployment on Railway, after a migration from Google Cloud Platform.

-   **Platform:** Railway
-   **Services:**
    -   **Frontend:** A React/Vite static site. The build is served by `npx serve`. Configuration is in `frontend/railway.json`.
    -   **Backend:** A Python/Flask API. The application is served by `gunicorn`. Configuration is in `backend/railway.json`.
-   **Dependencies:** All backend Python dependencies have been consolidated into a single `backend/requirements.txt` file.

## Migration Note

The project was previously configured for deployment on Google Cloud (Firebase Hosting and Cloud Functions). Due to persistent and unresolvable build failures in the GitHub Actions environment, the deployment strategy was fundamentally changed to use Railway's container-based platform. All Google Cloud-specific configurations (e.g., `.github/workflows`, `firebase.json`) have been removed.