import React from 'react';
import { Shield, Award, Users, MapPin, FileText, Truck } from 'lucide-react';

const benefits = [
  { icon: Shield, title: 'Specialist Knowledge', description: 'Our team includes occupational therapists and AT specialists with decades of clinical experience.' },
  { icon: Award, title: 'Quality Equipment', description: 'We only stock leading Australian and international brands that meet rigorous safety standards.' },
  { icon: Users, title: 'Personalised Advice', description: 'One-on-one consultations to understand your unique needs, goals and environment.' },
  { icon: MapPin, title: 'Australian Support', description: 'Locally based team with Australia-wide delivery, setup and ongoing support.' },
  { icon: FileText, title: 'NDIS Experience', description: 'Deep understanding of NDIS processes, funding categories and reporting requirements.' },
  { icon: Truck, title: 'Delivery & Setup', description: 'White-glove delivery service including assembly, fitting and user training.' },
];

export function WhyATSpecialists() {
  return (<section className="py-10 sm:py-12 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8">
        <h2 className="text-[24px] sm:text-[28px] font-bold text-primary text-center mb-8 sm:mb-10">Why choose AT Specialists?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {benefits.map((benefit) => (<div key={benefit.title} className="flex gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl border border-border hover:shadow-card transition-all duration-200">
              <div className="flex-shrink-0 flex items-center justify-center w-10 sm:w-11 h-10 sm:h-11 rounded-xl bg-secondary/10">
                <benefit.icon className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-secondary" />
              </div>
              <div>
                <h3 className="text-[14px] sm:text-[15px] font-semibold text-primary mb-1">{benefit.title}</h3>
                <p className="text-[12px] sm:text-[13px] text-muted leading-relaxed">{benefit.description}</p>
              </div>
            </div>))}
        </div>
      </div>
    </section>);
}
