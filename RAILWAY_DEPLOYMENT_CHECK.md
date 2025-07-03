# Railway Deployment Check voor Final CRM

## ✅ Backend Requirements

### Dockerfile ✓
- Python 3.11 slim image
- Requirements.txt aanwezig
- Health check endpoint op `/health`
- Gunicorn in requirements

### Database ✓
- PostgreSQL configuratie via DATABASE_URL
- Schema file aanwezig
- SQLAlchemy models

### Environment Variables Nodig:
```
DATABASE_URL=<Railway PostgreSQL URL>
SECRET_KEY=<genereer veilige key>
JWT_SECRET_KEY=<genereer veilige key>
FLASK_ENV=production
CORS_ORIGINS=https://<je-frontend-url>.up.railway.app
```

## ✅ Frontend Requirements

### Dockerfile ✓
- Node 18 alpine voor build
- Nginx voor serving
- Build process configured

### Environment Variables Nodig:
```
VITE_API_URL=https://<je-backend-url>.up.railway.app/api
```

## 🔧 Railway Setup Stappen

### 1. Backend Service
```bash
# In Railway project:
1. New Service > GitHub Repo > final-crm-backend folder
2. Add PostgreSQL database
3. Set environment variables (zie boven)
4. Deploy settings:
   - Root Directory: /final-crm-backend
   - Build Command: (default)
   - Start Command: gunicorn -b 0.0.0.0:$PORT src.main:app
```

### 2. Frontend Service
```bash
1. New Service > GitHub Repo > final-crm-frontend folder
2. Set environment variables
3. Deploy settings:
   - Root Directory: /final-crm-frontend
   - Build Command: npm run build
   - Start Command: (gebruik Dockerfile)
```

## ⚠️ Aandachtspunten

### 1. Gunicorn Start Command
Backend Dockerfile gebruikt Flask development server. Voor productie:

```dockerfile
# Voeg toe aan backend Dockerfile:
CMD ["gunicorn", "-b", "0.0.0.0:5000", "src.main:app"]
```

### 2. Frontend API URL
Check of frontend correct gebouwd wordt met VITE_API_URL:

```javascript
// In api.js moet staan:
baseURL: import.meta.env.VITE_API_URL || '/api'
```

### 3. Database Initialisatie
Na eerste deploy, run in Railway:
```bash
railway run python -c "from src.models.database import db; db.create_all()"
```

## 🚀 Deployment Ready?

**Bijna!** Alleen deze kleine aanpassingen nodig:

1. **Backend**: Wijzig CMD in Dockerfile naar gunicorn
2. **Frontend**: Zorg dat VITE_API_URL environment variable werkt
3. **Database**: Plan voor schema initialisatie

De applicatie is verder deployment-ready!
