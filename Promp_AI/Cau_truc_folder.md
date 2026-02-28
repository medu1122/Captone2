---
name: AIMAP Folder Structure Doc
overview: Cấu trúc thư mục AIMAP đã gộp, đơn giản, mỗi folder một mục tiêu rõ ràng.
todos: []
isProject: false
---

# Cấu trúc thư mục AIMAP (tối ưu, đơn giản, dễ hiểu)

Tài liệu mô tả **struct folder** của dự án AIMAP sau khi gộp bớt, mỗi folder có **một mục tiêu chính** rõ ràng. Tham chiếu: [READ_CONTEXT/AIMAP-Architecture-VN.md](../READ_CONTEXT/AIMAP-Architecture-VN.md).

---

## 1. Sơ đồ ánh xạ Kiến trúc → Folder

| Layer trong kiến trúc | Folder tương ứng | Mục tiêu chính |
|----------------------|------------------|----------------|
| Frontend (Dashboard) | `frontend/` | Giao diện người dùng: form, preview, gọi API |
| Backend Core (API, workflow) | `backend/routes/` + `backend/services/` | Nhận request, điều phối và trả response |
| AI + Agents | `backend/services/` (orchestrator) + `backend/agents/` | Chạy workflow và từng agent (branding, content, web, deploy, social) |
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
│   ├── routes/               # Mục tiêu: Định nghĩa API (auth, stores, branding, sites, deploy, facebook, admin)
│   ├── services/             # Mục tiêu: Logic nghiệp vụ + điều phối workflow (orchestrator)
│   ├── agents/               # Mục tiêu: Các agent (branding, content, visualPost, websiteBuilder, deploy, socialPosting)
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

## 3. Bảng mô tả folder (mục tiêu chính – tránh lẫn chức năng)

| Folder | Mục tiêu chính | Không làm gì (tránh lẫn) |
|--------|----------------|---------------------------|
| `frontend/` | Hiển thị UI, form nhập, preview, gọi API backend. | Không gọi AI/Docker trực tiếp, không lưu DB. |
| `backend/routes/` | Định nghĩa endpoint (POST/GET), auth middleware, gọi service. | Không chứa logic workflow hay gọi LLM/Docker trực tiếp. |
| `backend/services/` | Nghiệp vụ + điều phối: nhận data từ route, gọi agents theo thứ tự, trả kết quả. | Không định nghĩa route; không chứa template HTML. |
| `backend/agents/` | Từng agent: branding, content, visualPost, websiteBuilder, deploy, socialPosting (input/output rõ). | Không điều phối lẫn nhau; không định nghĩa API. |
| `backend/lib/` | Công cụ: kết nối LLM, Image API, build prompt, gọi Docker (dockerode). | Không chứa logic nghiệp vụ hay workflow. |
| `backend/templates/` | File template (partial) để render HTML từ config. | Không chứa logic Node, không gọi API. |
| `backend/db/` | Schema, migrations, truy vấn (sites, users, conversation, credits). | Không chứa logic workflow hay agent. |
| `backend/schemas/` | JSON Schema (ví dụ site-config) cho validate và gửi AI. | Không chứa code nghiệp vụ. |
| `docker/` | Định nghĩa image container shop + cấu hình proxy. | Không chứa code app (Node/React). |

## 4. Cách thể hiện khi trình bày

- **Cho người review:** Dùng cây thư mục (mục 2) + bảng mục tiêu (mục 3); có thể thêm 1 sơ đồ Architecture → Folders (mục 1).
- **Trong repo:** Đặt đúng tên folder như trên. (Promp_AI/ là folder ngoài dự án, không nằm trong cấu trúc code.)
- **Quy ước đặt tên gợi ý:** `routes/shops.js`, `services/orchestrator.js`, `agents/brandingAgent.js`, `lib/llmClient.js`, `lib/docker.js`.
