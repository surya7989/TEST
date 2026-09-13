import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

// 1. Meal Preparation Equipment (Adaptive Utensils & Kettle Tipper)
export function MealPrepSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {/* Kettle body & spout */}
      <path d="M4 19h12a3 3 0 0 0 3-3V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v7a3 3 0 0 0 3 3Z" />
      <path d="M19 11l3-2v5l-3-1" />
      {/* Handle */}
      <path d="M7 4h6a3 3 0 0 1 3 3v2" />
      {/* Steam / heat lines */}
      <path d="M8 2v2M12 2v2" />
      <line x1="2" y1="21" x2="20" y2="21" />
    </svg>);
}

// 2. Hip Protectors (Pelvic Shield & Impact Cushioning)
export function HipProtectorSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
      <circle cx="12" cy="12" r="3" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>);
}

// 3. Vehicle Equipment (Car Access & Door Assist Bar)
export function VehicleEquipmentSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {/* Car profile */}
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 3.1C2.1 11.4 2 11.7 2 12v4c0.6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
      {/* Hand assist bar arrow */}
      <path d="M14 4h6m-3-3v6" strokeWidth="2.2" />
    </svg>);
}

// 4. Non slip equipment (Textured Safety Grip Mat)
export function NonSlipSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      {/* Grip dots / ridges */}
      <path d="M7 9h.01M12 9h.01M17 9h.01M7 12h.01M12 12h.01M17 12h.01M7 15h.01M12 15h.01M17 15h.01" strokeWidth="3" />
      <path d="M3 19h18" />
    </svg>);
}

// 5. Walkers (4-Wheel Rollator Seat Walker)
export function WalkerSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {/* Handles */}
      <path d="M6 3h3v5M18 3h-3v5" />
      {/* Frame legs */}
      <path d="M8 8l-3 10M16 8l3 10" />
      {/* Seat bar & cross brace */}
      <path d="M6 13h12" strokeWidth="2.5" />
      <path d="M7 16h10" />
      {/* Wheels */}
      <circle cx="5" cy="19" r="1.8" />
      <circle cx="19" cy="19" r="1.8" />
    </svg>);
}

// 6. Single Point Sticks (Quad Cane & Walking Stick)
export function SinglePointStickSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {/* Curved handle */}
      <path d="M7 6a3 3 0 0 1 6 0v13" />
      <path d="M10 3h3" />
      {/* Quad base prongs */}
      <path d="M13 19l-4 2M13 19l4 2M13 17v4" strokeWidth="2" />
      <circle cx="8" cy="21" r="0.8" />
      <circle cx="13" cy="21" r="0.8" />
      <circle cx="18" cy="21" r="0.8" />
    </svg>);
}

// 7. Electric Bed and Mattress (Hi-Lo Profiling Electric Bed)
export function ElectricBedSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {/* Headboard and footboard */}
      <path d="M3 6v14M21 10v10" />
      {/* Profiling articulated mattress (elevated head) */}
      <path d="M3 13l6-5 6 3 6-2" strokeWidth="2.2" />
      {/* Bed base frame */}
      <path d="M3 15h18" />
      {/* Electric motion arrows / handset */}
      <path d="M12 18v2m-2-1h4" />
      <circle cx="5" cy="19" r="1" />
      <circle cx="19" cy="19" r="1" />
    </svg>);
}

// 8. Long Handled Equipment (Reacher Grabber Claw)
export function LongHandledSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {/* Trigger handle */}
      <path d="M4 19l2-2v-3l-2-1" />
      {/* Long shaft */}
      <path d="M6 17L18 5" strokeWidth="2.5" />
      {/* Grabber jaws */}
      <path d="M16 3l4 0-1 4" />
      <path d="M21 6l-1 4-3-1" />
    </svg>);
}

// 9. Pillows (Ergonomic Contour Pillow)
export function PillowSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {/* Contoured pillow wave */}
      <path d="M3 10c2-2 6-2 9 0s7 2 9 0v6c-2 2-6 2-9 0s-7-2-9 0v-6Z" />
      <path d="M7 11c1-1 3-1 4.5 0" strokeWidth="1.5" />
      {/* Sleep rest spark */}
      <path d="M12 4v2m-2-1h4" />
    </svg>);
}

// 10. Personal care equipment (Bedside Commode & Hygiene Support)
export function PersonalCareSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {/* Commode back & arms */}
      <path d="M6 3v9M18 3v9" />
      <path d="M4 7h4M16 7h4" />
      {/* Commode seat */}
      <rect x="5" y="11" width="14" height="4" rx="2" />
      {/* Removable bucket curve */}
      <path d="M8 15a4 4 0 0 0 8 0" />
      {/* Legs */}
      <path d="M6 15v6M18 15v6" />
    </svg>);
}

