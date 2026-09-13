export interface Brand {
  id: string;
  name: string;
  logo: string;
  productCount: number;
  href: string;
}

export const brands: Brand[] = [
  { id: 'sunrise', name: 'Sunrise Medical', logo: '/brand-sunrise.svg', productCount: 45, href: '/brands/sunrise-medical' },
  { id: 'invacare', name: 'Invacare', logo: '/brand-invacare.svg', productCount: 38, href: '/brands/invacare' },
  { id: 'permobil', name: 'Permobil', logo: '/brand-permobil.svg', productCount: 32, href: '/brands/permobil' },
  { id: 'drive', name: 'Drive Medical', logo: '/brand-drive.svg', productCount: 41, href: '/brands/drive-medical' },
  { id: 'ottobock', name: 'Ottobock', logo: '/brand-ottobock.svg', productCount: 28, href: '/brands/ottobock' },
  { id: 'etac', name: 'Etac', logo: '/brand-etac.svg', productCount: 24, href: '/brands/etac' },
  { id: 'pride', name: 'Pride Mobility', logo: '/brand-pride.svg', productCount: 22, href: '/brands/pride-mobility' },
  { id: 'ki', name: 'Ki Mobility', logo: '/brand-ki.svg', productCount: 18, href: '/brands/ki-mobility' },
  { id: 'roho', name: 'Roho', logo: '/brand-roho.svg', productCount: 15, href: '/brands/roho' },
  { id: 'bakare', name: 'Bakare', logo: '/brand-bakare.svg', productCount: 12, href: '/brands/bakare' },
];
