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

/** Remove any remaining unresolved {{placeholder}} tokens so the final
 *  prompt doesn't contain template markers that confuse the image model. */
function cleanupUnresolvedPlaceholders(text) {
  return text.replace(/\{\{[^}]+\}\}/g, '')
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
 * @param {number} [opts.maxLength] - max chars for the final prompt (default 3900)
 */
export function buildImagePrompt({
  templateContent,
  shop,
  aspect,
  imageStyle,
  shopOnly,
  selectedProducts,
  userPrompt,
  maxLength = 3900,
}) {
  const ci = shop.contact_info && typeof shop.contact_info === 'object' ? shop.contact_info : {}
  const styleHint = STYLE_HINT[imageStyle] || imageStyle

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

  const shopNameParts = (shop.name || '').split(' ')
  const contactText = [ci.phone, ci.email].filter(Boolean).join(' | ')
  const addressText = [shop.address, shop.district, shop.city, shop.country].filter(Boolean).join(', ')

  // First three products for named variant slots
  const p0 = selectedProducts[0]
  const p1 = selectedProducts[1]
  const p2 = selectedProducts[2]
  const p0Name = p0?.name || shop.name || 'product'
  const p1Name = p1?.name || p0Name
  const p2Name = p2?.name || p0Name

  const vars = {
    // ── Shop identity ──────────────────────────────────────────────────
    shop_name: shop.name || '',
    brand_name: shop.name || '',
    collection_name: shop.name || '',

    // ── Campaign / style ───────────────────────────────────────────────
    campaign_theme: styleHint,
    style_theme: styleHint,
    collection_theme: styleHint,
    design_style: 'professional commercial photography',
    layout_style: 'professional commercial layout',
    campaign_name: shop.name || '',
    event_name: shop.description || 'Special Promotion',

    // ── Promotion copy ─────────────────────────────────────────────────
    promotion_highlight: shop.description || 'quality and service',
    promotion_title: shop.description || shop.name || '',
    promotion_text: shop.description || 'Special Offer',
    promotion_tag: shop.description || 'Special Offer',
    tagline_text: shop.description || shop.name || '',
    button_text: 'Shop Now',
    cta_text: 'Order Now',
    cta_primary: 'Order Now',
    cta_secondary: 'See More',
    discount_text: 'Best Deals',
    discount_value: '',
    price_tag: 'attractive prices',
    price_text: 'See menu for prices',
    price_1: p0?.price ? String(p0.price) : '',
    price_2: p1?.price ? String(p1.price) : '',
    price_3: p2?.price ? String(p2.price) : '',
    product_label_1: p0Name,
    product_label_2: p1Name,
    product_label_3: p2Name,

    // ── Contact / address ──────────────────────────────────────────────
    address: addressText,
    contact_info: contactText,
    phone: ci.phone || '',
    email: ci.email || '',
    owner_name: ci.owner_name || '',

    // ── Product category / industry ────────────────────────────────────
    product_category: shop.industry || 'consumer product',

    // ── Product lines (generic across all industry templates) ─────────
    beverage_items: productLines,
    product_details: productLines,
    shoe_items: productLines,
    accessory_items: productLines,
    beauty_products: productLines,
    main_dishes: productLines,

    // ── Specific product names ─────────────────────────────────────────
    item_name: p0Name,
    product_name: p0Name,
    product_item: p0Name,
    product_variant_1: p0Name,
    product_variant_2: p1Name,
    product_variant_3: p2Name,

    // ── Headline text derived from shop name ───────────────────────────
    headline_text: shop.name || '',
    headline_word_1: shopNameParts[0] || '',
    headline_word_2: shopNameParts.slice(1).join(' ') || '',
    headline_primary: shop.name || '',
    headline_secondary: shop.description
      ? shop.description.split(' ').slice(0, 5).join(' ')
      : '',

    // ── Surface / material ─────────────────────────────────────────────
    surface_material: 'premium display surface',
    cup_or_container_type: 'elegant container',
    table_material: 'wooden',

    // ── Generic style/color hints (AI will interpret creatively) ───────
    color_primary: 'vibrant brand color',
    color_secondary: 'complementary accent color',
    primary_color: 'professional tone',
    background_color: 'professional neutral background',
    background_color_primary: 'soft neutral background',
    background_color_secondary: 'light complementary tone',
    background_color_tertiary: 'soft accent tone',
    background_color_1: 'warm neutral tone',
    background_color_2: 'light complementary shade',
    brand_color_primary: 'brand primary color',
    accent_color: 'vibrant accent',
    accent_color_primary: 'brand accent color',
    accent_color_1: 'bright accent',
    accent_color_2: 'secondary accent',
    accent_color_3: 'tertiary accent',
    headline_color: 'bold contrasting color',
    text_color_primary: 'dark readable text color',
    text_fill_color: 'white',
    text_outline_color: 'dark contrasting outline',
    headline_font_style: 'modern bold',

    // ── Visual/atmosphere descriptors ──────────────────────────────────
    product_layout: 'elegant modern arrangement',
    material_detail: 'premium quality material',
    material_highlights: 'exquisite details and craftsmanship',
    food_texture_detail: 'fresh and vibrant textures',
    side_dishes_drinks: 'complementary items',
    price_style: 'bold clear pricing',
    color_palette: 'professional brand colors',
    background_elements: 'elegant decorative patterns',
    background_style: 'clean modern background',
    graphic_elements: 'elegant design accents',
    brand_vibe: 'modern professional',
    target_audience: 'quality-conscious customers',
    lighting_type: 'professional studio lighting',
    key_design_detail: 'distinctive design features',
    drink_texture_or_feature: 'rich texture and visual appeal',
    composition_style: 'dynamic display',
    product_color_or_texture: 'vibrant natural',
    product_variants_or_flavors: 'various product options',
    number_of_items: String(Math.max(selectedProducts.length, 2)),
    product_container_or_form: 'product',
  }

  let out = replacePlaceholders(templateContent, vars)
  out = cleanupUnresolvedPlaceholders(out)

  out += `\n\n[Layout] ${ASPECT_HINT[aspect] || ASPECT_HINT['1:1']}`
  out += `\n[Style brief] ${STYLE_HINT[imageStyle] || ''}`
  if (userPrompt?.trim()) {
    out += `\n\n[Additional ideas from shop owner]\n${userPrompt.trim()}`
  }
  return out.slice(0, maxLength)
}
