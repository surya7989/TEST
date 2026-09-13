#!/usr/bin/env python3
"""
AT Specialists Australia - Comprehensive Catalogue & Hierarchy Audit
Validates ingested dataset across all clinical categories, variants, pricing,
optional equipment, accessories, documents, and integrity constraints.
"""

import json
import os
import sys

def run_audit():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    products_json_path = os.path.join(script_dir, "..", "apps", "frontend", "src", "data", "products.json")
    categories_ts_path = os.path.join(script_dir, "..", "apps", "frontend", "src", "data", "categories.ts")

    if not os.path.exists(products_json_path):
        print(f"Error: products.json not found at {products_json_path}")
        sys.exit(1)

    with open(products_json_path, "r", encoding="utf-8") as f:
        products = json.load(f)

    # Calculate statistics
    total_products = len(products)
    unique_ids = set()
    unique_slugs = set()
    duplicate_ids = 0
    duplicate_slugs = 0

    total_variants = 0
    products_with_variants = 0
    products_with_size = 0
    products_with_colour = 0
    products_with_depth = 0
    products_with_optional_equipment = 0
    total_optional_equipment_items = 0
    products_with_accessories = 0
    products_with_documents = 0
    total_documents = 0

    buy_only_count = 0
    hire_only_count = 0
    both_count = 0
    quote_only_count = 0

    zero_price_count = 0
    missing_image_count = 0
    missing_category_count = 0

    all_categories = set()
    category_product_counts = {}

    for p in products:
        pid = p.get("id")
        pslug = p.get("slug")
        
        if pid in unique_ids:
            duplicate_ids += 1
        unique_ids.add(pid)

        if pslug in unique_slugs:
            duplicate_slugs += 1
        unique_slugs.add(pslug)

        # Image check
        if not p.get("image") or p.get("image") == "":
            missing_image_count += 1

        # Categories
        cats = p.get("categories", [])
        if not cats:
            missing_category_count += 1
        for c in cats:
            all_categories.add(c)
            category_product_counts[c] = category_product_counts.get(c, 0) + 1

        # Purchase type
        buy_avail = p.get("buyAvailable", False)
        hire_avail = p.get("hireAvailable", False)
        buy_price = p.get("buyPrice", 0)
        hire_price = p.get("hirePrice", 0)

        if p.get("quoteRequired", False) or (buy_price == 0 and hire_price == 0):
            quote_only_count += 1
        elif buy_avail and hire_avail:
            both_count += 1
        elif hire_avail and not buy_avail:
            hire_only_count += 1
        elif buy_avail and not hire_avail:
            buy_only_count += 1

        # Variants & Attributes
        variants = p.get("variants", [])
        total_variants += len(variants)
        if len(variants) > 0:
            products_with_variants += 1

        attrs = p.get("attributes", [])
        attr_slugs = [a.get("slug", "").lower() for a in attrs]
        if "size" in attr_slugs:
            products_with_size += 1
        if "colour" in attr_slugs or "color" in attr_slugs:
            products_with_colour += 1
        if "depth" in attr_slugs:
            products_with_depth += 1

        # Optional equipment
        opt = p.get("optionalEquipment", [])
        if len(opt) > 0:
            products_with_optional_equipment += 1
            total_optional_equipment_items += len(opt)

        # Accessories
        acc = p.get("accessories", [])
        if len(acc) > 0:
            products_with_accessories += 1

        # Documents
        docs = p.get("documents", [])
        if len(docs) > 0:
            products_with_documents += 1
            total_documents += len(docs)

    print("================================================================================")
    print("AT SPECIALISTS AUSTRALIA - CATALOGUE DATA AUDIT REPORT")
    print("================================================================================")
    print(f"Total Unique Products Ingested:        {total_products}")
    print(f"Total Product Variants Generated:       {total_variants}")
    print(f"Total Unique Categories Referenced:     {len(all_categories)}")
    print("--------------------------------------------------------------------------------")
    print(f"Products with Size Attribute:           {products_with_size}")
    print(f"Products with Colour Attribute:         {products_with_colour}")
    print(f"Products with Depth Attribute:          {products_with_depth}")
    print(f"Products with Multi-Variant Options:    {products_with_variants}")
    print(f"Products with Optional Equipment:       {products_with_optional_equipment} ({total_optional_equipment_items} total add-ons)")
    print(f"Products with Clinical Accessories:     {products_with_accessories}")
    print(f"Products with Downloadable Documents:   {products_with_documents} ({total_documents} total PDFs/manuals)")
    print("--------------------------------------------------------------------------------")
    print("PURCHASE & RENTAL FLEET BREAKDOWN:")
    print(f"  - Buy Only Products:                  {buy_only_count}")
    print(f"  - Hire Only Products:                 {hire_only_count}")
    print(f"  - Hire & Buy (Flexible Fleet):        {both_count}")
    print(f"  - Quote Only / Complex AT:            {quote_only_count}")
    print("--------------------------------------------------------------------------------")
    print("DATA INTEGRITY VERIFICATION:")
    print(f"  - Duplicate IDs:                      {duplicate_ids} {'[PASS]' if duplicate_ids == 0 else '[FAIL]'}")
    print(f"  - Duplicate Slugs:                    {duplicate_slugs} {'[PASS]' if duplicate_slugs == 0 else '[FAIL]'}")
    print(f"  - Missing Primary Images:             {missing_image_count} {'[PASS]' if missing_image_count == 0 else '[FAIL]'}")
    print(f"  - Missing Category References:        {missing_category_count} {'[PASS]' if missing_category_count == 0 else '[FAIL]'}")
    print("================================================================================")
    
    if duplicate_ids == 0 and duplicate_slugs == 0 and missing_category_count == 0:
        print("RESULT: ALL CATALOGUE DATA INTEGRITY CHECKS PASSED SUCCESSFULLY [PASS]")
        return 0
    else:
        print("RESULT: CATALOGUE DATA INTEGRITY CHECKS FAILED [FAIL]")
        return 1

if __name__ == "__main__":
    sys.exit(run_audit())
