import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Users, FileText, Brain } from 'lucide-react';

export function NDISSection() {
  return (<section className="py-10 sm:py-14 bg-[#0B1728] text-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          {/* Left */}
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold text-white bg-[#147A7A] px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full mb-4 uppercase tracking-wider">
              <Shield className="h-3.5 w-3.5" />
              NDIS Provider
            </span>
            <h2 className="text-[24px] sm:text-[28px] lg:text-[36px] font-black text-white leading-tight mb-4">
              Assistive Technology for NDIS Participants
            </h2>
            <p className="text-[13px] sm:text-[15px] text-white/80 leading-relaxed mb-6 sm:mb-8 max-w-[520px]">
              We help participants, families, carers and support professionals find practical equipment that supports independence, safety and everyday living.
            </p>
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2.5 sm:gap-3">
              <Link
                to="/ndis"
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 h-11 sm:h-12 px-5 sm:px-7 bg-[#147A7A] hover:bg-[#106262] text-white text-[13px] sm:text-[14px] font-bold rounded-xl transition-all shadow-sm text-center whitespace-nowrap"
              >
                <span>Explore NDIS Range</span>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Link>
              <Link
                to="/contact?type=ndis"
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 h-11 sm:h-12 px-5 sm:px-7 bg-white/10 text-white text-[13px] sm:text-[14px] font-bold rounded-xl border border-white/20 hover:bg-white/20 transition-all text-center whitespace-nowrap"
              >
                <span>Talk to a Specialist</span>
              </Link>
            </div>
            <p className="text-[11px] sm:text-xs text-white/60 leading-relaxed mt-4 sm:mt-5 max-w-[520px]">
              For self-managed and plan-managed participants — just check with your OT, support coordinator or plan manager that an item fits your plan before you order.
            </p>
          </div>

          {/* Right - Features: 2 columns on mobile & tablet */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            {[
              { icon: Shield, title: 'Plan Review', desc: 'Equipment quotes & clinical reports' },
              { icon: Users, title: 'Equipment Trials', desc: 'Home demonstrations before buy' },
              { icon: FileText, title: 'AT Assessments', desc: 'Clinical documentation & OT support' },
              { icon: Brain, title: 'Coordination', desc: 'Fast quotes & live delivery tracking' },
            ].map((item) => (<div key={item.title} className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 hover:bg-white/10 transition-colors">
                <item.icon className="h-4.5 sm:h-6 w-4.5 sm:w-6 text-[#2DD4BF] mb-2 sm:mb-3" />
                <h3 className="text-[12px] sm:text-[14.5px] font-bold text-white mb-0.5 sm:mb-1">{item.title}</h3>
                <p className="text-[10.5px] sm:text-[12.5px] text-white/70 leading-relaxed line-clamp-2">{item.desc}</p>
              </div>))}
          </div>
        </div>
      </div>
    </section>);
}
