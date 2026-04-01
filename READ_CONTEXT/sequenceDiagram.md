Shop Management
```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant BE as Backend
    participant DB as Database

    User->>FE: Create or update shop information
    FE->>BE: Send shop data
    BE->>DB: Save shop profile
    DB-->>BE: Shop stored
    BE-->>FE: Return shop summary
```

Product Management
```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant BE as Backend
    participant DB as Database

    User->>FE: Manage products
    FE->>BE: Submit product list changes
    BE->>DB: Save products to shop
    DB-->>BE: Products updated
    BE-->>FE: Return updated products
```

Image Generation
```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant BE as Backend
    participant AI as AIModel
    participant DB as Database

    User->>FE: Create or update shop information
    FE->>BE: Request image generation
    BE->>AI: Create image variants from shop context
    AI-->>BE: Return generated images
    BE->>DB: Save generation metadata and assets
    BE-->>FE: Return image results
```

Asset Storage Management
```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant BE as Backend
    participant DB as Database

    User->>FE: Save or remove assets
    FE->>BE: Send asset action
    BE->>DB: Update asset library
    DB-->>BE: Asset state updated
    BE-->>FE: Return current assets
```

Support Marketing Manual Flow
```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant BE as Backend
    participant Ollama as Ollama_VPS
    participant FB as Meta_Graph_API
    participant DB as Database

    User->>FE: Connect Page (hoặc nhập page token) / xem post / yêu cầu AI
    FE->>BE: GET/POST /api/shops/:id/facebook/... (pages, posts, assist)
    BE->>FB: Graph API (token server-side, không lộ client)
    FB-->>BE: Page list, posts, insights
    BE->>DB: Cache facebook_posts_cache, snapshots, tokens
    BE-->>FE: JSON cho UI

    User->>FE: AI assist / tóm tắt comment / gợi ý caption
    FE->>BE: POST .../assist (hoặc route tương đương)
    BE->>Ollama: POST /api/generate (MARKETING_AI_*)
    Ollama-->>BE: Text
    BE->>DB: marketing_ai_cache (tuỳ gọi)
    BE-->>FE: Gợi ý text

    Note over BE,FB: OAuth flow đầy đủ có thể bổ sung sau; hiện có thể connect bằng page token / bước manual.
```

