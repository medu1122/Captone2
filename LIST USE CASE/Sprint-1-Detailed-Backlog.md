# Sprint 1 – Sprint Backlog chi tiết (Points & Phân công)

**Quy ước:** 1 point = 1 giờ. Mỗi PBI gồm **Backend**, **Frontend & Design**, **Integration & Testing**. Một task có thể có nhiều thành viên.

**Thành viên:** Diem (PM/PO), Duong (BA/QA), Dao (Lead Backend/AI), Duc (Frontend/UI), Thinh (Backend/DevOps).

---

## E0 – Sprint 1 – PM/PO & Điều phối (đảm bảo 5 thành viên đều đóng góp)

| Task ID | Task | Type | Points | Assignee(s) |
|---------|------|------|--------|-------------|
| T0.1 | Sprint 1 kick-off & alignment scope với team | Integration & Testing | 2 | Diem |
| T0.2 | Định nghĩa Definition of Done & acceptance criteria cho Sprint 1 | Integration & Testing | 3 | Diem |
| T0.3 | Backlog refinement & làm rõ user story với BA/Dev | Integration & Testing | 2 | Diem |
| T0.4 | Chuẩn bị Sprint 1 review & demo script | Integration & Testing | 2 | Diem |
| T0.5 | Báo cáo tiến độ Sprint 1 cho stakeholder / mentor | Integration & Testing | 2 | Diem |
| **E0 total** | | | **11** | |

---

## E1 – Backend & Database Foundation

### P1.1 – Set up backend and database configuration

| Task ID | Task | Type | Points | Assignee(s) |
|---------|------|------|--------|-------------|
| T1.1.1 | Cấu hình dotenv, đọc PORT, DATABASE_URL từ .env | Backend | 1 | Thinh |
| T1.1.2 | Mount CORS, express.json() trong index.js | Backend | 1 | Thinh |
| T1.1.3 | Route GET /health trả { ok, service } | Backend | 1 | Thinh |
| T1.1.4 | Chọn stack DB (pg hoặc better-sqlite3), thêm dependency | Backend | 2 | Dao |
| T1.1.5 | Tạo db/connection.js (pool), connect/close | Backend | 2 | Thinh |
| T1.1.6 | Tạo thư mục migrations, script chạy migration | Backend | 2 | Thinh |
| T1.1.7 | Smoke test: start app, gọi GET /health | Integration & Testing | 1 | Duong, Diem |
| **P1.1 total** | | | **10** | |

### P1.2 – Manage environment variables and system configuration

| Task ID | Task | Type | Points | Assignee(s) |
|---------|------|------|--------|-------------|
| T1.2.1 | Chuẩn hóa .env.example, document biến cần thiết | Backend | 1 | Thinh |
| T1.2.2 | Kiểm tra env khi start (thiếu thì log rõ) | Backend | 1 | Thinh |
| T1.2.3 | Cập nhật README / doc cấu hình | Integration & Testing | 1 | Duong, Diem |
| **P1.2 total** | | | **3** | |

### P1.1+ – Migrations (bảng users, sites, credits)

| Task ID | Task | Type | Points | Assignee(s) |
|---------|------|------|--------|-------------|
| T1.M1 | Migration: bảng users (id, email, password_hash, name, role, created_at) | Backend | 2 | Dao, Thinh |
| T1.M2 | Migration: bảng sites (id, user_id, name, slug, config_json, created_at) | Backend | 2 | Thinh |
| T1.M3 | Migration: bảng credit_transactions (user_id, amount, type, ref, created_at) | Backend | 2 | Dao, Thinh |
| T1.M4 | Script npm chạy migrations, verify bảng tạo đúng | Backend | 1 | Thinh |
| T1.M5 | Test: chạy migration lần đầu, kiểm tra schema | Integration & Testing | 1 | Duong, Diem |
| **Migrations total** | | | **8** | |

---

## E2 – Authentication & User Management

### P1.3 – Register account

| Task ID | Task | Type | Points | Assignee(s) |
|---------|------|------|--------|-------------|
| T2.1.1 | Route POST /auth/register: validate email, password min length | Backend | 2 | Thinh |
| T2.1.2 | Hash password (bcrypt/argon2), lưu users, trả 201 + user (không trả password_hash) | Backend | 2 | Dao, Thinh |
| T2.1.3 | Xử lý email trùng → 409 | Backend | 1 | Thinh |
| T2.1.4 | Trang Register: form email, password, name; gọi API | Frontend & Design | 3 | Duc |
| T2.1.5 | UI hiển thị lỗi (trùng email, validation) | Frontend & Design | 1 | Duc |
| T2.1.6 | Test case đăng ký thành công / email trùng / validation | Integration & Testing | 2 | Duong, Diem |
| **P1.3 total** | | | **11** | |

