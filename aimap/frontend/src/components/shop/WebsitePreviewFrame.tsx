import { useEffect, useMemo } from 'react'
import type { WebsiteConfig, WebsiteDeviceMode, WebsiteSection } from '../../api/shopWebsite'

export type WebsitePreviewVariant = 'interactive' | 'published'

type Props = {
  config: WebsiteConfig | null
  deviceMode: WebsiteDeviceMode
  selectedSectionId: string | null
  onSelectSection?: (sectionId: string) => void
  /** interactive = srcDoc + chọn section; published = iframe HTML đã lưu trên server */
  variant?: WebsitePreviewVariant
  /** URL GET /api/shops/preview/sites/:shopId; dùng khi variant === 'published' */
  publishedSrc?: string | null
  /** Đổi key để iframe tải lại sau khi apply/save */
  publishedReloadKey?: number
  /** Raw HTML from codegen — shows full AI-generated page instead of config-rendered preview */
  codegenHtml?: string | null
}

function escapeHtml(value: unknown): string {
  const text = String(value ?? '')
  return text.replace(/[<>&"]/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
  })[char] || char)
}

function asText(value: unknown): string {
  return escapeHtml(value)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function buildHero(section: WebsiteSection): string {
  const props = isObject(section.props) ? section.props : {}
  const imageUrl = typeof props.imageUrl === 'string' ? props.imageUrl : ''
  return `
    <section class="section hero" data-section-id="${escapeHtml(section.id)}">
      <div class="hero-copy">
        <p class="eyebrow">${asText(props.eyebrow || '')}</p>
        <h1>${asText(props.title || section.name)}</h1>
        <p class="muted">${asText(props.subtitle || '')}</p>
        <div class="actions">
          <a href="${asText(props.primaryButtonHref || '#')}" class="button primary">${asText(props.primaryButtonText || 'Contact')}</a>
          <a href="${asText(props.secondaryButtonHref || '#')}" class="button secondary">${asText(props.secondaryButtonText || 'More')}</a>
        </div>
      </div>
      <div class="hero-media">
        ${
          imageUrl
            ? `<img src="${escapeHtml(imageUrl)}" alt="${asText(props.title || section.name)}" />`
            : '<div class="image-placeholder">No image selected</div>'
        }
      </div>
    </section>
  `
}

function buildFeatures(section: WebsiteSection): string {
  const props = isObject(section.props) ? section.props : {}
  const items = Array.isArray(props.items) ? props.items : []
  return `
    <section class="section stack" data-section-id="${escapeHtml(section.id)}">
      <h2>${asText(props.title || section.name)}</h2>
      <div class="grid columns-3">
        ${
          items.length > 0
            ? items
                .map((item) => {
                  const normalized = isObject(item) ? item : {}
                  return `
                    <article class="card">
                      <h3>${asText(normalized.title || 'Item')}</h3>
                      <p>${asText(normalized.body || '')}</p>
                    </article>
                  `
                })
                .join('')
            : '<article class="card"><h3>Add items</h3><p>This section is ready for your content.</p></article>'
        }
      </div>
    </section>
  `
}

function buildGallery(section: WebsiteSection): string {
  const props = isObject(section.props) ? section.props : {}
  const imageUrls = Array.isArray(props.imageUrls) ? props.imageUrls : []
  return `
    <section class="section stack" data-section-id="${escapeHtml(section.id)}">
      <h2>${asText(props.title || section.name)}</h2>
      <div class="gallery">
        ${
          imageUrls.length > 0
            ? imageUrls
                .map((url) => `<div class="gallery-item"><img src="${escapeHtml(url)}" alt="Gallery" /></div>`)
                .join('')
            : '<div class="gallery-item empty">Choose images from storage</div>'
        }
      </div>
    </section>
  `
}

function buildCta(section: WebsiteSection): string {
  const props = isObject(section.props) ? section.props : {}
  return `
    <section class="section cta" data-section-id="${escapeHtml(section.id)}">
      <div>
        <h2>${asText(props.title || section.name)}</h2>
        <p>${asText(props.body || '')}</p>
      </div>
      <a href="${asText(props.buttonHref || '#')}" class="button primary">${asText(props.buttonText || 'Contact')}</a>
    </section>
  `
}

function buildFooter(section: WebsiteSection): string {
  const props = isObject(section.props) ? section.props : {}
  return `
    <footer class="section footer" data-section-id="${escapeHtml(section.id)}">
      <div>
        <strong>${asText(props.title || section.name)}</strong>
        <p>${asText(props.body || '')}</p>
      </div>
      <p class="muted">${asText(props.contactLine || '')}</p>
    </footer>
  `
}

function buildTestimonials(section: WebsiteSection): string {
  const props = isObject(section.props) ? section.props : {}
  const items = Array.isArray(props.items) ? props.items : []
  return `
    <section class="section stack" data-section-id="${escapeHtml(section.id)}">
      <h2>${asText(props.title || section.name)}</h2>
      <div class="grid columns-2">
        ${
          items.length > 0
            ? items
                .map((item) => {
                  const normalized = isObject(item) ? item : {}
                  return `
                    <blockquote class="card quote">
                      <p>“${asText(normalized.quote || '')}”</p>
                      <footer>${asText(normalized.author || '')}</footer>
                    </blockquote>
                  `
                })
                .join('')
            : '<blockquote class="card quote"><p>“Add your testimonials here.”</p><footer>Customer</footer></blockquote>'
        }
      </div>
    </section>
  `
}

function renderSection(section: WebsiteSection): string {
  if (section.type === 'hero') return buildHero(section)
  if (section.type === 'features') return buildFeatures(section)
  if (section.type === 'gallery') return buildGallery(section)
  if (section.type === 'cta') return buildCta(section)
  if (section.type === 'footer') return buildFooter(section)
  if (section.type === 'testimonials') return buildTestimonials(section)

  return `
    <section class="section stack" data-section-id="${escapeHtml(section.id)}">
      <h2>${escapeHtml(section.name)}</h2>
      <pre>${escapeHtml(JSON.stringify(section.props || {}, null, 2))}</pre>
    </section>
  `
}

function buildPreviewHtml(config: WebsiteConfig, selectedSectionId: string | null): string {
  const theme = config.theme
  const sections = config.sections.map((section) => renderSection(section)).join('')
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          :root {
            --primary: ${theme.primary};
            --accent: ${theme.accent};
            --background: ${theme.background};
            --surface: ${theme.surface};
            --text: #0f172a;
            --muted: #475569;
          }
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; font-family: Inter, Arial, sans-serif; background: var(--background); color: var(--text); }
          body { padding: 24px; }
          a { color: inherit; text-decoration: none; }
          .page { display: flex; flex-direction: column; gap: 18px; }
          .section {
            background: var(--surface);
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 20px;
            padding: 24px;
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
          }
          .section:hover {
            border-color: rgba(37, 99, 235, 0.35);
          }
          .section[data-section-id="${escapeHtml(selectedSectionId || '')}"] {
            border-color: var(--accent);
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
          }
          .hero {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 20px;
            align-items: center;
          }
          .hero-copy h1, .stack h2, .cta h2 { margin: 0 0 12px; line-height: 1.1; }
          .hero-copy h1 { font-size: 2rem; }
          .eyebrow { margin: 0 0 8px; color: var(--accent); font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; }
          .muted { color: var(--muted); margin: 0; }
          .actions { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
          .button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 40px;
            padding: 0 16px;
            border-radius: 999px;
            font-weight: 600;
            border: 1px solid rgba(15, 23, 42, 0.12);
          }
          .button.primary { background: var(--accent); color: white; border-color: transparent; }
          .button.secondary { background: white; color: var(--text); }
          .hero-media img, .gallery-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 18px;
            display: block;
          }
          .hero-media { min-height: 280px; }
          .image-placeholder, .gallery-item.empty {
            min-height: 220px;
            border: 1px dashed rgba(15, 23, 42, 0.15);
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--muted);
            text-align: center;
            padding: 20px;
            background: rgba(255,255,255,0.65);
          }
          .stack { display: flex; flex-direction: column; gap: 16px; }
          .grid { display: grid; gap: 16px; }
          .columns-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .columns-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .card {
            border-radius: 16px;
            background: rgba(248, 250, 252, 0.9);
            border: 1px solid rgba(15, 23, 42, 0.06);
            padding: 16px;
          }
          .card h3, .card p, .card footer { margin: 0; }
          .card p { margin-top: 8px; color: var(--muted); }
          .quote footer { margin-top: 10px; font-weight: 600; color: var(--text); }
          .gallery { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
          .gallery-item { aspect-ratio: 4 / 3; overflow: hidden; border-radius: 18px; background: rgba(248,250,252,0.9); }
          .cta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            background: linear-gradient(135deg, rgba(255,255,255,0.98), rgba(37,99,235,0.06));
          }
          .footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            background: #0f172a;
            color: white;
          }
          .footer .muted { color: rgba(255,255,255,0.8); }
          pre {
            margin: 0;
            white-space: pre-wrap;
            font-family: ui-monospace, SFMono-Regular, monospace;
            font-size: 12px;
            color: var(--muted);
          }
          @media (max-width: 820px) {
            body { padding: 14px; }
            .hero, .cta, .footer { grid-template-columns: 1fr; display: flex; flex-direction: column; align-items: stretch; }
            .columns-3, .columns-2, .gallery { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="page">${sections}</div>
        <script>
          document.addEventListener('click', function (event) {
            const target = event.target.closest('[data-section-id]');
            if (!target) return;
            event.preventDefault();
            window.parent.postMessage({
              type: 'aimap-website-section-select',
              sectionId: target.getAttribute('data-section-id')
            }, '*');
          }, true);

          document.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function (event) {
              event.preventDefault();
            });
          });
        </script>
      </body>
    </html>
  `
}

export default function WebsitePreviewFrame({
  config,
  deviceMode,
  selectedSectionId,
  onSelectSection,
  variant = 'interactive',
  publishedSrc,
  publishedReloadKey = 0,
  codegenHtml,
}: Props) {
  useEffect(() => {
    if (variant !== 'interactive') return
    function handleMessage(event: MessageEvent) {
      if (event.data?.type !== 'aimap-website-section-select') return
      if (typeof event.data.sectionId !== 'string') return
      onSelectSection?.(event.data.sectionId)
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onSelectSection, variant])

  const widthClass = deviceMode === 'mobile'
    ? 'max-w-[360px]'
    : deviceMode === 'tablet'
      ? 'max-w-[820px]'
      : 'max-w-[1100px]'

  const srcDoc = useMemo(() => {
    if (!config) return ''
    return buildPreviewHtml(config, selectedSectionId)
  }, [config, selectedSectionId])

  const publishedUrl = useMemo(() => {
    if (!publishedSrc) return ''
    const sep = publishedSrc.includes('?') ? '&' : '?'
    return `${publishedSrc}${sep}v=${publishedReloadKey}`
  }, [publishedSrc, publishedReloadKey])

  return (
    <div className={`mx-auto w-full ${widthClass}`}>
      {variant === 'published' && publishedUrl ? (
        <iframe
          key={publishedReloadKey}
          title="Website published preview"
          src={publishedUrl}
          className="h-[760px] w-full rounded-none border border-slate-200 bg-white shadow-sm"
        />
      ) : codegenHtml ? (
        <iframe
          key={`codegen-${publishedReloadKey}`}
          title="Website codegen preview"
          srcDoc={codegenHtml}
          className="h-[760px] w-full rounded-none border border-slate-200 bg-white shadow-sm"
        />
      ) : (
        <iframe
          title="Website preview"
          srcDoc={srcDoc}
          className="h-[760px] w-full rounded-none border border-slate-200 bg-white shadow-sm"
        />
      )}
    </div>
  )
}
