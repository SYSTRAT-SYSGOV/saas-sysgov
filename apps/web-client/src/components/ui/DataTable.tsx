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
  Column,
  ColumnDef,
  ColumnFiltersState,
  Row,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  FileSpreadsheet,
  FileText,
  FileType,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Amplia o `meta` das colunas do tanstack/react-table para que cada
// ColumnDef possa declarar como se comporta na exportação (CSV/XLSX/PDF) —
// sem isso, colunas com `cell` custom (JSX) exportariam célula vazia.
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    /** Rótulo usado no cabeçalho do arquivo exportado, se diferente do `header` da coluna. */
    exportHeader?: string;
    /** Valor exportado para a linha. Se omitido, a coluna é ignorada na exportação. */
    exportValue?: (row: TData) => string | number | null | undefined;
    /**
     * Coluna que existe só para os arquivos exportados (ex.: "Objeto" cujo
     * texto já aparece resumido dentro da célula de outra coluna na grid) —
     * não é renderizada no `<thead>`/`<tbody>`, só entra no CSV/XLSX/PDF.
     */
    exportOnly?: boolean;
  }
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  emptyText?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: TData) => void;
  pagination?: boolean;
  pageSize?: number;
  className?: string;
  /**
   * Usa table-layout: fixed e respeita o `size` de cada ColumnDef — sem
   * isso, o navegador redistribui o espaço sobrando entre TODAS as
   * colunas (mesmo as que já cabem no conteúdo), deixando colunas curtas
   * (status, data) com espaço em branco exagerado. Colunas sem `size`
   * dividem o espaço restante entre si. Desligado por padrão para não
   * mudar o layout de grids existentes que não definem `size`.
   */
  fixedLayout?: boolean;
  /**
   * Permite ao usuário arrastar a borda direita do cabeçalho para
   * redimensionar cada coluna. Implica table-layout fixed (senão a
   * largura arrastada é ignorada pelo navegador).
   */
  resizableColumns?: boolean;
  /** Mostra um seletor de "registros por página" acima da paginação. */
  pageSizeSelector?: boolean;
  /** Opções do seletor de registros por página. */
  pageSizeOptions?: number[];
  /**
   * Habilita os botões de exportar (CSV/XLSX/PDF). Exporta todas as linhas
   * filtradas (não só a página atual). Cada coluna exportada precisa de
   * `meta.exportValue` no ColumnDef — colunas sem isso são omitidas.
   */
  exportable?: boolean;
  /** Nome do arquivo exportado, sem extensão. */
  exportFileName?: string;
  /** Título usado no cabeçalho do PDF exportado. */
  exportTitle?: string;
}

function getExportableColumns<TData>(columns: Column<TData, unknown>[]) {
  return columns.filter((col) => typeof col.columnDef.meta?.exportValue === 'function');
}

function buildExportRows<TData>(rows: Row<TData>[], columns: Column<TData, unknown>[]) {
  const exportCols = getExportableColumns(columns);
  const headers = exportCols.map(
    (col) => col.columnDef.meta?.exportHeader ?? (typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id),
  );
  const body = rows.map((row) =>
    exportCols.map((col) => {
      const value = col.columnDef.meta!.exportValue!(row.original);
      return value === null || value === undefined ? '' : value;
    }),
  );
  return { headers, body };
}

