# Website Backend Requirements (Sprint 3, bám Project Plan)

Nguồn bám theo:
- `READ_CONTEXT/AIMAP-Project-Plan-Schedule.md` (Sprint 3: P3.1 -> P3.10)
- `LIST USE CASE/LISTvn.md` (Website builder + Deploy hosting)
- `LIST USE CASE/Product-Backlog.md` (P3.1 -> P3.10)
- `READ_CONTEXT/AIMAP-Architecture-VN.md` (1 shop = 1 container, reverse proxy)
- `READ_CONTEXT/database_design.md` (`sites`, `conversation_messages`, `site_deployments`)
- `READ_CONTEXT/aimap-backend-env.md` (PORT, API_PUBLIC_URL, ASSET_STORAGE_PATH, TRUST_PROXY)
- `READ_CONTEXT/Cau_truc_folder.md` (routes/services/lib/templates/docker)

---

## 1) Scope phải làm (không đi xa)

Chỉ tập trung module website sprint 3:
- P3.1 Create website config from store + branding
- P3.2 Render website from config + template
- P3.3 View preview website
- P3.4 Edit website by prompt (AI)
- P3.5 Save edit history
- P3.6 Create Docker container per shop
- P3.7 Update static content in container
- P3.8 Configure reverse proxy (subdomain -> container)
- P3.9 Deploy website to subdomain
- P3.10 Check container/proxy status

Không mở rộng:
- không thêm feature ngoài website/deploy
- không làm pipeline marketing ở module này
- không đổi kiến trúc folder hiện có

---

## 2) Quy ước domain & URL (chốt theo yêu cầu hiện tại)

- Public domain của site user:
  - `https://{slug}.captone2.site`
- `slug` lấy từ `sites.slug` (fallback `shops.slug`)
- Lưu host deploy thực tế tại `site_deployments.subdomain`
- Preview URL đề xuất:
  - `https://preview.captone2.site/sites/{shopId}` hoặc route tương đương qua reverse proxy

---

## 3) API contract tối thiểu để frontend đã làm sẵn có thể nối

Base prefix: `/api/shops/:shopId/website`

### 3.1 Overview
- `GET /overview`
- Mục đích: trả dữ liệu cho `ShopWebsitePage`
- Response shape:
  - `overview.siteId`
  - `overview.slug`
  - `overview.status` (`draft|preview_ready|deployed|building|error`)
  - `overview.versionCount`
  - `overview.publicUrl`
  - `overview.previewUrl`
  - `overview.updatedAt`
  - `overview.promptCount`
  - `overview.promptSuccessRate`
  - `overview.creditsUsed`
  - `overview.lastPrompt`
  - `overview.viewsToday` (nullable)
  - `overview.views7d` (nullable)
  - `overview.mobileDesktopRatio` (nullable)
  - `overview.coreWebVitals` (nullable)
  - `history[]` (`id`, `type`, `title`, `createdAt`)

### 3.2 Prompt preview
- `POST /prompt/preview`
- Body:
  - `prompt`
  - `scope` (`all|selected`)
  - `sectionId` (nullable)
  - `creativity` (`safe|balanced|creative`)
- Response:
  - `summary`
  - `previewUrl` (optional)

### 3.3 Prompt apply
- `POST /prompt/apply`
- Body: giống `/prompt/preview`
- Response:
  - `ok`
  - `message`
  - `previewUrl` (optional)

---

## 4) Data layer tối thiểu (DB)

Theo `database_design.md`:
- `sites`:
  - `shop_id`, `slug`, `config_json`, `status`, `updated_at`
- `conversation_messages`:
  - lưu prompt user + phản hồi assistant theo `site_id`
- `site_deployments`:
  - `site_id`, `shop_id`, `container_id`, `subdomain`, `status`, `deployed_at`, `error_message`, `updated_at`

Yêu cầu:
- `slug` unique toàn hệ thống cho deploy host
- 1 site active deployment tại một thời điểm

---

## 5) Runtime & deploy (không build bậy)

Theo kiến trúc đã chốt:
- 1 shop = 1 container runtime riêng
- backend render HTML từ template + config
- copy static + assets vào container shop
- reverse proxy map host -> container
- health check/ status rõ cho frontend

Không làm:
- frontend gọi docker trực tiếp
- model AI ghi file trực tiếp vào frontend

---

## 6) Env và port cần đúng

Theo `aimap-backend-env.md`:
- `PORT` (backend mặc định 4111)
- `TRUST_PROXY=1` khi sau reverse proxy
- `API_PUBLIC_URL` để build link public/uploads đúng origin
- `ASSET_STORAGE_PATH` cho assets theo shop
- frontend `VITE_API_URL` phải có `/api`

---

## 7) Folder implementation map (đúng rule project)

- `backend/routes/`
  - thêm route website module
- `backend/services/`
  - business: website overview, prompt workflow, deploy status
- `backend/lib/`
  - AI client adapter (Qwen local), docker helper
- `backend/templates/`
  - render HTML từ config JSON
- `docker/proxy/`
  - cấu hình host `*.captone2.site` -> container tương ứng

---

## 8) Acceptance để frontend dùng thật

Done khi:
- `ShopWebsitePage` hiển thị dữ liệu thực từ `/overview` (không mock)
- `ShopWebsiteBuilderPage` gọi được `/prompt/preview` + `/prompt/apply`
- URL public mở được theo `.captone2.site`
- trạng thái deploy phản ánh đúng `site_deployments.status`
- lỗi backend trả message rõ, frontend hiển thị ngắn gọn

