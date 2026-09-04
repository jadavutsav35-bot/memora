# Memora — Full-Stack Starter

Private collaborative memory platform: users create private albums, invite members, and share memories.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- Auth: JWT + bcrypt
- Media: local `/uploads` in development (swap for S3/Cloudinary in production)

## Run

### 1. Database
Create a PostgreSQL database named `memora`, then run:

```bash
psql -U postgres -d memora -f backend/schema.sql
```

### 2. Backend
```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

### 3. Frontend
In another terminal:
```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

## Environment
Backend `.env`:
- `PORT=5000`
- `DATABASE_URL=postgresql://postgres:password@localhost:5432/memora`
- `JWT_SECRET=change-this-secret`
- `CLIENT_URL=http://localhost:5173`

## API
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/albums`
- POST `/api/albums`
- GET `/api/albums/:id`
- POST `/api/albums/:id/memories`
- GET `/api/albums/:id/memories`
- POST `/api/memories/:id/comments`
- POST `/api/memories/:id/reactions`
- POST `/api/albums/:id/invite`

The authorization middleware checks album membership before private album/memory access.

## Production next steps
Replace local uploads with object storage, add refresh-token rotation, email invitations, rate limiting, validation, virus scanning, image/video processing, backups, audit logs and HTTPS.
