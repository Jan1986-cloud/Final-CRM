# Gemini Workspace Configuration & Deployment Log

This file provides an overview of the project configuration and a detailed log of the debugging and deployment process.

## Project Overview

This is a full-stack CRM application with a React frontend and a Python/Flask backend, deployed on Railway.

-   **Frontend:** `frontend/` - React, Vite, Nginx
-   **Backend:** `backend/` - Python, Flask, Gunicorn

## API Naming & Contract Consistency

To prevent deployment failures and runtime errors due to naming inconsistencies, this project now follows a strict "contract-first" development workflow.

**The Single Source of Truth:**
The `api_contracts.yaml` file is the definitive "heilige graal" for all API endpoint definitions. It contains the formal contract, including paths, methods, and the schemas for all requests and responses.

**The Guardian:**
The `consistency_checker.py` script is the automated guardian of this contract. It programmatically validates the backend's implementation against the `api_contracts.yaml` file.

### Mandatory Development Workflow

**ALL** new feature development or modification of existing endpoints **MUST** follow this process:

1.  **Define the Contract First:** Before writing any implementation code, define or update the endpoint's contract in `api_contracts.yaml`. This includes the request body, response body, and all expected fields.
2.  **Implement the Feature:** Write the backend and frontend code to match the contract you just defined.
3.  **Run the Consistency Check:** Before committing, run the guardian script from the project root:
    ```bash
    python consistency_checker.py
    ```
4.  **Verify the Report:** The script will generate a `consistency_report.md`. If there are any failures, go back to step 2 and fix the implementation to match the contract. **DO NOT** modify the contract to match a broken implementation.
5.  **Commit:** Once the consistency check passes, commit the changes to `api_contracts.yaml`, the implementation files, and the updated `consistency_report.md` together.

By adhering to this process, we can guarantee that naming and structural inconsistencies will no longer be a source of errors in this project.

---

## Railway Project Configuration

-   **Project ID:** `c485425e-5205-40be-bfb7-3059840b5d85`
-   **Environment ID:** `b2d988a3-e0cc-4cd1-9a86-af8727168a1f`
-   **Backend Service ID:** `3c4089d2-ff6c-4ed7-a29b-5d85f78ee3e5`
-   **Frontend Service ID:** `ffd9c54c-e81d-4000-949a-2376e3966ba8`
-   **Postgres Service ID:** `3488b9f8-216f-459c-8fd2-3f68dde43282`

---

## Deployment Debugging Log (2025-07-11)

This log details the extensive debugging process required to achieve a successful deployment on Railway.

### Initial State & Objective

-   **Objective:** Synchronize the local repository with the `Jan1986-cloud/Final-CRM` GitHub repository and achieve a stable deployment on Railway.
-   **Initial Problem:** The local directory was not a Git repository, and multiple deployment-related issues were uncovered.

### Step-by-Step Debugging Chronology

1.  **Git Initialization:**
    -   **Action:** Initialized a new Git repository, added the remote origin, and performed a hard reset to match the remote `main` branch.
    -   **Result:** The local codebase was successfully synced with the GitHub repository.

2.  **First Deployment Attempt & Backend Fix:**
    -   **Symptom:** The backend deployment failed to start, with logs showing `exec container process: /entrypoint.sh: No such file or directory`.
    -   **Hypothesis:** The `entrypoint.sh` script was either missing or had incorrect permissions.
    -   **Investigation:** Confirmed the file existed and had the correct `ENTRYPOINT` instruction in the `Dockerfile`. The error was misleading.
    -   **Revised Hypothesis:** The script's line endings were incorrect (CRLF from Windows instead of the required LF for Linux).
    -   **Action:** Converted the line endings of `backend/entrypoint.sh` to LF.
    -   **Result:** The backend service deployed successfully.

3.  **Frontend Deployment Failures & Misleading Clues:**
    -   **Symptom:** The frontend service repeatedly failed its health check (`service unavailable`) despite successful builds.
    -   **Investigation 1: `railway.json`:** Identified and corrected a misconfiguration in `frontend/railway.json` where the builder was set to `NIXPACKS` instead of `DOCKERFILE`.
    -   **Result 1:** Failure persisted. This was a necessary fix but not the root cause.
    -   **Investigation 2: Malformed `BACKEND_URL`:** The deployment logs revealed a trailing semicolon (`;`) in the `$BACKEND_URL` environment variable (`https://...app;`).
    -   **Hypothesis:** This semicolon was breaking the `proxy_pass` directive in Nginx.
    -   **Action (Multiple Attempts):** A series of increasingly robust attempts were made to remove the semicolon from the variable *inside* the `entrypoint.sh` script using `sed`, `awk`, and POSIX parameter expansion.
    -   **Result (Multiple Attempts):** All attempts failed. The logs showed that the variable remained unchanged, indicating a fundamental issue with how the variable was being passed into the container's environment.
    -   **Investigation 3: Nginx Configuration:** An attempt was made to handle the malformed URL directly within `nginx.conf` using an `if` block.
    -   **Result 3:** This failed with an `unknown "backend_url" variable` error due to incorrect variable scoping within Nginx.

### The Root Cause & The Definitive Solution

After multiple failed attempts, a deeper analysis revealed two core, interacting problems:

1.  **The Silent Killer - Line Endings:** The primary, underlying issue was the line endings of `frontend/entrypoint.sh`. Despite my previous fix for the backend script, I had not yet addressed the root cause for all scripts. The Git client was likely converting LF line endings to CRLF on checkout, rendering the script un-executable by the Linux container, causing it to fail silently before Nginx could even properly start.
2.  **The Red Herring - Port Mapping:** The secondary issue, which became apparent only after the line endings were fixed, was the Nginx port configuration. Railway provides a dynamic `$PORT` environment variable that the web server must listen on. The `nginx.conf` was hardcoded to listen on port 80, causing it to be unreachable by Railway's health checker.

**The Final, Successful Fix:**

1.  **`.gitattributes`:** A `.gitattributes` file was created in the root of the project with the rule `*.sh eol=lf`. This enforces Unix-style line endings for all shell scripts across all environments, permanently solving the line-ending problem.
2.  **Dynamic Port in Nginx:** The `frontend/nginx.conf` was modified to listen on `${PORT}`.
3.  **Robust `entrypoint.sh`:** The `frontend/entrypoint.sh` was updated to use `envsubst` to substitute the dynamic `${PORT}` variable into the Nginx configuration before starting the server.

This combination addressed both root causes, resulting in a successful and stable deployment.
