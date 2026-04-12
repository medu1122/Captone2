# AIMAP reset scope plan

## 1. Muc tieu moi

Du an khong theo huong "AI lam thay toan bo" nua.

Huong moi:

- AI goi y
- User chon
- User sua
- User tu export ra Facebook de dang tay

Flow chinh:

```text
Nhap shop
-> Tao brand context
-> Generate content
-> Chon / sua / improve
-> Tao campaign hoac plan
-> Export caption + image
-> Mo Facebook de dang thu cong
```

## 2. Dinh vi san pham

AIMAP duoc chot lai thanh:

**Cong cu ho tro tao noi dung marketing cho shop nho, theo kieu manual-first, user control, AI chi de goi y va tang toc do lam viec.**

Khong dinh vi thanh:

- he thong auto-post full
- he thong phan tich marketing chuyen sau
- he thong website builder
- he thong deploy hosting
- he thong AI tu van phuc tap

## 3. Nguyen tac thiet ke

1. Moi tinh nang phai co gia tri that khi demo.
2. AI khong duoc ra quyet dinh thay user.
3. Moi output deu phai cho user edit hoac regenerate.
4. UI ngan, ro, it chu.
5. Lam manual-first de de demo, de giai thich, de build.

## 4. Pham vi giu lai

### Bat buoc cho MVP

| Nhom | Tinh nang |
|------|-----------|
| Auth | Dang ky, dang nhap, dang xuat |
| Shop | Tao shop, sua thong tin shop |
| Brand context | Form nhap nganh hang, target, phong cach, USP; luu DB; AI chuan hoa thanh context |
| AI content | Generate 3-5 caption theo loai content, muc tieu, do dai |
| Improve content | Rewrite caption de ro hon, manh hon, them CTA |
| Content variation | Tao version A/B tu 1 caption |
| Campaign | Generate 3-5 bai post cung 1 muc tieu campaign |
| Post plan | Tao lich dang bai don gian theo tuan |
| Export | Copy caption, download image, open Facebook |
| Pipeline | Step-by-step: Brand -> Content -> Image -> Plan |
| Library | Luu danh sach bai viet / campaign theo shop |

### Optional neu con thoi gian

| Nhom | Tinh nang |
|------|-----------|
| Image | Tao anh marketing tu prompt/idea |
| Activity log | Luu hanh dong generate, improve, export |
| Credit | Mo phong credit co ban |

## 5. Pham vi bo hoac de sau

| Tinh nang cu | Xu ly moi |
|--------------|----------|
| Auto post Facebook bang API | Bo khoi MVP |
| Facebook OAuth, chon Page, token | Bo khoi MVP |
| Phan tich hieu qua bang like/comment manual | Bo, thay bang content variation |
| Website builder | Bo khoi scope |
| Docker, deploy, subdomain | Bo khoi scope |
| Dashboard admin lon | Bo khoi MVP |
| Payment gateway that | Bo khoi MVP |

## 6. Cac module chinh

### 6.1 Shop + Brand context

Input toi thieu:

- nganh hang
- khach hang muc tieu
- phong cach
- USP (optional)

Output:

- brand summary
- tone goi y
- keyword nen dung
- keyword nen tranh (optional)

AI chi lam 1 viec:

**Chuan hoa input thanh context dung lai cho cac feature sau.**

### 6.2 Tao noi dung AI

Input:

- loai content: quang cao / gioi thieu / khuyen mai
- muc tieu: ban hang / tang tuong tac
- do dai: ngan / dai

Output:

- 3-5 caption

Action:

- copy
- edit
- regenerate
- improve
- tao variation

### 6.3 Tao campaign

Input:

- shop
- brand context
- muc tieu campaign

Output:

- 3-5 bai post
- moi bai co:
  - caption
  - image idea
  - CTA

Action:

- edit
- delete
- export
- improve

### 6.4 Lap ke hoach dang bai

Muc tieu:

- tao lich dang bai don gian, de hieu, co logic

Logic du:

- khong dang lien tuc
- xen ke noi dung
- phu hop nganh + target

Output mau:

```text
Thu 2: Gioi thieu san pham
Thu 4: Feedback / loi ich
Thu 6: Khuyen mai / CTA
```

### 6.5 Export

Chi lam theo huong thuc te:

- Copy caption
- Download image
- Open Facebook

Khong cam ket dang bai tu dong.

### 6.6 Pipeline

Phai la wizard co kiem soat, khong generate 1 phat.

Steps:

1. Brand
2. Content
3. Image
4. Plan

Moi step co:

- preview
- regenerate
- edit
- continue

## 7. Cac page can co

| Page | Muc dich |
|------|----------|
| Login/Register | Dang nhap he thong |
| Shop form | Tao shop + nhap thong tin co ban |
| Brand context step | Nhap 4 field va xem context AI chuan hoa |
| Content generator | Tao 3-5 caption va thao tac tren tung caption |
| Campaign generator | Tao bo bai viet cho 1 muc tieu |
| Content plan | Xem lich dang bai dang list/card |
| Pipeline workspace | Di tung buoc tu brand toi plan |
| Library | Xem lai content, campaign, plan theo shop |

