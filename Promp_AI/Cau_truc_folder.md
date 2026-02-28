---
name: AIMAP Folder Structure Doc
overview: Tạo một tài liệu trong folder Promp_AI mô tả cấu trúc thư mục (struct) của dự án AIMAP và cách thể hiện các folder, dựa trên kiến trúc trong AIMAP-Architecture-VN.md.
todos: []
isProject: false
---

# Kế hoạch: Tài liệu cấu trúc thư mục AIMAP trong Promp_AI

## Mục tiêu

Tạo một bản mô tả **struct (cấu trúc folder)** và **cách thể hiện các folder** của dự án AIMAP, lưu trong folder **Promp_AI**, dựa trên [READ_CONTEXT/AIMAP-Architecture-VN.md](d:\CAPTONE2\testKhaThi\READ_CONTEXT\AIMAP-Architecture-VN.md).

---

## Nội dung tài liệu sẽ tạo

**File đề xuất:** `Promp_AI/AIMAP-Folder-Structure.md` (hoặc giữ tên `Promp_AI/Tao_struct.md` nếu bạn muốn).

Tài liệu gồm các phần sau:

### 1. Sơ đồ ánh xạ Kiến trúc → Folder

Một diagram (mermaid hoặc text) thể hiện: các layer trong kiến trúc (Frontend, Backend Core, AI Layer, Storage, Hosting) tương ứng với nhóm folder nào trong codebase.

- **Frontend (Dashboard)** → `frontend/` (hoặc `apps/web/`, `client/`)
- **Backend Core** → `backend/` (hoặc `apps/api/`, `server/`)
- **AI Layer / Agents** → `backend/agents/` hoặc `backend/src/ai/` (Branding, Content, Visual Post, Website Builder, Deploy, Social Posting) + Orchestrator
- **Storage** → `backend` (DB, migrations) + thư mục/volume asset storage (local hoặc S3/MinIO)
- **Hosting / Docker** → `docker/`, `deploy/`, hoặc script trong `backend` (orchestrator gọi Docker)

### 2. Cây thư mục đề xuất (folder tree)

Cấu trúc text dạng tree phản ánh đầy đủ tính năng theo architecture:

```
aimap/
├── frontend/                 # Dashboard (React/Next.js)
│   ├── src/
│   │   ├── components/       # Auth, BrandingUI, WebBuilder, Preview, DeployUI
│   │   ├── pages/
│   │   ├── api/              # client gọi backend
│   │   └── ...
│   └── package.json
├── backend/                  # Node.js (Express/NestJS)
│   ├── src/
│   │   ├── api/              # Gateway, routes (auth, shops, branding, site, admin)
│   │   ├── agents/           # Multi-Agent: branding, content, visualPost, websiteBuilder, deploy, socialPosting
│   │   ├── orchestrator/     # Điều phối workflow
│   │   ├── ai/               # Prompt builder, LLM client, image gen client
│   │   ├── storage/          # Config store, conversation store, asset path
│   │   ├── templates/        # Handlebars/EJS partials cho website
│   │   ├── docker/           # Orchestrator gọi Docker (dockerode), map shop → container
│   │   └── ...
│   ├── migrations/           # DB schema (sites, users, conversation_messages, credits...)
│   └── package.json
├── shared/                   # (optional) Schema, types dùng chung
│   └── schemas/
│       └── site-config.v1.json
├── docker/                   # Hosting layer: image nginx cho shop, reverse-proxy config
│   ├── shop-image/
│   │   └── Dockerfile
│   └── proxy/                # Nginx/Traefik config cho subdomain
├── storage/                  # (optional) Local asset root: users/, shops/ (hoặc dùng S3)
├── docs/                     # README, architecture (có thể trỏ tới READ_CONTEXT)
└── Promp_AI/                 # Prompt & tài liệu phụ (struct, prompt mẫu...)
    └── AIMAP-Folder-Structure.md
```

(Ghi chú: `Promp_AI` có thể nằm trong repo gốc `testKhaThi` như hiện tại, không bắt buộc nằm trong `aimap/` nếu repo tách riêng.)

### 3. Bảng mô tả từng nhóm folder

Bảng ngắn: **Folder** | **Thuộc layer** | **Nội dung chính**.

- `frontend/` → Frontend – UI Dashboard, Store info form, Branding, Web Builder + Prompt Panel, Preview iframe, Deploy, (Credit, Admin nếu có).
- `backend/src/api/` → Backend Core – API Gateway, Auth, routes (store, branding, site edit, deploy, Facebook, credit, admin).
- `backend/src/agents/` → AI Layer / Multi-Agent – Branding Agent, Content Agent, Visual Post Agent, Website Builder Agent, Deploy Agent, Social Posting Agent.
- `backend/src/orchestrator/` → Backend Core – Gọi agents theo thứ tự, truyền data.
- `backend/src/ai/` → AI Layer – Prompt builder, gọi LLM/Image API, parse JSON.
- `backend/src/templates/` → Website Builder – Partial theo section type (hero, cta, footer...).
- `backend/src/docker/` hoặc `backend/docker/` → Hosting – Logic tạo/stop container, đẩy HTML vào container (dockerode).
- `docker/` → Hosting – Image cho shop container, config reverse proxy.
- `shared/schemas/` → Dùng chung – JSON Schema site-config cho validate và AI.

### 4. Cách thể hiện folder khi trình bày

- **Trình bày cho người review:** Dùng cây thư mục (tree) + 1 diagram “Architecture → Folders” (mermaid flowchart).
- **Trong repo:** Giữ đúng tên folder như trên; README gốc có thể link tới `Promp_AI/AIMAP-Folder-Structure.md` để xem struct chi tiết.
- **Tài liệu kèm:** Trong cùng file có thể thêm “Quy ước đặt tên” (ví dụ: `agents/<name>Agent.js`, `api/routes/shops.js`).

---

## Vị trí file

- **Tạo file tại:** [Promp_AI/AIMAP-Folder-Structure.md](d:\CAPTONE2\testKhaThi\Promp_AI\AIMAP-Folder-Structure.md) (hoặc [Promp_AI/Tao_struct.md](d:\CAPTONE2\testKhaThi\Promp_AI\Tao_struct.md) nếu bạn chọn tên cũ).
- Tham chiếu kiến trúc: [READ_CONTEXT/AIMAP-Architecture-VN.md](d:\CAPTONE2\testKhaThi\READ_CONTEXT\AIMAP-Architecture-VN.md).

---

## Công việc thực hiện (khi bạn chạy Agent)

1. Tạo folder `Promp_AI` nếu chưa tồn tại.
2. Tạo file markdown trong `Promp_AI` với:
  - Tiêu đề: Cấu trúc thư mục AIMAP / AIMAP Folder Structure.
  - Đoạn 1: Sơ đồ mermaid “Architecture layers → Folders”.
  - Đoạn 2: Cây thư mục (tree) như trên, có thể điều chỉnh theo stack thật (Vite/Next, Express/Nest).
  - Đoạn 3: Bảng mô tả folder vs layer.
  - Đoạn 4: Cách thể hiện (trình bày / trong repo / quy ước tên).
3. Không chỉnh sửa file trong `READ_CONTEXT`, chỉ tham chiếu.

Nếu bạn muốn đặt tên file là `Tao_struct.md` thay vì `AIMAP-Folder-Structure.md`, hoặc muốn tree chi tiết hơn (từng file con), có thể nói rõ để cập nhật plan trước khi thực hiện.