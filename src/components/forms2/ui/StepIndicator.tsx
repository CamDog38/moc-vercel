/**
 * Step Indicator Component
 * 
 * A reusable component for displaying step progress in multi-step forms.
 * Can be used in both the new Form System 2.0 and legacy form components.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckIcon } from 'lucide-react';

export interface StepIndicatorProps {
  steps: Array<{
    id: string;
    title: string;
  }>;
  activeStep: number;
  allowStepNavigation?: boolean;
  onStepClick?: (step: number) => void;
  showStepNumbers?: boolean;
  className?: string;
}

export function StepIndicator({
  steps,
  activeStep,
  allowStepNavigation = false,
  onStepClick,
  showStepNumbers = true,
  className
}: StepIndicatorProps) {
  // Calculate progress percentage
  const progress = ((activeStep + 1) / steps.length) * 100;
  
  const handleStepClick = (index: number) => {
    if (allowStepNavigation && index <= activeStep && onStepClick) {
      onStepClick(index);
    }
  };

  return (
    <div className={cn("mb-8", className)}>
      {/* Stepper for desktop and tablet */}
      <div className="hidden sm:flex justify-center mb-6">
        <div className="flex items-center max-w-3xl w-full">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              {/* Step circle */}
              <div 
                className={cn(
                  "relative flex items-center justify-center",
                  allowStepNavigation && index <= activeStep ? "cursor-pointer" : ""
                )}
                onClick={() => handleStepClick(index)}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
                  index < activeStep 
                    ? "bg-primary text-white" 
                    : index === activeStep 
                      ? "bg-primary text-white ring-4 ring-primary/20" 
                      : "bg-muted text-muted-foreground"
                )}>
                  {index < activeStep ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                {showStepNumbers && (
                  <div className={cn(
                    "absolute top-12 whitespace-nowrap text-xs font-medium",
                    index === activeStep ? "text-primary" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </div>
                )}
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-1">
                  <div className="h-1 bg-muted overflow-hidden rounded-full">
                    <div 
                      className="h-full bg-primary transition-all duration-300" 
                      style={{ width: index < activeStep ? '100%' : '0%' }}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Simplified indicator for mobile */}
      <div className="block sm:hidden">
        <div className="flex justify-between mb-2">
          {steps.map((step, index) => (
            <div 
              key={`mobile-${step.id}`}
              className={cn(
                "flex flex-col items-center",
                allowStepNavigation && index <= activeStep ? "cursor-pointer" : ""
              )}
              onClick={() => handleStepClick(index)}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center mb-1",
                index < activeStep 
                  ? "bg-primary text-white" 
                  : index === activeStep 
                    ? "bg-primary text-white ring-2 ring-primary/20" 
                    : "bg-muted text-muted-foreground"
              )}>
                {index < activeStep ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden mb-3">
          <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="text-sm text-center font-medium text-primary">
          {steps[activeStep]?.title}
          <span className="text-xs text-muted-foreground ml-2">
            Step {activeStep + 1} of {steps.length}
          </span>
        </div>
      </div>
    </div>
  );
}

export default StepIndicator;
