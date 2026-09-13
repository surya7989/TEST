const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('./apps/frontend/src/data/products.json', 'utf-8'));
const catData = JSON.parse(fs.readFileSync('./apps/frontend/src/data/categories.json', 'utf-8'));

function getSubcategories(slug) {
  const parent = catData.find((c) => c.slug === slug || c.id === slug);
  if (!parent) return [];
  return catData.filter((c) => c.parentId === parent.id);
}

const depts = [
  'chairs',
  'bedroom',
  'wheelchairs',
  'bathroom-and-toilet',
  'mobility-aids',
  'patient-handling',
  'daily-living-aids',
  'pressure-care-cushions',
  'physio-and-rehab',
  'mobility-ramps'
];

depts.forEach(catSlug => {
  const allTargetSlugs = new Set();
  allTargetSlugs.add(catSlug.toLowerCase());
  const subcats = getSubcategories(catSlug);
  subcats.forEach((sub) => {
    allTargetSlugs.add(sub.slug.toLowerCase());
    const deepSubcats = getSubcategories(sub.slug);
    deepSubcats.forEach((deep) => allTargetSlugs.add(deep.slug.toLowerCase()));
  });

  const count = raw.filter((p) => {
    const pCats = (p.categories || []).map((c) => c.toLowerCase());
    return pCats.some((tc) => allTargetSlugs.has(tc));
  }).length;

  console.log(`ShopPage count for /shop/${catSlug}: ${count}`);
});
