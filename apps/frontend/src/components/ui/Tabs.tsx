import { forwardRef, createContext, useContext, useState, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  variant?: 'line' | 'enclosed' | 'soft';
  orientation?: 'horizontal' | 'vertical';
}

interface TabListProps extends HTMLAttributes<HTMLDivElement> {}

interface TabProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
}

interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

interface TabsContextValue {
  activeValue: string;
  onTabClick: (value: string) => void;
  variant: 'line' | 'enclosed' | 'soft';
  orientation: 'horizontal' | 'vertical';
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs components must be used within Tabs');
  return ctx;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(({ className, defaultValue, value, onChange, variant = 'line', orientation = 'horizontal', children,...props }, ref) => {
    const [activeValue, setActiveValue] = useState(value || defaultValue || '');
    const isControlled = value !== undefined;

    const handleTabClick = (tabValue: string) => {
      if (!isControlled) setActiveValue(tabValue);
      onChange?.(tabValue);
    };

    const contextValue = {
      activeValue: isControlled ? value : activeValue,
      onTabClick: handleTabClick,
      variant,
      orientation,
    };

    return (<TabsContext.Provider value={contextValue}>
        <div ref={ref} className={cn('space-y-4', className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>);
  });

export const TabList = forwardRef<HTMLDivElement, TabListProps>(({ className, children,...props }, ref) => {
    const { variant, orientation } = useTabs();

    return (<div
        ref={ref}
        role="tablist"
        aria-orientation={orientation}
        className={cn('flex gap-1',
          variant === 'line' && 'border-b border-border',
          variant === 'enclosed' && 'bg-neutral-100 p-1 rounded-xl',
          variant === 'soft' && 'bg-transparent',
          orientation === 'vertical' && 'flex-col',
          className)}
        {...props}
      >
        {children}
      </div>);
  });

TabList.displayName = 'TabList';

export const Tab = forwardRef<HTMLButtonElement, TabProps>(({ className, value, disabled, children,...props }, ref) => {
    const { activeValue, onTabClick, variant, orientation } = useTabs();
    const isActive = activeValue === value;

    const variantStyles = {
      line: isActive
        ? 'border-b-2 border-primary text-primary'
        : 'text-text-secondary hover:text-text-primary',
      enclosed: isActive
        ? 'bg-surface text-primary shadow-card'
        : 'text-text-secondary hover:text-text-primary',
      soft: isActive
        ? 'bg-primary/10 text-primary'
        : 'text-text-secondary hover:text-text-primary hover:bg-neutral-100',
    };

    return (<button
        ref={ref}
        role="tab"
        aria-selected={isActive}
        aria-controls={`panel-${value}`}
        id={`tab-${value}`}
        disabled={disabled}
        onClick={() => !disabled && onTabClick(value)}
        className={cn('relative px-4 py-3 text-body font-medium rounded-xl transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantStyles[variant],
          orientation === 'vertical' && 'w-full text-left',
          className)}
        {...props}
      >
        {children}
      </button>);
  });

Tab.displayName = 'Tab';

export const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(({ className, value, children,...props }, ref) => {
    const { activeValue, orientation } = useTabs();
    const isActive = activeValue === value;

    if (!isActive) return null;

    return (<div
        ref={ref}
        role="tabpanel"
        id={`panel-${value}`}
        aria-labelledby={`tab-${value}`}
        className={cn('animate-fade-in', orientation === 'vertical' && 'mt-0', className)}
        {...props}
      >
        {children}
      </div>);
  });

TabPanel.displayName = 'TabPanel';