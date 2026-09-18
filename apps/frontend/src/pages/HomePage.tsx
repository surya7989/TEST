import React from 'react';
import { Hero } from '@/components/home/Hero';
import { TrustStrip } from '@/components/home/TrustStrip';
import { ShopByCategory } from '@/components/home/ShopByCategory';
import { PromotionalCards } from '@/components/home/PromotionalCards';
import { PopularProducts } from '@/components/home/PopularProducts';
import { WhyATSpecialists } from '@/components/home/WhyATSpecialists';
import { NDISSection } from '@/components/home/NDISSection';
import { ExpertAdvice } from '@/components/home/ExpertAdvice';

export function HomePage() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <ShopByCategory />
      <PromotionalCards />
      <PopularProducts />
      <WhyATSpecialists />
      <NDISSection />
      <ExpertAdvice />
    </>
  );
}
