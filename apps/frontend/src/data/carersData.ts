export interface CarerProductItem {
  id: string;
  name: string;
  categoryId: 'womens-pants' | 'mens-pants' | 'unisex-specialists' | 'specialists-skincare';
  categoryName: string;
  price: number;
  image: string;
  absorbency: string;
  packSize: string;
  badge?: string;
  description: string;
  features: string[];
  sizes: string[];
  inStock: boolean;
  ndisEligible: boolean;
}

export interface CarerCategory {
  id: 'womens-pants' | 'mens-pants' | 'unisex-specialists' | 'specialists-skincare';
  title: string;
  image: string;
  description: string;
  href: string;
  badge?: string;
  productCount: number;
  highlights: string[];
}

export interface CarerArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  fullContent: string[];
  tips: string[];
  category: string;
  readTime: string;
  image: string;
  link: string;
}

export const carerCategories: CarerCategory[] = [
  {
    id: 'womens-pants',
    title: "Women's Pants",
    image: '/images/carers/cat-womens-pants.png',
    description: 'Discreet and secure pull-up underwear designed specifically for female anatomy, offering high absorption and triple protection.',
    href: '/shop/womens-pants',
    badge: 'Popular for Carers',
    productCount: 4,
    highlights: ['Triple protection from leaks, odour & moisture', 'Feel & look like regular underwear', 'Breathable dermatologically tested fabric']
  },
  {
    id: 'mens-pants',
    title: "Men's Pants",
    image: '/images/carers/cat-mens-pants.png',
    description: 'Masculine navy pull-up protective underwear shaped for men, ensuring complete discretion and reliable leak security.',
    href: '/shop/mens-pants',
    badge: 'Men\'s Specialist',
    productCount: 3,
    highlights: ['Targeted absorption zone in the front', 'Discreet navy colour design', 'Odour control system']
  },
  {
    id: 'unisex-specialists',
    title: 'Unisex Specialists',
    image: '/images/carers/cat-unisex-specialists.png',
    description: 'High-performance slip briefs with adjustable tabs, wetness indicators, and extra security for assisted changing and nighttime care.',
    href: '/shop/unisex-specialists',
    badge: 'High Absorption',
    productCount: 3,
    highlights: ['Adjustable refastenable fastening tapes', 'ConfioAir breathable side panels', 'Wetness indicator for easy carer checks']
  },
  {
    id: 'specialists-skincare',
    title: 'Specialists Skincare',
    image: '/images/carers/cat-specialists-skincare.png',
    description: 'Gentle no-rinse cleansing foams, barrier creams, and soft washcloths formulated to protect elderly and fragile skin.',
    href: '/shop/specialists-skincare',
    badge: 'Skin Health',
    productCount: 3,
    highlights: ['3-in-1 cleanses, restores and protects', 'No water rinse required', 'Maintains skin natural pH balance']
  }
];

