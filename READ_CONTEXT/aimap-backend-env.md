# AIMAP — Biến môi trường

**File env duy nhất cần quản:** **`aimap/.env`** — đồng bộ VPS / máy dev / Docker. Backend nạp qua `aimap/backend/loadEnv.js` (import đầu `index.js`). Frontend Vite đọc cùng file (`envDir` trỏ thư mục `aimap/` trong `vite.config.ts`).

**Không commit** file `.env` lên git. Khi thêm biến env mới trong code, cập nhật bảng dưới và (nếu có) `aimap/backend/danhsach_API.md`.

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
| `CREDIT_VND_RATE` | Số VND cho 1 credit khi tạo đơn nạp (mặc định `1000`) |
| `IMAGE_GENERATE_CREDIT_COST` | Trừ credit mỗi variant ảnh image bot (mặc định `1`) |
| `PAYMENT_PROVIDER` | Không dùng để auto-success; luồng production xác nhận qua webhook VietQR API Service |
| `PAYMENT_POLL_ENABLED` | `0` = tắt vòng poll nền |
| `PAYMENT_POLL_INTERVAL_MS` | Chu kỳ poll (mặc định `15000`) |
| `PAYMENT_EXPIRY_MINUTES` | Hết hạn đơn pending (mặc định `30`) |
| `PAYMENT_MIN_AMOUNT_VND` | Tối thiểu số tiền mỗi lần tạo intent (mặc định `10000`) |
| `PAYMENT_METHOD_VIETQR` | `0` = ẩn VietQR dù đã cấu hình BIN/tài khoản |
| `VIETQR_BANK_BIN` | Mã BIN ngân hàng (6 số) — sinh URL ảnh QR `img.vietqr.io` |
| `VIETQR_ACCOUNT_NO` | Số tài khoản nhận (không khoảng trắng) |
| `VIETQR_WEBHOOK_BEARER` | (Tuỳ chọn) Nếu set, `POST /api/webhooks/vietqr` yêu cầu `Authorization: Bearer <giá trị>` |
| `VIETQR_CLIENT_USERNAME` | (Tuỳ chọn) Username Basic Auth phía khách hàng cấu hình trong VietQR API Service |
| `VIETQR_CLIENT_PASSWORD` | (Tuỳ chọn) Password Basic Auth phía khách hàng cấu hình trong VietQR API Service |
| `VIETQR_CALLBACK_SECRET` | (Tuỳ chọn) Secret để verify trường `sign` callback VietQR (nếu tài khoản có bật) |
| `VIETQR_CLIENT_TOKEN_TTL_SEC` | TTL token cấp bởi endpoint `POST /vqr/api/token_generate` (mặc định `900` giây) |
| `FACEBOOK_APP_ID` | Meta App ID — OAuth + so khớp app id bài post (`canEditViaApi`). Fallback trong code: `FB_APP_ID`, `META_APP_ID` |
| `FACEBOOK_APP_SECRET` | App Secret — đổi code/token. Fallback: `FB_APP_SECRET` |
| `FACEBOOK_GRAPH_VERSION` | Graph API (mặc định `v20.0`) |
| `FACEBOOK_OAUTH_SCOPES` | Chuỗi scope OAuth (không khoảng trắng). Fallback: `FB_OAUTH_SCOPES`; mặc định trong `facebookEnv.js` |
| `FACEBOOK_OAUTH_REDIRECT_URI` | Callback backend — khớp Meta → Valid OAuth Redirect URIs |
| `VITE_FACEBOOK_APP_ID` | Cùng App ID — bật Facebook JS SDK khi build/dev |
| `VITE_API_URL` | Base API có `/api` (vd. `http://localhost:4111/api`) — Vite đọc từ `aimap/.env` |
| `MARKETING_AI_BASE_URL` | URL Ollama trên VPS (vd. `http://IP:11434`) — tóm tắt comment / đánh giá bài / AI assist; không set → API vẫn chạy, phần AI trả placeholder |
| `MARKETING_AI_MODEL` | Tên model Ollama (mặc định `qwen2.5:7b`) |
| `MARKETING_AI_TIMEOUT_MS` | Timeout gọi Ollama (mặc định `45000`) |
| `WEBSITE_AI_PROVIDER` | Provider cho website builder: `openai` / `ollama` / `auto` (mặc định `auto` — ưu tiên OpenAI nếu có `OPENAI_API_KEY`, không thì Ollama) |
| `WEBSITE_AI_MODEL` | Tên model theo provider (OpenAI: `gpt-4o-mini`; Ollama: `qwen2.5:7b`) |
| `WEBSITE_AI_TIMEOUT_MS` | Timeout gọi AI (mặc định `60000` ms) |
| `WEBSITE_AI_BASE_URL` | URL Ollama server — chỉ dùng khi `WEBSITE_AI_PROVIDER=ollama`; fallback `MARKETING_AI_BASE_URL` |
| `WEBSITE_PUBLIC_BASE_DOMAIN` | Domain gốc public website shop (mặc định `captone2.site`), dùng build host `slug.domain` trong website module |
| `WEBSITE_PREVIEW_BASE_URL` | Base URL preview website (mặc định `https://preview.captone2.site`), backend build `.../sites/:shopId` |
| `MARKETING_MODEL_PROVIDER` | (Tùy module khác) Provider text marketing `openai` / `gemini` nếu có route tách |
| `MARKETING_OPENAI_MODEL` | Model OpenAI cho draft content (vd. `gpt-4o-mini`) |
| `MARKETING_GEMINI_MODEL` | Model Gemini cho draft content (vd. `gemini-2.5-flash`) |

**Facebook (đồ án, tối thiểu trong `aimap/.env`):** `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_GRAPH_VERSION`, `FACEBOOK_OAUTH_SCOPES`, `FACEBOOK_OAUTH_REDIRECT_URI`, `VITE_FACEBOOK_APP_ID`. Tuỳ chọn: `VITE_FACEBOOK_OAUTH_SCOPES`, `VITE_FACEBOOK_GRAPH_VERSION`, `VITE_FACEBOOK_LOGIN_CONFIG_ID` (fallback tên `VITE_FB_*` trong code).

**OAuth scope mặc định** (khi không set `FACEBOOK_OAUTH_SCOPES`): `public_profile`, `email`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts` — xem `aimap/backend/services/facebookEnv.js`. Cần KPI insights Graph → thêm `read_insights` (và thường `pages_manage_engagement`) vào chuỗi scope.

**Ghi chú Docker/Production:**
- Backend + Vite đều đọc **`aimap/.env`**.
- Nếu chạy sau reverse proxy (Nginx/Caddy) nên set `TRUST_PROXY=1` để log IP đúng.
- Để VietQR API Service test pass E05: frontend nginx phải proxy thêm đường dẫn `/vqr` về backend.
