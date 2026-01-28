import React, { useState } from 'react';
import { ChevronRight, Activity, BarChart2, BookOpen } from 'lucide-react';

interface IntroViewProps {
  onComplete: () => void;
}

const IntroView: React.FC<IntroViewProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: Activity,
      title: 'Premium Signals',
      desc: 'Receive real-time, high-probability trade setups with exact entry, stop-loss, and take-profit levels.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10'
    },
    {
      icon: BarChart2,
      title: 'Track Performance',
      desc: 'Visualize your trading journey with advanced analytics. Monitor your win-rate and equity curve.',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10'
    },
    {
      icon: BookOpen,
      title: 'Learn & Grow',
      desc: 'Access our exclusive trading academy. Master technical analysis and risk management strategies.',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10'
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
    <div className="min-h-screen bg-dark-900 flex flex-col relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-2/3 bg-gradient-to-b from-dark-800 to-dark-900 pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-green/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 -left-20 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl" />

      {/* Skip Button */}
      <div className="absolute top-6 right-6 z-20">
        <button 
          onClick={onComplete}
          className="text-gray-400 text-sm font-medium hover:text-white transition py-2 px-4 rounded-full hover:bg-dark-800"
        >
          Skip
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center z-10 mt-10">
        {steps.map((step, index) => {
           if (index !== currentStep) return null;
           const Icon = step.icon;
           return (
             <div key={index} className="animate-slide max-w-xs mx-auto">
                <div className={`w-32 h-32 rounded-3xl ${step.bg} flex items-center justify-center mb-10 mx-auto relative shadow-2xl`}>
                    <div className={`absolute inset-0 ${step.bg} blur-xl opacity-60`}></div>
                    <Icon size={64} className={step.color} strokeWidth={1.5} />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">{step.title}</h2>
                <p className="text-gray-400 leading-relaxed text-base">{step.desc}</p>
             </div>
           )
        })}
      </div>

      {/* Footer / Controls */}
      <div className="p-8 pb-12 z-10">
        <div className="flex items-center justify-between">
            {/* Indicators */}
            <div className="flex gap-2">
                {steps.map((_, idx) => (
                    <div 
                        key={idx}
                        className={`h-2 rounded-full transition-all duration-300 ${
                            idx === currentStep ? 'w-8 bg-brand-green' : 'w-2 bg-dark-700'
                        }`}
                    />
                ))}
            </div>

            {/* Action Button */}
            <button
                onClick={handleNext}
                className="w-14 h-14 bg-brand-green rounded-full flex items-center justify-center text-dark-900 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-105 transition-all duration-300 group"
            >
                <ChevronRight size={28} strokeWidth={3} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default IntroView;