// 11. Cushions (Roho Air-Cell & Gel Pressure Cushion)
export function CushionSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {/* Cushion block */}
      <rect x="3" y="7" width="18" height="12" rx="3" />
      {/* Pressure relief matrix grid */}
      <path d="M3 11h18M3 15h18" strokeDasharray="3 2" />
      <path d="M8 7v12M12 7v12M16 7v12" strokeDasharray="3 2" />
      {/* Center pressure comfort zone */}
      <circle cx="12" cy="13" r="2" fill="currentColor" opacity="0.3" />
    </svg>);
}

// 12. Recliners (Power Lift Reclining Armchair)
export function ReclinerSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {/* Recliner high back */}
      <path d="M7 4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v9H7V4Z" />
      {/* Armrests */}
      <rect x="4" y="9" width="3" height="8" rx="1.5" />
      <rect x="17" y="9" width="3" height="8" rx="1.5" />
      {/* Seat & raised footrest */}
      <path d="M7 13h10v3H7z" />
      <path d="M8 16l-1 5M16 16l1 5" />
      {/* Lift motion indicator */}
      <path d="M12 17v-4m-2 2l2-2 2 2" strokeWidth="1.7" />
    </svg>);
}

// 13. Bed Side rails (Bed Safety Guard Rail & Pole)
export function BedSideRailSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {/* Top safety rail */}
      <path d="M3 7h18a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
      {/* Vertical guard bars */}
      <line x1="7" y1="7" x2="7" y2="13" />
      <line x1="12" y1="7" x2="12" y2="13" />
      <line x1="17" y1="7" x2="17" y2="13" />
      {/* Base mounting brackets onto bed frame */}
      <path d="M5 13v7a1 1 0 0 0 1 1h2M19 13v7a1 1 0 0 1-1 1h-2" />
    </svg>);
}

// 14. Over Bed Table (Cantilever Table & Portable Clothesline)
export function OverBedTableSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {/* Table top / line airer top */}
      <rect x="3" y="4" width="18" height="4" rx="1.5" />
      {/* Central adjustable column */}
      <path d="M12 8v10" strokeWidth="2.5" />
      <path d="M10 11h4" />
      {/* Base frame with castors */}
      <path d="M5 18h14" strokeWidth="2" />
      <circle cx="6" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
    </svg>);
}

// 15. Day Chairs (Classic High-Back Ergonomic Day Chair)
export function DayChairSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {/* High backrest with head wings */}
      <path d="M7 3h10v10H7V3Z" />
      <path d="M6 5h2M16 5h2" />
      {/* Seat */}
      <rect x="5" y="13" width="14" height="3" rx="1" />
      {/* Wooden armrests & legs */}
      <path d="M5 10v6M19 10v6" />
      <path d="M6 16v5M18 16v5" />
    </svg>);
}

// 16. Wheelchairs (Universal Transit & Manual Wheelchair)
export function WheelchairSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {/* Person sitting & chair frame */}
      <circle cx="10" cy="5" r="2" />
      <path d="M10 9v5l4 2" />
      {/* Push handles */}
      <path d="M7 7h3" />
      {/* Large rear wheel */}
      <circle cx="11" cy="16" r="5" />
      {/* Footrest & front castor */}
      <path d="M14 16h4v2" />
      <circle cx="18" cy="19" r="1.2" />
    </svg>);
}

// 17. Comfortshield Gold Cotton Terry Fitted Waterproof (Waterproof Fitted Bedding)
export function WaterproofBeddingSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {/* Fitted mattress corner */}
      <path d="M3 7l9-4 9 4v8l-9 4-9-4V7Z" />
      <path d="M3 7l9 4 9-4" />
      <path d="M12 11v8" />
      {/* Water drop protection barrier */}
      <path d="M12 11a2.5 2.5 0 0 1 2.5 2.5c0 1.4-2.5 3.5-2.5 3.5s-2.5-2.1-2.5-3.5A2.5 2.5 0 0 1 12 11Z" fill="currentColor" opacity="0.3" />
    </svg>);
}

