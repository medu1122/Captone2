---
name: AIMAP Progress Checklist
overview: Checklist kiểm tra tiến độ dự án AIMAP theo Product Backlog Sprint 1-3, đánh giá từng module Backend và Frontend.
todos:
  - id: sprint1-shops
    content: "Backend: Tạo routes/shops.js với CRUD endpoints cho shops"
    status: pending
  - id: sprint1-shops-ui
    content: "Frontend: Tạo pages /shops, /shops/create, /shops/[id]"
    status: pending
  - id: sprint1-credits
    content: "Backend: Tạo routes/credits.js cho balance và transactions"
    status: pending
  - id: sprint1-credits-ui
    content: "Frontend: Tạo pages /credit với balance, topup, history"
    status: pending
  - id: sprint1-profile
    content: "Backend: Thêm endpoint update profile vào auth.js"
    status: completed
  - id: sprint1-profile-ui
    content: "Frontend: Tạo page /profile với form update"
    status: pending
  - id: sprint1-ai-libs
    content: "Backend: Tạo services/llm.js và services/imageAI.js"
    status: pending
  - id: sprint2-assets
    content: "Backend: Tạo routes/assets.js với upload và quản lý"
    status: pending
  - id: sprint2-ai-gen
    content: "Backend: Tạo routes/generate.js cho AI branding/content"
    status: pending
  - id: sprint2-facebook
    content: "Backend: Tạo routes/facebook.js cho OAuth và publish"
    status: pending
isProject: false
---

# AIMAP - Checklist Tiến Độ Dự Án

## Tổng quan


| Sprint                  | Kế hoạch     | Backend  | Frontend | Tổng     |
| ----------------------- | ------------ | -------- | -------- | -------- |
| Sprint 1 (Core)         | 15 items     | ~40%     | ~35%     | ~37%     |
| Sprint 2 (AI + FB)      | 18 items     | 0%       | 0%       | 0%       |
| Sprint 3 (Web + Deploy) | 14 items     | 0%       | 0%       | 0%       |
| **Tổng**                | **47 items** | **~13%** | **~12%** | **~12%** |


---

## Sprint 1 - Core System Foundation (15-Feb -> 07-Mar)

### Chuẩn bị & Nền tảng


| ID   | Item                                                  | Backend | Frontend | Ghi chú                         |
| ---- | ----------------------------------------------------- | ------- | -------- | ------------------------------- |
| P1.1 | Set up backend and database configuration             | DONE    | -        | Express.js, PostgreSQL, pg pool |
| P1.2 | Manage environment variables and system configuration | DONE    | -        | `.env` file với DB, JWT, SMTP   |


### Authentication & Users


| ID   | Item                                 | Backend  | Frontend | Ghi chú                           |
| ---- | ------------------------------------ | -------- | -------- | --------------------------------- |
| P1.3 | Register account                     | DONE     | DONE     | Email verification 6-digit code   |
| P1.4 | Login                                | DONE     | DONE     | JWT auth, 7 ngày expire           |
| P1.5 | Logout                               | DONE     | DONE     | Clear token client-side           |
| P1.6 | View and update personal information | DONE     | NOT DONE | GET + PUT /api/auth/me hoàn chỉnh |
| P1.7 | User management (Admin)              | NOT DONE | NOT DONE | Chưa có admin routes/UI           |


### Credit & Payment


| ID    | Item                               | Backend  | Frontend | Ghi chú                                     |
| ----- | ---------------------------------- | -------- | -------- | ------------------------------------------- |
| P1.8  | View credit balance                | NOT DONE | NOT DONE | Table `credit_transactions` có trong schema |
| P1.9  | Top up credit via payment gateway  | NOT DONE | NOT DONE | Chưa tích hợp payment                       |
| P1.10 | Deduct credit when using features  | NOT DONE | NOT DONE | Logic chưa implement                        |
| P1.11 | View credit transaction history    | NOT DONE | NOT DONE | Route chưa có                               |
| P1.12 | Manage credit transactions (Admin) | NOT DONE | NOT DONE | Admin chưa có                               |


### Store & Input


| ID    | Item                             | Backend  | Frontend | Ghi chú                       |
| ----- | -------------------------------- | -------- | -------- | ----------------------------- |
| P1.13 | Enter and save store information | NOT DONE | NOT DONE | Table `shops` có trong schema |
| P1.14 | Edit store information           | NOT DONE | NOT DONE | Route chưa có                 |


