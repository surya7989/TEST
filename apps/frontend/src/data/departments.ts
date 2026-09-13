import React from 'react';
import {
  Armchair,
  Bed,
  Accessibility,
  Bath,
  Activity,
  Users,
  HeartHandshake,
  HeartPulse,
  Sparkles,
  Layers,
  Package,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { getSubcategories, getCategoryBySlug } from './categories';
import { PRODUCTS, getEffectiveProducts, resolveProductBrand, type Product } from './products';

// AT Specialists storefront departments (mirrors the Shop by Category cards).
// Used by the desktop mega-menu AND the mobile drawer so both stay identical.
export interface AtDepartment {
  id: string;
  name: string;
  blurb: string;
  shopSlug: string;
  slugs: string[];
  icon: React.ElementType;
  isHire?: boolean;
}

export const AT_DEPARTMENTS: AtDepartment[] = [
  {
    id: 'chairs',
    name: 'Chairs & Lift Chairs',
    blurb: 'Configura® posture & electric lift chairs',
    shopSlug: 'chairs',
    slugs: ['chairs', 'lift-chairs', 'day-chairs', 'recliners', 'posture-chairs'],
    icon: Armchair,
  },
  {
    id: 'bedroom',
    name: 'Beds & Pressure Care',
    blurb: 'Hi-lo hospital beds & dynamic air mattresses',
    shopSlug: 'bedroom',
    slugs: ['bedroom', 'electric-beds', 'hospital-beds', 'mattresses', 'bed-accessories', 'over-bed-tables'],
    icon: Bed,
  },
  {
    id: 'wheelchairs',
    name: 'Wheelchairs & Power Mobility',
    blurb: 'Active manual, tilt-in-space & power wheelchairs',
    shopSlug: 'wheelchairs',
    slugs: ['wheelchairs', 'manual-wheelchairs', 'power-wheelchairs', 'transit-wheelchairs'],
    icon: Accessibility,
  },
  {
    id: 'bathroom-and-toilet',
    name: 'Bathroom & Hygiene',
    blurb: 'Shower commodes, bath boards & toilet safety',
    shopSlug: 'bathroom-and-toilet',
    slugs: ['bathroom-and-toilet', 'shower-commodes', 'shower-chairs', 'toilet-aids', 'bath-aids'],
    icon: Bath,
  },
  {
    id: 'mobility-aids',
    name: 'Walking & Mobility Aids',
    blurb: 'Carbon fibre rollators, seat walkers & canes',
    shopSlug: 'mobility-aids',
    slugs: ['mobility-aids', 'walking-aids', 'rollators', 'seat-walkers', 'canes', 'walking-sticks'],
    icon: Activity,
  },
  {
    id: 'patient-handling',
    name: 'Patient Handling & Hoists',
    blurb: 'Standing lifters, mobile hoists & transfer slings',
    shopSlug: 'patient-handling',
    slugs: ['patient-handling', 'hoists', 'lifters', 'slings', 'transfer-aids'],
    icon: Users,
  },
  {
    id: 'daily-living-aids',
    name: 'Daily Living & Independence',
    blurb: 'Adaptive cutlery, kettles, reachers & dining',
    shopSlug: 'daily-living-aids',
    slugs: ['daily-living-aids', 'kitchen-dining', 'reachers', 'dressing-aids', 'medication-aids'],
    icon: HeartHandshake,
  },
  {
    id: 'pressure-care-cushions',
    name: 'Pressure Care & Cushions',
    blurb: 'ROHO air-cell & gel clinical positioning cushions',
    shopSlug: 'pressure-care-cushions',
    slugs: ['pressure-care-cushions', 'cushions', 'therapeutic-cushions', 'seating-and-positioning'],
    icon: HeartPulse,
  },
  {
    id: 'paediatric',
    name: 'Paediatric Equipment',
    blurb: 'Specialist paediatric seating, strollers & therapy',
    shopSlug: 'paediatric',
    slugs: ['paediatric', 'paediatric-wheelchairs', 'paediatric-walking-frames', 'prescription-complex-shower-commodes-paediatric'],
    icon: Sparkles,
  },
  {
    id: 'bariatric',
    name: 'Bariatric High-Capacity',
    blurb: 'Engineered high safe-working-load clinical equipment',
    shopSlug: 'bariatric',
    slugs: ['bariatric', 'bariatric-chairs', 'bariatric-bedroom', 'bariatric-wheelchairs', 'bariatric-patient-handling'],
    icon: Layers,
  },
  {
    id: 'for-carers',
    name: 'Continence & Carer Aids',
    blurb: 'Clinical TENA pads, pull-ups, briefs & bed protection',
    shopSlug: 'for-carers',
    slugs: ['for-carers', 'continence-care', 'pants', 'flex', 'pads-liners', 'all-in-one-slips', 'bed-chair-protection', 'mens-underwear', 'incontinence-aids'],
    icon: ShieldCheck,
  },
  {
    id: 'mobility-ramps',
    name: 'Ramps & Access',
    blurb: 'Portable suitcase, threshold & rubber access ramps',
    shopSlug: 'mobility-ramps',
    slugs: ['mobility-ramps', 'ramps', 'threshold-ramps'],
    icon: Package,
  },
  {
    id: 'hire',
    name: 'Equipment Hire Fleet',
    blurb: 'NDIS funded short & long term clinical hire',
    shopSlug: 'hire',
    slugs: [],
    icon: Clock,
    isHire: true,
  },
];

// Live catalogue product count for a department (same grouping as Shop by Category cards)
export function getDepartmentCount(dept: AtDepartment, productsList?: Product[]): number {
  const prods = productsList || getEffectiveProducts();
  if (dept.isHire) {
    return prods.filter((p) => p.hireAvailable || (p.hirePrice && p.hirePrice > 0)).length;
  }
  if (dept.id === 'for-carers') {
    return prods.filter((p) => {
      const brand = (p.brand || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const pCats = (p.categories || []).map((c) => (c || '').toLowerCase());
      return (brand === 'tena' ||
        pCats.includes('continence-care') ||
        pCats.includes('for-carers') ||
        pCats.includes('incontinence-aids') ||
        pCats.some((c) => dept.slugs.includes(c)) ||
        name.includes('tena') ||
        name.includes('proskin'));
    }).length;
  }
  return prods.filter((p) => {
    const pCats = (p.categories || []).map((c) => (c || '').toLowerCase());
    return dept.slugs.some((s) => pCats.some((pc) => pc.includes(s)));
  }).length;
}

// Live catalogue subcategories grouped under a department
export function getDepartmentSubcategories(dept: AtDepartment) {
  if (dept.isHire) return [];
  const seen = new Set<string>();
  const out: ReturnType<typeof getSubcategories> = [];
  dept.slugs.forEach((s) => {
    const self = getCategoryBySlug(s);
    if (self && !seen.has(self.id)) {
      seen.add(self.id);
      out.push(self);
    }
    getSubcategories(s).forEach((sub) => {
      if (!seen.has(sub.id)) {
        seen.add(sub.id);
        out.push(sub);
      }
    });
  });
  return out;
}

export function getDepartmentHref(dept: AtDepartment): string {
  if (dept.isHire) return '/hire';
  if (dept.id === 'for-carers' || dept.shopSlug === 'for-carers') return '/for-carers';
  return `/shop/${dept.shopSlug}`;
}

export interface DepartmentSubcategory {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export const CURATED_DEPARTMENT_SUBCATEGORIES: Record<string, { name: string; slug: string }[]> = {
  chairs: [
    { name: 'Lift & Recline Chairs', slug: 'lift-chairs' },
    { name: 'Tilt-in-Space & Posture Chairs', slug: 'pressure-relief-chairs' },
    { name: 'Day Chairs & Utility Stools', slug: 'day-chairs-and-stools' },
    { name: 'Bariatric Seating', slug: 'bariatric-chairs' },
    { name: 'Seating Accessories', slug: 'chair-accessories' },
  ],
  bedroom: [
    { name: 'Electric Profiling Beds', slug: 'beds' },
    { name: 'Floorline Low Beds', slug: 'floorline-beds' },
    { name: 'Homecare Care Beds', slug: 'homecare-beds' },
    { name: 'Alternating Air Mattresses', slug: 'air-mattresses' },
    { name: 'Static Foam Mattresses', slug: 'static-mattresses' },
    { name: 'Safety Rails & Protectors', slug: 'bed-rails-and-rail-protectors' },
  ],
  wheelchairs: [
    { name: 'Manual & Transit Wheelchairs', slug: 'manual-wheelchairs' },
    { name: 'Electric Power Wheelchairs', slug: 'power-wheelchairs' },
    { name: 'Prescription & Tilt Seating', slug: 'prescription-complex-wheelchairs' },
    { name: 'Bariatric Wheelchairs', slug: 'bariatric-wheelchairs' },
    { name: 'Wheelchair Accessories', slug: 'wheelchair-accessories' },
  ],
  'bathroom-and-toilet': [
    { name: 'Shower Commodes', slug: 'shower-commodes' },
    { name: 'Tilt-in-Space Commodes', slug: 'tilt-in-space-shower-commodes' },
    { name: 'Shower Chairs & Stools', slug: 'shower-chairs' },
    { name: 'Bath Boards & Benches', slug: 'bath-aids' },
    { name: 'Toilet Overlays & Surrounds', slug: 'toilet-aids' },
  ],
  'mobility-aids': [
    { name: 'Seat Walkers & Rollators', slug: 'seat-walkers' },
    { name: '4-Wheel Rollators', slug: 'wheeled-walkers' },
    { name: 'Walking Frames', slug: 'walking-frames' },
    { name: 'Walking Sticks & Canes', slug: 'walking-sticks' },
    { name: 'Mobility Scooters', slug: 'mobility-scooters' },
  ],
  'patient-handling': [
    { name: 'Standing Lifters & Hoists', slug: 'standing-lifters-and-hoists' },
    { name: 'Patient Transfer Slings', slug: 'slings' },
    { name: 'Floor Lift Slings', slug: 'slings-for-floor-lifts' },
    { name: 'Bariatric Hoists & Slings', slug: 'bariatric-patient-handling' },
    { name: 'Transfer Boards & Aids', slug: 'transfer-equipment' },
  ],
  'daily-living-aids': [
    { name: 'Dining & Kitchen Aids', slug: 'dining-aids' },
    { name: 'Adaptive Kitchenware', slug: 'kitchen' },
    { name: 'Reachers & Pickers', slug: 'reachers' },
    { name: 'Independence Aids', slug: 'daily-living-aids' },
  ],
  'pressure-care-cushions': [
    { name: 'Interconnected Air Cushions', slug: 'air-cushions' },
    { name: 'Clinical Seat Cushions', slug: 'therapeutic-seat-cushions' },
    { name: 'Back Support Cushions', slug: 'therapeutic-back-cushions' },
    { name: 'Positioning & Leg Cushions', slug: 'therapeutic-leg-and-feet-cushions' },
    { name: 'Gel & Hybrid Cushions', slug: 'hybrid-cushions' },
  ],
  paediatric: [
    { name: 'Paediatric Wheelchairs', slug: 'paediatric-wheelchairs' },
    { name: 'Paediatric Walking Aids', slug: 'paediatric-walking-frames' },
    { name: 'Paediatric Shower & Seating', slug: 'prescription-complex-shower-commodes-paediatric' },
  ],
  bariatric: [
    { name: 'Bariatric Beds & Mattresses', slug: 'bariatric-bedroom' },
    { name: 'Bariatric Chairs & Recliners', slug: 'bariatric-chairs' },
    { name: 'Bariatric Wheelchairs', slug: 'bariatric-wheelchairs' },
    { name: 'Bariatric Shower Commodes', slug: 'bariatric-shower-commodes' },
    { name: 'Bariatric Patient Lifters', slug: 'bariatric-patient-handling' },
  ],
  'mobility-ramps': [
    { name: 'Access Ramps', slug: 'mobility-ramps' },
  ],
  'for-carers': [
    { name: 'Pads & Daily Liners', slug: 'pads-liners' },
    { name: 'Pull-Up Protective Pants', slug: 'pull-up-pants' },
    { name: 'Flex Belted Briefs', slug: 'flex-briefs' },
    { name: 'All-in-One Slips & Bariatric', slug: 'all-in-one-slips' },
    { name: 'Bed & Chair Protection', slug: 'bed-chair-protection' },
    { name: "Men's Protective Underwear", slug: 'mens-underwear' },
  ],
  hire: [
    { name: 'Hospital & Floorline Beds', slug: 'bedroom' },
    { name: 'Riser Recliner & Lift Chairs', slug: 'chairs' },
    { name: 'Transit & Manual Wheelchairs', slug: 'wheelchairs' },
    { name: 'Tilt Commodes & Bathing', slug: 'bathroom-and-toilet' },
    { name: 'Standing Lifters & Hoists', slug: 'patient-handling' },
    { name: 'Dynamic Air Mattresses', slug: 'pressure-care-cushions' },
  ],
};

// Unified live product filter for a subcategory or department
export function filterProductsBySubcategory(deptId: string, subSlug: string, productsList?: Product[]): Product[] {
  const prods = productsList || getEffectiveProducts();
  const sLower = (subSlug || '').toLowerCase();

  if (deptId === 'hire') {
    return prods.filter((p) => 
      (p.hireAvailable || (p.hirePrice && p.hirePrice > 0)) && (p.categories || []).map((c) => (c || '').toLowerCase()).includes(sLower));
  }

  if (deptId === 'for-carers' ||
    sLower === 'pads-liners' ||
    sLower === 'pull-up-pants' ||
    sLower === 'flex-briefs' ||
    sLower === 'all-in-one-slips' ||
    sLower === 'bed-chair-protection' ||
    sLower === 'mens-underwear') {
    const carerProds = prods.filter((p) => {
      const brand = (p.brand || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const pCats = (p.categories || []).map((c) => (c || '').toLowerCase());
      return (brand === 'tena' ||
        pCats.includes('continence-care') ||
        pCats.includes('for-carers') ||
        pCats.includes('incontinence-aids') ||
        name.includes('tena') ||
        name.includes('proskin'));
    });

    return carerProds.filter((p) => {
      const nameLower = (p.name || '').toLowerCase();
      const slugLower = (p.slug || '').toLowerCase();
      const pCats = (p.categories || []).map((c) => (c || '').toLowerCase());

      if (sLower === 'bed-chair-protection') {
        return (pCats.includes('incontinence-aids') ||
          pCats.includes('bed-chair-protection') ||
          slugLower.includes('bed-pad') ||
          slugLower.includes('chair-pad') ||
          nameLower.includes('bed pad') ||
          nameLower.includes('chair pad') ||
          nameLower.includes('mattress cover') ||
          nameLower.includes('sheet'));
      }
      if (sLower === 'pads-liners') {
        return (pCats.includes('pads-liners') ||
          nameLower.includes('liner') ||
          nameLower.includes('pad') ||
          slugLower.includes('liner') ||
          slugLower.includes('pad'));
      }
      if (sLower === 'pull-up-pants') {
        return pCats.includes('pants') || slugLower.includes('pants') || nameLower.includes('pants');
      }
      if (sLower === 'flex-briefs') {
        return pCats.includes('flex') || slugLower.includes('flex') || nameLower.includes('flex');
      }
      if (sLower === 'mens-underwear') {
        return pCats.includes('mens') || slugLower.includes('men') || nameLower.includes('men');
      }
      if (sLower === 'all-in-one-slips') {
        return pCats.includes('slip') || slugLower.includes('slip') || nameLower.includes('slip');
      }
      return pCats.includes(sLower);
    });
  }

  if (sLower === 'standing-lifters-and-hoists') {
    return prods.filter((p) => {
      const pCats = (p.categories || []).map((c) => (c || '').toLowerCase());
      const isHandling = pCats.includes('patient-handling') || pCats.includes('bariatric-patient-handling');
      const nameLower = (p.name || '').toLowerCase();
      const isHoist =
        nameLower.includes('lifter') ||
        nameLower.includes('hoist') ||
        nameLower.includes('sara') ||
        nameLower.includes('move') ||
        nameLower.includes('easytrack') ||
        nameLower.includes('minstrel') ||
        nameLower.includes('gantry') ||
        nameLower.includes('stedy');
      const isSling = nameLower.includes('sling') || pCats.includes('slings');
      return isHandling && isHoist && !isSling;
    });
  }

  if (sLower === 'bariatric-chairs') {
    return prods.filter((p) => {
      const pCats = (p.categories || []).map((c) => (c || '').toLowerCase());
      return pCats.includes('bariatric-chairs') || (pCats.includes('bariatric') && pCats.includes('chairs'));
    });
  }

  // Exact match on category slug
  const directMatches = prods.filter((p) => {
    const pCats = (p.categories || []).map((c) => (c || '').toLowerCase());
    return pCats.includes(sLower);
  });
  if (directMatches.length > 0) {
    return directMatches;
  }

  // Fallback to department's primary slug if no exact matches found
  const dept = AT_DEPARTMENTS.find((d) => d.id === deptId);
  if (dept && dept.shopSlug) {
    return prods.filter((p) => {
      const pCats = (p.categories || []).map((c) => (c || '').toLowerCase());
      return pCats.includes(dept.shopSlug.toLowerCase());
    });
  }

  return [];
}

export function getCuratedDepartmentSubcategories(deptId: string, productsList?: Product[]): DepartmentSubcategory[] {
  const defs = CURATED_DEPARTMENT_SUBCATEGORIES[deptId] || [];
  const prods = productsList || getEffectiveProducts();

  return defs.map((sub, idx) => {
    const matches = filterProductsBySubcategory(deptId, sub.slug, prods);

    return {
      id: `${deptId}-sub-${idx}-${sub.slug}`,
      name: sub.name,
      slug: sub.slug,
      productCount: matches.length,
    };
  });
}

export function getExactSubcategoryProducts(deptId: string, subSlug: string, maxLimit = 100, productsList?: Product[]): Product[] {
  if (!subSlug) return [];
  const prods = productsList || getEffectiveProducts();
  const matches = filterProductsBySubcategory(deptId, subSlug, prods);

  if (subSlug === 'standing-lifters-and-hoists') {
    // Prioritize top clinical stand aids and lifters in display order
    const priorityNames = ['Sara Stedy', 'A150F', 'Sara Flex', 'Oxford', 'Smart 150', 'Maxi Move'];
    const sorted = [...matches].sort((a, b) => {
      const aIdx = priorityNames.findIndex((name) => a.name.includes(name));
      const bIdx = priorityNames.findIndex((name) => b.name.includes(name));
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return 0;
    });
    return sorted.slice(0, maxLimit);
  }

  return matches.slice(0, maxLimit);
}
