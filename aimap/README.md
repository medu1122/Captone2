# AIMAP – Bộ khung dự án

Cấu trúc folder và config đã sẵn sàng. Chưa có code nghiệp vụ.

## Cấu trúc

- **frontend/** – React + Vite, Dashboard (components, pages, api client)
- **backend/** – Express API, routes, services, agents, lib, templates, db, schemas
- **docker/** – shop-image (Nginx static), proxy

## Chạy nhanh

1. **Biến môi trường:** Copy `aimap/.env.example` → `aimap/.env` và `aimap/backend/.env.example` → `aimap/backend/.env`, điền giá trị nếu cần.

2. **Backend:**
   ```bash
   cd aimap/backend && npm run dev
   ```
   API: http://localhost:4000, health: http://localhost:4000/health

3. **Frontend:**
   ```bash
   cd aimap/frontend && npm run dev
   ```
   UI: http://localhost:3000

## Config đã có

- `aimap/.env.example` – biến môi trường gợi ý (DB, AI, Meta, Docker, storage)
- `aimap/backend/.env.example` – biến backend
- `aimap/frontend/vite.config.ts` – Vite, proxy `/api` → backend
- `aimap/frontend/tsconfig.json` + `tsconfig.node.json`
- `aimap/frontend/.eslintrc.cjs`, `aimap/backend/.eslintrc.cjs`
- `aimap/docker/shop-image/Dockerfile` – Nginx serve static 1 shop

Tiếp theo: implement routes, services, agents và UI trong từng folder tương ứng.