// 18. Bathroom & Toilet (Shower Chair & Toilet Safety Frame)
export function BathroomToiletSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {/* Shower head stream */}
      <path d="M4 4h3l2 4" />
      <path d="M7 8l-2 3" />
      <path d="M8 12l-1 2M10 11l-1 2M12 10l-1 2" strokeDasharray="1 1" />
      {/* Shower chair / toilet aid frame */}
      <rect x="11" y="9" width="10" height="4" rx="1.5" />
      <path d="M13 13v7M19 13v7" />
      {/* Non-slip suction rubber feet */}
      <circle cx="13" cy="20.5" r="1" fill="currentColor" />
      <circle cx="19" cy="20.5" r="1" fill="currentColor" />
    </svg>);
}

// 19. Hire Equipment (Rental Calendar with Clock / Clockwise Repeat)
export function HireEquipmentSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      {/* Clock / rental cycle */}
      <circle cx="12" cy="16" r="3" />
      <polyline points="12 14.5 12 16 13.5 16" />
    </svg>);
}

// 20. Default Medical Assistive Technology Cross (Never a generic star)
export function AssistiveTechSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M12 2v20M2 12h20" strokeWidth="3" />
      <circle cx="12" cy="12" r="9" />
    </svg>);
}

// 21. Bags, Pouches & Wheelchair Storage (Equipment Carry Bag)
export function BagEquipmentSvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
      <circle cx="12" cy="15" r="1.5" fill="currentColor" />
    </svg>);
}

// 22. Dynamic Monogram Category SVG for any new custom category
export function createDynamicMonogramSvg(char: string): React.FC<IconProps> {
  const cleanChar = (char || 'A').toUpperCase().charAt(0);
  return function DynamicCategorySvg({ className = "w-5 h-5",...props }: IconProps) {
    return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <text
          x="12"
          y="16"
          textAnchor="middle"
          fontSize="11.5"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="currentColor"
          stroke="none"
        >
          {cleanChar}
        </text>
      </svg>);
  };
}

// 23. Massage, Physiotherapy & Wellness Therapy
export function MassageTherapySvg({ className = "w-5 h-5",...props }: IconProps) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {/* Therapeutic caring hands / pulse waves */}
      <path d="M7 11.5a4.5 4.5 0 0 1 9 0" />
      <path d="M4 14.5a7.5 7.5 0 0 1 15 0" />
      <circle cx="12" cy="6.5" r="2.5" />
      <path d="M5 20h14" />
      <path d="M9 20v-2a3 3 0 0 1 6 0v2" />
    </svg>);
}

export const categorySvgMap: Record<string, React.FC<IconProps>> = {
  'Chairs & Lift Chairs': ReclinerSvg,
  'Beds & Pressure Care': ElectricBedSvg,
  'Wheelchairs & Power Mobility': WheelchairSvg,
  'Bathroom & Hygiene': BathroomToiletSvg,
  'Patient Handling & Hoists': LongHandledSvg,
  'Daily Living & Continence': MealPrepSvg,
  'Paediatric & Specialized Rehab': WalkerSvg,
  'Meal Preparation Equipment': MealPrepSvg,
  'Hip Protectors': HipProtectorSvg,
  'Vehicle Equipment': VehicleEquipmentSvg,
  'Non slip equipment': NonSlipSvg,
  'Walkers': WalkerSvg,
  'Single Point Sticks': SinglePointStickSvg,
  'Electric Bed and Mattress': ElectricBedSvg,
  'Long Handled Equipment': LongHandledSvg,
  'Pillows': PillowSvg,
  'Personal care equipment': PersonalCareSvg,
  'Cushions': CushionSvg,
  'Recliners': ReclinerSvg,
  'Bed Side rails': BedSideRailSvg,
  'Over Bed Table': OverBedTableSvg,
  'Day Chairs': DayChairSvg,
  'Wheelchairs': WheelchairSvg,
  'Comfortshield Gold Cotton Terry Fitted Waterproof': WaterproofBeddingSvg,
  'Bathroom & Toilet': BathroomToiletSvg,
  'Hire Equipment': HireEquipmentSvg,
  'hire': HireEquipmentSvg,
  'bag': BagEquipmentSvg,
  'Bag': BagEquipmentSvg,
  'Bags': BagEquipmentSvg,
  'Equipment Bag': BagEquipmentSvg,
  'massage': MassageTherapySvg,
  'Massage': MassageTherapySvg,
};

