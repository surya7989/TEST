import React from 'react';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ src, alt, name, size = 'md', className = '' }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  }[size];

  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (<div
      className={`relative inline-flex items-center justify-center rounded-full bg-secondary/10 text-secondary font-semibold overflow-hidden flex-shrink-0 ${sizeClasses} ${className}`}
    >
      {src ? (<img src={src} alt={alt || name || 'Avatar'} className="w-full h-full object-cover" />) : (<span>{initials}</span>)}
    </div>);
}

export function AvatarGroup({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex -space-x-2 overflow-hidden ${className}`}>{children}</div>;
}
