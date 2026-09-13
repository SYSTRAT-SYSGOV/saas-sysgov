import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: TData) => void;
  pagination?: boolean;
  pageSize?: number;
  pageSizeSelector?: boolean;
  pageSizeOptions?: number[];
  className?: string;
  paginationState?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    total: number;
    perPage: number;
    onPerPageChange?: (perPage: number) => void;
  };
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  };
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading,
  emptyMessage = 'Nenhum registro encontrado.',
  searchable,
  searchPlaceholder = 'Buscar...',
  onRowClick,
  pagination = true,
  pageSize = 10,
  pageSizeSelector = true,
  pageSizeOptions = [10, 20, 50, 100],
  className,
  paginationState,
  search,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState('');

  const table = useReactTable<TData>({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    autoResetPageIndex: false,
    initialState: pagination ? { pagination: { pageSize } } : { pagination: { pageSize: Number.MAX_SAFE_INTEGER } },
  });

  const handlePageChange = (page: number) => {
    if (paginationState?.onPageChange) {
      paginationState.onPageChange(page);
    } else {
      table.setPageIndex(page - 1);
    }
  };

  const handleSearch = (value: string) => {
    if (search?.onChange) {
      search.onChange(value);
    } else {
      setGlobalFilter(value);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {searchable && search && (
        <div className="relative">
          <input
            value={search.value ?? ''}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={search.placeholder || searchPlaceholder}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border bg-muted/40">
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground',
                        header.column.getCanSort() ? 'cursor-pointer select-none' : '',
                        header.column.id === 'actions' ? 'text-right' : 'text-center'
                      )}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          disabled={!header.column.getCanSort()}
                          className={cn(
                            'inline-flex items-center gap-1.5 transition-colors',
                            header.column.getCanSort() && 'hover:text-foreground',
                            header.column.id === 'actions' && 'justify-end'
                          )}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() &&
                            (sorted === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : sorted === 'desc' ? (
                              <ArrowDown className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-50" />
                            ))}
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <Loader2 className="inline-block h-6 w-6 animate-spin text-emerald-600 mx-auto" />
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn('transition-colors hover:bg-accent/40', onRowClick && 'cursor-pointer')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={cn('px-4 py-3', cell.column.id === 'actions' ? 'text-right' : 'text-center')}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && !loading && (paginationState ? paginationState.total > 0 : data.length > 0) && (() => {
        const isRemote = Boolean(paginationState);
        const currentPage = isRemote ? paginationState!.currentPage : table.getState().pagination.pageIndex + 1;
        const totalPages = isRemote ? paginationState!.totalPages : (table.getPageCount() || 1);
        const currentPerPage = isRemote ? paginationState!.perPage : table.getState().pagination.pageSize;
        const totalRows = isRemote ? paginationState!.total : table.getFilteredRowModel().rows.length;
        const startRow = totalRows === 0 ? 0 : (currentPage - 1) * currentPerPage + 1;
        const endRow = Math.min(currentPage * currentPerPage, totalRows);

        const canPrev = isRemote ? currentPage > 1 : table.getCanPreviousPage();
        const canNext = isRemote ? currentPage < totalPages : table.getCanNextPage();

        const goToPage = (p: number) => {
          if (isRemote) {
            paginationState!.onPageChange(p);
          } else {
            table.setPageIndex(p - 1);
          }
        };

        const changePageSize = (size: number) => {
          if (paginationState?.onPerPageChange) {
            paginationState.onPerPageChange(size);
          }
          table.setPageSize(size);
        };

        return (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-1 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              {pageSizeSelector && (
                <label className="flex items-center gap-1.5">
                  <span>Exibir</span>
                  <select
                    value={currentPerPage}
                    onChange={(e) => changePageSize(Number(e.target.value))}
                    className="rounded-lg border border-input bg-background px-2 py-1 text-xs font-mono tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                  >
                    {pageSizeOptions.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <span>por página</span>
                </label>
              )}

              <span className="font-mono tabular-nums text-muted-foreground">
                Mostrando <strong className="text-foreground">{startRow}</strong> a{' '}
                <strong className="text-foreground">{endRow}</strong> ({totalRows} registros)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => goToPage(1)}
                disabled={!canPrev}
                title="Primeira página"
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border text-xs disabled:opacity-40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={!canPrev}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 h-8 text-xs disabled:opacity-40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Anterior
              </button>

              <span className="px-2 font-mono tabular-nums text-xs text-muted-foreground">
                Página <strong className="text-foreground">{currentPage}</strong> de{' '}
                <strong className="text-foreground">{totalPages}</strong>
              </span>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={!canNext}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 h-8 text-xs disabled:opacity-40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Próxima <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={!canNext}
                title="Última página"
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border text-xs disabled:opacity-40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default DataTable;