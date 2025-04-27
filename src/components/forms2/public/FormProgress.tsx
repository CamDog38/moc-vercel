import React from 'react';
import { FormSection } from '@/lib/forms2/core/types';

interface FormProgressProps {
  sections: FormSection[];
  activeStep: number;
}

export const FormProgress: React.FC<FormProgressProps> = ({ sections, activeStep }) => {
  if (sections.length <= 1) return null;
  
  return (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        {sections.map((section, index) => (
          <div 
            key={section.id} 
            className={`flex-1 text-center ${
              index < activeStep 
                ? "text-primary" 
                : index === activeStep 
                  ? "text-primary font-bold" 
                  : "text-muted-foreground"
            }`}
          >
            <div className="relative">
              <div 
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center border-2 ${
                  index <= activeStep ? "border-primary bg-primary/10" : "border-muted"
                }`}
              >
                {index < activeStep ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {index < sections.length - 1 && (
                <div 
                  className={`absolute top-4 w-full h-0.5 ${
                    index < activeStep ? "bg-primary" : "bg-muted"
                  }`}
                  style={{ left: "50%" }}
                ></div>
              )}
            </div>
            <div className="mt-2 text-xs">{section.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
