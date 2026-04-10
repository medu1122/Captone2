# Website Backend Sprint 3 Plan (Qwen end-to-end)

Nguồn bám:
- `READ_CONTEXT/AIMAP-Project-Plan-Schedule.md` (P3.1 -> P3.10)
- `READ_CONTEXT/AIMAP-Architecture-VN.md` (1 shop = 1 Docker container)
- `READ_CONTEXT/database_design.md` (`sites`, `conversation_messages`, `site_deployments`)
- `READ_CONTEXT/aimap-backend-env.md` (env runtime/deploy)

---

## 1) Mục tiêu sprint (chốt lại)

Mục tiêu backend cho website module:
1. Qwen (local) là bot chính tạo/sửa config web từ đầu đến cuối.
2. Mỗi lần create/apply/rebuild/restore đều có bản static HTML thật trên server.
3. Deploy dùng 1 shop = 1 container, status phản ánh được cho frontend.
4. API đủ ổn định để frontend flow mới chạy xuyên suốt: entry -> dashboard -> builder.

Không mở rộng:
- không làm pipeline marketing trong sprint này
- không mở rộng multi-site (giữ 1 shop = 1 website active)

---

## 2) Luồng chuẩn backend

1. User gửi idea/prompt.
2. Backend lấy `currentConfig` + context shop + assets.
3. Qwen trả patch/config (fallback heuristic nếu AI lỗi).
4. Backend validate + lưu `sites.config_json` + lưu history (`conversation_messages`, versions).
5. Backend render static HTML từ config và publish vào storage shop.
6. Khi deploy: tạo/khởi chạy container shop, serve static đã publish.
7. Trả `publicUrl`, `previewUrl`, `deploy status`.

---

## 3) Trạng thái triển khai thực tế

### Completed trong batch này
- [x] Thêm service publish static: `backend/services/websiteStaticPublishService.js`
  - render `index.html` từ website config
  - publish vào `ASSET_STORAGE_PATH/shops/:shopId/index.html`
- [x] Nối publish static vào các endpoint mutate:
  - `POST /website/create-from-idea`
  - `POST /website/sections/:sectionId/update`
  - `POST /website/prompt/apply`
  - `POST /website/rebuild`
  - `POST /website/versions/:versionId/restore`
  - `POST /website/deploy`
- [x] Cải tiến Docker runtime `createShopContainer`:
  - tái sử dụng container cũ theo tên `aimap-shop-<shopId>`
  - start lại nếu đang stop
  - mount trực tiếp thư mục shop vào web root container

### In progress / next
- [ ] Chuẩn hóa reverse proxy wildcard `*.captone2.site` -> port container theo `site_deployments`.
- [x] Đồng bộ preview URL thật với runtime đã publish:
  - thêm endpoint `GET /api/shops/preview/sites/:shopId` trả static runtime `index.html`
  - đưa URL preview/public về env config (`WEBSITE_PREVIEW_BASE_URL`, `WEBSITE_PUBLIC_BASE_DOMAIN`)
- [x] Harden frontend flow website (entry/dashboard/builder):
  - hiển thị lỗi backend chi tiết cho prompt/apply/deploy/load thay vì lỗi chung chung
  - giữ trạng thái loading/action rõ ràng để tránh cảm giác "bấm nút không chạy"
- [ ] Thêm health endpoint per shop (proxy/container) cho dashboard.

---

## 4) API contract (backend giữ ổn định cho frontend)

Base: `/api/shops/:shopId/website`

- `GET /entry` -> danh sách website (thực tế tối đa 1 record).
- `GET /overview` -> status/url/usage summary.
- `GET /builder-state` -> config/sections/assets/versions/deploy info.
- `POST /create-from-idea` -> create config ban đầu từ idea/shop/assets.
- `POST /prompt/preview` -> preview patch từ Qwen.
- `POST /prompt/apply` -> apply patch + save version + publish static.
- `POST /rebuild` -> regenerate config + publish static.
- `POST /versions/:versionId/restore` -> restore + publish static.
- `POST /deploy` -> ensure runtime container + mark deployed.
- `GET /deploy/status` -> deployment + live container stats.
- `POST /delete` -> verify password + remove container + cleanup DB.

---

## 5) Acceptance criteria sprint 3

Done khi:
- [ ] User tạo web xong mở public URL thấy trang HTML render từ config mới nhất.
- [ ] Sau prompt apply/rebuild/restore, public/preview có nội dung cập nhật đồng bộ.
- [ ] Deploy/redeploy không lỗi name conflict container.
- [ ] `site_deployments.status` phản ánh đúng (`building|running|error|stopped`).
- [ ] Frontend flow không cần mock để hiển thị core website status/url/version.

---

## 6) Rủi ro & hướng xử lý

- Qwen trả JSON sai cấu trúc -> validate + fallback heuristic.
- Container chạy nhưng không có nội dung -> bắt buộc publish static trước khi deploy.
- DNS/proxy chưa map đúng host -> thêm checklist hạ tầng riêng cho wildcard + SSL.
- Divergence giữa preview iframe và runtime -> ưu tiên runtime-based preview sau sprint này.