### AI Base Libraries


| ID    | Item                                         | Backend  | Frontend | Ghi chú                                      |
| ----- | -------------------------------------------- | -------- | -------- | -------------------------------------------- |
| P1.15 | LLM client, Image API client, prompt builder | NOT DONE | -        | `dockerode`, `ajv` installed nhưng chưa dùng |


---

## Sprint 2 - AI Automation & Facebook (15-Mar -> 04-Apr)

### Branding & Assets


| ID   | Item                          | Backend  | Frontend | Ghi chú                        |
| ---- | ----------------------------- | -------- | -------- | ------------------------------ |
| P2.1 | Create logo with AI           | NOT DONE | NOT DONE | -                              |
| P2.2 | Create banner/cover with AI   | NOT DONE | NOT DONE | -                              |
| P2.3 | Save and manage asset library | NOT DONE | NOT DONE | Table `assets` có trong schema |
| P2.4 | Upload custom assets          | NOT DONE | NOT DONE | -                              |


### Marketing Content


| ID   | Item                            | Backend  | Frontend | Ghi chú                      |
| ---- | ------------------------------- | -------- | -------- | ---------------------------- |
| P2.5 | Create ad post (AI)             | NOT DONE | NOT DONE | -                            |
| P2.6 | Create product description (AI) | NOT DONE | NOT DONE | -                            |
| P2.7 | Create caption and hashtag (AI) | NOT DONE | NOT DONE | -                            |
| P2.8 | View and edit created content   | NOT DONE | NOT DONE | Table `marketing_content` có |


### Visual Post


| ID    | Item                                      | Backend  | Frontend | Ghi chú |
| ----- | ----------------------------------------- | -------- | -------- | ------- |
| P2.9  | Create post image from branding + content | NOT DONE | NOT DONE | -       |
| P2.10 | Export image in correct Facebook size     | NOT DONE | NOT DONE | -       |
| P2.11 | Save and reuse created images             | NOT DONE | NOT DONE | -       |


### Pipeline


| ID    | Item                                       | Backend  | Frontend | Ghi chú                  |
| ----- | ------------------------------------------ | -------- | -------- | ------------------------ |
| P2.12 | Run pipeline: Store -> Branding -> Content | NOT DONE | NOT DONE | Table `pipeline_runs` có |
| P2.13 | Deduct credit per step in pipeline         | NOT DONE | NOT DONE | -                        |
| P2.14 | View status and result of each step        | NOT DONE | NOT DONE | -                        |


### Facebook Integration


| ID    | Item                                  | Backend  | Frontend | Ghi chú                         |
| ----- | ------------------------------------- | -------- | -------- | ------------------------------- |
| P2.15 | Connect Facebook (OAuth, select Page) | NOT DONE | NOT DONE | Table `facebook_page_tokens` có |
| P2.16 | Save and refresh Page Access Token    | NOT DONE | NOT DONE | -                               |
| P2.17 | Publish content to Facebook Page      | NOT DONE | NOT DONE | -                               |
| P2.18 | Disconnect Facebook Page              | NOT DONE | NOT DONE | -                               |


---

## Sprint 3 - Website Builder, Deploy & Operations (12-Apr -> 02-May)

### Website Builder


| ID   | Item                                        | Backend  | Frontend | Ghi chú                          |
| ---- | ------------------------------------------- | -------- | -------- | -------------------------------- |
| P3.1 | Create website config from store + branding | NOT DONE | NOT DONE | Table `sites` có                 |
| P3.2 | Render website from config + template       | NOT DONE | NOT DONE | `handlebars` installed           |
| P3.3 | View website preview                        | NOT DONE | NOT DONE | -                                |
| P3.4 | Edit website by prompt (AI)                 | NOT DONE | NOT DONE | -                                |
| P3.5 | Save edit history (conversation/config)     | NOT DONE | NOT DONE | Table `conversation_messages` có |


### Deploy & Hosting