export const clinicalCategoryMeta: Record<string, {
  subtitle: string;
  preferredImage: string;
  group: 'mobility' | 'care' | 'continence' | 'hire';
  tag?: string;
}> = {
  'Chairs & Lift Chairs': {
    subtitle: 'Configura® posture & electric lift chairs',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2021/11/Configura-Comfort-Black-Upright-2026.webp',
    group: 'mobility',
    tag: 'Seating & Lift',
  },
  'Beds & Pressure Care': {
    subtitle: 'Hi-lo hospital beds & dynamic air mattresses',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2024/12/Empresa-LTC-Bed-Main-Badge.webp',
    group: 'care',
    tag: 'Beds & Pressure',
  },
  'Wheelchairs & Power Mobility': {
    subtitle: 'Active manual, tilt-in-space & power wheelchairs',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2024/01/Aspire-VIDA-X-Purple-MWS449868-Front-Angle.webp',
    group: 'mobility',
    tag: 'Mobility',
  },
  'Bathroom & Hygiene': {
    subtitle: 'Shower commodes, tilt chairs & bath safety',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2023/04/Ocean-Ergo-VIP-Main.webp',
    group: 'care',
    tag: 'Hygiene',
  },
  'Patient Handling & Hoists': {
    subtitle: 'Standing lifters, mobile hoists & transfer slings',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2018/08/Sara-Stedy-Badge.webp',
    group: 'care',
    tag: 'Transfers',
  },
  'Daily Living & Continence': {
    subtitle: 'Adaptive dining, reachers & continence care',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2022/01/Uccello-Black-and-White-01.webp',
    group: 'care',
    tag: 'Daily Living',
  },
  'Paediatric & Specialized Rehab': {
    subtitle: 'Paediatric seating, gait trainers & therapy',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2024/12/ACTIPRO-Balance-Pad-01.webp',
    group: 'mobility',
    tag: 'Paediatric & Rehab',
  },
  'Meal Preparation Equipment': {
    subtitle: 'Adaptive openers, kettles & dining aids',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2022/01/Uccello-Black-and-White-01.webp',
    group: 'care',
    tag: 'Daily Living',
  },
  'Hip Protectors': {
    subtitle: 'Protective wear & day calendar clocks',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2025/01/Able-Life-Universal-Stand-Assist.webp',
    group: 'care',
    tag: 'Fall Safety',
  },
  'Vehicle Equipment': {
    subtitle: 'Car assist bars & transfer swivel seats',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2024/12/Empresa-Self-Assist-Bar-Main.webp',
    group: 'mobility',
    tag: 'Vehicle',
  },
  'Non slip equipment': {
    subtitle: 'Anti-slip bathroom mats & floor runners',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2018/09/Conni-Anti-Slip-Floor-Mat-Pebble.webp',
    group: 'care',
    tag: 'Non-Slip',
  },
  'Walkers': {
    subtitle: 'Carbon fibre & indoor seat rollators',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2021/06/Aspire-Vogue-Adventure-Walker-WAF705450.webp',
    group: 'mobility',
    tag: 'Mobility',
  },
  'Single Point Sticks': {
    subtitle: 'Quad canes & folding walking sticks',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2025/01/Able-Life-Universal-Stand-Assist.webp',
    group: 'mobility',
    tag: 'Stability',
  },
  'Electric Bed and Mattress': {
    subtitle: 'Hi-lo profiling electric beds & mattresses',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2024/12/Empresa-LTC-Bed-Main-Badge.webp',
    group: 'care',
    tag: 'Hospital Bed',
  },
  'Long Handled Equipment': {
    subtitle: 'Reachers, stocking aids & toe washers',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2022/01/Uccello-Black-and-White-01.webp',
    group: 'care',
    tag: 'Assistance',
  },
  'Pillows': {
    subtitle: 'Ergonomic cervical & latex medical pillows',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2022/10/Pillow.jpg',
    group: 'care',
    tag: 'Ergonomic',
  },
  'Personal care equipment': {
    subtitle: 'Bedside commodes & toilet seat raisers',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2023/04/Ocean-Ergo-VIP-Main.webp',
    group: 'care',
    tag: 'Personal Care',
  },
  'Cushions': {
    subtitle: 'Roho air-cell & gel pressure cushions',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2018/09/Quadtro-Select-High-Profile-02-Flattened.png',
    group: 'mobility',
    tag: 'Pressure Care',
  },
  'Recliners': {
    subtitle: 'Single & quad motor electric lift chairs',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2022/08/Configura-Advance-01.webp',
    group: 'mobility',
    tag: 'Power Lift',
  },
  'Bed Side rails': {
    subtitle: 'King Cobra poles & U-assist safety rails',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2024/12/Empresa-LTC-Bed-Self-Help-Pole.webp',
    group: 'care',
    tag: 'Bed Safety',
  },
  'Over Bed Table': {
    subtitle: 'EcoDry airers & mobile overbed tables',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2025/01/Able-Life-Universal-Stand-Assist.webp',
    group: 'care',
    tag: 'Convenience',
  },
  'Day Chairs': {
    subtitle: 'Classic ergonomic high & low back chairs',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2021/11/Configura-Comfort-Black-Upright-2026.webp',
    group: 'care',
    tag: 'Postural',
  },
  'Wheelchairs': {
    subtitle: 'Ergonomic manual & transit folding chairs',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2024/01/Aspire-VIDA-X-Purple-MWS449868-Front-Angle.webp',
    group: 'mobility',
    tag: 'Wheelchairs',
  },
  'Comfortshield Gold Cotton Terry Fitted Waterproof': {
    subtitle: 'Fitted waterproof bed sheets & protectors',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2018/09/Conni-Anti-Slip-Floor-Mat-Pebble.webp',
    group: 'continence',
    tag: 'Waterproof',
  },
  'Bathroom & Toilet': {
    subtitle: 'Shower chairs, stools & toilet surrounds',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2023/04/Ocean-Ergo-VIP-Main.webp',
    group: 'care',
    tag: 'Bathroom',
  },
  'Hire Equipment': {
    subtitle: 'Flexible weekly clinical rental equipment',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2024/12/Empresa-LTC-Bed-Main-Badge.webp',
    group: 'hire',
    tag: 'Rental',
  },
  'hire': {
    subtitle: 'Flexible weekly clinical rental equipment',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2024/12/Empresa-LTC-Bed-Main-Badge.webp',
    group: 'hire',
    tag: 'Rental',
  },
  'bag': {
    subtitle: 'Adaptive carry bags & wheelchair storage pouches',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2018/08/Pride-Single-Fold-Ramp-01.jpg',
    group: 'care',
    tag: 'Accessories',
  },
  'Bag': {
    subtitle: 'Adaptive carry bags & wheelchair storage pouches',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2018/08/Pride-Single-Fold-Ramp-01.jpg',
    group: 'care',
    tag: 'Accessories',
  },
  'Bags': {
    subtitle: 'Adaptive carry bags & wheelchair storage pouches',
    preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2018/08/Pride-Single-Fold-Ramp-01.jpg',
    group: 'care',
    tag: 'Accessories',
  },
};

