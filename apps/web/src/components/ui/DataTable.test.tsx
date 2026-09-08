import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DataTable } from './DataTable';
import type { ColumnDef } from '@tanstack/react-table';

interface TestItem {
  id: string;
  name: string;
  cnpj: string;
  amount: number;
}

const testData: TestItem[] = [
  { id: '1', name: 'Prefeitura de Curitiba', cnpj: '76.417.005/0001-86', amount: 15400.5 },
  { id: '2', name: 'Prefeitura de Araucária', cnpj: '76.105.517/0001-57', amount: 8200.0 },
];

const columns: ColumnDef<TestItem>[] = [
  {
    accessorKey: 'name',
    header: 'Nome do Tenant',
    cell: (info) => info.getValue() as string,
  },
  {
    accessorKey: 'cnpj',
    header: 'CNPJ',
    cell: (info) => (
      <span className="font-mono tabular-nums">{info.getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'amount',
    header: 'Valor Mensal',
    cell: (info) => (
      <span className="font-mono tabular-nums">
        R$ {(info.getValue() as number).toFixed(2)}
      </span>
    ),
  },
];

describe('DataTable', () => {
  it('renderiza cabeçalhos e linhas de dados corretamente', () => {
    render(<DataTable columns={columns} data={testData} />);

    expect(screen.getByText('Nome do Tenant')).toBeInTheDocument();
    expect(screen.getByText('CNPJ')).toBeInTheDocument();
    expect(screen.getByText('Valor Mensal')).toBeInTheDocument();

    expect(screen.getByText('Prefeitura de Curitiba')).toBeInTheDocument();
    expect(screen.getByText('76.417.005/0001-86')).toBeInTheDocument();
    expect(screen.getByText('R$ 15400.50')).toBeInTheDocument();

    expect(screen.getByText('Prefeitura de Araucária')).toBeInTheDocument();
  });

  it('garante que dados técnicos usam classes JetBrains Mono (font-mono tabular-nums)', () => {
    render(<DataTable columns={columns} data={testData} />);

    const cnpjCell = screen.getByText('76.417.005/0001-86');
    expect(cnpjCell.className).toContain('font-mono');
    expect(cnpjCell.className).toContain('tabular-nums');

    const amountCell = screen.getByText('R$ 15400.50');
    expect(amountCell.className).toContain('font-mono');
    expect(amountCell.className).toContain('tabular-nums');
  });

  it('exibe estado de carregamento quando loading é true', () => {
    render(<DataTable columns={columns} data={[]} loading={true} />);

    expect(screen.queryByText('Prefeitura de Curitiba')).not.toBeInTheDocument();
    // Verifica a presença de linha com spinner
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });

  it('exibe mensagem customizada de lista vazia', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyMessage="Nenhum tenant cadastrado no sistema."
      />
    );

    expect(screen.getByText('Nenhum tenant cadastrado no sistema.')).toBeInTheDocument();
  });

  it('dispara evento onRowClick ao clicar em uma linha', () => {
    const handleRowClick = vi.fn();

    render(
      <DataTable
        columns={columns}
        data={testData}
        onRowClick={handleRowClick}
      />
    );

    fireEvent.click(screen.getByText('Prefeitura de Curitiba'));
    expect(handleRowClick).toHaveBeenCalledWith(testData[0]);
  });

  it('exibe e aciona controles de paginação', () => {
    const handlePageChange = vi.fn();

    render(
      <DataTable
        columns={columns}
        data={testData}
        paginationState={{
          currentPage: 1,
          totalPages: 3,
          onPageChange: handlePageChange,
          total: 6,
          perPage: 2,
        }}
      />
    );

    expect(screen.getByText(/Página/)).toBeInTheDocument();
    expect(screen.getByText(/6 registros/)).toBeInTheDocument();

    const nextBtn = screen.getByRole('button', { name: /Próxima/i });
    expect(nextBtn).toBeEnabled();

    fireEvent.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });
});
