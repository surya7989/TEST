#!/usr/bin/env python3
"""
Inspect and verify images in products.json and categories.ts
"""
import json
import os
import re

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    products_file = os.path.join(root, "apps", "frontend", "src", "data", "products.json")
    
    with open(products_file, "r", encoding="utf-8") as f:
        products = json.load(f)

    print(f"Loaded {len(products)} products.")

    rehab_hire_images = 0
    other_images = 0
    missing_images = 0
    gallery_total = 0
    variants_with_images = 0

    sample_products = [
        "accora-configura-comfort-black",
        "icare-ic333-homecare-bed",
        "arjo-maxi-twin",
        "aspire-lifecomfort-fall-safety-mat",
        "etac-clean-soft-seat-pad"
    ]

    for p in products:
        img = p.get("image", "")
        if not img:
            missing_images += 1
        elif "rehabhire.com.au" in img:
            rehab_hire_images += 1
        else:
            other_images += 1

        gallery = p.get("galleryImages", [])
        gallery_total += len(gallery)

        for v in p.get("variants", []):
            if v.get("image"):
                variants_with_images += 1

    print(f"Rehab Hire CDN Images:       {rehab_hire_images}")
    print(f"Other Hosted Images:         {other_images}")
    print(f"Missing Primary Images:      {missing_images}")
    print(f"Total Gallery Images:        {gallery_total}")
    print(f"Total Variant-mapped Images: {variants_with_images}")

    print("\nSample Product Image Audit:")
    for slug in sample_products:
        p = next((x for x in products if x["slug"] == slug), None)
        if p:
            print(f"- [{p['name']}]:")
            print(f"    Primary: {p.get('image')}")
            print(f"    Gallery ({len(p.get('galleryImages', []))} items): {p.get('galleryImages', [])[:2]}")
        else:
            print(f"- [NOT FOUND: {slug}]")

if __name__ == "__main__":
    main()
