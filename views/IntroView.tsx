import React, { useState } from 'react';
import { ChevronRight, BarChart2, GraduationCap, CandlestickChart, TrendingUp } from 'lucide-react';

interface IntroViewProps {
  onComplete: () => void;
}

const IntroView: React.FC<IntroViewProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: CandlestickChart,
      title: 'Expert Crypto Signals',
      desc: 'Get real-time trading signals from top analysts and maximize your profits.',
    },
    {
      icon: GraduationCap,
      title: 'Learn & Grow',
      desc: 'Master crypto trading with our comprehensive education courses.',
    },
    {
      icon: TrendingUp,
      title: 'Track Performance',
      desc: 'Monitor your portfolio growth with detailed equity curves and win rate stats.',
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex flex-col items-center justify-between px-8 py-12 font-sans overflow-hidden">
      {/* Spacer to push content down */}
      <div className="h-4"></div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm">
        {steps.map((step, index) => {
           if (index !== currentStep) return null;
           const Icon = step.icon;
           return (
             <div key={index} className="animate-slide flex flex-col items-center">
                {/* Icon Container */}
                <div className="w-48 h-48 rounded-full bg-[#151A25] flex items-center justify-center mb-16 shadow-2xl">
                    <Icon size={72} className="text-brand-green" strokeWidth={2.5} />
                </div>
                
                {/* Text Content */}
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">{step.title}</h2>
                <p className="text-gray-400 leading-relaxed text-lg px-2">
                  {step.desc}
                </p>
             </div>
           )
        })}
      </div>

      {/* Footer / Controls */}
      <div className="w-full space-y-12">
        {/* Pagination Indicators */}
        <div className="flex justify-center gap-2">
            {steps.map((_, idx) => (
                <div 
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentStep ? 'w-8 bg-brand-green' : 'w-2 bg-gray-700'
                    }`}
                />
            ))}
        </div>

        {/* Action Button */}
        <button
            onClick={handleNext}
            className="w-full bg-brand-green hover:bg-brand-neon text-dark-900 font-bold py-5 rounded-2xl text-xl transition-all active:scale-[0.98] shadow-lg shadow-brand-green/10"
        >
            {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default IntroView;