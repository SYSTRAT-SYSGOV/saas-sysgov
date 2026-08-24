import React, { TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes, HTMLAttributes } from 'react';

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  wrapperClassName?: string;
}

export const Table: React.FC<TableProps> = ({
  children,
  className = '',
  wrapperClassName = '',
  ...props
}) => {
  return (
    <div className={`w-full overflow-x-auto border border-gov-border rounded-xl bg-gov-surface shadow-2xs ${wrapperClassName}`}>
      <table className={`w-full text-left border-collapse text-sm sm:text-base ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
};

export const TableHead: React.FC<HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <thead className={`bg-[#F8F9FA] border-b border-gov-border text-gov-text-secondary ${className}`} {...props}>
      {children}
    </thead>
  );
};

export const TableHeaderCell: React.FC<ThHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <th
      className={`py-4 px-5 font-bold text-xs sm:text-sm uppercase tracking-wider text-gov-text-secondary select-none ${className}`}
      {...props}
    >
      {children}
    </th>
  );
};

export const TableBody: React.FC<HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <tbody className={`divide-y divide-gov-border bg-gov-surface ${className}`} {...props}>
      {children}
    </tbody>
  );
};

export const TableRow: React.FC<HTMLAttributes<HTMLTableRowElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <tr className={`hover:bg-[#F0F4FA] transition-colors duration-100 ${className}`} {...props}>
      {children}
    </tr>
  );
};

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  isTechnical?: boolean;
}

export const TableCell: React.FC<TableCellProps> = ({
  children,
  className = '',
  isTechnical = false,
  ...props
}) => {
  return (
    <td
      className={`py-4 px-5 text-gov-text-primary text-sm sm:text-base ${
        isTechnical ? 'font-mono tabular-nums text-sm sm:text-base font-semibold' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </td>
  );
};