| ID    | Item                                | Backend  | Frontend | Ghi chú                     |
| ----- | ----------------------------------- | -------- | -------- | --------------------------- |
| P3.6  | Create Docker container for a shop  | NOT DONE | NOT DONE | `dockerode` installed       |
| P3.7  | Update static content in container  | NOT DONE | NOT DONE | -                           |
| P3.8  | Configure reverse proxy (subdomain) | NOT DONE | NOT DONE | Table `site_deployments` có |
| P3.9  | Deploy website to subdomain         | NOT DONE | NOT DONE | -                           |
| P3.10 | Check container and proxy status    | NOT DONE | NOT DONE | -                           |


### Admin & Operations


| ID    | Item                           | Backend  | Frontend | Ghi chú                  |
| ----- | ------------------------------ | -------- | -------- | ------------------------ |
| P3.11 | View system dashboard          | NOT DONE | NOT DONE | -                        |
| P3.12 | View revenue / credit reports  | NOT DONE | NOT DONE | -                        |
| P3.13 | View activity logs             | NOT DONE | NOT DONE | Table `activity_logs` có |
| P3.14 | Monitor performance and errors | NOT DONE | NOT DONE | -                        |


---

## Chi tiết đã hoàn thành

### Backend ([backend/](aimap/backend/))

**Files đã có:**

- `index.js` - Express server, health check, CORS
- `routes/auth.js` - 7 auth endpoints đầy đủ
- `services/email.js` - Nodemailer SMTP
- `db/index.js` - PostgreSQL connection pool
- `db/verifySchema.js` - Schema verification cho 15 tables
- `Dockerfile` - Production container

**API Endpoints hoạt động:**

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/verify`
- `POST /api/auth/resend-verify-code`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me` - Lấy tất cả thông tin profile
- `PUT /api/auth/me` - Cập nhật profile
- `PUT /api/auth/password` - Đổi mật khẩu

### Frontend ([frontend/](aimap/frontend/))

**Pages hoàn chỉnh:**

- `HomePage.tsx` - Landing page với hero, features, pricing
- `LoginPage.tsx` - Form đăng nhập
- `RegisterPage.tsx` - Form đăng ký với password strength
- `VerifyPage.tsx` - Xác thực email 6 số
- `ForgotPasswordPage.tsx` - Quên mật khẩu
- `ResetPasswordPage.tsx` - Đặt lại mật khẩu

**Layouts:**

- `AuthLayout.tsx` - Wrapper cho auth pages
- `DashboardLayout.tsx` - Sidebar + header (structure only)

**Components:**

- `ProtectedRoute.tsx` - Auth guard
- `PasswordInput.tsx` - Password field
- `LanguageSwitcher.tsx` - EN/VN toggle

**Contexts:**

- `AuthContext.tsx` - Auth state management
- `LocaleContext.tsx` - i18n (English/Vietnamese)

---

## Cần làm tiếp (Ưu tiên)

### Backend - Ưu tiên cao

1. `routes/shops.js` - CRUD shops
2. `routes/credits.js` - Credit balance, transactions
3. `routes/assets.js` - Asset management
4. `services/llm.js` - LLM client (Gemini API key đã có)
5. `services/storage.js` - File upload/storage

### Frontend - Ưu tiên cao

1. `/shops` - Danh sách và tạo shop
2. `/shops/[id]` - Chi tiết shop
3. `/profile` - Cập nhật thông tin cá nhân
4. `/credit` - Xem số dư và nạp credit
5. `/assets` - Quản lý thư viện ảnh

---

## Database Schema Status


| Table                    | Có trong Schema | Có Route API | Có UI   |
| ------------------------ | --------------- | ------------ | ------- |
| logins                   | YES             | YES          | YES     |
| user_profiles            | YES             | PARTIAL      | PARTIAL |
| pending_registrations    | YES             | YES          | YES     |
| email_verification_codes | YES             | YES          | YES     |
| shops                    | YES             | NO           | NO      |
| sites                    | YES             | NO           | NO      |
| credit_transactions      | YES             | NO           | NO      |
| payments                 | YES             | NO           | NO      |
| prompt_templates         | YES             | NO           | NO      |
| industry_tag_mappings    | YES             | NO           | NO      |
| assets                   | YES             | NO           | NO      |
| facebook_page_tokens     | YES             | NO           | NO      |
| marketing_content        | YES             | NO           | NO      |
| pipeline_runs            | YES             | NO           | NO      |
| conversation_messages    | YES             | NO           | NO      |
| site_deployments         | YES             | NO           | NO      |
| activity_logs            | YES             | NO           | NO      |