export const carerProducts: CarerProductItem[] = [
  // Women's Pants
  {
    id: 'tena-discreet-high-waist-creme',
    name: 'TENA Discreet High Waist Incontinence Underwear - Crème',
    categoryId: 'womens-pants',
    categoryName: "Women's Pants",
    price: 35.64,
    image: '/images/carers/products/discreet-high-waist-creme.png',
    absorbency: 'Plus (5.5/8 Drops)',
    packSize: 'Pack of 10',
    badge: 'High Waist Design',
    description: 'Soft crème coloured protective underwear featuring an elegant high waist and lace-like feminine pattern.',
    features: ['High-waisted fit for maximum tummy comfort', 'Triple Protection from leaks, odour and moisture', 'Looks and feels just like regular underwear'],
    sizes: ['Medium (Waist 75-100cm)', 'Large (Waist 95-125cm)'],
    inStock: true,
    ndisEligible: true
  },
  {
    id: 'tena-discreet-low-waist-black',
    name: 'TENA Discreet Low Waist Underwear - Noir Black',
    categoryId: 'womens-pants',
    categoryName: "Women's Pants",
    price: 37.26,
    image: '/images/carers/products/discreet-low-waist-black.jpg',
    absorbency: 'Plus (5/8 Drops)',
    packSize: 'Pack of 9',
    badge: 'Discreet Noir',
    description: 'Stylish all-black disposable underwear with low-waist cut, engineered for ultimate discretion with black clothing.',
    features: ['Black inside and out for complete discretion', 'microPROTEX™ compression core locks in leaks', 'Silky soft fabric with odour neutralizer'],
    sizes: ['Medium (Waist 75-100cm)', 'Large (Waist 95-125cm)'],
    inStock: true,
    ndisEligible: true
  },
  {
    id: 'tena-discreet-low-waist-white',
    name: 'TENA Discreet Low Waist Underwear - Blanc White',
    categoryId: 'womens-pants',
    categoryName: "Women's Pants",
    price: 35.46,
    image: '/images/carers/products/discreet-low-waist-white.jpg',
    absorbency: 'Plus (5/8 Drops)',
    packSize: 'Pack of 10',
    badge: 'Low Waist Fit',
    description: 'Classic white disposable protective underwear offering dependable everyday leak security and snug hip fit.',
    features: ['Low waistline tailored to hip-hugger garments', 'Breathable micro-stretch waistband', 'Dermatologically tested for skin gentleness'],
    sizes: ['Small (Waist 65-85cm)', 'Medium (Waist 75-100cm)', 'Large (Waist 95-125cm)'],
    inStock: true,
    ndisEligible: true
  },
  {
    id: 'tena-proskin-pants-super-women',
    name: 'TENA ProSkin Pants Super - High Capacity Pull-Ups',
    categoryId: 'womens-pants',
    categoryName: "Women's Pants",
    price: 39.50,
    image: '/images/carers/products/proskin-pants-super.png',
    absorbency: 'Super (7/8 Drops)',
    packSize: 'Pack of 12',
    badge: 'Heavy Protection',
    description: 'Heavy absorbency pull-up pants with FeelDry Advanced technology for active women needing extra peace of mind.',
    features: ['FeelDry Advanced™ rapidly pulls fluid away', 'Anti-leak barriers around legs', 'Odour Neutralizer prevents unwanted smells'],
    sizes: ['Medium (Waist 80-110cm)', 'Large (Waist 100-135cm)', 'Extra Large (Waist 120-160cm)'],
    inStock: true,
    ndisEligible: true
  },

  // Men's Pants
  {
    id: 'tena-men-active-fit-navy',
    name: 'TENA Men Active Fit Protective Underwear - Navy',
    categoryId: 'mens-pants',
    categoryName: "Men's Pants",
    price: 30.60,
    image: '/images/carers/products/men-active-fit-navy.png',
    absorbency: 'Level 4 Plus (6/8 Drops)',
    packSize: 'Pack of 10',
    badge: 'Active Masculine Fit',
    description: 'Masculine navy blue pull-up underwear designed specifically for male anatomy with a reinforced front core.',
    features: ['Secure absorption zone positioned at the front', 'Masculine navy blue brief styling', 'Flexible waistband stays in place during activity'],
    sizes: ['Medium (Waist 75-105cm)', 'Large / XL (Waist 95-130cm)'],
    inStock: true,
    ndisEligible: true
  },
  {
    id: 'tena-men-premium-fit-maxi',
    name: 'TENA Men Premium Fit Protective Underwear Maxi',
    categoryId: 'mens-pants',
    categoryName: "Men's Pants",
    price: 48.60,
    image: '/images/carers/products/men-premium-fit-maxi.png',
    absorbency: 'Maxi (7/8 Drops)',
    packSize: 'Pack of 10',
    badge: 'Maxi Security',
    description: 'Premium cotton-feel underwear engineered with high absorption capacity for heavy daytime and night-time leaks.',
    features: ['Dual Core Maxi absorption in the front zone', 'Cotton-like breathable stretch material', 'Tear-away side seams for quick carer changes'],
    sizes: ['Medium (Waist 75-105cm)', 'Large (Waist 95-130cm)'],
    inStock: true,
    ndisEligible: true
  },
  {
    id: 'tena-proskin-pants-maxi-men',
    name: 'TENA ProSkin Pants Maxi - Overnight Male & Carer Care',
    categoryId: 'mens-pants',
    categoryName: "Men's Pants",
    price: 42.50,
    image: '/images/carers/products/proskin-pants-maxi.png',
    absorbency: 'Maxi (8/8 Drops)',
    packSize: 'Pack of 14',
    badge: 'Overnight Care',
    description: 'Maximum absorbency pull-up pants ensuring full night-time dryness and skin protection for heavy leakage.',
    features: ['8-drop maximum protection for all-night dryness', 'Triple Protection for skin health', 'Soft elastic leg barriers prevent side leaks'],
    sizes: ['Medium (Waist 80-110cm)', 'Large (Waist 100-135cm)', 'Extra Large (Waist 120-160cm)'],
    inStock: true,
    ndisEligible: true
  },

  // Unisex Specialists
  {
    id: 'tena-proskin-pants-maxi-unisex',
    name: 'TENA ProSkin Pants Maxi - Heavy Unisex Pull-Ups',
    categoryId: 'unisex-specialists',
    categoryName: 'Unisex Specialists',
    price: 42.50,
    image: '/images/carers/products/proskin-pants-maxi.png',
    absorbency: 'Maxi (8/8 Drops - 2550ml)',
    packSize: 'Pack of 14',
    badge: 'Maxi Absorbency',
    description: 'High-absorption unisex pull-up pants designed for individuals requiring maximum protection and simple carer checkups.',
    features: ['Up to 2550ml absorbency for continuous dryness', 'ConfioAir 100% breathable materials', 'Approved by the Skin Health Alliance'],
    sizes: ['Small (Waist 65-85cm)', 'Medium (Waist 80-110cm)', 'Large (Waist 100-135cm)', 'XL (Waist 120-160cm)'],
    inStock: true,
    ndisEligible: true
  },
  {
    id: 'tena-proskin-flex-maxi',
    name: 'TENA ProSkin Flex Maxi - Ergonomic Belted Briefs',
    categoryId: 'unisex-specialists',
    categoryName: 'Unisex Specialists',
    price: 46.00,
    image: '/images/carers/products/proskin-flex-maxi.png',
    absorbency: 'Maxi (8/8 Drops)',
    packSize: 'Pack of 22',
    badge: 'Ergonomic Belt',
    description: 'Belted all-in-one briefs with ComfiStretch belt, scientifically proven to reduce caregiver back strain during changes.',
    features: ['ComfiStretch™ adjustable belt saves carer lifting', 'Fast hook-and-loop refastenable tapes', 'Wetness indicator reveals when changing is needed'],
    sizes: ['Small (Waist 56-85cm)', 'Medium (Waist 71-102cm)', 'Large (Waist 83-120cm)', 'XL (Waist 105-153cm)'],
    inStock: true,
    ndisEligible: true
  },
  {
    id: 'tena-proskin-pants-super-unisex',
    name: 'TENA ProSkin Pants Super - All-Day Support',
    categoryId: 'unisex-specialists',
    categoryName: 'Unisex Specialists',
    price: 39.50,
    image: '/images/carers/products/proskin-pants-super.png',
    absorbency: 'Super (7/8 Drops - 2000ml)',
    packSize: 'Pack of 14',
    badge: 'Carer Favourite',
    description: 'Comfortable unisex protective pull-ups providing dependable medium-to-heavy continence support for assisted living.',
    features: ['Quick liquid dispersion prevents surface dampness', 'Soft body-hugging elastic threads', 'Dermatologically accredited by Skin Health Alliance'],
    sizes: ['Small (Waist 65-85cm)', 'Medium (Waist 80-110cm)', 'Large (Waist 100-135cm)', 'XL (Waist 120-160cm)'],
    inStock: true,
    ndisEligible: true
  },

  // Specialists Skincare
  {
    id: 'tena-proskin-barrier-cream',
    name: 'TENA ProSkin Zinc Barrier Cream (150ml)',
    categoryId: 'specialists-skincare',
    categoryName: 'Specialists Skincare',
    price: 15.50,
    image: '/images/carers/products/proskin-barrier-cream.png',
    absorbency: 'Water-Repellent Layer',
    packSize: '150ml Tube',
    badge: '10% Zinc Oxide',
    description: 'Water-repellent protective cream with zinc oxide and canola oil, shielding fragile perineal skin from irritants and moisture breakdown.',
    features: ['Forms a soothing protective shield against urine & stool', 'Fragrance-free and preservative-free', 'Easy to spread and remove without scrubbing'],
    sizes: ['150ml Tube'],
    inStock: true,
    ndisEligible: true
  },
  {
    id: 'tena-proskin-wet-wipes',
    name: 'TENA ProSkin Plastic-Free Wet Wipes (48 Large Wipes)',
    categoryId: 'specialists-skincare',
    categoryName: 'Specialists Skincare',
    price: 14.00,
    image: '/images/carers/products/proskin-wet-wipes.png',
    absorbency: '3-in-1 Skin Care',
    packSize: 'Pack of 48 Wipes',
    badge: '100% Plastic-Free',
    description: 'Extra-large, thick pre-moistened cleansing wipes that cleanse, restore, and protect elderly skin in a single easy step.',
    features: ['3-in-1 cleanses, moisturizes and protects', '100% biodegradable plant-based fibres', 'One-handed dispensing lid for effortless carer use'],
    sizes: ['Pack of 48 (XL Size 30x20cm)'],
    inStock: true,
    ndisEligible: true
  },
  {
    id: 'tena-proskin-body-lotion',
    name: 'TENA ProSkin Nourishing Body Lotion (500ml Pump)',
    categoryId: 'specialists-skincare',
    categoryName: 'Specialists Skincare',
    price: 15.13,
    image: '/images/carers/products/proskin-body-lotion.png',
    absorbency: 'Hydrating Formula',
    packSize: '500ml Pump Bottle',
    badge: 'Natural Canola Oil',
    description: 'Gentle, light moisturizing lotion with natural oils and vitamin E, specially formulated to replenish aging and sensitive skin.',
    features: ['Replenishes natural skin moisture balance', 'Absorbs quickly with no greasy residue', 'Convenient hygienic pump dispenser'],
    sizes: ['500ml Pump Bottle'],
    inStock: true,
    ndisEligible: true
  }
];

