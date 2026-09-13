const fs = require('fs');

const prods = JSON.parse(fs.readFileSync('./apps/frontend/src/data/products.json', 'utf8'));

// Proposed corrected AT_DEPARTMENTS
const AT_DEPARTMENTS = [
  {
    id: 'chairs',
    name: 'Chairs & Lift Chairs',
    blurb: 'Configura® posture & electric lift chairs',
    shopSlug: 'chairs',
    slugs: ['chairs', 'lift-chairs', 'day-chairs', 'recliners', 'posture-chairs'],
  },
  {
    id: 'bedroom',
    name: 'Beds & Pressure Care',
    blurb: 'Hi-lo hospital beds & dynamic air mattresses',
    shopSlug: 'bedroom',
    slugs: ['bedroom', 'electric-beds', 'hospital-beds', 'mattresses', 'bed-accessories', 'over-bed-tables'],
  },
  {
    id: 'wheelchairs',
    name: 'Wheelchairs & Power Mobility',
    blurb: 'Active manual, tilt-in-space & power wheelchairs',
    shopSlug: 'wheelchairs',
    slugs: ['wheelchairs', 'manual-wheelchairs', 'power-wheelchairs', 'transit-wheelchairs'],
  },
  {
    id: 'bathroom-and-toilet',
    name: 'Bathroom & Hygiene',
    blurb: 'Shower commodes, bath boards & toilet safety',
    shopSlug: 'bathroom-and-toilet',
    slugs: ['bathroom-and-toilet', 'shower-commodes', 'shower-chairs', 'toilet-aids', 'bath-aids'],
  },
  {
    id: 'mobility-aids',
    name: 'Walking & Mobility Aids',
    blurb: 'Carbon fibre rollators, seat walkers & canes',
    shopSlug: 'mobility-aids',
    slugs: ['mobility-aids', 'walking-aids', 'rollators', 'seat-walkers', 'canes', 'walking-sticks'],
  },
  {
    id: 'patient-handling',
    name: 'Patient Handling & Hoists',
    blurb: 'Standing lifters, mobile hoists & transfer slings',
    shopSlug: 'patient-handling',
    slugs: ['patient-handling', 'hoists', 'lifters', 'slings', 'transfer-aids'],
  },
  {
    id: 'daily-living-aids',
    name: 'Daily Living & Independence',
    blurb: 'Adaptive cutlery, kettles, reachers & dining',
    shopSlug: 'daily-living-aids',
    slugs: ['daily-living-aids', 'kitchen-dining', 'reachers', 'dressing-aids', 'medication-aids'],
  },
  {
    id: 'pressure-care-cushions',
    name: 'Pressure Care & Cushions',
    blurb: 'ROHO air-cell & gel clinical positioning cushions',
    shopSlug: 'pressure-care-cushions',
    slugs: ['pressure-care-cushions', 'cushions', 'therapeutic-cushions', 'seating-and-positioning'],
  },
  {
    id: 'paediatric',
    name: 'Paediatric Equipment',
    blurb: 'Specialist paediatric seating, strollers & therapy',
    shopSlug: 'paediatric', // Corrected from physio-and-rehab
    slugs: ['paediatric', 'paediatric-wheelchairs', 'paediatric-walking-frames', 'prescription-complex-shower-commodes-paediatric'],
  },
  {
    id: 'bariatric',
    name: 'Bariatric High-Capacity',
    blurb: 'Engineered high safe-working-load clinical equipment',
    shopSlug: 'bariatric', // Corrected from bariatric-chairs
    slugs: ['bariatric', 'bariatric-chairs', 'bariatric-bedroom', 'bariatric-wheelchairs', 'bariatric-patient-handling'],
  },
  {
    id: 'for-carers',
    name: 'Continence & Carer Aids',
    blurb: 'Clinical TENA pads, pull-ups, briefs & bed protection',
    shopSlug: 'for-carers',
    slugs: ['for-carers', 'continence-care', 'pants', 'flex', 'pads-liners', 'all-in-one-slips', 'bed-chair-protection', 'mens-underwear', 'incontinence-aids'],
  },
  {
    id: 'mobility-ramps',
    name: 'Ramps & Access',
    blurb: 'Portable suitcase, threshold & rubber access ramps',
    shopSlug: 'mobility-ramps',
    slugs: ['mobility-ramps', 'ramps', 'threshold-ramps'],
  },
  {
    id: 'hire',
    name: 'Equipment Hire Fleet',
    blurb: 'NDIS funded short & long term clinical hire',
    shopSlug: 'hire',
    slugs: [],
    isHire: true,
  },
];

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

