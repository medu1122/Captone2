/**
 * Build final image prompt from template + shop + form options.
 */

const ASPECT_HINT = {
  '1:1': 'Square composition 1:1 aspect ratio.',
  '2:3': 'Portrait poster 2:3 aspect ratio.',
  '3:2': 'Landscape 3:2 aspect ratio.',
  '4:5': 'Portrait 4:5 suitable for social feed.',
  '16:9': 'Wide banner 16:9 aspect ratio.',
}

const STYLE_HINT = {
  ad: 'Marketing advertisement style, bold and eye-catching.',
  product_intro: 'Product showcase, clean product-focused layout.',
  price_board: 'Price list or menu board style, clear typography for prices.',
  banner_shop: 'Shop banner / hero image for the brand.',
}

function replacePlaceholders(template, vars) {
  let s = template
  for (const [k, v] of Object.entries(vars)) {
    const re = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi')
    s = s.replace(re, v != null ? String(v) : '')
  }
  return s
}

/**
 * @param {object} opts
 * @param {string} opts.templateContent
 * @param {object} opts.shop - row from shops
 * @param {string} opts.aspect
 * @param {string} opts.imageStyle
 * @param {boolean} opts.shopOnly
 * @param {object[]} opts.selectedProducts
 * @param {string} opts.userPrompt
 */
export function buildImagePrompt({
  templateContent,
  shop,
  aspect,
  imageStyle,
  shopOnly,
  selectedProducts,
  userPrompt,
}) {
  const ci = shop.contact_info && typeof shop.contact_info === 'object' ? shop.contact_info : {}
  const productLines = shopOnly
    ? 'Focus on the shop brand only; no specific product list.'
    : selectedProducts.length
      ? selectedProducts
          .map((p, i) => {
            const name = p.name != null ? p.name : `Product ${i + 1}`
            const price = p.price != null ? ` — ${p.price}` : ''
            const desc = p.description != null ? `: ${p.description}` : ''
            return `- ${name}${price}${desc}`
          })
          .join('\n')
      : 'Featured products from the shop catalog.'

  const vars = {
    shop_name: shop.name || '',
    campaign_theme: STYLE_HINT[imageStyle] || imageStyle,
    design_style: 'professional commercial photography',
    promotion_highlight: shop.description || 'quality and service',
    beverage_items: productLines,
    surface_material: 'premium display surface',
    product_details: productLines,
    address: [shop.address, shop.district, shop.city, shop.country].filter(Boolean).join(', '),
    phone: ci.phone || '',
    email: ci.email || '',
    owner_name: ci.owner_name || '',
  }

  let out = replacePlaceholders(templateContent, vars)
  out += `\n\n[Layout] ${ASPECT_HINT[aspect] || ASPECT_HINT['1:1']}`
  out += `\n[Style brief] ${STYLE_HINT[imageStyle] || ''}`
  if (userPrompt?.trim()) {
    out += `\n\n[Additional ideas from shop owner]\n${userPrompt.trim()}`
  }
  return out.slice(0, 3900)
}
