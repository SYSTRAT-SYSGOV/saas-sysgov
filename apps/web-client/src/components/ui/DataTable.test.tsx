import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