### P1.4 – Login

| Task ID | Task | Type | Points | Assignee(s) |
|---------|------|------|--------|-------------|
| T2.2.1 | Route POST /auth/login: so sánh hash, chọn JWT hoặc session | Backend | 3 | Dao, Thinh |
| T2.2.2 | Trả 200 + token + user info; sai credential → 401 | Backend | 1 | Thinh |
| T2.2.3 | Middleware requireAuth: đọc token, gắn req.user | Backend | 2 | Thinh |
| T2.2.4 | Trang Login: form email, password; gọi API; lưu token (localStorage/cookie) | Frontend & Design | 3 | Duc |
| T2.2.5 | Redirect sau login thành công; hiển thị lỗi 401 | Frontend & Design | 1 | Duc |
| T2.2.6 | Test case login thành công / sai mật khẩu | Integration & Testing | 2 | Duong, Diem |
| **P1.4 total** | | | **12** | |

### P1.5 – Logout

| Task ID | Task | Type | Points | Assignee(s) |
|---------|------|------|--------|-------------|
| T2.3.1 | Route POST /auth/logout (nếu session: destroy) | Backend | 1 | Thinh |
| T2.3.2 | Nút Logout: xóa token, redirect về Login | Frontend & Design | 1 | Duc |
| T2.3.3 | Test logout | Integration & Testing | 1 | Duong, Diem |
| **P1.5 total** | | | **3** | |

### P1.6 – View and update personal information

| Task ID | Task | Type | Points | Assignee(s) |
|---------|------|------|--------|-------------|
| T2.4.1 | Route GET /users/me (requireAuth), không trả password_hash | Backend | 1 | Thinh |
| T2.4.2 | Route PATCH /users/me: cập nhật name, email (kiểm tra trùng) | Backend | 2 | Thinh |
| T2.4.3 | Auth context: đọc token, gửi Authorization header cho mọi API | Frontend & Design | 2 | Duc |
| T2.4.4 | Trang/component Profile: hiển thị thông tin, form sửa | Frontend & Design | 3 | Duc |
| T2.4.5 | Test GET/PATCH /users/me (có token / không token) | Integration & Testing | 2 | Duong, Diem |
| **P1.6 total** | | | **10** | |

### P1.7 – User management – list and basic admin (Admin)

| Task ID | Task | Type | Points | Assignee(s) |
|---------|------|------|--------|-------------|
| T2.5.1 | Middleware requireRole('admin') (sau requireAuth) | Backend | 2 | Thinh |
| T2.5.2 | Route GET /admin/users: danh sách user (paginate) + balance | Backend | 3 | Thinh |
| T2.5.3 | Trang Admin: bảng users (chỉ hiện khi role admin) | Frontend & Design | 3 | Duc |
| T2.5.4 | Test: admin truy cập được, user thường 403 | Integration & Testing | 2 | Duong, Diem |
| **P1.7 total** | | | **10** | |

### P1.3–P1.7 – Protected routes & Auth UX

| Task ID | Task | Type | Points | Assignee(s) |
|---------|------|------|--------|-------------|
| T2.6.1 | Protected route: chưa login → redirect Login | Frontend & Design | 2 | Duc |
| T2.6.2 | Kiểm tra E2E: đăng ký → đăng nhập → xem profile → logout | Integration & Testing | 2 | Duong, Diem |
| **Subtotal** | | | **4** | |

---

## E3 – Credit System & Payment Integration

### P1.8 – View credit balance

| Task ID | Task | Type | Points | Assignee(s) |
|---------|------|------|--------|-------------|
| T3.1.1 | Service/hàm lấy balance theo user_id từ credit_transactions | Backend | 2 | Dao |
| T3.1.2 | Route GET /users/me/credits: balance + (optional) lịch sử gần | Backend | 2 | Thinh |
| T3.1.3 | UI hiển thị số dư credit (header/sidebar hoặc trang Credits) | Frontend & Design | 2 | Duc |
| T3.1.4 | Test GET /users/me/credits | Integration & Testing | 1 | Duong, Diem |
| **P1.8 total** | | | **7** | |

### P1.10 – Deduct credit when using features

| Task ID | Task | Type | Points | Assignee(s) |
|---------|------|------|--------|-------------|
| T3.2.1 | Service deduct credit (amount, user_id, ref); kiểm tra đủ balance | Backend | 3 | Dao |
| T3.2.2 | Service add credit (nạp từ payment callback) | Backend | 2 | Dao |
| T3.2.3 | Test: trừ credit đủ/không đủ; cộng credit | Integration & Testing | 2 | Duong, Diem |
| **P1.10 total** | | | **7** | |

