import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ActionsMenu, type ActionsMenuItem } from '@sysgov/ui';

/**
 * Coluna de ações padrão do DataTable (à esquerda, cabeçalho vazio): com mais de uma ação vira o menu ⋮, com uma só
 * o botão fica direto na linha e, sem itens, a célula fica vazia (ver `ActionsMenu`).
 */
export function colunaAcoes<T>(triggerLabel: (linha: T) => string, itens: (linha: T) => ActionsMenuItem[]): ColumnDef<T, unknown> {
  return {
    id: 'acoes',
    header: '',
    size: 56,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex justify-center">
        <ActionsMenu triggerLabel={triggerLabel(row.original)} items={itens(row.original)} />
      </div>
    ),
  };
}
