export const KNOWN_BRAND_MAP: [RegExp, string][] = [
  [/^Arjo\b/i, 'Arjo'],
  [/^Aspire\b/i, 'Aspire'],
  [/^Roho\b/i, 'Roho'],
  [/^Karma\b/i, 'Karma Mobility'],
  [/^Alerta\b/i, 'Alerta Medical'],
  [/^Configura\b/i, 'Configura'],
  [/^Accora\b/i, 'Accora'],
  [/^Aquatec\b/i, 'Aquatec'],
  [/^Etac\b/i, 'Etac'],
  [/^Bakare\b/i, 'Bakare'],
  [/^Drive\b/i, 'Drive Medical'],
  [/^Pride\b/i, 'Pride Mobility'],
  [/^Invacare\b/i, 'Invacare'],
  [/^Sunrise\b|^Quickie\b/i, 'Sunrise Medical'],
  [/^Permobil\b/i, 'Permobil'],
  [/^TENA\b/i, 'TENA'],
  [/^Neeki\b/i, 'Neeki'],
  [/^Uccello\b/i, 'Uccello'],
  [/^ShowerBuddy\b/i, 'ShowerBuddy'],
  [/^Meyra\b/i, 'Meyra'],
  [/^Ki Mobility\b/i, 'Ki Mobility'],
  [/^Otto\s*bock\b/i, 'Ottobock'],
  [/^Vicair\b/i, 'Vicair'],
  [/^Molift\b/i, 'Molift'],
  [/^Joerns\b|^Oxford\b/i, 'Joerns Healthcare'],
  [/^Cobi\b/i, 'Cobi Rehab'],
  [/^Alber\b/i, 'Alber'],
  [/^Novis\b/i, 'Novis'],
  [/^TheraBand\b/i, 'TheraBand'],
  [/^Rolyan\b/i, 'Rolyan'],
  [/^Days\b/i, 'Days Healthcare'],
  [/^Care-Quip\b/i, 'Care-Quip'],
  [/^ProSling\b/i, 'ProSling'],
];

export function resolveProductBrand(p: { brand?: string; name?: string }): string {
  const currentBrand = (p.brand || '').trim();
  if (currentBrand && currentBrand !== 'AT Specialists' && currentBrand !== 'General') {
    return currentBrand;
  }
  const name = p.name || '';
  for (const [regex, brandName] of KNOWN_BRAND_MAP) {
    if (regex.test(name)) {
      return brandName;
    }
  }
  return currentBrand || 'AT Specialists';
}
