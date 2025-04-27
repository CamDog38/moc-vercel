import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const segmentedControlVariants = cva(
  "flex rounded-md p-1 bg-muted w-full max-w-full relative",
  {
    variants: {
      size: {
        default: "h-10",
        sm: "h-8",
        lg: "h-12",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

const segmentVariants = cva(
  "flex-1 flex justify-center items-center text-sm font-medium relative z-10 transition-all rounded-md",
  {
    variants: {
      selected: {
        true: "text-primary-foreground",
        false: "text-muted-foreground hover:text-foreground",
      },
    },
    defaultVariants: {
      selected: false,
    },
  }
);

export interface SegmentedControlProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof segmentedControlVariants> {
  options: string[];
  value?: string;
  onValueChange?: (value: string) => void;
}

const SegmentedControl = React.forwardRef<HTMLDivElement, SegmentedControlProps>(
  ({ className, options, value, onValueChange, size, ...props }, ref) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [segmentRefs, setSegmentRefs] = React.useState<(HTMLDivElement | null)[]>([]);
    const [indicatorStyle, setIndicatorStyle] = React.useState<React.CSSProperties>({
      width: 0,
      transform: "translateX(0)",
      opacity: 0,
    });

    // Initialize segment refs
    React.useEffect(() => {
      setSegmentRefs(Array(options.length).fill(null));
    }, [options.length]);

    // Set the segment ref at the given index
    const setSegmentRef = React.useCallback((index: number) => (el: HTMLDivElement | null) => {
      setSegmentRefs(prev => {
        const newRefs = [...prev];
        newRefs[index] = el;
        return newRefs;
      });
    }, []);

    // Update indicator position and size when selected value changes
    React.useEffect(() => {
      if (!value || !containerRef.current) return;
      
      const selectedIndex = options.indexOf(value);
      if (selectedIndex === -1 || !segmentRefs[selectedIndex]) {
        setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
        return;
      }
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const segmentRect = segmentRefs[selectedIndex]!.getBoundingClientRect();
      
      const width = segmentRect.width;
      const offsetLeft = segmentRect.left - containerRect.left;
      
      setIndicatorStyle({
        width,
        transform: `translateX(${offsetLeft}px)`,
        opacity: 1,
      });
    }, [value, options, segmentRefs]);

    return (
      <div
        ref={ref}
        className={cn(segmentedControlVariants({ size }), className)}
        {...props}
      >
        <div 
          ref={containerRef}
          className="relative flex w-full h-full"
        >
          {/* Indicator */}
          <div
            className="absolute top-0 left-0 h-full bg-primary rounded-md transition-all duration-200 z-0"
            style={indicatorStyle}
          />
          
          {/* Options */}
          {options.map((option, index) => (
            <div
              key={option}
              ref={setSegmentRef(index)}
              className={cn(
                segmentVariants({ selected: option === value }),
                "cursor-pointer"
              )}
              onClick={() => onValueChange?.(option)}
            >
              {option}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

SegmentedControl.displayName = "SegmentedControl";

export { SegmentedControl }; 