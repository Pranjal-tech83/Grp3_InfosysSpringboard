# Connection Setup: Vercel (Frontend) to Render (Backend) & Database

We have implemented a dynamic, robust setup to connect the **FastAPI backend (Render)** with the **React/Vanilla HTML frontend (Vercel)** and the database.

Here is a summary of the changes and the configuration steps.

---

## 🛠️ Changes Implemented

### 1. Dynamic Frontend Environment Detection
We created a central configuration file at [config.js](file:///c:/Users/pranj/OneDrive/Desktop/Grp3_InfosysSpringboard/frontend/js/config.js).
- It automatically routes requests to the local backend `http://127.0.0.1:8000` when running locally (whether via `localhost`, `127.0.0.1`, VS Code Live Server, or opening files directly via the `file://` protocol).
- If running on a production URL, it dynamically routes API requests and WebSocket streams to the deployed Render backend URL.
- We updated all frontend files to use this dynamic global config instead of hardcoded backend URLs.

### 2. Auto-Routing for Vercel
We created a root-level [vercel.json](file:///c:/Users/pranj/OneDrive/Desktop/Grp3_InfosysSpringboard/vercel.json) file.
- If you deploy the root repository directly to Vercel, it automatically redirects and rewrites all routes (including assets, css, js, employee dashboard, etc.) to the `/frontend` directory. 
- You don't have to change Vercel's root directory settings; it works **out of the box**.

### 3. Database Connectivity on Render (PostgreSQL Support)
- We added `psycopg2-binary` to [requirements.txt](file:///c:/Users/pranj/OneDrive/Desktop/Grp3_InfosysSpringboard/backend/requirements.txt). This allows SQLAlchemy to connect to Postgres instances (e.g. Render Postgres) using a `postgresql://` connection string.
- We fixed a major bug in the AI Triage router [triage_router.py](file:///c:/Users/pranj/OneDrive/Desktop/Grp3_InfosysSpringboard/backend/app/routers/triage_router.py) where writing to local SQLite file was not optional. In a cloud environment, if that local write failed, it was discarding the real LLaMA 3.2 AI triage result and always returning a hardcoded fallback. The SQLite write is now optional and runs inside a safe try-catch wrapper.

---

## 🚀 How to Deploy & Connect (Step-by-Step)

### Step 1: Deploy Backend to Render
1. In your Render Dashboard, click **New** -> **Web Service**.
2. Select your repository.
3. Configure the following settings:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Create a **Render PostgreSQL database** in the same region.
5. In your Web Service settings under **Environment**, add:
   - `DATABASE_URL`: paste the Internal Database URL of your Render PostgreSQL.
   - `JWT_SECRET`: a secure random string.
   - `BREVO_API_KEY`: (from your Brevo email account).

### Step 2: Deploy Frontend to Vercel
1. In Vercel, click **Add New** -> **Project**.
2. Select your repository.
3. Vercel will automatically read the root-level [vercel.json](file:///c:/Users/pranj/OneDrive/Desktop/Grp3_InfosysSpringboard/vercel.json) and deploy the frontend directory.
4. *(Optional)* If your Render URL is different from `https://grp3-infosysspringboard.onrender.com`, update it in [config.js](file:///c:/Users/pranj/OneDrive/Desktop/Grp3_InfosysSpringboard/frontend/js/config.js) before pushing.