## 8. Cac bang DB can co

Toi thieu:

| Bang | Muc dich |
|------|----------|
| users | Tai khoan |
| stores | Thong tin shop |
| brand_context | Luu context da chuan hoa cua shop |
| content_items | Luu caption don le |
| content_variations | Luu version A/B hoac improve |
| campaigns | Luu campaign |
| campaign_posts | Luu cac bai viet trong campaign |
| posting_plans | Luu ke hoach dang bai |

Goi y field chinh:

### stores

- id
- user_id
- name
- industry
- target_customer
- style
- usp
- created_at

### brand_context

- id
- store_id
- raw_input_json
- normalized_summary
- tone
- keywords
- created_at
- updated_at

### content_items

- id
- store_id
- brand_context_id
- type
- goal
- length
- content_text
- status
- created_at

### content_variations

- id
- content_item_id
- variant_type
- content_text
- created_at

### campaigns

- id
- store_id
- goal
- title
- created_at

### campaign_posts

- id
- campaign_id
- caption
- image_idea
- cta
- sort_order

### posting_plans

- id
- store_id
- source_type
- source_id
- plan_json
- created_at

## 9. API huong de xay

### Shop

- `POST /api/stores`
- `GET /api/stores/:id`
- `PUT /api/stores/:id`

### Brand context

- `POST /api/stores/:id/brand-context`
- `GET /api/stores/:id/brand-context`

### Content

- `POST /api/stores/:id/content/generate`
- `POST /api/content/:id/improve`
- `POST /api/content/:id/variations`
- `PUT /api/content/:id`
- `GET /api/stores/:id/content`

### Campaign

- `POST /api/stores/:id/campaigns/generate`
- `GET /api/stores/:id/campaigns`
- `GET /api/campaigns/:id`
- `PUT /api/campaigns/:id`
- `DELETE /api/campaigns/:id`

### Posting plan

- `POST /api/stores/:id/posting-plan/generate`
- `GET /api/stores/:id/posting-plans`

### Export support

- `POST /api/export/open-facebook-log` (optional neu muon log hanh vi export)

## 10. User flow demo

Flow demo de bao ve do an:

1. User dang nhap.
2. User tao shop.
3. User nhap nganh hang, target, phong cach, USP.
4. He thong tao brand context.
5. User chon "Generate content".
6. He thong tra ve 3-5 caption.
7. User copy 1 caption, improve 1 caption, tao 1 variation.
8. User chon "Generate campaign".
9. He thong tao 3-5 bai post.
10. User chon "Generate posting plan".
11. User export caption / image.
12. User bam "Open Facebook" de dang thu cong.

Demo nhu vay la du ro gia tri he thong.

## 11. Phan ra theo phase

### Phase 1 - Core co the demo som

- Auth
- CRUD shop
- Brand context
- Content generate
- Copy / edit / regenerate

### Phase 2 - Tang gia tri

- Improve content
- Content variation
- Campaign generate
- Library

### Phase 3 - Hoan thien workflow

- Posting plan
- Pipeline workspace
- Export actions

### Phase 4 - Optional

- Image generation
- Activity log
- Credit

## 12. Product backlog moi

| ID | Backlog item |
|----|--------------|
| R1 | Dang ky / dang nhap / dang xuat |
| R2 | Tao shop va luu thong tin shop |
| R3 | Tao brand context tu 4 field input |
| R4 | Luu va xem lai brand context theo shop |
| R5 | Generate 3-5 caption theo type + goal + length |
| R6 | Edit va save caption |
| R7 | Regenerate caption |
| R8 | Improve caption |
| R9 | Tao version A/B cho caption |
| R10 | Generate campaign 3-5 bai viet |
| R11 | Edit / delete bai viet trong campaign |
| R12 | Tao lich dang bai don gian |
| R13 | Pipeline step-by-step workspace |
| R14 | Library theo shop |
| R15 | Copy caption |
| R16 | Download image |
| R17 | Open Facebook |
| R18 | Image generation (optional) |
| R19 | Activity log (optional) |
| R20 | Credit (optional) |

## 13. Thu tu uu tien code

Thu tu nen lam:

1. Auth
2. Store
3. Brand context
4. Content generation
5. Improve + variation
6. Campaign
7. Library
8. Posting plan
9. Pipeline
10. Export

Neu bi thieu thoi gian, cat tu cuoi len.

## 14. Tieu chi danh gia la "kha thi"

Du an duoc xem la kha thi neu:

- user tao duoc shop
- AI tao duoc context dung lai
- AI generate duoc nhieu caption
- user co quyen chon / sua / improve
- campaign generate duoc thanh bo bai viet
- co the export de dang len Facebook thu cong

Chi can dat muc nay la du manh cho do an.

## 15. Ket luan

Huong moi cua AIMAP nen chot thanh:

**AI marketing assistant cho shop nho, tap trung vao goi y noi dung, campaign va ke hoach dang bai, theo mo hinh user control va export thu cong.**

Khong nen om them cac phan auto-post, website builder, deploy hay analytics phuc tap trong giai doan nay.
