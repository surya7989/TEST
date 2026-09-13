import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Phone,
  Truck,
  Package,
  CheckCircle2,
  Sparkles,
  HeartHandshake,
  FileText,
  Clock,
} from 'lucide-react';
import { AustraliaIcon } from '@/components/common/Icons';
import { useProducts, type Product } from '@/data/products';
import { useAdminStore } from '@/store/adminStore';

interface ContinenceCategory {
  id: string;
  shopSlug: string;
  title: string;
  badge: string;
  description: string;
  image: string;
}

const CONTINENCE_CATEGORIES: ContinenceCategory[] = [
  {
    id: 'pads-liners',
    shopSlug: 'pads-liners',
    title: 'Pads & Daily Liners',
    badge: 'Daily & Overnight',
    description: 'Ultra-thin liners, rapid-absorption InstaDRY daytime pads, and high-capacity overnight Maxi pads for discreet confidence.',
    image: '/images/carers/cat-womens-pants.png',
  },
  {
    id: 'pants',
    shopSlug: 'pull-up-pants',
    title: 'Pull-Up Protective Pants',
    badge: 'Underwear Style',
    description: 'Underwear-style pull-up pants for active or assisted wearers. Soft, breathable, dignified, with quick tear-open side seams.',
    image: '/images/carers/products/proskin-pants-super.png',
  },
  {
    id: 'flex',
    shopSlug: 'flex-briefs',
    title: 'Flex Belted Briefs',
    badge: 'Carer Ergonomic',
    description: 'Ergonomic belted briefs designed to reduce caregiver back strain by up to 70% during bed or wheelchair changes.',
    image: '/images/carers/products/proskin-flex-maxi.png',
  },
  {
    id: 'slips',
    shopSlug: 'all-in-one-slips',
    title: 'All-in-One Slips & Bariatric',
    badge: 'Maximum Care',
    description: 'Wide-tab all-in-one 2XL bariatric slips and anatomically contoured inserts for high-needs nighttime care.',
    image: '/images/carers/cat-unisex-specialists.png',
  },
  {
    id: 'bed-chair-protection',
    shopSlug: 'bed-chair-protection',
    title: 'Bed & Chair Protection',
    badge: 'Surface & Skin',
    description: 'Clinical protective underpads, mattress covers, skin barrier lotions, and cleansers for skin integrity & pressure care.',
    image: '/images/carers/products/proskin-wet-wipes.png',
  },
  {
    id: 'mens',
    shopSlug: 'mens-underwear',
    title: "Men's Protective Underwear",
    badge: 'Contoured Fit',
    description: 'Masculine navy blue protective underwear anatomically contoured specifically for the male body and active lifestyle.',
    image: '/images/carers/products/men-active-fit-navy.png',
  },
];

const CARER_FAQS = [
  {
    q: 'Can I purchase these continence products using an NDIS Consumables budget?',
    a: 'Yes, 100%. All TENA pads, pull-up pants, belted briefs, and liners in this catalogue are fully eligible under NDIS Support Category 03 (Core: Consumables). If you are Self-Managed, you can pay online and claim immediate reimbursement. If you are Plan-Managed, select "NDIS Quotation / Plan Invoice" at checkout and we will send the tax invoice directly to your Plan Manager for payment with zero out-of-pocket expenses.',
  },
  {
    q: 'How do I choose between Pull-Up Pants, Flex Belted Briefs, and All-in-One Slips?',
    a: 'Pull-Up Pants are ideal for wearers who can stand or walk, feeling just like regular underwear. Flex Belted Briefs are the clinical standard for assisted changing in bed or wheelchair — the waist belt fastens first, allowing the carer to adjust the pad without lifting the participant, drastically reducing caregiver strain. All-in-One Bariatric Slips (such as the 2XL Slip) feature wide refastenable tabs designed for larger individuals or those requiring maximum containment.',
  },
  {
    q: 'What does "Carton Supply" mean and why do carers buy in cartons?',
    a: 'Continence care is an ongoing daily necessity. We supply products in wholesale cartons (e.g. 304 to 1,392 pieces) to save carers time, provide wholesale bulk savings, and ensure you never run out. Your NDIS budget covers the full carton cost GST-Free.',
  },
  {
    q: 'Is delivery discreet?',
    a: 'Yes. All orders are dispatched in plain, unbranded outer boxes with no medical or continence markings. Free Australia-wide door delivery is provided with live tracking on all carton orders.',
  },
  {
    q: 'Can you set up automatic recurring monthly deliveries?',
    a: 'Yes. Contact our carer care team on 0494 787 409 or via email. We can schedule monthly or bi-monthly carton deliveries timed perfectly to your loved one’s usage and plan schedule.',
  },
  {
    q: 'Are continence pads and pants GST-Free in Australia?',
    a: 'Yes. Under Section 38-45 of A New Tax System (GST) Act 1999, medical continence aids and appliances are strictly GST-Free. You pay 0% GST on all continence products in this catalogue.',
  },
];

