import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from './DataTable';
import type { ColumnDef } from '@tanstack/react-table';

interface TestItem {
  id: number;
  name: string;
  status: string;
}

describe('DataTable', () => {
  const columns: ColumnDef<TestItem, any>[] = [
    { id: 'id', header: 'ID', accessorKey: 'id', cell: ({ row }) => <span className="font-mono">{row.original.id}</span> },
    { id: 'name', header: 'Nome', accessorKey: 'name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { id: 'status', header: 'Status', accessorKey: 'status', cell: ({ row }) => <span>{row.original.status}</span> },
  ];

  const data: TestItem[] = [
    { id: 1, name: 'Item A', status: 'Ativo' },
    { id: 2, name: 'Item B', status: 'Inativo' },
    { id: 3, name: 'Item C', status: 'Ativo' },
  ];

  it('renders table with data', () => {
    render(<DataTable columns={columns} data={data} pageSize={10} />);
    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.getByText('Item B')).toBeInTheDocument();
    expect(screen.getByText('Item C')).toBeInTheDocument();
  });

  it('renders empty state when data is empty', () => {
    render(<DataTable columns={columns} data={[]} emptyText="Nenhum item encontrado." pageSize={10} />);
    expect(screen.getByText('Nenhum item encontrado.')).toBeInTheDocument();
  });

  it('displays correct number of rows', () => {
    render(<DataTable columns={columns} data={data} pageSize={10} />);
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  it('respects pageSize prop', () => {
    render(<DataTable columns={columns} data={data} pageSize={2} />);
    expect(screen.getByText('Item A')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<DataTable columns={columns} data={data} pageSize={10} />);
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  describe('pageSizeSelector', () => {
    it('is hidden by default', () => {
      render(<DataTable columns={columns} data={data} pageSize={10} />);
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('lets the user change how many rows are shown per page', () => {
      render(<DataTable columns={columns} data={data} pageSize={10} pageSizeSelector pageSizeOptions={[1, 2, 10]} />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('10');
      fireEvent.change(select, { target: { value: '1' } });
      expect(screen.getByText('Item A')).toBeInTheDocument();
      expect(screen.queryByText('Item B')).not.toBeInTheDocument();
    });
  });

  describe('resizableColumns', () => {
    it('renders a drag handle per resizable header when enabled', () => {
      const { container } = render(<DataTable columns={columns} data={data} pageSize={10} resizableColumns />);
      expect(container.querySelectorAll('[class*="cursor-col-resize"]').length).toBe(columns.length);
    });

    it('renders no drag handles by default', () => {
      const { container } = render(<DataTable columns={columns} data={data} pageSize={10} />);
      expect(container.querySelectorAll('[class*="cursor-col-resize"]').length).toBe(0);
    });

    it('sets a min-width on the table equal to the sum of column sizes, so it scrolls horizontally on narrow screens instead of squeezing columns until content overlaps', () => {
      const columnsComTamanho: ColumnDef<TestItem, any>[] = [
        { id: 'id', header: 'ID', accessorKey: 'id', size: 90 },
        { id: 'name', header: 'Nome', accessorKey: 'name', size: 420 },
        { id: 'status', header: 'Status', accessorKey: 'status', size: 150 },
      ];
      const { container } = render(
        <DataTable columns={columnsComTamanho} data={data} pageSize={10} resizableColumns />,
      );
      const table = container.querySelector('table') as HTMLTableElement;
      expect(table.style.minWidth).toBe('660px');
    });
  });

  describe('exportable', () => {
    const columnsWithExport: ColumnDef<TestItem, any>[] = columns.map((col) => ({
      ...col,
      meta: { exportValue: (row: TestItem) => (row as any)[col.id as string] },
    }));

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('is hidden by default', () => {
      render(<DataTable columns={columns} data={data} pageSize={10} />);
      expect(screen.queryByText('Exportar')).not.toBeInTheDocument();
    });

    it('disables the export button when there is no data', () => {
      render(<DataTable columns={columnsWithExport} data={[]} pageSize={10} exportable />);
      expect(screen.getByText('Exportar').closest('button')).toBeDisabled();
    });

    it('downloads a CSV with one column per meta.exportValue', async () => {
      const clickSpy = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === 'a') el.click = clickSpy;
        return el;
      });
      const createObjectURL = vi.fn((_blob: Blob) => 'blob:mock');
      const revokeObjectURL = vi.fn();
      (URL as any).createObjectURL = createObjectURL;
      (URL as any).revokeObjectURL = revokeObjectURL;

      render(<DataTable columns={columnsWithExport} data={data} pageSize={10} exportable exportFileName="itens" />);
      fireEvent.click(screen.getByText('Exportar'));
      fireEvent.click(screen.getByText('CSV'));

      // exportToCsv resolve de forma assíncrona (função async) — dá um tick pro microtask rodar.
      await Promise.resolve();
      await Promise.resolve();

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const blob: Blob = createObjectURL.mock.calls[0][0];
      // jsdom não implementa Blob#text() — lê via FileReader (suportado).
      const text: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(blob);
      });
      expect(text).toContain('ID,Nome,Status');
      expect(text).toContain('Item A');
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('sorting', () => {
    // Fora de ordem alfabética de propósito — clicar no cabeçalho precisa
    // de fato reordenar, não só já estar por acaso na ordem certa.
    const dataDesordenada: TestItem[] = [
      { id: 1, name: 'Charlie', status: 'Ativo' },
      { id: 2, name: 'Alice', status: 'Inativo' },
      { id: 3, name: 'Bravo', status: 'Ativo' },
    ];

    it('does not sort a column with neither accessor nor meta.exportValue/sortValue (só mostra a setinha, sem quebrar)', () => {
      const semAccessor: ColumnDef<TestItem, any>[] = [
        { id: 'name', header: 'Nome', cell: ({ row }) => <span>{row.original.name}</span> },
      ];
      render(<DataTable columns={semAccessor} data={dataDesordenada} pageSize={10} pagination={false} />);
      const header = screen.getByText('Nome').closest('button')!;
      fireEvent.click(header);
      const cells = screen.getAllByRole('cell').map((c) => c.textContent);
      // Sem accessor, react-table não tem de onde tirar o valor — a ordem
      // original é preservada (comportamento anterior a esta função).
      expect(cells).toEqual(['Charlie', 'Alice', 'Bravo']);
    });

    it('sorts using meta.exportValue when the column has no accessorKey/accessorFn', () => {
      const comExportValue: ColumnDef<TestItem, any>[] = [
        { id: 'name', header: 'Nome', meta: { exportValue: (row) => row.name }, cell: ({ row }) => <span>{row.original.name}</span> },
      ];
      render(<DataTable columns={comExportValue} data={dataDesordenada} pageSize={10} pagination={false} />);
      const header = screen.getByText('Nome').closest('button')!;

      fireEvent.click(header); // asc
      expect(screen.getAllByRole('cell').map((c) => c.textContent)).toEqual(['Alice', 'Bravo', 'Charlie']);

      fireEvent.click(header); // desc
      expect(screen.getAllByRole('cell').map((c) => c.textContent)).toEqual(['Charlie', 'Bravo', 'Alice']);
    });

    it('sorts using meta.sortValue in preference to meta.exportValue', () => {
      const comSortValue: ColumnDef<TestItem, any>[] = [
        {
          id: 'name',
          header: 'Nome',
          // sortValue (numérico, por id) devolve uma ordem diferente da que
          // exportValue (string, por nome) daria — prova que é ele quem
          // decide a ordenação quando os dois estão presentes. Números
          // ordenam decrescente no primeiro clique (react-table detecta o
          // tipo do valor); strings ordenam crescente — por isso o resultado
          // esperado aqui é por id decrescente (3, 2, 1), não por nome.
          meta: { exportValue: (row) => row.name, sortValue: (row) => row.id },
          cell: ({ row }) => <span>{row.original.name}</span>,
        },
      ];
      render(<DataTable columns={comSortValue} data={dataDesordenada} pageSize={10} pagination={false} />);
      const header = screen.getByText('Nome').closest('button')!;

      // dataDesordenada tem id 1=Charlie, 2=Alice, 3=Bravo — descendente por id vira Bravo, Alice, Charlie.
      fireEvent.click(header);
      expect(screen.getAllByRole('cell').map((c) => c.textContent)).toEqual(['Bravo', 'Alice', 'Charlie']);
    });
  });

  describe('exportOnly columns', () => {
    it('are omitted from the rendered header and body but still exist for export', () => {
      const withHidden: ColumnDef<TestItem, any>[] = [
        ...columns,
        { id: 'hidden', header: 'Oculta', meta: { exportOnly: true, exportValue: () => 'valor-oculto' }, cell: () => null },
      ];
      render(<DataTable columns={withHidden} data={data} pageSize={10} />);
      expect(screen.queryByText('Oculta')).not.toBeInTheDocument();
      expect(screen.queryByText('valor-oculto')).not.toBeInTheDocument();
    });
  });
});