### P1.9 – Top up credit via payment gateway

| Task ID | Task | Type | Points | Assignee(s) |
|---------|------|------|--------|-------------|
| T3.3.1 | Nghiên cứu API cổng thanh toán (VNPay/Momo): tạo URL, callback | Backend | 3 | Thinh |
| T3.3.2 | Route POST /payment/create: body amount/packageId, trả redirect URL | Backend | 3 | Thinh, Dao |
| T3.3.3 | Route callback: verify chữ ký, cộng credit, idempotent | Backend | 4 | Dao, Thinh |
| T3.3.4 | Trang/modal "Nạp credit": chọn gói, gọi API, redirect sang cổng | Frontend & Design | 3 | Duc |
| T3.3.5 | Trang success/fail sau thanh toán | Frontend & Design | 2 | Duc |
| T3.3.6 | Test case: tạo payment, mock callback, kiểm tra credit tăng | Integration & Testing | 3 | Duong, Diem |
| **P1.9 total** | | | **18** | |

### P1.11 – View credit transaction history

| Task ID | Task | Type | Points | Assignee(s) |
|---------|------|------|--------|-------------|
| T3.4.1 | Route GET /users/me/transactions (paginate, filter) | Backend | 2 | Thinh |
| T3.4.2 | UI: danh sách giao dịch (user) | Frontend & Design | 2 | Duc |
| T3.4.3 | Test danh sách giao dịch | Integration & Testing | 1 | Duong, Diem |
| **P1.11 total** | | | **5** | |

### P1.12 – Manage and monitor credit transactions (Admin)

| Task ID | Task | Type | Points | Assignee(s) |
|---------|------|------|--------|-------------|
| T3.5.1 | Route GET /admin/transactions (filter user, ngày) | Backend | 3 | Thinh |
| T3.5.2 | Trang Admin: bảng transactions | Frontend & Design | 3 | Duc |
| T3.5.3 | Test admin xem được toàn bộ giao dịch | Integration & Testing | 1 | Duong, Diem |
| **P1.12 total** | | | **7** | |

---

## Store & Lib (Sprint 1 – đẩy bớt)

### P1.13 – Enter and save store information (API + persistence)

| Task ID | Task | Type | Points | Assignee(s) |
|---------|------|------|--------|-------------|
| T4.1.1 | Route POST /stores (hoặc /shops): validate, lưu DB | Backend | 3 | Thinh |
| T4.1.2 | Form nhập store: tên, ngành, mô tả, sản phẩm, liên hệ... | Frontend & Design | 4 | Duc |
| T4.1.3 | Gọi API lưu store, hiển thị thành công/lỗi | Frontend & Design | 2 | Duc |
| T4.1.4 | Test case tạo store, validate input | Integration & Testing | 2 | Duong, Diem |
| **P1.13 total** | | | **11** | |

### P1.14 – Edit store information

| Task ID | Task | Type | Points | Assignee(s) |
|---------|------|------|--------|-------------|
| T4.2.1 | Route GET /stores/:id, PATCH /stores/:id (requireAuth, owner) | Backend | 2 | Thinh |
| T4.2.2 | Trang/form chỉnh sửa store, load dữ liệu, submit | Frontend & Design | 3 | Duc |
| T4.2.3 | Test sửa store | Integration & Testing | 1 | Duong, Diem |
| **P1.14 total** | | | **6** | |

### P1.15 – Provide LLM client, Image API client, prompt builder (lib)

| Task ID | Task | Type | Points | Assignee(s) |
|---------|------|------|--------|-------------|
| T5.1.1 | lib/llmClient: gọi API LLM (Gemini/OpenAI), config từ env | Backend | 4 | Dao |
| T5.1.2 | lib/imageApi: gọi Image Gen API (nếu dùng riêng), lưu file | Backend | 3 | Dao |
| T5.1.3 | lib/promptBuilder: hàm build prompt từ context (store, type) | Backend | 3 | Dao |
| T5.1.4 | Document cách dùng lib cho agents (Sprint 2) | Integration & Testing | 1 | Dao, Duong, Diem |
| **P1.15 total** | | | **11** | |

---

## Tổng hợp Sprint 1