export function ForCarersPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const rawProducts = useProducts();
  const adminStoreProducts = useAdminStore((s) => s.products);

  // Active products pool
  const allProducts = useMemo(() => {
    return (adminStoreProducts && adminStoreProducts.length > 0 ? adminStoreProducts : rawProducts) as Product[];
  }, [adminStoreProducts, rawProducts]);

  // Continence & carer products pool
  const carerTenaProducts = useMemo(() => {
    return allProducts.filter((p) => {
      const isTena =
        p.brand?.toLowerCase() === 'tena' ||
        p.categories?.includes('continence-care') ||
        p.categories?.includes('for-carers') ||
        p.categories?.includes('incontinence-aids') ||
        p.tags?.includes('tena') ||
        p.name.toLowerCase().includes('tena') ||
        p.name.toLowerCase().includes('proskin');
      const isAvailable = (p as any).available !== false;
      return isTena && isAvailable;
    });
  }, [allProducts]);

  // Dynamic count map for each category
  const categoryCountMap = useMemo(() => {
    const map: Record<string, number> = {
      'pads-liners': 0,
      pants: 0,
      flex: 0,
      slips: 0,
      'bed-chair-protection': 0,
      mens: 0,
    };

    carerTenaProducts.forEach((p) => {
      const s = (p.slug || '').toLowerCase();
      const n = (p.name || '').toLowerCase();
      const pCats = (p.categories || []).map((c) => (c || '').toLowerCase());

      if (s.includes('liner') || s.includes('pad') || n.includes('liner') || n.includes('pad') || n.includes('instadry')) {
        map['pads-liners']++;
      }
      if (s.includes('pants') || n.includes('pants') || pCats.includes('pants')) {
        map['pants']++;
      }
      if (s.includes('flex') || n.includes('flex') || pCats.includes('flex')) {
        map['flex']++;
      }
      if (s.includes('slip') || s.includes('bariatric') || s.includes('comfort') || n.includes('slip') || n.includes('bariatric')) {
        map['slips']++;
      }
      if (s.includes('bed') ||
        s.includes('underpad') ||
        s.includes('barrier') ||
        s.includes('lotion') ||
        s.includes('wipe') ||
        n.includes('bed') ||
        n.includes('underpad') ||
        n.includes('barrier') ||
        n.includes('lotion') ||
        n.includes('wipe')) {
        map['bed-chair-protection']++;
      }
      if (s.includes('men') || n.includes('men') || pCats.includes('mens')) {
        map['mens']++;
      }
    });

    return map;
  }, [carerTenaProducts]);

  return (<div className="min-h-screen bg-[#F4F6F8] text-[#0F1E2E] font-sans">
      {/* ── BREADCRUMBS ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 2xl:px-8 py-3">
          <nav className="flex items-center gap-2 text-xs font-semibold text-gray-500" aria-label="Breadcrumbs">
            <Link to="/" className="hover:text-[#147A7A] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[#147A7A]">Continence & Pad Care for Carers</span>
          </nav>
        </div>
      </div>

      {/* ── HERO BANNER: CLEAN, BRIGHT, CLINICAL & TRUSTWORTHY ── */}
      <section className="bg-[#F4F6F8] py-10 sm:py-16 border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 2xl:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-8 space-y-4">
              {/* Clinical Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white rounded-full border border-teal-200/80 shadow-2xs text-xs font-bold text-[#147A7A]">
                <AustraliaIcon className="w-3.5 h-3 text-[#147A7A]" />
                <span>NDIS Consumables Support Category 03 &bull; 100% GST-Free</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black tracking-tight leading-[1.15] text-[#0F1E2E]">
                Continence Care & Pad Supplies <br className="hidden sm:inline" />
                <span className="text-[#147A7A]">Tailored for Family Carers & Support Workers</span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-[#4A5568] max-w-2xl leading-relaxed">
                Direct wholesale access to clinical-grade TENA continence products. From discreet daily liners and pull-up underwear to ergonomic belted briefs that protect caregiver back health.
                Claimable via Self-Managed, Plan-Managed, and Agency NDIS funding with zero upfront out-of-pocket costs.
              </p>

              {/* Quick Trust Badges Strip (White cards on light background) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-white border border-gray-200/90 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center gap-2 text-[#147A7A] font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-[#147A7A]" />
                    <span>NDIS Eligible</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">Core Consumables 03</p>
                </div>

                <div className="bg-white border border-gray-200/90 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center gap-2 text-[#147A7A] font-bold text-xs">
                    <Truck className="w-4 h-4 text-[#147A7A]" />
                    <span>Discreet Packaging</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">Plain unbranded boxes</p>
                </div>

                <div className="bg-white border border-gray-200/90 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center gap-2 text-[#147A7A] font-bold text-xs">
                    <Package className="w-4 h-4 text-[#147A7A]" />
                    <span>Carton Supply</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">Wholesale bulk savings</p>
                </div>

                <div className="bg-white border border-gray-200/90 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center gap-2 text-[#147A7A] font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-[#147A7A]" />
                    <span>100% GST-Free</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">Section 38-45 Tax Free</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/shop/for-carers"
                  className="inline-flex items-center justify-center h-[46px] px-7 bg-[#147A7A] hover:bg-[#106262] text-white text-sm font-bold rounded-xl shadow-xs transition-all duration-150 hover:scale-[1.02]"
                >
                  <span>Browse All Continence in Shop</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>

                <a
                  href="tel:0494787409"
                  className="inline-flex items-center justify-center h-[46px] px-6 bg-white border border-gray-300 hover:border-[#147A7A] text-[#0F1E2E] hover:text-[#147A7A] text-sm font-bold rounded-xl shadow-2xs transition-all duration-150"
                >
                  <Phone className="w-4 h-4 text-[#147A7A] mr-2" />
                  <span>Call Specialist: 0494 787 409</span>
                </a>
              </div>
            </div>

            {/* Right Hero Feature Box (Crisp White Card) */}
            <div className="lg:col-span-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
                <span className="text-xs font-bold text-[#0F1E2E] uppercase tracking-wider">Carer Quick Order Guide</span>
                <span className="text-[11px] bg-teal-50 text-[#147A7A] border border-teal-200 font-bold px-2 py-0.5 rounded-md">
                  NDIS Fast-Track
                </span>
              </div>

              <div className="space-y-4 mt-4 text-xs text-[#4A5568]">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-50 text-[#147A7A] border border-teal-200 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-[#0F1E2E]">Select Your Style</p>
                    <p className="text-[11.5px] text-gray-500 mt-0.5">Pull-Up Pants, Ergonomic Belted Briefs, Liners, or Bariatric Slips.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-50 text-[#147A7A] border border-teal-200 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-[#0F1E2E]">Order in Wholesale Cartons</p>
                    <p className="text-[11.5px] text-gray-500 mt-0.5">Bulk quantities (up to 1,392 pieces) so you never run out of supply.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-50 text-[#147A7A] border border-teal-200 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-bold text-[#0F1E2E]">Checkout with NDIS or Card</p>
                    <p className="text-[11.5px] text-gray-500 mt-0.5">Choose Plan-Managed invoice delivery or pay online for instant reimbursement.</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-[#147A7A] font-semibold">
                <span>Free door shipping on carton orders</span>
                <Truck className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORY-WISE CARDS SHOWCASE (CLICK GOES DIRECTLY TO SHOP) ── */}
      <section className="bg-white py-12 sm:py-16 border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 2xl:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-[#147A7A] uppercase tracking-wider bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  NDIS Consumables Category 03
                </span>
                <span className="text-xs text-gray-400">&bull;</span>
                <span className="text-xs text-gray-500 font-medium">Click Any Category to Shop</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F1E2E] tracking-tight">
                Shop Continence Supplies by Category
              </h2>
            </div>
            <Link
              to="/shop/for-carers"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#147A7A] hover:underline"
            >
              <span>View All Continence in Shop ({carerTenaProducts.length} Items)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 6 Category Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CONTINENCE_CATEGORIES.map((cat) => {
              const count = categoryCountMap[cat.id] ?? 0;

              return (<Link
                  key={cat.id}
                  to={`/shop/${cat.shopSlug}`}
                  className="group flex flex-col justify-between bg-white border border-gray-200/90 hover:border-[#147A7A] rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 p-4 text-left"
                >
                  {/* Photo Container */}
                  <div className="relative aspect-[16/10] w-full bg-[#F8FAFC] rounded-xl p-3 flex items-center justify-center overflow-hidden mb-4 border border-gray-100">
                    <img
                      src={cat.image}
                      alt={cat.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <span className="absolute top-3 right-3 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white text-[#147A7A] border border-teal-100 shadow-2xs">
                      {count > 0 ? `${count} Products` : 'In Shop'}
                    </span>
                    <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-[#147A7A] border border-teal-200">
                      {cat.badge}
                    </span>
                  </div>

                  {/* Text Details */}
                  <div className="flex flex-col justify-between flex-1 space-y-3">
                    <div>
                      <h3 className="text-base font-bold text-[#0F1E2E] group-hover:text-[#147A7A] transition-colors leading-snug">
                        {cat.title}
                      </h3>
                      <p className="text-xs text-[#4A5568] mt-1.5 line-clamp-2 leading-relaxed">
                        {cat.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-[#147A7A] group-hover:underline inline-flex items-center gap-1.5">
                        <span>Shop {cat.title}</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                      <span className="text-[11px] text-gray-400 font-medium">
                        GST-Free &middot; Carton Supply
                      </span>
                    </div>
                  </div>
                </Link>);
            })}
          </div>

          {/* Complete Catalogue Callout Strip */}
          <div className="mt-8 bg-gradient-to-r from-teal-50/70 via-white to-teal-50/70 border border-teal-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xs">
            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Sparkles className="w-4 h-4 text-[#147A7A]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#147A7A]">Complete Clinical Catalogue</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#0F1E2E]">
                Browse All {carerTenaProducts.length} Continence & Carer Aids
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 max-w-xl">
                Filter all TENA products in the shop by drop absorbency rating, carton size, and clinical waist dimensions.
              </p>
            </div>

            <Link
              to="/shop/for-carers"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#147A7A] hover:bg-[#106262] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all whitespace-nowrap hover:scale-[1.02]"
            >
              <span>Open Complete Catalogue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CLINICAL GUIDE FOR CARERS: CHOOSING THE RIGHT SOLUTION ── */}
      <section className="py-12 sm:py-16 bg-[#F4F6F8] border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 2xl:px-8">
          <div className="max-w-3xl mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[#147A7A] bg-white px-3 py-1 rounded-full border border-teal-200 shadow-2xs">
              Clinical Continence Guide for Carers
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F1E2E] mt-2.5 tracking-tight">
              Choosing the Right Incontinence Solution for Your Care Routine
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1.5 leading-relaxed">
              Selecting the appropriate product style ensures skin integrity, prevents leakage, and protects caregiver back health during changing routines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Guide Card 1 */}
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#147A7A] border border-teal-200 flex items-center justify-center font-black">
                  1
                </div>
                <h3 className="font-extrabold text-base text-[#0F1E2E]">Pull-Up Protective Pants</h3>
                <p className="text-xs text-[#4A5568] leading-relaxed">
                  Best for mobile, active, or semi-mobile individuals who can stand during changes. They pull on just like standard underwear, supporting dignity and independence. Side seams tear open quickly for hygienic removal.
                </p>
              </div>
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-500">TENA PROskin Pants</span>
                <Link
                  to="/shop/pull-up-pants"
                  className="text-xs font-bold text-[#147A7A] hover:underline flex items-center gap-1"
                >
                  <span>Shop Pull-Ups</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Guide Card 2 */}
            <div className="p-6 rounded-2xl bg-white border border-teal-200 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-[#147A7A] flex items-center justify-center font-black">
                  2
                </div>
                <h3 className="font-extrabold text-base text-[#0F1E2E]">Ergonomic Flex Belted Briefs</h3>
                <p className="text-xs text-[#4A5568] leading-relaxed">
                  Specifically engineered to protect carer ergonomics. The soft ComfiStretch waistband fastens first, and the absorbent brief fastens to the belt. Proven to reduce caregiver back strain by up to 70% during bed or wheelchair transfers.
                </p>
              </div>
              <div className="pt-4 border-t border-teal-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#147A7A]">TENA PROskin Flex</span>
                <Link
                  to="/shop/flex-briefs"
                  className="text-xs font-bold text-[#147A7A] hover:underline flex items-center gap-1"
                >
                  <span>Shop Flex Briefs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Guide Card 3 */}
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center font-black">
                  3
                </div>
                <h3 className="font-extrabold text-base text-[#0F1E2E]">Bariatric Slips & Two-Piece Systems</h3>
                <p className="text-xs text-[#4A5568] leading-relaxed">
                  For bariatric individuals requiring wider waist dimensions (up to 178cm) or high-needs nighttime care. Reusable fixation pants pair with contoured shaped pads (Comfort Extra / Super) to maximize containment with minimal waste.
                </p>
              </div>
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-500">TENA Slip Bariatric 2XL</span>
                <Link
                  to="/shop/all-in-one-slips"
                  className="text-xs font-bold text-[#147A7A] hover:underline flex items-center gap-1"
                >
                  <span>Shop Slips</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── NDIS CONSUMABLES HOW TO CLAIM STRIP (CLEAN WHITE ON SLATE) ── */}
      <section className="py-12 sm:py-16 bg-white border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 2xl:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs font-bold text-[#147A7A] uppercase">
                <ShieldCheck className="w-4 h-4 text-[#147A7A]" />
                <span>NDIS Assistive Technology & Consumables Provider</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0F1E2E]">
                How to Order with Your NDIS Plan
              </h2>
              <p className="text-xs sm:text-sm text-[#4A5568] leading-relaxed max-w-2xl">
                Continence products are classified under <strong>Support Category 03: Core – Consumables</strong>. You can order with zero out-of-pocket expenses whether your plan is self-managed, plan-managed, or agency-managed.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-xl space-y-1">
                  <span className="font-bold text-[#0F1E2E] block">Plan-Managed</span>
                  <span className="text-gray-500 text-[11.5px] leading-relaxed block">
                    Select Plan-Managed at checkout. We invoice your Plan Manager directly with zero out-of-pocket cost.
                  </span>
                </div>

                <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-xl space-y-1">
                  <span className="font-bold text-[#0F1E2E] block">Self-Managed</span>
                  <span className="text-gray-500 text-[11.5px] leading-relaxed block">
                    Pay online with card or PayPal and receive an instant ATO-compliant GST-Free receipt for portal claiming.
                  </span>
                </div>

                <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-xl space-y-1">
                  <span className="font-bold text-[#0F1E2E] block">NDIA Agency</span>
                  <span className="text-gray-500 text-[11.5px] leading-relaxed block">
                    Contact our clinical team to create an NDIS service booking quote for your planner.
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
              <Link
                to="/shop/for-carers"
                className="px-6 py-3.5 bg-[#147A7A] hover:bg-[#106262] text-white text-xs sm:text-sm font-bold rounded-xl text-center shadow-xs transition-all hover:scale-[1.02]"
              >
                Go to Continence Shop
              </Link>
              <a
                href="tel:0494787409"
                className="px-6 py-3.5 bg-white border border-gray-300 hover:border-[#147A7A] text-[#0F1E2E] text-xs sm:text-sm font-bold rounded-xl text-center shadow-2xs transition-all flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4 text-[#147A7A]" />
                <span>Call Care Team: 0494 787 409</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHOLESALE CARTON SUPPLY & DISCREET DELIVERY GUARANTEE ── */}
      <section className="py-12 sm:py-16 bg-[#F8FAFC] border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 2xl:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#147A7A] bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
              Why Family Carers Trust AT Specialists
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F1E2E] mt-2.5 tracking-tight">
              Wholesale Value, Complete Discretion, Reliable Supply
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1.5">
              Care routines cannot afford unexpected stockouts. We supply directly in wholesale cartons with 100% plain-box discreet home delivery Australia-wide.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200/90 shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-[#147A7A] border border-teal-200 flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-[#0F1E2E]">Wholesale Carton Economy</h3>
              <p className="text-xs text-[#4A5568] leading-relaxed">
                Save hundreds of dollars compared to supermarket packs. Our wholesale cartons contain up to 1,392 pieces, ensuring clinical-grade continence protection at the lowest cost per unit.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200/90 shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-[#147A7A] border border-teal-200 flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-[#0F1E2E]">100% Discreet Packaging</h3>
              <p className="text-xs text-[#4A5568] leading-relaxed">
                Total dignity and privacy. All cartons are shipped in plain, unbranded brown outer boxes with zero medical or continence logos. Fast courier door delivery across all Australian states.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200/90 shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-[#147A7A] border border-teal-200 flex items-center justify-center">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-[#0F1E2E]">Flexible Recurring Orders</h3>
              <p className="text-xs text-[#4A5568] leading-relaxed">
                Set and forget. We can coordinate monthly scheduled deliveries aligned with your client’s NDIS plan budget so you never have to worry about running out of pads or liners.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FREQUENTLY ASKED QUESTIONS FOR CARERS ── */}
      <section className="py-12 sm:py-16 bg-white border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 2xl:px-8">
          <div className="max-w-2xl mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[#147A7A] bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
              Carer Support FAQ
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F1E2E] mt-2.5 tracking-tight">
              Frequently Asked Questions for Family Carers
            </h2>
          </div>

          <div className="space-y-3 max-w-4xl">
            {CARER_FAQS.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (<div
                  key={idx}
                  className={`border rounded-2xl overflow-hidden transition-colors ${
                    isOpen ? 'border-[#147A7A] bg-teal-50/20' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-[#0F1E2E] hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#147A7A]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (<div className="p-4 pt-0 text-xs sm:text-sm text-[#4A5568] leading-relaxed bg-white border-t border-gray-100">
                      {faq.a}
                    </div>)}
                </div>);
            })}
          </div>
        </div>
      </section>

      {/* ── NEED SIZING OR ABSORBENCY ADVICE? CONSULTATION STRIP ── */}
      <section className="py-12 bg-[#F4F6F8]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 2xl:px-8">
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-[#147A7A] bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
                Carer Support Desk
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0F1E2E]">
                Need Help Choosing the Right Pad Size or Absorbency?
              </h2>
              <p className="text-xs sm:text-sm text-[#4A5568] max-w-xl leading-relaxed">
                Our clinical continence consultants work with family carers and support coordinators every day. We can recommend exact waist sizing, absorbency drop ratings, and complimentary trial kits.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <a
                href="tel:0494787409"
                className="px-6 py-3.5 bg-[#147A7A] hover:bg-[#106262] text-white text-xs sm:text-sm font-bold rounded-xl text-center shadow-xs transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
              >
                <Phone className="w-4 h-4" />
                <span>Call: 0494 787 409</span>
              </a>
              <Link
                to="/contact"
                className="px-6 py-3.5 bg-white border border-gray-300 hover:border-[#147A7A] text-[#0F1E2E] hover:text-[#147A7A] text-xs sm:text-sm font-bold rounded-xl text-center shadow-2xs transition-all flex items-center justify-center gap-2"
              >
                <span>Email Carer Support</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>);
}

export default ForCarersPage;