function csvEscape(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

async function exportToCsv<TData>(rows: Row<TData>[], columns: Column<TData, unknown>[], filename: string) {
  const { headers, body } = buildExportRows(rows, columns);
  const lines = [headers, ...body].map((line) => line.map(csvEscape).join(','));
  // BOM para o Excel reconhecer UTF-8 (acentuação) ao abrir o CSV.
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${filename}.csv`);
}

async function exportToXlsx<TData>(rows: Row<TData>[], columns: Column<TData, unknown>[], filename: string) {
  const { headers, body } = buildExportRows(rows, columns);
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Dados');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

async function exportToPdf<TData>(
  rows: Row<TData>[],
  columns: Column<TData, unknown>[],
  filename: string,
  title?: string,
) {
  const { headers, body } = buildExportRows(rows, columns);
  const [{ default: JsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new JsPDF({ orientation: headers.length > 5 ? 'landscape' : 'portrait' });
  if (title) {
    doc.setFontSize(12);
    doc.text(title, 14, 14);
  }
  autoTable(doc, {
    head: [headers],
    body,
    startY: title ? 20 : 10,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [16, 185, 129] }, // Verde Esmeralda SYSGOV
  });
  doc.save(`${filename}.pdf`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Botão "Exportar" com um menu suspenso simples (CSV / XLSX / PDF). */
function ExportMenu<TData>({
  rows,
  columns,
  filename,
  title,
}: {
  rows: Row<TData>[];
  columns: Column<TData, unknown>[];
  filename: string;
  title?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const disabled = rows.length === 0;

  const options: { label: string; icon: React.ReactNode; run: () => void }[] = [
    { label: 'CSV', icon: <FileText className="h-3.5 w-3.5" />, run: () => exportToCsv(rows, columns, filename) },
    {
      label: 'Excel (XLSX)',
      icon: <FileSpreadsheet className="h-3.5 w-3.5" />,
      run: () => exportToXlsx(rows, columns, filename),
    },
    { label: 'PDF', icon: <FileType className="h-3.5 w-3.5" />, run: () => exportToPdf(rows, columns, filename, title) },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Download className="h-3.5 w-3.5" /> Exportar
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => {
                opt.run();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent"
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * DataTable no padrão shadcn/ui (baseado em @tanstack/react-table).
 * Suporte a ordenação por coluna, busca, paginação e seleção de colunas.
 * Paleta GOV.BR.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  loading,
  emptyText = 'Nenhum registro encontrado.',
  searchable,
  searchPlaceholder = 'Buscar...',
  onRowClick,
  pagination = true,
  pageSize = 10,
  className,
  fixedLayout = false,
  resizableColumns = false,
  pageSizeSelector = false,
  pageSizeOptions = [10, 20, 30, 50, 100],
  exportable = false,
  exportFileName = 'export',
  exportTitle,
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
    columnResizeMode: 'onChange',
    enableColumnResizing: resizableColumns,
    initialState: pagination ? { pagination: { pageSize } } : { pagination: { pageSize: Number.MAX_SAFE_INTEGER } },
  });

  // O resize arrasta a largura real da coluna — sem table-fixed o navegador
  // ignora o `width` do <th>/<td> e redistribui o espaço do jeito dele.
  const useFixedLayout = fixedLayout || resizableColumns;

  return (
    <div className={cn('space-y-3', className)}>
      {(searchable || pageSizeSelector || exportable) && (
        <div className="flex flex-wrap items-center gap-3">
          {searchable && (
            <div className="relative min-w-[200px] flex-1">
              <input
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
          <div className="ml-auto flex items-center gap-3">
            {pageSizeSelector && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Exibir
                <select
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}
                  className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                por página
              </label>
            )}
            {exportable && (
              <ExportMenu
                rows={table.getFilteredRowModel().rows}
                columns={table.getAllLeafColumns()}
                filename={exportFileName}
                title={exportTitle}
              />
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table
          className={cn('w-full text-sm', useFixedLayout && 'table-fixed')}
          style={resizableColumns ? { width: table.getTotalSize() } : undefined}
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border bg-muted/40">
                {headerGroup.headers
                  .filter((header) => !header.column.columnDef.meta?.exportOnly)
                  .map((header) => {
                  const sorted = header.column.getIsSorted();
                  // Só aplica largura explícita quando a coluna define `size` —
                  // do contrário mantém o auto-layout de sempre (não afeta
                  // grids existentes que não passam `size`).
                  const largura = resizableColumns ? header.getSize() : header.column.columnDef.size;
                  return (
                    <th
                      key={header.id}
                      style={largura ? { width: largura } : undefined}
                      className={cn(
                        'relative px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground',
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
                      {resizableColumns && header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            'absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none select-none',
                            'hover:bg-primary/50',
                            header.column.getIsResizing() && 'bg-primary'
                          )}
                        />
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
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center text-muted-foreground">
                  {emptyText}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn('transition-colors hover:bg-accent/40', onRowClick && 'cursor-pointer')}
                >
                  {row
                    .getVisibleCells()
                    .filter((cell) => !cell.column.columnDef.meta?.exportOnly)
                    .map((cell) => (
                    <td
                      key={cell.id}
                      style={
                        resizableColumns
                          ? { width: cell.column.getSize() }
                          : cell.column.columnDef.size
                            ? { width: cell.column.columnDef.size }
                            : undefined
                      }
                      className={cn('px-4 py-3', cell.column.id === 'actions' ? 'text-right' : 'text-center')}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && !loading && table.getRowModel().rows.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-muted-foreground">
            Página <span className="font-bold text-foreground">{table.getState().pagination.pageIndex + 1}</span> de{' '}
            <span className="font-bold text-foreground">{table.getPageCount()}</span> ({data.length} registros)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs disabled:opacity-40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs disabled:opacity-40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Próxima <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
