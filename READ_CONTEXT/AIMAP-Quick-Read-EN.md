# AIMAP – Quick Read: AI Marketing & Website Platform for Small Businesses

**AIMAP** = *AI-Powered Marketing Automation Platform for Small Businesses*  
Capstone Project 2 – International School, Duy Tan University

**A SaaS platform that lets small business owners enter store information once → AI generates branding, content, post images, website, auto-posts to Facebook, and deploys online — no coding required.**

---

## Highlights

- **Single store information input:** Enter name, products, pricing, contact, and brand preferences once → used as the single data source for the entire automation pipeline (branding, content, images, website, Facebook posting).
- **Multi-Agent orchestration:** Specialized agents (Branding, Content, Visual Post, Website Builder, Deploy, Social Posting) work together via an Orchestrator → end-to-end flow from input to website + Facebook.
- **All-in-one:** Store info → branding (logo, banner) → marketing content (posts, descriptions, captions, hashtags) → social-ready post images → website → edit website by prompt → realtime preview → deploy (`shopname.aimap.app`) → **auto-publish to Facebook Page**, all in one dashboard.
- **Automatic Facebook posting:** OAuth via Meta Graph API, secure token storage, publish generated content to authorized Facebook Pages.
- **AI understands context:** Edit the website over multiple turns; AI remembers current structure and conversation history without breaking the layout.
- **Zero code:** No HTML/CSS/JS; all website changes via natural-language prompt; no separate design tools.
- **Credit & payment:** Pay-as-you-go with credits; payment gateway integration to buy credits; Admin monitors revenue and transactions.
- **Isolation & scale:** One Docker container per shop; Admin manages users, activity logs, and performance dashboard.

---

## Features & User Benefits

### 0. Unified Store Information Input

| Feature | Benefit to users |
|---------|-------------------|
| **Structured store input** (name, products, pricing, contact, brand preferences) | One-time entry powers the full pipeline: branding, content, post images, website; no re-entering in multiple places. |
| **Data validation** | Ensures required fields are present before running automation; fewer missing-data errors. |

**Summary:** Store info is the single source of truth; users fill the form once.

---

### 1. Branding & Image Generation (Logo, Banner, Cover)

| Feature | Benefit to users |
|---------|-------------------|
| **Brand inputs** (shop name, industry, style) | AI generates logo, banner, and marketing images aligned with the brand; no need to hire a designer. |
| **Auto logo generation** | Professional logo from day one, consistent with industry and chosen style. |
| **Banner & marketing images** | Enough assets for ads (Facebook, website, email) without complex design tools. |
| **Custom image upload** | Use existing photos (products, real shots) and manage them in one library. |
| **Per-user/shop asset storage** | All files (logo, banner, images) stored separately and securely; easy to reuse when creating or editing the website. |

**Summary:** Users get a basic brand identity and marketing visuals without design skills or specialist software.

---

### 2. AI Website Builder (Frontend Auto-Generation)

| Feature | Benefit to users |
|---------|-------------------|
| **Full frontend website** (HTML/CSS/JS or framework) | Complete, ready-to-view site without writing code. |
| **In-dashboard preview (iframe)** | See the live site in the same screen; no extra tabs or tools. |
| **Branding integration** | Logo, banner, and colors from branding can be used directly on the website → consistent brand. |

**Summary:** From nothing to a live website in a few steps, with a look that matches the brand.

---

### 2b. AI Marketing Content Creation

| Feature | Benefit to users |
|---------|-------------------|
| **Advertising posts** | AI generates ad copy from store and product info; no copywriting skills needed. |
| **Product descriptions** | Structured descriptions suitable for promotion and the website. |
| **Captions & hashtag suggestions** | Social-ready captions and hashtags for Facebook posts or images. |

**Summary:** Full text content (posts, descriptions, captions, hashtags) for marketing without hiring a writer.

---

### 2c. Automated Visual Post Creation

| Feature | Benefit to users |
|---------|-------------------|
| **Social-ready post images** | Combines branding (logo, colors), product info, price, and promo text into images ready for Facebook. |
| **Facebook-sized export** | Images exported in dimensions that meet Facebook requirements; no manual resizing. |

**Summary:** On-brand post images ready to publish on Facebook.

---

### 2d. Facebook Page Auto-Publishing

| Feature | Benefit to users |
|---------|-------------------|
| **Facebook OAuth** | One-time authorization via Meta Graph API for Facebook Page access; Meta-compliant security. |
| **Secure token storage** | Page Access Tokens stored encrypted; no need to log in again for each post. |
| **Automatic posting** | Publish posts (content + generated images) to the authorized Facebook Page with one action or as part of the automation flow. |

**Summary:** From content and images created in the system → direct publish to the Facebook Page, no manual copy-paste.

---

### 3. Prompt-Based Website Editing

