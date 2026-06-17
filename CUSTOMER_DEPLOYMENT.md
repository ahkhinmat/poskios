# KA MART Customer Deployment (On-Premise SQL Server)

> ⚠️ Đã chuyển sang PostgreSQL + Docker + Render cloud. Xem [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) cho bản mới.

## Thu muc can copy sang may khach

Copy nguyen thu muc du an da build san, bao gom toi thieu:

- `backend/dist`
- `backend/node_modules`
- `backend/.env`
- `frontend/dist`
- `nginx.conf`
- `ecosystem.config.cjs`
- `start.bat`
- `stop.bat`
- `status.bat`
- `deploy.bat`

May khach khong can `git clone`, `git pull`, `npm install`, `npm run build`.

## Yeu cau tren may khach

- `D:\nginx`
- `Node.js`
- `PM2`
- `SQL Server`

## Cau hinh backend

Tao file `backend/.env` theo mau sau:

```env
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASSWORD=abc1234!
DB_NAME=POS
DB_ENCRYPT=false
DB_TRUST_CERT=true
PORT=3000
JWT_SECRET=doi-thanh-chuoi-ngau-nhien-dai
JWT_EXPIRES_IN=8h
```

## Khoi tao database vi may khach chua co POS

Chay theo thu tu:

1. Chay [docs/sqlserver-create-pos-db.sql](/d:/React/poskios/docs/sqlserver-create-pos-db.sql)
2. Chay [docs/sqlserver-mvp-schema.sql](/d:/React/poskios/docs/sqlserver-mvp-schema.sql)
3. Neu can user test, chay [docs/sqlserver-seed-test-users.sql](/d:/React/poskios/docs/sqlserver-seed-test-users.sql)
   - Manager test: `manager01` / `manager123`
   - Staff test: `staff01` / `staff123`

Neu DB da ton tai tu ban cu, chay them [docs/sqlserver-alter-product-variant-group.sql](/d:/React/poskios/docs/sqlserver-alter-product-variant-group.sql) truoc khi import lai Excel.

## Khoi dong he thong

1. Chay [deploy.bat](/d:/React/poskios/deploy.bat) de copy frontend va restart he thong
2. Neu chi muon mo lai he thong, chay [start.bat](/d:/React/poskios/start.bat)
3. Kiem tra trang thai bang [status.bat](/d:/React/poskios/status.bat)
4. Dung he thong bang [stop.bat](/d:/React/poskios/stop.bat)

## Tu khoi dong lai sau reboot

Sau khi he thong da chay on dinh, chay:

1. [pm2-startup.bat](/d:/React/poskios/pm2-startup.bat)
2. Neu co thay doi process PM2 sau nay, chay lai [pm2-save.bat](/d:/React/poskios/pm2-save.bat)

## Dong goi ban giao

Neu muon tao thu muc copy sang may khach, chay [package-release.bat](/d:/React/poskios/package-release.bat).
Script se tao thu muc `release\ka-mart-pos`.

## URL

- Frontend: `http://localhost`
- Backend: `http://localhost:3000/api/v1`

## ACC login

manager01 / manager123
staff01 / staff123
