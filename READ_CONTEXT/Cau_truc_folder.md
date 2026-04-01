---
name: AIMAP Folder Structure Doc
overview: Cấu trúc thư mục AIMAP đã gộp, đơn giản, mỗi folder một mục tiêu rõ ràng.
todos: []
isProject: false
---

# Cấu trúc thư mục AIMAP (tối ưu, đơn giản, dễ hiểu)

**Trang web hệ thống hiện tại:** [captone2.site](https://captone2.site)

Tài liệu mô tả **struct folder** của dự án AIMAP sau khi gộp bớt, mỗi folder có **một mục tiêu chính** rõ ràng. Tham chiếu: [READ_CONTEXT/AIMAP-Architecture-VN.md](../READ_CONTEXT/AIMAP-Architecture-VN.md).

---

## 1. Sơ đồ ánh xạ Kiến trúc → Folder

| Layer trong kiến trúc | Folder tương ứng | Mục tiêu chính |
|----------------------|------------------|----------------|
| Frontend (Dashboard) | `frontend/` | Giao diện người dùng: form, preview, gọi API |
| Backend Core (API, workflow) | `backend/routes/` + `backend/services/` | Nhận request, điều phối và trả response |
| AI + workflow | `backend/services/` | Logic nghiệp vụ + Facebook Graph + Ollama marketing bot; **không có** folder `backend/agents/` trong repo hiện tại (agent có thể gom trong `services/` sau) |
| AI client & Docker | `backend/lib/` | Gọi LLM/Image API, Docker (dockerode), prompt builder |
| Website render | `backend/templates/` | Template (Handlebars/EJS) render HTML từ config |
| Dữ liệu | `backend/db/` | Schema, migrations, config + conversation store |
| Hosting (container, proxy) | `docker/` | Image nginx cho shop, cấu hình reverse proxy |

## 2. Cây thư mục đề xuất (đã gộp, ít tầng)

```
aimap/
├── frontend/                 # Mục tiêu: UI Dashboard (React/Next.js)
│   ├── src/
│   │   ├── components/       # Auth, StoreForm, BrandingUI, WebBuilder, Preview, DeployUI
│   │   ├── pages/
│   │   └── api/              # Client gọi backend
│   └── package.json
│
├── backend/                  # Mục tiêu: API + nghiệp vụ + AI + lưu trữ
│   ├── routes/               # Mục tiêu: Định nghĩa API (auth, shops, image-bot, **shopFacebookMarketing**, admin, …)
│   ├── services/             # Mục tiêu: Logic nghiệp vụ + điều phối workflow (orchestrator)
│   ├── (agents/)             # Tuỳ chọn tương lai — hiện chưa có; logic tương đương nằm trong services/
│   ├── lib/                  # Mục tiêu: Công cụ dùng chung (LLM client, image API, prompt builder, dockerode)
│   ├── templates/            # Mục tiêu: Partial Handlebars/EJS cho website (hero, cta, footer...)
│   ├── db/                   # Mục tiêu: Schema DB, migrations, config + conversation store
│   ├── schemas/              # Mục tiêu: JSON Schema (site-config) cho validate và AI
│   └── package.json
│
├── docker/                   # Mục tiêu: Hosting (image shop + reverse proxy)
│   ├── shop-image/
│   │   └── Dockerfile        # Nginx serve static cho 1 shop
│   └── proxy/                # Nginx/Traefik config subdomain → container
```

**Lưu ý:** Folder `Promp_AI/` nằm ngoài cấu trúc dự án (dùng cho tài liệu, prompt mẫu), không thuộc repo code.

**Đã gộp so với bản cũ:** `backend/src/` bỏ; `orchestrator/` gộp vào `services/`; `ai/` + `docker/` gộp vào `lib/`; `storage/` bỏ (asset path cấu hình trong backend); `shared/schemas` gộp vào `backend/schemas/`; không tách `storage/` hay `docs/` root.

**Asset path:** Cấu hình theo **từng shop**: `shops/:shopId/assets/`; không lưu chung theo user. Mỗi shop một kho ảnh riêng (AI + upload).

## 3. Bảng mô tả folder (mục tiêu chính – tránh lẫn chức năng)

| Folder | Mục tiêu chính | Không làm gì (tránh lẫn) |
|--------|----------------|---------------------------|
| `frontend/` | Hiển thị UI, form nhập, preview, gọi API backend. | Không gọi AI/Docker trực tiếp, không lưu DB. |
| `backend/routes/` | Endpoint: **`auth.js`**, **`admin.js`**, **`shops.js`**, **`shopImageBot.js`**, **`shopFacebookMarketing.js`** (prefix `/api/shops/:id/facebook/...` — Page, post, insight, AI assist). | Không chứa logic workflow hay gọi LLM/Docker trực tiếp. |
| `backend/services/` | Nghiệp vụ: **`activityLog.js`**, **`imagePromptBuilder.js`**, **`imageGeneration.js`**, **`assetStorage.js`**, **`marketingContentService.js`**, **`facebookGraphService.js`** (Graph API), **`marketingAiBot.js`** (Ollama). | Không định nghĩa route; không chứa template HTML. |
| `backend/agents/` | *(Chưa có trong repo.)* | — |
| `backend/lib/` | Công cụ: kết nối LLM, Image API, build prompt, gọi Docker (dockerode). | Không chứa logic nghiệp vụ hay workflow. |
| `backend/templates/` | File template (partial) để render HTML từ config. | Không chứa logic Node, không gọi API. |
| `backend/db/` | Schema, migrations, truy vấn (sites, users, conversation, credits). | Không chứa logic workflow hay agent. |
| `backend/schemas/` | JSON Schema (ví dụ site-config) cho validate và gửi AI. | Không chứa code nghiệp vụ. |
| `docker/` | Định nghĩa image container shop + cấu hình proxy. | Không chứa code app (Node/React). |

## 4. Cách thể hiện khi trình bày

- **Cho người review:** Dùng cây thư mục (mục 2) + bảng mục tiêu (mục 3); có thể thêm 1 sơ đồ Architecture → Folders (mục 1).
- **Trong repo:** Đặt đúng tên folder như trên. (Promp_AI/ là folder ngoài dự án, không nằm trong cấu trúc code.)
- **Quy ước đặt tên gợi ý:** `routes/auth.js`, `routes/shops.js`, `routes/shopFacebookMarketing.js`, `services/activityLog.js`, `services/facebookGraphService.js`, `lib/llmClient.js`, `lib/docker.js`.
