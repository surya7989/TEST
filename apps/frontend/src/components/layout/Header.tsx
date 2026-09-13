import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, ShoppingBag, Heart, User, Menu, X, Phone, ChevronDown, LayoutGrid, AlertTriangle } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { ATLogo } from '@/components/common/Icons';
import { LiveSearchBar } from '@/components/layout/LiveSearchBar';
import { AT_DEPARTMENTS, getDepartmentCount, getDepartmentHref } from '@/data/departments';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileDeptsOpen, setMobileDeptsOpen] = useState(false);
  const navigate = useNavigate();
  const { itemCount, hasMixedItems } = useCart();

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  return (<header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 h-[86px] flex items-center justify-between gap-4">
        {/* LOGO ONLY */}
        <Link to="/" className="flex-shrink-0 flex items-center select-none" aria-label="AT Specialist Australia Home">
          <ATLogo />
        </Link>

        {/* MOBILE ACTIONS */}
        <div className="flex lg:hidden items-center gap-1 sm:gap-2 flex-shrink-0">
          <a
            href="tel:0494767409"
            className="p-2 text-[#147A7A] hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Call Specialist 0494 767 409"
          >
            <Phone className="h-5 w-5" />
          </a>

          <Link
            to="/cart"
            className="relative p-2 text-gray-700 hover:text-[#147A7A] hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Shopping Cart"
          >
            <ShoppingBag className="h-5 w-5" />
            {hasMixedItems ? (
              <span className="absolute top-0.5 right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold" title="Mixed Cart Restriction">
                <AlertTriangle className="w-2.5 h-2.5" />
              </span>
            ) : itemCount > 0 ? (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#E88D2A] text-white text-[9.5px] font-bold">
                {itemCount}
              </span>
            ) : null}
          </Link>

          <button
            className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* SEARCH BAR - Large Centered Desktop with Instant Live Dropdown */}
        <div className="flex-1 max-w-[660px] mx-2 lg:mx-4 hidden lg:block relative z-40">
          <LiveSearchBar />
        </div>

        {/* RIGHT ACTIONS - Desktop */}
        <div className="hidden lg:flex items-center gap-6 flex-shrink-0">
          {/* Account */}
          <Link
            to="/account"
            className="flex items-center gap-2.5 text-gray-800 hover:text-[#147A7A] transition-colors"
          >
            <User className="h-5 w-5 text-gray-600" />
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[10.5px] text-gray-500 font-normal">My Account</span>
              <span className="text-[12.5px] font-semibold text-gray-800">Sign in / Register</span>
            </div>
          </Link>

          {/* Wishlist */}
          <Link
            to="/wishlist"
            className="flex items-center gap-2 text-gray-800 hover:text-[#147A7A] transition-colors"
          >
            <Heart className="h-5 w-5 text-gray-600" />
            <span className="text-[12.5px] font-semibold text-gray-800">Wishlist</span>
          </Link>

          {/* Cart */}
          <Link
            to="/cart"
            className="flex items-center gap-2 text-gray-800 hover:text-[#147A7A] transition-colors"
          >
            <div className="relative flex items-center">
              <ShoppingCart className="h-5 w-5 text-gray-700" />
              {hasMixedItems ? (
                <span className="absolute -top-1.5 -right-2 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold" title="Mixed Cart Restriction">
                  <AlertTriangle className="w-2.5 h-2.5" />
                </span>
              ) : itemCount > 0 ? (
                <span className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-[#E88D2A] text-white text-[10px] font-bold">
                  {itemCount}
                </span>
              ) : null}
            </div>
            <span className="text-[12.5px] font-semibold text-gray-800 flex items-center gap-1">
              Cart
              {hasMixedItems && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
              )}
            </span>
          </Link>
        </div>
      </div>

      {/* MOBILE SEARCH BAR WITH LIVE INSTANT DROPDOWN */}
      <div className="lg:hidden px-4 pb-4">
        <LiveSearchBar isMobile={true} />
      </div>

      {/* MOBILE MENU DRAWER */}
      {isMobileMenuOpen && (<div className="lg:hidden fixed inset-0 z-50 bg-white animate-fade-in">
          <div className="h-full flex flex-col overflow-y-auto">
            {/* Header in drawer */}
            <div className="flex items-center justify-between h-[64px] px-4 border-b border-gray-200">
              <ATLogo size="sm" showTagline={false} />
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="px-4 py-4 space-y-1">
              <Link
                to="/account"
                className="flex items-center gap-3 px-3 py-3 text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User className="h-5 w-5 text-gray-600" />
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[11px] text-gray-500 font-normal">My Account</span>
                  <span className="text-[14px] font-semibold text-gray-800">Sign in / Register</span>
                </div>
              </Link>

              <Link
                to="/wishlist"
                className="flex items-center gap-3 px-3 py-3 text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Heart className="h-5 w-5 text-gray-600" />
                <span className="text-[14px] font-semibold text-gray-800">Wishlist</span>
              </Link>

              <Link
                to="/cart"
                className="flex items-center gap-3 px-3 py-3 text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="relative flex items-center">
                  <ShoppingBag className="h-5 w-5 text-gray-600" />
                  {itemCount > 0 && (<span className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-[#E88D2A] text-white text-[10px] font-bold">
                      {itemCount}
                    </span>)}
                </div>
                <span className="text-[14px] font-semibold text-gray-800">Cart</span>
              </Link>

              <hr className="my-3 border-gray-200" />

              <Link
                to="/shop"
                className="flex items-center gap-3 px-3 py-3 text-gray-800 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Shop All Equipment
              </Link>

              {/* Shop by Department (same 12 departments as desktop menu) */}
              <div className="rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMobileDeptsOpen((v) => !v)}
                  className="flex items-center gap-3 px-3 py-3 text-gray-800 hover:bg-gray-50 rounded-lg transition-colors font-medium w-full"
                  aria-expanded={mobileDeptsOpen}
                >
                  <LayoutGrid className="h-5 w-5 text-gray-600" />
                  <span className="text-[14px] font-semibold flex-1 text-left">Shop by Department</span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${mobileDeptsOpen ? 'rotate-180' : ''}`} />
                </button>
                {mobileDeptsOpen && (<div className="ml-4 pl-4 border-l-2 border-gray-100 py-1 space-y-0.5 max-h-[300px] overflow-y-auto">
                    {AT_DEPARTMENTS.map((dept) => (<Link
                        key={dept.id}
                        to={getDepartmentHref(dept)}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <span className="text-[13px] font-semibold">{dept.name}</span>
                        <span className="text-[11px] text-gray-400">{getDepartmentCount(dept)}</span>
                      </Link>))}
                  </div>)}
              </div>

              <Link
                to="/ndis"
                className="flex items-center gap-3 px-3 py-3 text-gray-800 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                NDIS Participants
              </Link>

              <Link
                to="/hire"
                className="flex items-center gap-3 px-3 py-3 text-gray-800 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Equipment Hire
              </Link>

              <Link
                to="/for-carers"
                className="flex items-center gap-3 px-3 py-3 text-gray-800 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                For Carers
              </Link>

              <Link
                to="/help"
                className="flex items-center gap-3 px-3 py-3 text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Help & Advice
              </Link>

              <Link
                to="/contact"
                className="flex items-center gap-3 px-3 py-3 text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact Us
              </Link>

              <hr className="my-3 border-gray-200" />

              <a
                href="tel:0494767409"
                className="flex items-center gap-3 px-3 py-3 text-[#147A7A] hover:bg-[#147A7A]/5 rounded-lg transition-colors font-semibold"
              >
                <Phone className="h-5 w-5" />
                <span>Call Specialist: 0494 767 409</span>
              </a>
            </nav>
          </div>
        </div>)}
    </header>);
}