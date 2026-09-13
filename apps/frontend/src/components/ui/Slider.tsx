import { forwardRef, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  className?: string;
  'aria-label'?: string;
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(({ min, max, step = 1, value, onValueChange, className, 'aria-label': ariaLabel,...props }, ref) => {
    const [activeThumb, setActiveThumb] = useState<0 | 1 | null>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    const thumbs = [
      { index: 0, position: value[0] },
      { index: 1, position: value[1] },
    ];

    const getPercent = (val: number) => ((val - min) / (max - min)) * 100;

    const handleMouseDown = (index: 0 | 1) => (e: React.MouseEvent) => {
      e.preventDefault();
      setActiveThumb(index);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (activeThumb === null || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newValue = min + percent * (max - min);
      const steppedValue = Math.round(newValue / step) * step;
      const clampedValue = Math.max(min, Math.min(max, steppedValue));

      const newValues = [...value];
      newValues[activeThumb] = clampedValue;
      newValues.sort((a, b) => a - b);
      onValueChange([newValues[0], newValues[1]] as [number, number]);
    };

    const handleMouseUp = () => setActiveThumb(null);

    useEffect(() => {
      if (activeThumb !== null) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [activeThumb]);

    return (<div ref={ref} className={cn('relative h-6', className)} {...props} role="slider" aria-valuemin={min} aria-valuemax={max} aria-valuenow={value[0]} aria-label="Price range">
        <div
          ref={trackRef}
          className="relative h-2 bg-border rounded-full overflow-hidden"
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value[0]}
          aria-label="Minimum price"
        >
          <div
            className="absolute h-full bg-primary rounded-full"
            style={{
              left: `${getPercent(value[0])}%`,
              right: `${100 - getPercent(value[1])}%`,
            }}
          />
          {thumbs.map(({ index, position }) => (<button
              key={index}
              type="button"
              onMouseDown={handleMouseDown(index as 0 | 1)}
              className={cn('absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 border-primary shadow-card',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
                'transition-transform duration-200',
                activeThumb === index && 'scale-125')}
              style={{ left: `calc(${getPercent(position)}% - 12px)` }}
              aria-label={index === 0 ? 'Minimum price' : 'Maximum price'}
              aria-valuenow={position}
              aria-valuemin={min}
              aria-valuemax={max}
              tabIndex={0}
            />))}
        </div>
      </div>);
  });

Slider.displayName = 'Slider';