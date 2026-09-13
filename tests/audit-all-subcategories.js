const fs = require('fs');

const prods = JSON.parse(fs.readFileSync('./apps/frontend/src/data/products.json', 'utf8'));

// Import current departments logic
const CURATED_DEPARTMENT_SUBCATEGORIES = {
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

function getCuratedDepartmentSubcategories(deptId, prodsList = prods) {
  const defs = CURATED_DEPARTMENT_SUBCATEGORIES[deptId] || [];
  const isHireDept = deptId === 'hire';

  return defs.map((sub, idx) => {
    let count = 0;
    if (isHireDept) {
      count = prodsList.filter((p) => (p.hireAvailable || (p.hirePrice && p.hirePrice > 0)) && (p.categories || []).includes(sub.slug)).length;
    } else if (deptId === 'for-carers') {
      count = prodsList.filter((p) => {
        const nameLower = (p.name || '').toLowerCase();
        const slugLower = (p.slug || '').toLowerCase();
        const pCats = (p.categories || []).map((c) => (c || '').toLowerCase());
        if (sub.slug === 'pads-liners') {
          return pCats.includes('pads-liners') || slugLower.includes('liner') || slugLower.includes('pad') || nameLower.includes('pad') || nameLower.includes('liner') || nameLower.includes('instadry');
        }
        if (sub.slug === 'pull-up-pants') {
          return pCats.includes('pull-up-pants') || pCats.includes('pants') || slugLower.includes('pants') || nameLower.includes('pants');
        }
        if (sub.slug === 'flex-briefs') {
          return pCats.includes('flex-briefs') || pCats.includes('flex') || slugLower.includes('flex') || nameLower.includes('flex');
        }
        if (sub.slug === 'all-in-one-slips') {
          return pCats.includes('all-in-one-slips') || slugLower.includes('slip') || slugLower.includes('bariatric') || nameLower.includes('slip') || nameLower.includes('bariatric');
        }
        if (sub.slug === 'bed-chair-protection') {
          return pCats.includes('bed-chair-protection') || slugLower.includes('bed') || slugLower.includes('underpad') || nameLower.includes('bed') || nameLower.includes('underpad') || nameLower.includes('chair pad') || nameLower.includes('wipe') || nameLower.includes('barrier');
        }
        if (sub.slug === 'mens-underwear') {
          return pCats.includes('mens-underwear') || pCats.includes('mens') || slugLower.includes('men') || nameLower.includes('men');
        }
        return pCats.includes(sub.slug);
      }).length;
    } else if (sub.slug === 'standing-lifters-and-hoists') {
      count = prodsList.filter((p) => {
        const isHandling = (p.categories || []).includes('patient-handling') || (p.categories || []).includes('bariatric-patient-handling');
        const nameLower = (p.name || '').toLowerCase();
        const isHoist = nameLower.includes('lifter') || nameLower.includes('hoist') || nameLower.includes('sara') || nameLower.includes('move') || nameLower.includes('easytrack') || nameLower.includes('minstrel') || nameLower.includes('gantry') || nameLower.includes('stedy');
        const isSling = nameLower.includes('sling') || (p.categories || []).includes('slings');
        return isHandling && isHoist && !isSling;
      }).length;
    } else {
      count = prodsList.filter((p) => (p.categories || []).includes(sub.slug)).length;
    }

    return {
      name: sub.name,
      slug: sub.slug,
      productCount: count,
    };
  });
}

function getExactSubcategoryProducts(deptId, subSlug, maxLimit = 100, prodsList = prods) {
  if (!subSlug) return [];

  if (deptId === 'hire') {
    return prodsList.filter((p) => 
      (p.hireAvailable || (p.hirePrice && p.hirePrice > 0)) && (p.categories || []).includes(subSlug)).slice(0, maxLimit);
  }

  // Specialized match for Continence & Carer Aids
  if (deptId === 'for-carers') {
    const tenaProds = prodsList.filter((p) => {
      const brand = (p.brand || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const pCats = (p.categories || []).map((c) => (c || '').toLowerCase());
      return brand === 'tena' || pCats.includes('continence-care') || pCats.includes('for-carers') || name.includes('tena') || name.includes('proskin');
    });

    const matches = tenaProds.filter((p) => {
      const nameLower = (p.name || '').toLowerCase();
      const slugLower = (p.slug || '').toLowerCase();
      const pCats = (p.categories || []).map((c) => (c || '').toLowerCase());
      if (subSlug === 'pads-liners') {
        return pCats.includes('pads-liners') || slugLower.includes('liner') || slugLower.includes('pad') || nameLower.includes('pad') || nameLower.includes('liner') || nameLower.includes('instadry');
      }
      if (subSlug === 'pull-up-pants') {
        return pCats.includes('pull-up-pants') || pCats.includes('pants') || slugLower.includes('pants') || nameLower.includes('pants');
      }
      if (subSlug === 'flex-briefs') {
        return pCats.includes('flex-briefs') || pCats.includes('flex') || slugLower.includes('flex') || nameLower.includes('flex');
      }
      if (subSlug === 'all-in-one-slips') {
        return pCats.includes('all-in-one-slips') || slugLower.includes('slip') || slugLower.includes('bariatric') || nameLower.includes('slip') || nameLower.includes('bariatric');
      }
      if (subSlug === 'bed-chair-protection') {
        return pCats.includes('bed-chair-protection') || slugLower.includes('bed') || slugLower.includes('underpad') || nameLower.includes('bed') || nameLower.includes('underpad') || nameLower.includes('chair pad') || nameLower.includes('wipe') || nameLower.includes('barrier');
      }
      if (subSlug === 'mens-underwear') {
        return pCats.includes('mens-underwear') || pCats.includes('mens') || slugLower.includes('men') || nameLower.includes('men');
      }
      return pCats.includes(subSlug);
    });

    if (matches.length > 0) return matches.slice(0, maxLimit);
    return tenaProds.slice(0, maxLimit);
  }

  // Specialized match for standing lifters and hoists
  if (subSlug === 'standing-lifters-and-hoists') {
    const hoists = prodsList.filter((p) => {
      const isHandling = (p.categories || []).includes('patient-handling') || (p.categories || []).includes('bariatric-patient-handling');
      const nameLower = (p.name || '').toLowerCase();
      const isHoist = nameLower.includes('lifter') || nameLower.includes('hoist') || nameLower.includes('sara') || nameLower.includes('move') || nameLower.includes('easytrack') || nameLower.includes('minstrel') || nameLower.includes('gantry') || nameLower.includes('stedy');
      const isSling = nameLower.includes('sling') || (p.categories || []).includes('slings');
      return isHandling && isHoist && !isSling;
    });
    if (hoists.length > 0) {
      return hoists.slice(0, maxLimit);
    }
  }

  // Slings
  if (subSlug === 'slings') {
    const allSlings = prodsList.filter((p) => (p.categories || []).includes('slings'));
    return allSlings.slice(0, maxLimit);
  }

  // Direct match
  const directMatches = prodsList.filter((p) => {
    const pCats = (p.categories || []).map((c) => (c || '').toLowerCase());
    return pCats.includes(subSlug.toLowerCase());
  });
  if (directMatches.length > 0) {
    return directMatches.slice(0, maxLimit);
  }

  return [];
}

console.log('COMPARING Column 2 Badge (sub.productCount) vs Column 3 Products (getExactSubcategoryProducts.length):');
let mismatchCount = 0;
for (const deptId of Object.keys(CURATED_DEPARTMENT_SUBCATEGORIES)) {
  const subs = getCuratedDepartmentSubcategories(deptId, prods);
  for (const s of subs) {
    const col3 = getExactSubcategoryProducts(deptId, s.slug, 500, prods);
    if (s.productCount !== col3.length) {
      mismatchCount++;
      console.log(`[MISMATCH in ${deptId}] ${s.name} (${s.slug}): Col2 Badge = ${s.productCount} vs Col3 Cards = ${col3.length}`);
    }
  }
}
console.log(`\nTotal Column 2 vs Column 3 Mismatches: ${mismatchCount}`);
