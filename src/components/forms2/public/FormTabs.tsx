/**
 * Form Tabs Component
 * 
 * A tab-based navigation component for multi-section forms.
 * Designed to match the legacy form system's UX/UI while adding improved accessibility.
 * 
 * Features responsive design for different screen sizes:
 * - Desktop: Horizontally scrollable tabs with fixed width and scroll buttons
 * - Tablet: Horizontally scrollable tabs with touch support
 * - Mobile: Compact dropdown menu for section navigation
 * 
 * Accessibility features include keyboard navigation and screen reader support.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { FormSection } from '@/lib/forms2/core/types';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface FormTabsProps {
  sections: FormSection[];
  activeSection: number;
  onSectionChange: (index: number) => void;
  className?: string;
}

export const FormTabs: React.FC<FormTabsProps> = ({
  sections,
  activeSection,
  onSectionChange,
  className
}) => {
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  
  // Check if scrolling is needed
  useEffect(() => {
    const checkScroll = () => {
      if (tabsContainerRef.current) {
        const { scrollWidth, clientWidth } = tabsContainerRef.current;
        setShowScrollButtons(scrollWidth > clientWidth);
      }
    };
    
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [sections]);
  
  // Scroll functions
  const scrollLeft = () => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };
  
  const scrollRight = () => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };
  
  // Add custom styles to hide scrollbars while maintaining functionality
  const styles = `
    .hide-scrollbar {
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
    .hide-scrollbar::-webkit-scrollbar {
      display: none;  /* Chrome, Safari and Opera */
    }
    .tabs-container {
      position: relative;
      overflow: hidden;
      padding: 0 28px; /* Add padding for the scroll buttons */
    }
    .tabs-scroll-container {
      overflow-x: auto;
      scroll-behavior: smooth;
    }
    .scroll-button {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 10;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      cursor: pointer;
      opacity: 0.9;
    }
    .scroll-left {
      left: 2px;
    }
    .scroll-right {
      right: 2px;
    }
  `;

  const activeTitle = sections[activeSection]?.title || `Section ${activeSection + 1}`;

  // If there's only one section, don't render any tabs
  if (sections.length <= 1) {
    return null;
  }
  
  return (
    <div className={cn("mb-6", className)}>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
      {/* Mobile dropdown menu - visible only on small screens */}
      <div className="block sm:hidden mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span>{activeTitle}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full" align="center">
            {sections.map((section, index) => (
              <DropdownMenuItem 
                key={section.id}
                onClick={() => onSectionChange(index)}
                className={cn(
                  "justify-center",
                  index === activeSection ? "bg-muted font-medium" : ""
                )}
              >
                {section.title || `Section ${index + 1}`}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Tablet scrollable tabs - visible on medium screens */}
      <div className="hidden sm:block lg:hidden">
        <div className="tabs-container rounded-lg bg-muted p-1">
          <div className="tabs-scroll-container hide-scrollbar">
            <Tabs 
              value={String(activeSection)} 
              onValueChange={(value) => onSectionChange(parseInt(value))}
              className="w-full"
            >
              <TabsList className="w-max flex border-0 bg-transparent">
                {sections.map((section, index) => (
                  <TabsTrigger 
                    key={section.id} 
                    value={String(index)}
                    className="text-sm whitespace-nowrap px-3"
                    style={{ minWidth: '140px' }}
                    title={section.title || `Section ${index + 1}`} // Add tooltip for truncated text
                  >
                    {section.title || `Section ${index + 1}`}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>
      
      {/* Desktop scrollable tabs with scroll buttons - visible on large screens */}
      <div className="hidden lg:block">
        <div className="tabs-container rounded-lg bg-muted p-1">
          {showScrollButtons && (
            <>
              <div 
                className="scroll-button scroll-left" 
                onClick={scrollLeft}
                role="button"
                aria-label="Scroll tabs left"
                tabIndex={0}
              >
                <ChevronLeft size={16} />
              </div>
              <div 
                className="scroll-button scroll-right" 
                onClick={scrollRight}
                role="button"
                aria-label="Scroll tabs right"
                tabIndex={0}
              >
                <ChevronRight size={16} />
              </div>
            </>
          )}
          <div className="tabs-scroll-container hide-scrollbar" ref={tabsContainerRef}>
            <Tabs 
              value={String(activeSection)} 
              onValueChange={(value) => onSectionChange(parseInt(value))}
              className="w-full"
            >
              <TabsList className="w-max flex border-0 bg-transparent">
                {sections.map((section, index) => (
                  <TabsTrigger 
                    key={section.id} 
                    value={String(index)}
                    className="text-sm whitespace-nowrap px-4"
                    style={{ minWidth: '160px' }}
                    title={section.title || `Section ${index + 1}`} // Add tooltip for truncated text
                  >
                    {section.title || `Section ${index + 1}`}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormTabs;
