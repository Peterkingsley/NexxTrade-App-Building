import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, Check } from 'lucide-react';

export interface TourStep {
  targetId?: string; // Optional, if undefined, shows in center
  title: string;
  description: string;
  position?: 'top' | 'bottom'; // Position relative to target
}

interface OnboardingTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onComplete: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ steps, isOpen, onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  // Update spotlight position
  const updatePosition = useCallback(() => {
    if (!isOpen) return;
    
    // If no target (center modal), clear rect
    if (!currentStep.targetId) {
      setTargetRect(null);
      return;
    }

    const element = document.getElementById(currentStep.targetId);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    } else {
        // Fallback if element not found, just center it
        setTargetRect(null);
    }
  }, [isOpen, currentStep.targetId, currentStepIndex]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', () => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        updatePosition();
    });
    window.addEventListener('scroll', updatePosition, true);
    
    // Small delay to ensure DOM is rendered (transitions etc)
    const timeout = setTimeout(updatePosition, 100);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      clearTimeout(timeout);
    };
  }, [updatePosition, windowSize]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [isLastStep, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft' && currentStepIndex > 0) {
        setCurrentStepIndex(prev => prev - 1);
      } else if (e.key === 'Escape') {
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, handleNext, handleSkip]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-auto font-sans">
      {/* Background / Spotlight */}
      <div className="absolute inset-0 w-full h-full transition-all duration-300 ease-in-out">
        {targetRect ? (
          <div
            className="absolute rounded-xl transition-all duration-300 ease-in-out"
            style={{
              left: targetRect.left - 4,
              top: targetRect.top - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
              // Use a border to highlight the active element
              border: '2px solid #10B981'
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300" />
        )}
      </div>

      {/* Tooltip Card */}
      <div 
        className="absolute w-full px-6 transition-all duration-300 ease-in-out flex justify-center pointer-events-none"
        style={{
            top: targetRect 
                ? (currentStep.position === 'top' 
                    ? targetRect.top - 180 // Shifted up slightly
                    : targetRect.bottom + 20)
                : '50%',
            transform: targetRect ? 'none' : 'translateY(-50%)'
        }}
      >
        <div
          className="bg-dark-800 border border-dark-700 p-5 rounded-2xl shadow-2xl max-w-sm w-full pointer-events-auto relative animate-in fade-in zoom-in-95 duration-300"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-describedby="tour-description"
        >
            {/* Close Button */}
            <button 
                onClick={handleSkip}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
                aria-label="Skip tour"
            >
                <X size={18} />
            </button>

            {/* Content */}
            <div className="mb-6">
                <span className="text-brand-green text-xs font-bold uppercase tracking-wider mb-2 block">
                    Step {currentStepIndex + 1} of {steps.length}
                </span>
                <h3 id="tour-title" className="text-white text-lg font-bold mb-2">{currentStep.title}</h3>
                <p id="tour-description" className="text-gray-400 text-sm leading-relaxed">{currentStep.description}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1">
                    {steps.map((_, idx) => (
                        <div 
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-colors ${idx === currentStepIndex ? 'bg-brand-green' : 'bg-dark-700'}`}
                        />
                    ))}
                </div>
                <button 
                    onClick={handleNext}
                    className="flex items-center gap-2 bg-brand-green hover:bg-emerald-400 text-dark-900 font-bold py-2 px-4 rounded-xl transition-colors text-sm"
                >
                    {isLastStep ? 'Finish' : 'Next'}
                    {isLastStep ? <Check size={16} /> : <ChevronRight size={16} />}
                </button>
            </div>
            
            {/* Arrow Pointer (Conditional) */}
            {targetRect && (
                <div 
                    className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-dark-800 border-l border-t border-dark-700 rotate-45 ${
                        currentStep.position === 'top' 
                        ? '-bottom-2 border-l-0 border-t-0 border-r border-b' 
                        : '-top-2'
                    }`}
                />
            )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;