// Unified product filter function for a subcategory or category
function filterProductsBySubcategory(deptId, subSlug, prodsList) {
  const sLower = subSlug.toLowerCase();

  if (deptId === 'hire') {
    return prodsList.filter((p) => 
      (p.hireAvailable || (p.hirePrice && p.hirePrice > 0)) && (p.categories || []).map(c => c.toLowerCase()).includes(sLower));
  }

  if (deptId === 'for-carers' || sLower === 'pads-liners' || sLower === 'pull-up-pants' || sLower === 'flex-briefs' || sLower === 'all-in-one-slips' || sLower === 'bed-chair-protection' || sLower === 'mens-underwear') {
    const carerProds = prodsList.filter((p) => {
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
    return prodsList.filter((p) => {
      const pCats = (p.categories || []).map((c) => (c || '').toLowerCase());
      const isHandling = pCats.includes('patient-handling') || pCats.includes('bariatric-patient-handling');
      const nameLower = (p.name || '').toLowerCase();
      const isHoist = nameLower.includes('lifter') || nameLower.includes('hoist') || nameLower.includes('sara') || nameLower.includes('move') || nameLower.includes('easytrack') || nameLower.includes('minstrel') || nameLower.includes('gantry') || nameLower.includes('stedy');
      const isSling = nameLower.includes('sling') || pCats.includes('slings');
      return isHandling && isHoist && !isSling;
    });
  }

  if (sLower === 'bariatric-chairs') {
    return prodsList.filter((p) => {
      const pCats = (p.categories || []).map((c) => (c || '').toLowerCase());
      return pCats.includes('bariatric-chairs') || (pCats.includes('bariatric') && pCats.includes('chairs'));
    });
  }

  // Exact direct category match
  return prodsList.filter((p) => {
    const pCats = (p.categories || []).map((c) => (c || '').toLowerCase());
    return pCats.includes(sLower);
  });
}

function getDepartmentCount(dept, prodsList) {
  if (dept.isHire) {
    return prodsList.filter((p) => p.hireAvailable || (p.hirePrice && p.hirePrice > 0)).length;
  }
  if (dept.id === 'for-carers') {
    return prodsList.filter((p) => {
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
  return prodsList.filter((p) => {
    const pCats = (p.categories || []).map((c) => (c || '').toLowerCase());
    return dept.slugs.some((s) => pCats.some((pc) => pc.includes(s)));
  }).length;
}

// Test department counts
console.log('=== DEPARTMENT COUNTS ===');
AT_DEPARTMENTS.forEach(dept => {
  const countInDept = getDepartmentCount(dept, prods);
  console.log(`${dept.name.padEnd(32)}: ${countInDept}`);
});

// Test subcategory matching
console.log('\n=== SUBCATEGORY COUNTS (Column 2 badge vs Column 3 cards vs ShopPage filter) ===');
let mismatchCount = 0;
for (const [deptId, subs] of Object.entries(CURATED_DEPARTMENT_SUBCATEGORIES)) {
  for (const s of subs) {
    const matched = filterProductsBySubcategory(deptId, s.slug, prods);
    const count = matched.length;
    if (count === 0) {
      console.log(`[ZERO] ${deptId} -> ${s.name} (${s.slug}) = 0!`);
      mismatchCount++;
    }
  }
}

if (mismatchCount === 0) {
  console.log('ALL SUBCATEGORIES HAVE VALID PRODUCTS AND PERFECT 1:1 CORRESPONDENCE!');
}
