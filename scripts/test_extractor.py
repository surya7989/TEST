import urllib.request
import re
import html
import json

def extract_product(url):
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'}
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        raw_html = r.read().decode('utf-8', errors='ignore')

    # Title
    m_title = re.search(r'<h1[^>]*class=["\'][^"\']*product_title[^"\']*["\'][^>]*>(.*?)</h1>', raw_html, re.DOTALL)
    title = html.unescape(re.sub(r'<[^>]+>', '', m_title.group(1)).strip()) if m_title else ''

    # Breadcrumbs
    m_bc = re.search(r'<nav[^>]*class=["\'][^"\']*woocommerce-breadcrumb[^"\']*["\'][^>]*>(.*?)</nav>', raw_html, re.DOTALL)
    breadcrumbs = []
    if m_bc:
        links = re.findall(r'<a[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', m_bc.group(1))
        breadcrumbs = [(l[0], html.unescape(re.sub(r'<[^>]+>', '', l[1])).strip()) for l in links]

    # Categories from breadcrumbs or body classes
    category_slugs = []
    for link, name in breadcrumbs:
        if '/shop/' in link:
            p = link.split('/shop/')[-1].strip('/')
            if p:
                category_slugs.extend(p.split('/'))
    # Also check body classes: term-xxxx
    body_terms = re.findall(r'term-([a-z0-9\-]+)', raw_html)
    for bt in body_terms:
        if bt not in category_slugs and bt not in ('simple', 'variable', 'grouped'):
            category_slugs.append(bt)

    # SKU
    m_sku = re.search(r'<span[^>]*class=["\'][^"\']*sku[^"\']*["\'][^>]*>(.*?)</span>', raw_html)
    sku = html.unescape(m_sku.group(1)).strip() if m_sku else ''

    # Short Description
    m_sd = re.search(r'<div[^>]*class=["\'][^"\']*woocommerce-product-details__short-description[^"\']*["\'][^>]*>(.*?)</div>', raw_html, re.DOTALL)
    short_desc = ''
    if m_sd:
        short_desc = html.unescape(re.sub(r'<[^>]+>', ' ', m_sd.group(1))).strip()
        short_desc = re.sub(r'\s+', ' ', short_desc)

    # Full Description
    m_desc = re.search(r'<div[^>]*id=["\']tab-description["\'][^>]*>(.*?)</div>\s*(?:<div class="woocommerce-Tabs|</div>)', raw_html, re.DOTALL)
    full_desc = ''
    if m_desc:
        full_desc = html.unescape(re.sub(r'<[^>]+>', ' ', m_desc.group(1))).strip()
        full_desc = re.sub(r'\s+', ' ', full_desc)

    # Price / Sale Price
    # Inspect price tags
    price_amounts = re.findall(r'<bdi>(?:<span[^>]*>[^<]*</span>)?\s*([0-9\.,]+)</bdi>', raw_html)
    buy_price = 0.0
    if price_amounts:
        try:
            buy_price = float(price_amounts[-1].replace(',', ''))
        except:
            pass

    # Hire price: check if "Hire" or "$xx / week" exists
    hire_available = False
    hire_price = 0.0
    m_hire = re.search(r'(?:hire|rental)[^$]*\$([0-9\.,]+)', raw_html, re.IGNORECASE)
    if m_hire:
        hire_available = True
        try:
            hire_price = float(m_hire.group(1).replace(',', ''))
        except:
            pass

    # Variations JSON
    m_var = re.search(r'data-product_variations=["\'](.*?)["\']', raw_html)
    variations = []
    if m_var:
        try:
            raw_vars = json.loads(html.unescape(m_var.group(1)))
            for v in raw_vars:
                # v has: variation_id, sku, display_price, display_regular_price, attributes, image: { src, thumb_src }, is_in_stock
                attrs = {}
                for ak, av in v.get('attributes', {}).items():
                    clean_ak = ak.replace('attribute_pa_', '').replace('attribute_', '')
                    attrs[clean_ak] = av
                v_img = v.get('image', {}).get('src', '')
                variations.append({
                    'id': str(v.get('variation_id')),
                    'sku': v.get('sku') or sku,
                    'price': v.get('display_price', buy_price),
                    'regular_price': v.get('display_regular_price', buy_price),
                    'attributes': attrs,
                    'image': v_img,
                    'is_in_stock': v.get('is_in_stock', True)
                })
        except Exception as e:
            print(f'Error parsing variations: {e}')

    # Addons / Optional Equipment
    addons = []
    addon_inputs = re.findall(r'<input[^>]*class=["\'][^"\']*wc-pao-addon-field[^"\']*["\'][^>]*>', raw_html)
    addon_labels = re.findall(r'<label[^>]*for=["\']addon-[^"\']*["\'][^>]*>(.*?)</label>', raw_html, re.DOTALL)
    for lbl in addon_labels:
        raw_text = html.unescape(re.sub(r'<[^>]+>', ' ', lbl)).strip()
        raw_text = re.sub(r'\s+', ' ', raw_text)
        price_match = re.search(r'\+\s*\$\s*([0-9\.,]+)', raw_text)
        addon_price = float(price_match.group(1).replace(',', '')) if price_match else 0.0
        addon_name = re.sub(r'\s*\(\s*\+\s*\$[0-9\.,\s]+\)', '', raw_text).strip()
        if addon_name:
            addons.append({
                'name': addon_name,
                'price': addon_price
            })

    # Images
    # Main image & thumbnails
    images = []
    thumbs = re.findall(r'data-thumb=["\']([^"\']+)["\']', raw_html)
    gallery_links = re.findall(r'<div[^>]*class=["\'][^"\']*woocommerce-product-gallery__image[^"\']*["\'][^>]*>\s*<a[^>]*href=["\']([^"\']+)["\']', raw_html)
    all_imgs = gallery_links + thumbs
    for img in all_imgs:
        if img not in images and not img.endswith('.svg') and not 'placeholder' in img:
            images.append(img)

    # Documents
    doc_matches = re.findall(r'<a[^>]*href=["\']([^"\']+\.(?:pdf|docx?|xlsx?))["\'][^>]*>(.*?)</a>', raw_html, re.IGNORECASE)
    documents = []
    for durl, dname in doc_matches:
        cleanname = html.unescape(re.sub(r'<[^>]+>', '', dname)).strip()
        if not cleanname or 'feedback' in cleanname.lower():
            continue
        documents.append({'title': cleanname, 'url': durl})

    return {
        'url': url,
        'title': title,
        'sku': sku,
        'breadcrumbs': breadcrumbs,
        'category_slugs': list(set(category_slugs)),
        'short_desc': short_desc[:120] + '...' if len(short_desc) > 120 else short_desc,
        'buy_price': buy_price,
        'hire_available': hire_available,
        'hire_price': hire_price,
        'images_count': len(images),
        'first_image': images[0] if images else None,
        'variations_count': len(variations),
        'variations_sample': variations[:2],
        'addons_count': len(addons),
        'addons': addons,
        'documents_count': len(documents),
        'documents_sample': documents[:2]
    }

if __name__ == '__main__':
    for test_u in [
        'https://www.rehabhire.com.au/product/accora-configura-comfort-black/',
        'https://www.rehabhire.com.au/product/heel-protector-silicore-fibre/'
    ]:
        res = extract_product(test_u)
        print(f"\n--- {res['title']} ---")
        print(f"SKU: {res['sku']}")
        print(f"Price: ${res['buy_price']}")
        print(f"Categories: {res['category_slugs']}")
        print(f"Images: {res['images_count']}, First: {res['first_image']}")
        print(f"Variations: {res['variations_count']}")
        if res['variations_sample']:
            print(f"  Sample Var: {res['variations_sample'][0]}")
        print(f"Addons ({res['addons_count']}): {res['addons']}")
        print(f"Documents ({res['documents_count']}): {res['documents_sample']}")