// Generates a unique, high-resolution SVG graphic specific to any category
export function getDynamicCategoryImage(categoryName: string): string {
  const cleanName = (categoryName || 'Equipment').replace(/[<>"']/g, '');
  const firstChar = (cleanName.charAt(0) || 'E').toUpperCase();
  
  const palettes = [
    { bg1: '#0F766E', bg2: '#14B8A6', accent: '#2DD4BF' },
    { bg1: '#1E40AF', bg2: '#3B82F6', accent: '#60A5FA' },
    { bg1: '#6B21A8', bg2: '#A855F7', accent: '#C084FC' },
    { bg1: '#9D174D', bg2: '#EC4899', accent: '#F472B6' },
    { bg1: '#065F46', bg2: '#10B981', accent: '#34D399' },
    { bg1: '#C2410C', bg2: '#F97316', accent: '#FB923C' },
    { bg1: '#1E293B', bg2: '#475569', accent: '#94A3B8' },
  ];
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = (hash << 5) - hash + cleanName.charCodeAt(i);
    hash |= 0;
  }
  const color = palettes[Math.abs(hash) % palettes.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
    <defs>
      <linearGradient id="dynGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color.bg1}" />
        <stop offset="100%" stop-color="${color.bg2}" />
      </linearGradient>
      <linearGradient id="inner" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.25" />
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.05" />
      </linearGradient>
    </defs>
    <rect width="500" height="500" rx="32" fill="url(#dynGrad)" />
    <circle cx="250" cy="210" r="105" fill="url(#inner)" stroke="${color.accent}" stroke-width="4" />
    <circle cx="250" cy="210" r="85" fill="#FFFFFF" fill-opacity="0.1" />
    <text x="250" y="248" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="105" font-weight="900" fill="#FFFFFF" letter-spacing="-2">${firstChar}</text>
    <rect x="75" y="370" width="350" height="46" rx="14" fill="#000000" fill-opacity="0.32" />
    <text x="250" y="400" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="17" font-weight="800" fill="#FFFFFF" letter-spacing="1.5">${cleanName.toUpperCase().slice(0, 24)}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Resilient, keyword-smart category SVG resolver
export function getCategorySvg(key: string): React.FC<IconProps> {
  if (!key) return AssistiveTechSvg;
  if (categorySvgMap[key]) return categorySvgMap[key];

  const lower = key.toLowerCase().trim();
  for (const [k, v] of Object.entries(categorySvgMap)) {
    if (k.toLowerCase().trim() === lower) return v;
  }

  // Keyword fuzzy matching
  if (lower.includes('bag') || lower.includes('pouch') || lower.includes('carrier') || lower.includes('tote') || lower.includes('backpack')) {
    return BagEquipmentSvg;
  }
  if (lower.includes('wheelchair') || lower.includes('transit')) {
    return WheelchairSvg;
  }
  if (lower.includes('bed') || lower.includes('mattress') || lower.includes('sleep') || lower.includes('cot')) {
    return ElectricBedSvg;
  }
  if (lower.includes('walker') || lower.includes('rollator') || lower.includes('frame')) {
    return WalkerSvg;
  }
  if (lower.includes('cane') || lower.includes('stick') || lower.includes('crutch')) {
    return SinglePointStickSvg;
  }
  if (lower.includes('chair') || lower.includes('recliner') || lower.includes('seat')) {
    return lower.includes('recliner') ? ReclinerSvg : DayChairSvg;
  }
  if (lower.includes('cushion') || lower.includes('pad') || lower.includes('roho')) {
    return CushionSvg;
  }
  if (lower.includes('bath') || lower.includes('shower') || lower.includes('toilet') || lower.includes('commode')) {
    return BathroomToiletSvg;
  }
  if (lower.includes('kettle') || lower.includes('opener') || lower.includes('cutlery') || lower.includes('kitchen') || lower.includes('meal') || lower.includes('dining')) {
    return MealPrepSvg;
  }
  if (lower.includes('slip') || lower.includes('grip') || lower.includes('mat')) {
    return NonSlipSvg;
  }
  if (lower.includes('table') || lower.includes('desk') || lower.includes('overbed')) {
    return OverBedTableSvg;
  }
  if (lower.includes('pillow') || lower.includes('headrest') || lower.includes('cervical')) {
    return PillowSvg;
  }
  if (lower.includes('rail') || lower.includes('pole') || lower.includes('guard')) {
    return BedSideRailSvg;
  }
  if (lower.includes('car') || lower.includes('vehicle') || lower.includes('auto')) {
    return VehicleEquipmentSvg;
  }
  if (lower.includes('hip') || lower.includes('pelvic') || lower.includes('clock') || lower.includes('calendar')) {
    return HipProtectorSvg;
  }
  if (lower.includes('sheet') || lower.includes('waterproof') || lower.includes('terry') || lower.includes('bedding')) {
    return WaterproofBeddingSvg;
  }
  if (lower.includes('hire') || lower.includes('rental') || lower.includes('rent')) {
    return HireEquipmentSvg;
  }
  if (lower.includes('care') || lower.includes('personal') || lower.includes('hygiene')) {
    return PersonalCareSvg;
  }
  if (lower.includes('massage') || lower.includes('therapy') || lower.includes('wellness') || lower.includes('spa') || lower.includes('physio')) {
    return MassageTherapySvg;
  }

  // Generate distinct monogram SVG for any custom category name so no two categories share the same icon
  const firstChar = key.trim().charAt(0) || 'A';
  return createDynamicMonogramSvg(firstChar);
}

// Resilient, keyword-smart category metadata resolver
export function getCategoryMeta(key: string) {
  if (!key) {
    return {
      subtitle: 'Assistive clinical equipment',
      preferredImage: '',
      group: 'care' as const,
    };
  }

  if (clinicalCategoryMeta[key]) return clinicalCategoryMeta[key];
  const lower = key.toLowerCase().trim();
  for (const [k, v] of Object.entries(clinicalCategoryMeta)) {
    if (k.toLowerCase().trim() === lower) return v;
  }

  // Keyword-based intelligent metadata & related images
  if (lower.includes('bag') || lower.includes('pouch') || lower.includes('carrier') || lower.includes('tote') || lower.includes('backpack')) {
    return {
      subtitle: 'Adaptive carry bags & mobility equipment pouches',
      preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2018/08/Pride-Single-Fold-Ramp-01.jpg',
      group: 'care' as const,
      tag: 'Accessories',
    };
  }
  if (lower.includes('wheelchair') || lower.includes('transit')) {
    return {
      subtitle: 'Ergonomic manual & transit folding wheelchairs',
      preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2024/01/Aspire-VIDA-X-Purple-MWS449868-Front-Angle.webp',
      group: 'mobility' as const,
      tag: 'Wheelchairs',
    };
  }
  if (lower.includes('bed') || lower.includes('mattress') || lower.includes('sleep') || lower.includes('cot')) {
    return {
      subtitle: 'Hi-lo profiling electric beds & mattresses',
      preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2024/12/Empresa-LTC-Bed-Main-Badge.webp',
      group: 'care' as const,
      tag: 'Hospital Bed',
    };
  }
  if (lower.includes('walker') || lower.includes('rollator') || lower.includes('frame')) {
    return {
      subtitle: 'Carbon fibre & indoor seat rollators',
      preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2021/06/Aspire-Vogue-Adventure-Walker-WAF705450.webp',
      group: 'mobility' as const,
      tag: 'Mobility',
    };
  }
  if (lower.includes('cane') || lower.includes('stick') || lower.includes('crutch')) {
    return {
      subtitle: 'Quad canes & folding walking sticks',
      preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2025/01/Able-Life-Universal-Stand-Assist.webp',
      group: 'mobility' as const,
      tag: 'Stability',
    };
  }
  if (lower.includes('chair') || lower.includes('recliner') || lower.includes('seat')) {
    return {
      subtitle: lower.includes('recliner') ? 'Power lift electric armchairs' : 'Classic ergonomic patient day chairs',
      preferredImage: lower.includes('recliner') ? 'https://www.rehabhire.com.au/wp-content/uploads/2022/08/Configura-Advance-01.webp' : 'https://www.rehabhire.com.au/wp-content/uploads/2021/11/Configura-Comfort-Black-Upright-2026.webp',
      group: 'mobility' as const,
      tag: 'Seating',
    };
  }
  if (lower.includes('cushion') || lower.includes('pad') || lower.includes('roho')) {
    return {
      subtitle: 'Roho air-cell & gel pressure cushions',
      preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2018/09/Quadtro-Select-High-Profile-02-Flattened.png',
      group: 'mobility' as const,
      tag: 'Pressure Care',
    };
  }
  if (lower.includes('bath') || lower.includes('shower') || lower.includes('toilet') || lower.includes('commode')) {
    return {
      subtitle: 'Shower chairs, stools & toilet surrounds',
      preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2023/04/Ocean-Ergo-VIP-Main.webp',
      group: 'care' as const,
      tag: 'Bathroom',
    };
  }
  if (lower.includes('kettle') || lower.includes('opener') || lower.includes('cutlery') || lower.includes('kitchen') || lower.includes('meal') || lower.includes('dining')) {
    return {
      subtitle: 'Adaptive openers, kettles & dining aids',
      preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2022/01/Uccello-Black-and-White-01.webp',
      group: 'care' as const,
      tag: 'Daily Living',
    };
  }
  if (lower.includes('slip') || lower.includes('grip') || lower.includes('mat')) {
    return {
      subtitle: 'Anti-slip bathroom mats & floor runners',
      preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2018/09/Conni-Anti-Slip-Floor-Mat-Pebble.webp',
      group: 'care' as const,
      tag: 'Safety',
    };
  }
  if (lower.includes('table') || lower.includes('desk') || lower.includes('overbed')) {
    return {
      subtitle: 'Overbed tables & convenience accessories',
      preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2025/01/Able-Life-Universal-Stand-Assist.webp',
      group: 'care' as const,
      tag: 'Convenience',
    };
  }
  if (lower.includes('pillow') || lower.includes('headrest') || lower.includes('cervical')) {
    return {
      subtitle: 'Ergonomic cervical & medical pillows',
      preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2022/10/Pillow.jpg',
      group: 'care' as const,
      tag: 'Ergonomic',
    };
  }
  if (lower.includes('rail') || lower.includes('pole') || lower.includes('guard')) {
    return {
      subtitle: 'King Cobra poles & bed safety rails',
      preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2024/12/Empresa-LTC-Bed-Self-Help-Pole.webp',
      group: 'care' as const,
      tag: 'Bed Safety',
    };
  }
  if (lower.includes('car') || lower.includes('vehicle') || lower.includes('auto')) {
    return {
      subtitle: 'Car assist bars & transfer swivel seats',
      preferredImage: 'https://www.rehabhire.com.au/wp-content/uploads/2024/12/Empresa-Self-Assist-Bar-Main.webp',
      group: 'mobility' as const,
      tag: 'Vehicle',
    };
  }
  if (lower.includes('massage') || lower.includes('therapy') || lower.includes('wellness') || lower.includes('spa') || lower.includes('physio')) {
    return {
      subtitle: 'Therapeutic massage & muscle recovery equipment',
      preferredImage: '',
      group: 'care' as const,
      tag: 'Therapy',
    };
  }

  // Fallback for custom categories: Keep preferredImage empty so actual uploaded product photos take precedence
  const capitalized = key.charAt(0).toUpperCase() + key.slice(1);
  return {
    subtitle: `${capitalized} equipment & clinical supplies`,
    preferredImage: '',
    group: 'care' as const,
    tag: capitalized,
  };
}

// Smart product image resolver for when a product is saved in Admin without an explicit image
export function getSmartProductImage(category: string, name: string): string {
  const combined = `${category} ${name}`.toLowerCase();
  
  if (combined.includes('bag') || combined.includes('pouch') || combined.includes('carrier') || combined.includes('tote') || combined.includes('backpack')) {
    return 'https://www.rehabhire.com.au/wp-content/uploads/2018/08/Pride-Single-Fold-Ramp-01.jpg';
  }
  if (combined.includes('wheelchair') || combined.includes('transit')) {
    return 'https://www.rehabhire.com.au/wp-content/uploads/2024/01/Aspire-VIDA-X-Purple-MWS449868-Front-Angle.webp';
  }
  if (combined.includes('bed') || combined.includes('mattress') || combined.includes('sleep') || combined.includes('cot')) {
    return 'https://www.rehabhire.com.au/wp-content/uploads/2024/12/Empresa-LTC-Bed-Main-Badge.webp';
  }
  if (combined.includes('walker') || combined.includes('rollator') || combined.includes('frame')) {
    return 'https://www.rehabhire.com.au/wp-content/uploads/2021/06/Aspire-Vogue-Adventure-Walker-WAF705450.webp';
  }
  if (combined.includes('cane') || combined.includes('stick') || combined.includes('crutch')) {
    return 'https://www.rehabhire.com.au/wp-content/uploads/2025/01/Able-Life-Universal-Stand-Assist.webp';
  }
  if (combined.includes('chair') || combined.includes('recliner') || combined.includes('seat')) {
    return combined.includes('recliner') ? 'https://www.rehabhire.com.au/wp-content/uploads/2022/08/Configura-Advance-01.webp' : 'https://www.rehabhire.com.au/wp-content/uploads/2021/11/Configura-Comfort-Black-Upright-2026.webp';
  }
  if (combined.includes('cushion') || combined.includes('pad') || combined.includes('roho')) {
    return 'https://www.rehabhire.com.au/wp-content/uploads/2018/09/Quadtro-Select-High-Profile-02-Flattened.png';
  }
  if (combined.includes('bath') || combined.includes('shower') || combined.includes('toilet') || combined.includes('commode')) {
    return 'https://www.rehabhire.com.au/wp-content/uploads/2023/04/Ocean-Ergo-VIP-Main.webp';
  }
  if (combined.includes('kettle') || combined.includes('opener') || combined.includes('cutlery') || combined.includes('kitchen') || combined.includes('meal') || combined.includes('dining')) {
    return 'https://www.rehabhire.com.au/wp-content/uploads/2022/01/Uccello-Black-and-White-01.webp';
  }
  if (combined.includes('slip') || combined.includes('grip') || combined.includes('mat')) {
    return 'https://www.rehabhire.com.au/wp-content/uploads/2018/09/Conni-Anti-Slip-Floor-Mat-Pebble.webp';
  }
  if (combined.includes('table') || combined.includes('desk') || combined.includes('overbed')) {
    return 'https://www.rehabhire.com.au/wp-content/uploads/2025/01/Able-Life-Universal-Stand-Assist.webp';
  }
  if (combined.includes('pillow') || combined.includes('headrest') || combined.includes('cervical')) {
    return 'https://www.rehabhire.com.au/wp-content/uploads/2022/10/Pillow.jpg';
  }
  if (combined.includes('rail') || combined.includes('pole') || combined.includes('guard')) {
    return 'https://www.rehabhire.com.au/wp-content/uploads/2024/12/Empresa-LTC-Bed-Self-Help-Pole.webp';
  }
  if (combined.includes('car') || combined.includes('vehicle') || combined.includes('auto')) {
    return 'https://www.rehabhire.com.au/wp-content/uploads/2024/12/Empresa-Self-Assist-Bar-Main.webp';
  }

  // If completely unknown, return general equipment placeholder or dynamic SVG
  return getDynamicCategoryImage(category || name || 'Equipment');
}
