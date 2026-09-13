import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Accessibility,
  Armchair,
  Bath,
  Users,
  Coffee,
  Bed,
  Layers,
  Activity,
  Calendar,
  ShieldCheck,
  Sparkles,
  Package,
} from 'lucide-react';

function WalkerIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
      <path d="M6 17L9 6h6l3 11" />
      <path d="M7 11h10" />
      <path d="M9 4h2M13 4h2" />
    </svg>);
}

interface CategoryCard {
  id: string;
  name: string;
  subtitle: string;
  href: string;
  image: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryCard[] = [
  // Row 1 (7 Categories)
  {
    id: 'mobility',
    name: 'Mobility',
    subtitle: 'Move with confidence',
    href: '/shop/mobility-aids',
    image: '/images/cat_mobility_walker_1787635979292.jpg',
    icon: WalkerIcon,
  },
  {
    id: 'wheelchairs',
    name: 'Wheelchairs',
    subtitle: 'Manual & power',
    href: '/shop/wheelchairs',
    image: '/images/cat_wheelchair_1787635999408.jpg',
    icon: Accessibility,
  },
  {
    id: 'seating',
    name: 'Seating & Positioning',
    subtitle: 'Support & comfort',
    href: '/shop/chairs',
    image: '/images/cat_seating_power_1787636023808.jpg',
    icon: Armchair,
  },
  {
    id: 'bathroom',
    name: 'Bathroom & Toilet',
    subtitle: 'Safety & independence',
    href: '/shop/bathroom-and-toilet',
    image: '/images/cat_bathroom_toilet_1787636064397.jpg',
    icon: Bath,
  },
  {
    id: 'patient-handling',
    name: 'Patient Handling',
    subtitle: 'Safe transfers',
    href: '/shop/patient-handling',
    image: '/images/cat_patient_handling_1787636087944.jpg',
    icon: Users,
  },
  {
    id: 'daily-living',
    name: 'Daily Living',
    subtitle: 'Everyday solutions',
    href: '/shop/daily-living-aids',
    image: '/images/cat_daily_living_1787641840523.jpg',
    icon: Coffee,
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    subtitle: 'Comfort & support',
    href: '/shop/bedroom',
    image: '/images/cat_hospital_bed_1787641779892.jpg',
    icon: Bed,
  },

  // Row 2 (7 Categories)
  {
    id: 'pressure-care',
    name: 'Pressure Care',
    subtitle: 'Skin protection',
    href: '/shop/pressure-care-cushions',
    image: '/images/cat_pressure_care_1787641802688.jpg',
    icon: Layers,
  },
  {
    id: 'continence-carers',
    name: 'Continence & Carers',
    subtitle: 'Pads, pants & briefs',
    href: '/for-carers',
    image: '/images/cat_continence_carers.jpg',
    icon: ShieldCheck,
  },
  {
    id: 'paediatric',
    name: 'Paediatric',
    subtitle: "Children's equipment",
    href: '/shop/paediatric',
    image: '/images/cat_paediatric.jpg',
    icon: Sparkles,
  },
  {
    id: 'bariatric',
    name: 'Bariatric Care',
    subtitle: 'High capacity',
    href: '/shop/bariatric',
    image: '/images/cat_bariatric.jpg',
    icon: Layers,
  },
  {
    id: 'rehab',
    name: 'Rehabilitation',
    subtitle: 'Recover & rebuild',
    href: '/shop/physio-and-rehab',
    image: '/images/cat_rehab_1787641869158.jpg',
    icon: Activity,
  },
  {
    id: 'ramps',
    name: 'Access Ramps',
    subtitle: 'Threshold & portable',
    href: '/shop/mobility-ramps',
    image: '/images/cat_ramps.jpg',
    icon: Package,
  },
  {
    id: 'hire',
    name: 'Hire Equipment',
    subtitle: 'Flexible solutions',
    href: '/hire',
    image: '/images/cat_hire_scooter.jpg',
    icon: Calendar,
  },
];

export function ShopByCategory() {
  return (<section className="py-8 sm:py-10 bg-white border-b border-gray-100">
      <div className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 2xl:px-8">
        {/* Header Row: Title on Left, 'View all categories →' on Right */}
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h2 className="text-[20px] sm:text-[22px] md:text-[24px] font-extrabold text-[#0F1E2E] tracking-tight">
            Shop by Category
          </h2>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#147A7A] hover:underline"
          >
            <span>View all categories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 14 Category Cards in 2 Balanced Rows of 7 on Desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3.5">
          {CATEGORIES.map((cat) => {
            const IconComp = cat.icon;
            return (<Link
                key={cat.id}
                to={cat.href}
                className="group flex flex-col justify-between bg-white border border-gray-200/90 hover:border-[#147A7A] rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 p-2.5 text-left"
              >
                {/* Photo Area with Floating Circular Teal Badge overlapping bottom left */}
                <div className="relative aspect-square sm:h-[115px] w-full bg-[#F8FAFC] rounded-xl p-2 flex items-center justify-center overflow-visible mb-3">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {/* Floating Circular Teal Icon Badge overlapping bottom left */}
                  <div className="absolute -bottom-2.5 left-2.5 w-6 h-6 rounded-full bg-[#147A7A] text-white flex items-center justify-center shadow-xs">
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Card Text & Arrow Details */}
                <div className="pt-1 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="text-[13px] font-bold text-[#0F1E2E] group-hover:text-[#147A7A] transition-colors line-clamp-1 leading-snug">
                      {cat.name}
                    </h3>
                    <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                      {cat.subtitle}
                    </p>
                  </div>
                  <div className="mt-2.5 flex justify-end">
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#147A7A] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>);
          })}
        </div>
      </div>
    </section>);
}