export const carerArticles: CarerArticle[] = [
  {
    id: '1',
    slug: 'persistent-constipation',
    title: 'Persistent constipation',
    excerpt: 'Constipation is one of the most common causes of faecal incontinence. Chronic constipation could lead to weakened pelvic floors and unexpected leakage.',
    fullContent: [
      'Constipation is one of the most common causes of bowel or faecal incontinence. When stool becomes hard, dry, and impacted in the rectum, it stretches and weakens the rectal muscles.',
      'Over time, watery stool from higher in the digestive tract can bypass the hard blockage and leak out involuntarily. For family carers, recognizing that accidental bowel leakage is often triggered by underlying constipation is the first crucial step toward effective management.',
      'Dietary improvements including gradual fibre increases, adequate daily hydration, regular toilet routines, and gentle mobility assistance can make a tremendous difference in comfort and dignity.'
    ],
    tips: [
      'Ensure the person drinks 1.5–2 litres of water throughout the day unless fluid-restricted.',
      'Incorporate soluble and insoluble fibre (oats, stewed prunes, kiwi fruit, chia seeds).',
      'Encourage regular morning bathroom visits 20–30 minutes after breakfast.',
      'Consult a GP or continence nurse for tailored gentle laxatives or stool softeners.'
    ],
    category: 'Carers',
    readTime: '4 min read',
    image: '/images/carers/article-constipation.jpg',
    link: '/blogs/understanding-incontinence/persistent-constipation'
  },
  {
    id: '2',
    slug: 'loss-of-mobility',
    title: 'Loss of mobility',
    excerpt: 'Sometimes the simple fact of not being able to get around due to physical injury, disease or age makes getting to the toilet on time difficult.',
    fullContent: [
      'Functional incontinence occurs not because the bladder or bowel is impaired, but because physical limitations, arthritis, stroke recovery, Parkinson’s disease, or environmental barriers prevent reaching the toilet in time.',
      'For family carers, adapting the living environment and establishing structured toilet timing schedules reduces rush-related fall risks while preserving independence.',
      'Using easy-to-fasten clothing and placing bedside commodes or clear pathways with night lights can transform daily routines for both the individual and carer.'
    ],
    tips: [
      'Keep hallways well-lit and remove trip hazards such as loose rugs and clutter.',
      'Choose clothing with elastic waistbands or Velcro fastenings instead of complex buttons.',
      'Consider a raised toilet seat with integrated grab rails for easier sitting and standing.',
      'Utilize protective pants with tear-away side seams for effortless assisted changes.'
    ],
    category: 'Mobility & Care',
    readTime: '5 min read',
    image: '/images/carers/article-mobility.png',
    link: '/blogs/understanding-incontinence/loss-of-mobility'
  },
  {
    id: '3',
    slug: 'enlarged-prostate-gland-or-prostate-surgery',
    title: 'Enlarged prostate gland or prostate surgery',
    excerpt: 'The most common type of bladder weakness experienced by men is a continuous dripping or sudden urgency, often linked to prostate changes.',
    fullContent: [
      'As men age, benign prostatic hyperplasia (BPH) or prostate surgical interventions can compress the urethra or affect bladder sphincter function.',
      'This frequently results in post-micturition dribble, nocturia (waking multiple times at night), or sudden urgency. Understanding these male-specific mechanisms empowers carers to provide supportive, targeted solutions.',
      'Specialized male anatomical shields and absorbent pants channel fluids directly away from sensitive skin, preventing soreness and maintaining peace of mind.'
    ],
    tips: [
      'Encourage ‘double voiding’—waiting a few seconds after urination to empty remaining drops.',
      'Avoid high caffeine and alcohol intake in the late afternoon and evening.',
      'Choose cup-shaped male guards with adhesive strips designed specifically for men\'s underwear.',
      'Consult a urologist if sudden retention or severe flow changes occur.'
    ],
    category: 'Men\'s Health',
    readTime: '6 min read',
    image: '/images/carers/article-prostate.png',
    link: '/blogs/understanding-incontinence/enlarged-prostate-gland-or-prostate-surgery'
  },
  {
    id: '4',
    slug: 'being-a-smoker',
    title: 'Being a smoker',
    excerpt: 'A chronic cough can be an indirect cause of leakage, mainly because of the frequency and abnormal intra-abdominal pressure exerted on the pelvic floor.',
    fullContent: [
      'Persistent coughing from smoking places repetitive, intense downward pressure on the pelvic floor muscles and bladder neck.',
      'Over months and years, this constant mechanical strain can cause or aggravate stress incontinence during coughing, laughing, or lifting.',
      'Additionally, nicotine acts as a known bladder irritant that may stimulate premature muscle spasms and urinary urgency.'
    ],
    tips: [
      'Support gradual smoking cessation programs with medical advice.',
      'Perform gentle pelvic floor contraction exercises prior to coughing (known as ‘The Knack’).',
      'Stay hydrated to avoid concentrated, irritating urine that further triggers urgency.',
      'Use high-speed absorption pads that lock away sudden stress leaks instantly.'
    ],
    category: 'Lifestyle & Health',
    readTime: '3 min read',
    image: '/images/carers/article-smoker.jpg',
    link: '/blogs/understanding-incontinence/being-a-smoker'
  },
  {
    id: '5',
    slug: 'what-is-light-bladder-leakage',
    title: 'What is Light Bladder Leakage, its Causes & Treatments?',
    excerpt: 'Understanding more about light bladder leakage (LBL) will help you improve and manage this very widespread and treatable condition.',
    fullContent: [
      'Light Bladder Leakage (LBL) refers to small occasional leaks when sneezing, coughing, exercising, or experiencing an overwhelming urge to urinate.',
      'It is remarkably common, affecting 1 in 3 women and 1 in 10 men in Australia at various stages of life. Crucially, LBL is not an inevitable consequence of aging that one simply has to endure.',
      'With targeted pelvic health physiotherapy, lifestyle adjustments, and discreet modern liners, most people manage or completely resolve their symptoms.'
    ],
    tips: [
      'Differentiate between standard period pads and continence pads—continence pads absorb thinner liquid much faster and neutralize ammonia odours.',
      'Practice regular pelvic floor muscle exercises (Kegels) with correct technique.',
      'Keep a 3-day bladder diary recording fluid intake, bathroom frequency, and leak events.',
      'Avoid dehydrating yourself to prevent leaks, as concentrated urine irritates the bladder lining.'
    ],
    category: 'Women\'s Health',
    readTime: '5 min read',
    image: '/images/carers/article-light-leakage.jpg',
    link: '/blogs/understanding-incontinence/what-is-light-bladder-leakage'
  },
  {
    id: '6',
    slug: 'what-are-little-leaks',
    title: 'What are Little Leaks?',
    excerpt: 'Leaks are probably more common than you think. Whether you’ve just had a baby, or started to experience changes in mid-life, know you are not alone.',
    fullContent: [
      '‘Little leaks’ typically describe occasional drops or small squirts of urine that occur during physical exertion, heavy laughter, or sudden position shifts.',
      'Hormonal changes during pregnancy, post-partum recovery, perimenopause, and menopause alter the elasticity of pelvic tissues.',
      'Acknowledging these changes openly reduces anxiety and helps individuals choose the correct discreet protection without interrupting their daily activities.'
    ],
    tips: [
      'Choose ultra-thin micro-absorbent liners for lightweight every-day security.',
      'Engage in low-impact exercises such as swimming and guided Pilates.',
      'Limit known bladder irritants such as carbonated drinks and artificial sweeteners.',
      'Celebrate progress when pelvic floor strengthening routines start showing results.'
    ],
    category: 'Lifestyle & Care',
    readTime: '4 min read',
    image: '/images/carers/article-little-leaks.png',
    link: '/blogs/understanding-incontinence/what-are-little-leaks'
  },
  {
    id: '7',
    slug: 'types-of-prolapse',
    title: 'Types, Symptoms & Treatment of Prolapse',
    excerpt: 'The word ‘prolapse’ literally means ‘to fall out of place’. Discover how pelvic organ prolapse affects continence and how it can be managed.',
    fullContent: [
      'Pelvic Organ Prolapse (POP) occurs when one or more pelvic organs (bladder, uterus, or bowel) descend from their normal position due to weakened support ligaments.',
      'Symptoms often include a sensation of heaviness or dragging in the pelvis, difficulty completely emptying the bladder, and associated stress or urge leakage.',
      'Modern treatments range from conservative pelvic floor rehabilitation and support pessaries to gentle surgical techniques tailored to each individual’s quality of life.'
    ],
    tips: [
      'Avoid heavy lifting and learn proper bracing mechanics when standing up.',
      'Treat any chronic coughing or constipation promptly to reduce downward strain.',
      'Consult a specialized pelvic health physiotherapist or gynaecologist for personalized assessment.',
      'Use ergonomic shower commodes or supportive seating aids to alleviate standing discomfort.'
    ],
    category: 'Women\'s Health',
    readTime: '6 min read',
    image: '/images/carers/article-prolapse.webp',
    link: '/blogs/understanding-incontinence/types-of-prolapse'
  },
  {
    id: '8',
    slug: 'types-of-little-leaks',
    title: 'Types of Little Leaks',
    excerpt: 'There are two main types of urine leaks: ‘Stress’ and ‘Urge’. Understanding which one you or your loved one is experiencing is key to the right care.',
    fullContent: [
      'Stress Incontinence happens when physical pressure is exerted on the bladder (laughing, coughing, bending, lifting), causing weak sphincters to briefly release fluid.',
      'Urge Incontinence (Overactive Bladder) involves a sudden, intense and involuntary muscle spasm of the bladder, giving little warning before urination begins.',
      'Many individuals experience ‘Mixed Incontinence’—a combination of both. Accurately pinpointing the type allows carers to select the ideal product absorption rating and timing strategies.'
    ],
    tips: [
      'For stress leakage: focus on pelvic floor strengthening and preemptive support.',
      'For urge leakage: practice bladder retraining techniques, breathing deeply to calm the urge before calmly walking to the toilet.',
      'Ensure high-absorbency pants are readily accessible by the bedside for nighttime confidence.',
      'Review any medications that may have diuretic side-effects with a pharmacist or GP.'
    ],
    category: 'Carer Advice',
    readTime: '5 min read',
    image: '/images/carers/article-types-leaks.jpg',
    link: '/blogs/understanding-incontinence/types-of-little-leaks'
  }
];

