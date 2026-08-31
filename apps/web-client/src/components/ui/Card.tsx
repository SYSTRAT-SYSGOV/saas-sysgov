import React, { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  footer,
  noPadding = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-gov-surface border border-gov-border rounded-lg shadow-sm ${className}`}
      {...props}
    >
      {header && (
        <div className="px-5 py-4 sm:px-6 border-b border-gov-border bg-white flex items-center justify-between">
          {header}
        </div>
      )}

      <div className={noPadding ? '' : 'p-5 sm:p-6'}>
        {children}
      </div>

      {footer && (
        <div className="px-5 py-3 sm:px-6 border-t border-gov-border bg-[#FAFAFA] text-xs text-gov-text-muted">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
