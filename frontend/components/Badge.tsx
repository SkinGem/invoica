import React from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300',
  success: 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400',
  warning: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400',
  error: 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400',
  info: 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400',
};

const SIZE_STYLES: Record<string, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-base px-3 py-1',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  rounded = true,
  className = '',
}: BadgeProps): JSX.Element {
  const roundedClass = rounded ? 'rounded-full' : 'rounded';

  return (
    <span
      className={`inline-flex items-center font-medium ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${roundedClass} ${className}`}
    >
      {children}
    </span>
  );
}