export const carerFaqs = [
  {
    q: 'How do I choose between pull-up pants and all-in-one slip briefs for someone I care for?',
    a: 'Pull-up pants (like TENA Pants) are ideal for individuals who can walk or stand and still visit the toilet independently or with minimal help. All-in-one slip briefs with side tapes (like TENA Slip / Flex) are specifically designed for bedridden individuals or those needing full assisted changing while lying down, saving the carer physical lifting strain.'
  },
  {
    q: 'Can continence products be funded through the NDIS or Home Care Packages (HCP)?',
    a: 'Yes! TENA continence products, pull-up pants, slip briefs, bed pads, and skincare are eligible consumables under NDIS Core Supports (Consumables budget) and Government Home Care Packages (Levels 1 to 4). Our team can provide formal quotes and invoices directly to your plan manager or package provider.'
  },
  {
    q: 'How can I prevent skin redness and breakdown (IAD) for someone using incontinence aids?',
    a: 'Moisture and ammonia from urine quickly irritate fragile skin. Follow the 3-step ProSkin routine: 1) Cleanse gently with no-rinse wash cream or soft wet wipes rather than harsh soap, 2) Restore moisture with gentle lotion, and 3) Protect high-risk areas with a breathable zinc barrier cream. Always ensure products with breathable outer layers (like ConfioAir) are used.'
  },
  {
    q: 'How do I find the correct size so leaks around the legs do not happen?',
    a: 'Always measure around the hips at the widest part and the waist at the narrowest part. A common mistake is buying a larger size for extra absorption—this causes loose leg cuffs and leakage. Instead, pick the size that fits snugly around the groin and hips, and increase the absorbency rating (e.g. Plus, Super, or Maxi) if more absorption is needed.'
  }
];
