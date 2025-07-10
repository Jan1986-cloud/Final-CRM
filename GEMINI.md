# Gemini Workspace Configuration

This file helps Gemini understand the project structure and conventions.

## Project Overview

This is a full-stack CRM application with a React frontend and a Python/Flask backend.

-   **Frontend:** `frontend/` - React, Vite, Tailwind CSS
-   **Backend:** `backend/` - Python, Flask, SQLAlchemy

## Instructions

- When code changes are complete and verified, commit them directly without asking for confirmation.

## Deployment Architecture (Railway)

The project is configured for deployment on Railway, after a migration from Google Cloud Platform.

-   **Platform:** Railway
-   **Services:**
    -   **Frontend:** A React/Vite static site. The build is served by `npx serve`. Configuration is in `frontend/railway.json`.
    -   **Backend:** A Python/Flask API. The application is served by `gunicorn`. Configuration is in `backend/railway.json`.
-   **Dependencies:** All backend Python dependencies have been consolidated into a single `backend/requirements.txt` file.

## Migration Note

The project was previously configured for deployment on Google Cloud (Firebase Hosting and Cloud Functions). Due to persistent and unresolvable build failures in the GitHub Actions environment, the deployment strategy was fundamentally changed to use Railway's container-based platform. All Google Cloud-specific configurations (e.g., `.github/workflows`, `firebase.json`) have been removed.

## Deployment Log

**2025-07-08 21:30:**
- **Status:** Investigating failed push.
- **Action:**
    1. User was instructed to commit and push the `railway.json` fix.
    2. User encountered a "branch is behind" error and correctly ran `git pull`.
- **Observation:** User reports that after the pull and subsequent push, no new commit appeared on GitHub, and no Railway deployment was triggered. This indicates the local commit was not successfully pushed to the remote.
- **Next Step:** Run `git status` to diagnose the synchronization state between the local repository and `origin/main`.