| Feature | Benefit to users |
|---------|-------------------|
| **Natural-language requests** (e.g. “Make the header smaller”, “Change primary color to blue”, “Add a customer reviews section”) | Edit content and layout by describing in plain language; no syntax or complex drag-and-drop. |
| **AI analyzes & applies changes** | AI interprets intent and updates the right parts; less trial-and-error and manual tweaking. |
| **Understands current site structure** | AI does not “forget” existing layout or sections; edits are additive and do not break other parts. |
| **Multiple consecutive edits** | Refine step by step (e.g. add section → change button color → edit text); AI keeps context via conversation history. |
| **Instant preview** | After each prompt, see the result in the iframe; iterate if not satisfied. |

**Summary:** Users “instruct” in plain language; AI applies changes and shows the result immediately — similar to chatting with a designer or developer.

---

### 4. Hosting & Deploy (Publish Website Online)

| Feature | Benefit to users |
|---------|-------------------|
| **Hosted on platform servers** | No need to buy hosting or configure servers; the platform handles everything. |
| **Subdomain:** `shopname.aimap.app` | Professional URL from the start (e.g. `mycoffee.aimap.app`), easy to remember and share. |
| **Custom domain later** | When the business grows, attach a custom domain (e.g. `mycoffee.com`) without changing how the system works. |
| **One Docker per shop** | Each shop’s site runs in its own container → stable, secure, no cross-impact. |

**Summary:** One “Deploy” action puts the site online with a ready-made address; no hosting or Docker knowledge required.

---

### 5. Credit-Based Usage & Payment

| Feature | Benefit to users |
|---------|-------------------|
| **Credit-based usage** | Each action (create logo, post to Facebook, deploy site, etc.) consumes credits; easy to control cost. |
| **Buy credits via Payment Gateway** | Top up credits through the integrated payment gateway; get balance and transaction confirmations. |
| **View balance & history** | Dashboard shows credit balance and usage/payment history. |

**Summary:** Users pay by usage (credits); the platform has a clear revenue model.

---

### 6. Administrator

| Feature | Benefit for reviewers / operators |
|---------|-----------------------------------|
| **User account management** | Activate, suspend, or edit accounts; control access. |
| **Activity logs** | Review logs for audit, troubleshooting, and system integrity. |
| **Revenue & credit transaction monitoring** | Revenue reports, credit usage stats, and payment transactions. |
| **System performance dashboard** | Usage stats, API call counts, posting frequency, operational metrics. |

**Summary:** Admin does not do marketing but ensures stability, transparency, and business control.

---

### 7. Multi-Agent Orchestration

The system uses an **Orchestrator** to coordinate specialized agents:

- **Branding Agent:** Generates logo, banner, cover from store info and brand preferences.
- **Content Agent:** Generates ad copy, product descriptions, captions, hashtags (LLM).
- **Visual Post Agent:** Creates post images (branding + product + text) in Facebook-ready format.
- **Website Builder Agent:** Generates/updates website (JSON config) from store + branding; supports prompt-based editing.
- **Deploy Agent:** Deploys the website to hosting (one Docker per shop), returns public URL.
- **Social Posting Agent:** Publishes content + images to Facebook Page via Meta Graph API.

**Benefits:** Clear separation of responsibilities, easier maintenance and extension; end-to-end flow from store info to website + Facebook.

---

## Overall User Benefits

- **Save time & cost:** No need to hire a designer (logo/banner), copywriter (content), or developer (website), or buy separate hosting; automatic Facebook posting instead of manual copy-paste.
- **Lower technical barrier:** No need to learn code, design tools, or OAuth flows; one store info form + dashboard + prompt is enough.
- **Quick control:** Edit website → see result → edit again; one-click Facebook posting; pay by credit for predictable spending.
- **Consistent brand:** Store info → branding → content → post images → website all share the same assets and style.

---

## Why the System Stands Out (for reviewers)

1. **Multi-Agent orchestration:** Specialized agents (Branding, Content, Visual Post, Website Builder, Deploy, Social Posting) coordinated by an Orchestrator → end-to-end from store info to website + Facebook; maintainable and extensible.
2. **Clear, production-oriented architecture:** Frontend, Backend, AI Layer, Storage, Hosting; config-driven (JSON + template) for the website; Meta Graph API (OAuth, tokens, posting) and Payment Gateway (credits) integrated.
3. **Proper AI context:** Current website config + conversation history; stable multi-turn editing; no “forgetting” or breaking layout.
4. **Isolation & scale:** One Docker container per shop; reverse proxy for subdomains; Admin dashboard (users, logs, revenue, performance).
5. **Experience & business model:** Single flow: Store info → Branding → Content → Post images → Website (edit by prompt) → Deploy → Facebook posting; pay by credit. Extensible: custom domain, WebSocket preview, more section types, other AI models.

---

## Related Documents

- **Quick read (Vietnamese):** `AIMAP-Quick-Read.md` — Vietnamese version of this document.
- **Full architecture (Vietnamese):** See plan in `.cursor/plans` or main README.
- **Architecture (English):** `AIMAP-Architecture-EN.md` — technical architecture in English.
