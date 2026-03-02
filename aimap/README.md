# AIMAP – Bộ khung dự án

Cấu trúc folder và config đã sẵn sàng. Backend + Frontend có thể chạy trực tiếp hoặc **đóng gói Docker**.

---

## Chạy bằng Docker (khuyến nghị cho production / VPS)

**Yêu cầu:** Docker và Docker Compose đã cài.

1. **Tạo file môi trường** (nếu chưa có):
   ```bash
   cd aimap
   copy .env.example .env
   ```
   Chỉnh `.env` nếu cần (PORT, DATABASE_URL, ...).

2. **Build và chạy:**
   ```bash
   docker compose up --build
   ```

3. **Truy cập:**
   - **Giao diện (Frontend):** http://localhost:3000  
   - **API (Backend):** http://localhost:4000  
   - Health check: http://localhost:4000/health  

4. **Dừng:** `Ctrl+C` hoặc `docker compose down`.

**Cấu trúc Docker:**
- **backend:** Image Node 20 Alpine, chạy `node index.js`, expose 4000.
- **frontend:** Build Vite (React) → Nginx Alpine serve static, proxy `/api` → backend, expose 80 (map ra 3000).

---

## Chạy không Docker (development)

1. **Backend:**
   ```bash
   cd aimap/backend
   npm install
   copy .env.example .env
   npm run dev
   ```
   API: http://localhost:4000

2. **Frontend:**
   ```bash
   cd aimap/frontend
   npm install
   npm run dev
   ```
   UI: http://localhost:3000 (proxy `/api` → 4000).

---

## Cấu trúc thư mục

- **frontend/** – React + Vite (Dashboard)
- **backend/** – Express API (routes, services, agents, lib, db)
- **docker/** – shop-image (Nginx 1 shop), proxy
- **docker-compose.yml** – Chạy backend + frontend bằng Docker
