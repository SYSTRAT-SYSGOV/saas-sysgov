import type { ComponentType } from 'react';
import { lazy } from 'react';
import type { SysgovApi } from '@sysgov/sdk';

export type ModuleManifest = {
  alias: string;
  label: string;
  permission: string;
  icon: string;
  order: number;
  load: () => Promise<{ default: ComponentType<{ api: SysgovApi }> }>;
};

export const moduleRegistry: ModuleManifest[] = [
  {
    alias: 'contracts',
    label: 'Contratos',
    permission: 'contracts.view',
    icon: 'FileCheck2',
    order: 20,
    load: () => import('./contracts/ContractsPage').then(({ ContractsPage }) => ({ default: ContractsPage })),
  },
];

export const ContractsPage = lazy(() => moduleRegistry[0].load());
