import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { brands } from '@/data/brands';

export function BrandsStrip() {
  return (<section className="py-6 sm:py-8 bg-background">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8">
        <h2 className="text-[22px] sm:text-[26px] font-extrabold text-primary text-center mb-6 sm:mb-8">Trusted Brands</h2>
        <div className="overflow-hidden">
          <div className="flex gap-3 animate-scroll">
            {[...brands,...brands].map((brand, i) => (<div
                key={`${brand.id}-${i}`}
                className="flex-shrink-0 flex items-center gap-3 w-[160px] sm:w-[180px] bg-white border border-border rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 hover:shadow-card transition-all"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-gray-50 rounded-lg border border-border flex-shrink-0">
                  <span className="text-[10px] sm:text-[11px] font-bold text-primary">{brand.name.substring(0, 2).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-[12px] font-semibold text-primary truncate">{brand.name}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted">{brand.productCount} products</p>
                </div>
              </div>))}
          </div>
        </div>
        <div className="text-center mt-6 sm:mt-8">
          <Link
            to="/brands"
            className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] font-medium text-secondary hover:text-secondary-600 transition-colors"
          >
            View All Brands
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>);
}