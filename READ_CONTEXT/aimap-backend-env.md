# AIMAP Backend — Biến môi trường

**Nguồn mẫu (chạy trực tiếp backend):** [aimap/backend/.env.example](../aimap/backend/.env.example) — copy thành `aimap/backend/.env` và điền giá trị thật.

**Docker/Production (docker compose):** dùng file `aimap/.env` (nguồn mẫu: [aimap/.env.example](../aimap/.env.example)).
Compose sẽ inject biến vào container backend (không dùng `aimap/backend/.env`).

**Không commit** file `.env` lên git. Khi thêm biến env mới trong code backend, cập nhật `.env.example` và bảng dưới đây.

| Biến | Mục đích |
|------|----------|
| `NODE_ENV` | `development` / `production` |
| `PORT` | Cổng HTTP backend (mặc định 4111) |
| `TRUST_PROXY` | `1` hoặc `true` nếu sau reverse proxy (IP client) |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL |
| `DATABASE_SSL` | Khác `false` → bật SSL tới DB |
| `JWT_SECRET` | Ký JWT |
| `JWT_EXPIRES_IN` | Thời hạn token (vd. `7d`) |
| `FRONTEND_URL` | Origin frontend — CORS + link trong email |
| `SMTP_*`, `MAIL_FROM` | Gửi email verify / reset password |
| `OPENAI_API_KEY` | Tạo ảnh nhánh GPT |
| `OPENAI_IMAGE_MODEL` | `gpt-image-1.5` (khuyến nghị) hoặc `dall-e-3` |
| `GEMINI_API_KEY` | Tạo ảnh nhánh Gemini / Imagen |
| `GEMINI_IMAGEN_MODEL` | Imagen qua API predict (vd. `imagen-3.0-generate-002`) |
| `GEMINI_USE_IMAGEN` | `false` để bỏ qua Imagen, chỉ native Gemini image |
| `GEMINI_IMAGE_MODEL` | Fallback generateContent + IMAGE |
| `ASSET_STORAGE_PATH` | Thư mục lưu file ảnh shop |
| `API_PUBLIC_URL` | URL **gốc** backend **không** có `/api` — dùng cho link ảnh `/uploads/...` trong DB |

**Frontend:** `VITE_API_URL` trong `aimap/frontend/.env` phải trỏ tới API có suffix `/api`, vd. `http://localhost:4111/api`. Không nhầm với `API_PUBLIC_URL`.

**Ghi chú Docker/Production:**
- Backend thường gọi DB theo `DATABASE_URL` trong `aimap/.env`.
- Nếu chạy sau reverse proxy (Nginx/Caddy) nên set `TRUST_PROXY=1` để log IP đúng.