| PBI | Tên | Points |
|-----|-----|--------|
| P1.1 | Backend + DB configuration | 10 |
| P1.2 | Env & config | 3 |
| Migrations | users, sites, credits | 8 |
| P1.3 | Register | 11 |
| P1.4 | Login | 12 |
| P1.5 | Logout | 3 |
| P1.6 | View/update profile | 10 |
| P1.7 | Admin user list | 10 |
| Auth UX | Protected routes, E2E auth | 4 |
| P1.8 | View credit balance | 7 |
| P1.10 | Deduct/add credit service | 7 |
| P1.9 | Top up via payment gateway | 18 |
| P1.11 | Transaction history (user) | 5 |
| P1.12 | Admin transactions | 7 |
| P1.13 | Enter/save store | 11 |
| P1.14 | Edit store | 6 |
| P1.15 | LLM + Image API + prompt builder (lib) | 11 |
| E0 | PM/PO & điều phối Sprint 1 | 11 |
| **Tổng** | | **~164 points (~164 giờ)** |

---

## Thời gian các công việc lớn (Sprint 1: 15-Feb-2026 → 07-Mar-2026)

**Quy ước:** 1 point = 1 giờ; ước lượng ngày làm việc dựa trên phân công song song (nhiều thành viên). Sprint 1 = 3 tuần (~15 ngày làm việc).

| Công việc lớn | Nội dung chính | Points | Số ngày (ước lượng) | Ngày bắt đầu | Ngày kết thúc |
|---------------|----------------|--------|----------------------|--------------|---------------|
| **E0 – PM/PO & Điều phối** | Kick-off, DoD, refinement, review prep, báo cáo | 11 | Suốt sprint | 15-Feb-2026 | 07-Mar-2026 |
| **E1 – Backend & Database** | P1.1 Backend + DB config, P1.2 Env, Migrations (users, sites, credits) | 21 | 3 ngày | 15-Feb-2026 | 19-Feb-2026 |
| **E2 – Authentication & User** | P1.3 Register, P1.4 Login, P1.5 Logout, P1.6 Profile, P1.7 Admin users, Protected routes | 50 | 5 ngày | 20-Feb-2026 | 26-Feb-2026 |
| **E3 – Credit & Payment** | P1.8 Balance, P1.10 Deduct/add credit, P1.9 Payment gateway, P1.11/P1.12 Transactions (user + admin) | 44 | 4 ngày | 27-Feb-2026 | 02-Mar-2026 |
| **Store & Lib** | P1.13 Enter/save store, P1.14 Edit store, P1.15 LLM + Image API + prompt builder (lib) | 28 | 3 ngày | 03-Mar-2026 | 07-Mar-2026 |

**Lưu ý:** E2 và E3 có thể chồng lấn nhẹ (ví dụ Credit backend bắt đầu khi Auth gần xong). E0 chạy song song với toàn bộ sprint.

---

**Ghi chú phân công:**

- **Dao:** Kiến trúc backend, DB logic, credit service, auth strategy (JWT/session), lib LLM/Image/promptBuilder.
- **Thinh:** Implement routes, migrations, payment gateway integration, middleware auth/admin.
- **Duc:** Toàn bộ UI: auth pages, profile, admin, credit, store form, payment flow.
- **Duong:** Test cases, UAT, kiểm tra E2E, tài liệu test, cập nhật use case/context nếu cần.
- **Diem:** Sprint planning, làm rõ requirement với team, giám sát tài liệu, review tích hợp cuối sprint; đồng tham gia với QA (Duong) trong test/UAT và các task điều phối (E0).

Tasks có thể có 2 người (ví dụ Dao + Thinh cho route phức tạp, Duong + Diem cho doc).

---

## Bảng tổng kết giờ đóng góp theo thành viên (Sprint 1)

**Quy ước:** 1 task có 2 thành viên và 6h → mỗi thành viên đều được tính **6h** đóng góp (tổng giờ đóng góp = tổng theo từng người, không chia đôi).

| Thành viên | Vai trò | Tổng giờ đóng góp (h) | % đóng góp | Ghi chú |
|------------|---------|------------------------|------------|---------|
| **Thinh** | Backend Developer & DevOps | **62** | ~31% | Routes, migrations, auth middleware, payment gateway, admin/store API |
| **Duc** | Frontend Developer & UI/UX | **45** | ~22% | Toàn bộ UI: auth, profile, admin, credit, store form, payment flow |
| **Dao** | Lead Backend & AI Integration | **34** | ~17% | Kiến trúc DB, auth strategy, credit service, payment logic, lib LLM/Image/prompt |
| **Diem** | Project Manager & Product Owner | **37** | ~18% | PM/PO tasks (E0), đồng tham gia QA & doc với Duong |
| **Duong** | Business Analyst & QA | **26** | ~13% | Test cases, UAT, E2E, doc cấu hình (đồng tham gia với Diem) |
| **Tổng (theo đóng góp)** | | **204** | 100% | Task 2+ người: mỗi người tính đủ giờ task |

**Tổng giờ công việc (task-hours):** 164h (gồm E0). Cả 5 thành viên đều có đóng góp rõ ràng, không dưới ~13%.
  