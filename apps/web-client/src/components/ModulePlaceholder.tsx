import React from 'react';
import { PageHeader } from './ui/PageHeader';
import { Layers } from 'lucide-react';

interface ModulePlaceholderProps {
  name: string;
  alias: string;
  description?: string;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({ name, alias, description }) => {
  return (
    <div className="space-y-6">
      <PageHeader
        title={name}
        subtitle={description || `Módulo de negócio ${name} (${alias})`}
      />

      <div className="rounded-xl border border-dashed border-gov-border bg-gov-surface p-12 text-center shadow-xs">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8F0FE] text-[#0c326f] shadow-2xs">
          <Layers className="h-8 w-8" />
        </div>
        <h3 className="mt-4 text-base font-bold text-gov-text-primary">
          Módulo <span className="font-mono text-gov-primary">[{alias}]</span> em Ativação
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-gov-text-secondary">
          Este módulo está registrado e provisionado na plataforma. O componente de interface está localizado em{' '}
          <code className="rounded bg-gov-surface-subtle px-1.5 py-0.5 font-mono text-xs text-gov-text-primary">
            src/modules/{alias}/{name}Module.tsx
          </code>
          .
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-mono text-xs text-emerald-800 tabular-nums">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Status: backend conectado e pronto
        </div>
      </div>
    </div>
  );
};

export default ModulePlaceholder;
