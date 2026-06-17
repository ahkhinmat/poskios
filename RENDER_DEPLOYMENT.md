# Render Deployment Guide — POS Kiosk

> Hướng dẫn deploy POS Kiosk lên Render (PaaS free tier) với PostgreSQL.

## Architecture

```
GitHub (proV1)
  ├── Render Web Service (backend)  →  Render PostgreSQL (database)
  └── Render Static Site (frontend) →  gọi backend qua API URL
```

## Prerequisites

- Tài khoản [Render](https://dashboard.render.com)
- Repository GitHub: `ahkhinmat/poskios`, branch `proV1`
- Backend Dockerfile tại `backend/Dockerfile`
- Frontend build output tại `frontend/dist/`

---

## 1. Render PostgreSQL

Tạo database miễn phí (1GB):

| Field | Value |
|---|---|
| Name | `poskios-db` |
| Database | `poskios` |
| User | `poskios_user` |
| Region | `Singapore (Southeast Asia)` |
| PostgreSQL Version | 16 |

Sau khi tạo, copy **Internal Database URL** và **External Database URL**.

### Init schema

Chạy script init trên external DB:

```bash
# Dùng Docker container (không cần psql local)
docker run -i --rm postgres:16-alpine psql \
  "postgresql://<user>:<password>@<host>:5432/<db>" \
  < docs/postgres-init.sql
```

Script `docs/postgres-init.sql` sẽ:
- DROP tất cả tables (CASCADE)
- CREATE lại toàn bộ schema
- Seed 2 roles (MANAGER, STAFF), 1 setting, 2 users

### Migrate data từ local lên Render

```bash
# Pipe trực tiếp từ Docker local → Render (dùng cmd /c trên Windows để tránh lỗi encoding)
cmd /c "docker compose exec -T postgres pg_dump -U postgres -d poskios --data-only --no-owner 2>nul | docker run -i --rm postgres:16-alpine psql ""<external-db-url>"" -v ON_ERROR_STOP=0 2>&1"
```

Lưu ý: không pipe qua PowerShell (sẽ hỏng encoding tiếng Việt). Dùng `cmd /c`.

---

## 2. Render Web Service (Backend)

| Field | Value |
|---|---|
| Name | `poskios-backend` |
| Runtime | `Docker` |
| Repository | `ahkhinmat/poskios` |
| Branch | `proV1` |
| Root Directory | `backend` |
| Region | `Singapore` |
| Plan | Free |

### Environment Variables

| Variable | Value | Notes |
|---|---|---|
| `DB_HOST` | Internal DB host (e.g. `dpg-xxx.singapore-postgres.render.com`) | |
| `DB_PORT` | `5432` | |
| `DB_USERNAME` | `poskios_user` | |
| `DB_PASSWORD` | Database password | |
| `DB_NAME` | `poskios` | |
| `JWT_SECRET` | Random long string (ít nhất 32 ký tự) | **Bắt buộc** |
| `JWT_EXPIRES_IN` | `8h` | |
| `PORT` | `3000` | Render tự map port |
| `NODE_VERSION` | `20` | |
| `CORS_ORIGIN` | `https://poskios-frontend.onrender.com` | Frontend URL |

> `CORS_ORIGIN` có thể chứa nhiều origin, cách nhau bằng dấu phẩy.

### Health Check

Backend tự động health check tại `/api/v1/auth/login` (trả về 400 nếu không có body → OK).

### Cold Start

Render free tier sẽ sleep sau 30p không hoạt động. Dùng cron-job.org để ping mỗi 5 phút:

1. Đăng ký tại https://console.cron-job.org/signup
2. Vào Settings → copy API Key
3. Tạo cron job:

```bash
curl -X PUT \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <api-key>' \
  -d '{"job":{"url":"https://poskios-backend.onrender.com/api/v1/auth/login","enabled":true,"saveResponses":false,"schedule":{"timezone":"Asia/Ho_Chi_Minh","expiresAt":0,"hours":[-1],"mdays":[-1],"minutes":[0,5,10,15,20,25,30,35,40,45,50,55],"months":[-1],"wdays":[-1]}}}' \
  https://api.cron-job.org/jobs
```

---

## 3. Render Static Site (Frontend)

| Field | Value |
|---|---|
| Name | `poskios-frontend` |
| Runtime | `Static Site` |
| Repository | `ahkhinmat/poskios` |
| Branch | `proV1` |
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `frontend/dist` |
| Region | `Singapore` |

### Environment Variables

| Variable | Value | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `https://poskios-backend.onrender.com/api/v1` | URL backend **có** `/api/v1` |

> Không dùng Docker cho frontend trên Render vì nginx `proxy_pass` gây lỗi với Static Site.

### Build cache

Sau lần build đầu, build thường mất ~30-60s. Render cache `node_modules`.

---

## 4. Post-Deploy Checklist

- [ ] Login: `POST /api/v1/auth/login` với `{"username":"manager01","password":"manager123"}` → token
- [ ] Products: `GET /api/v1/pos/products/manage?page=1&pageSize=3` → danh sách
- [ ] Frontend: vào URL frontend → đăng nhập → xem dashboard
- [ ] CORS: kiểm tra browser console không có lỗi CORS
- [ ] In hóa đơn: checkout thử → modal hiển thị đúng tiêu đề "HÓA ĐƠN BÁN HÀNG"
- [ ] cron-job.org: backend ping mỗi 5 phút

---

## 5. Troubleshooting

### Backend crash-loop

Kiểm tra logs trên Render Dashboard. Các lỗi thường gặp:

| Error | Cause | Fix |
|---|---|---|
| `Missing required environment variable: JWT_SECRET` | Thiếu env var | Set JWT_SECRET, save, chờ restart |
| `ECONNREFUSED` | Sai DB_HOST/DB_PORT | Kiểm tra Internal Database URL |
| `password authentication failed` | Sai DB_USERNAME/DB_PASSWORD | Copy đúng từ Render PostgreSQL |
| `relation "Roles" does not exist` | Chưa chạy init SQL | Chạy `docs/postgres-init.sql` |

### CORS error on frontend

Frontend gọi backend → browser báo lỗi CORS:

1. Vào backend Service → Environment
2. Thêm/sửa `CORS_ORIGIN` = `https://poskios-frontend.onrender.com`
3. Save → chờ restart

### Encoding error khi migrate data

PowerShell pipe sẽ hỏng encoding tiếng Việt. Luôn dùng `cmd /c`:

```powershell
# Sai (hỏng tiếng Việt)
docker compose exec -T postgres pg_dump ... | docker run ... psql ...

# Đúng
cmd /c "docker compose exec -T postgres pg_dump ... 2>nul | docker run ... psql ""<url>"" 2>&1"
```

### Manual Redeploy

Vào Render Dashboard → chọn service → **Manual Deploy** → **Deploy latest commit**.

---

## 6. Local Development (Docker)

```bash
# Khởi động toàn bộ stack
docker compose up -d

# Frontend: http://localhost:80
# Backend:  http://localhost:3001/api/v1

# Xem logs backend
docker compose logs -f backend

# Xem logs frontend
docker compose logs -f frontend

# Truy cập PostgreSQL
docker compose exec -it postgres psql -U postgres -d poskios

# Xóa toàn bộ dữ liệu và restart
docker compose down -v && docker compose up -d
```

## 7. URLs

| Service | URL |
|---|---|
| Render PostgreSQL (external) | `postgresql://<user>:<pass>@<host>.singapore-postgres.render.com/poskios` |
| Backend API | `https://poskios-backend.onrender.com/api/v1` |
| Frontend | `https://poskios-frontend.onrender.com` |
| GitHub | `https://github.com/ahkhinmat/poskios/tree/proV1` |
