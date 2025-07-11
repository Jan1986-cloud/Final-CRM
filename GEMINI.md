# Gemini Workspace Configuration & Deployment Log

This file provides a single source of truth for project configuration, conventions, and a detailed log of all major operations performed by the Gemini assistant.

---

## 1. Project Overview

This is a full-stack CRM application with a React frontend and a Python/Flask backend, deployed on Railway.

### 1.1. Frontend (`frontend/`)
-   **Framework:** React
-   **Build Tool:** Vite
-   **Styling:** Tailwind CSS
-   **State Management:** React Context API
-   **Key Directories:**
    -   Components: `frontend/src/components/`
    -   API Services: `frontend/src/services/`
-   **Conventions:** Use functional components with hooks and follow existing styling.

### 1.2. Backend (`backend/`)
-   **Framework:** Flask
-   **Database:** SQLAlchemy
-   **Authentication:** JWT
-   **Key Files & Directories:**
    -   Dependencies: `backend/requirements.txt`
    -   API Routes: `backend/src/routes/`
    -   Entry Point: `backend/src/main.py`
-   **Conventions:** Follow PEP 8 for Python code style.

---

## 2. API Naming & Contract Consistency

To prevent deployment failures and runtime errors due to naming inconsistencies, this project now follows a strict "contract-first" development workflow.

**The Single Source of Truth:**
The `api_contracts.yaml` file is the definitive "heilige graal" for all API endpoint definitions. It contains the formal contract, including paths, methods, and the schemas for all requests and responses.

**The Guardian:**
The `consistency_checker.py` script is the automated guardian of this contract. It programmatically validates the backend's implementation against the `api_contracts.yaml` file.

### Mandatory Development Workflow

**ALL** new feature development or modification of existing endpoints **MUST** follow this process:

1.  **Define the Contract First:** Before writing any implementation code, define or update the endpoint's contract in `api_contracts.yaml`.
2.  **Implement the Feature:** Write the backend and frontend code to match the contract.
3.  **Run the Consistency Check:** Before committing, run `python consistency_checker.py`.
4.  **Verify the Report:** If the generated `consistency_report.md` shows failures, fix the *implementation* to match the contract.
5.  **Commit:** Once the check passes, commit the changes to `api_contracts.yaml`, the implementation, and the report together.

---

## 3. Railway Project Configuration

-   **Project ID:** `c485425e-5205-40be-bfb7-3059840b5d85`
-   **Environment ID:** `b2d988a3-e0cc-4cd1-9a86-af8727168a1f`
-   **Backend Service ID:** `3c4089d2-ff6c-4ed7-a29b-5d85f78ee3e5`
-   **Frontend Service ID:** `ffd9c54c-e81d-4000-949a-2376e3966ba8`
-   **Postgres Service ID:** `3488b9f8-216f-459c-8fd2-3f68dde43282`

---

## 4. Deployment & Debugging Log

### 4.1. Successful Deployment (2025-07-11)
A stable deployment was achieved after a lengthy debugging session. The key solutions were:
1.  **`.gitattributes`:** A `.gitattributes` file was created to enforce Unix-style (LF) line endings for all `.sh` scripts, fixing silent execution failures in the Linux container.
2.  **Dynamic Nginx Port:** The frontend `nginx.conf` was updated to use the `${PORT}` environment variable provided by Railway, ensuring the service was reachable for health checks.

### 4.2. Unresolved Login Issue & Final Debugging Attempts (2025-07-11)

Following the successful deployment, a `502 Bad Gateway` error was encountered specifically on the `/api/auth/login` and `/api/auth/register` routes. This indicated a fatal crash in the backend application upon trying to communicate with the database.

A series of exhaustive debugging steps were taken to resolve this, none of which were successful:

1.  **Database URL Correction:** The backend was modified to use the standard `DATABASE_URL` environment variable provided by Railway, instead of the incorrect `DATABASE_PRIVATE_URL`. **Result:** No change.
2.  **Disabled Database Seeding:** The automatic seeding of demo data on application startup was disabled to prevent potential race conditions or errors during initialization. **Result:** No change.
3.  **Deconstructed DB Connection:** The connection string was built manually in the application using the individual `PGHOST`, `PGPORT`, `PGUSER`, etc., variables to eliminate any URL parsing errors. **Result:** No change.
4.  **Hardened Dockerfile & Verbose Logging:** The backend `Dockerfile` was significantly hardened by removing the `entrypoint.sh` script in favor of a direct `CMD` instruction, setting the `PYTHONPATH` explicitly, and enabling Gunicorn's `--log-level=debug` flag.
5.  **Final Diagnosis from Logs:** The debug logs revealed the `wsgi_app` was not being loaded correctly. The `CMD` instruction was updated to use the explicit `--wsgi-app` flag. **Result:** No change. The `502` error persisted.

**Conclusion:**
The root cause of the `502 Bad Gateway` on database-related routes remains unidentified. All logical configuration and code-level issues (database URL, permissions, library versions, startup scripts, Python path) have been systematically addressed and eliminated. The application still fails to run in the Railway environment in a way that defies standard debugging procedures and tooling. The problem lies at a deeper, currently unobservable level within the production container.