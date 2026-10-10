import React, { useMemo, useState } from 'react';
import { Badge, Input, Skeleton, cn } from '@sysgov/ui';
import type { AlunoPortfolio } from '../api';
import { filtrarAlunos, formatarAvaliacao } from '../formato';

interface Props {
  alunos: AlunoPortfolio[];
  selecionado: number | null;
  onSelecionar: (id: number) => void;
  carregando: boolean;
}

const SITUACAO: Record<AlunoPortfolio['situacao'], string | null> = { ativo: null, transferido: 'Transferido', remanejado: 'Remanejado' };

export const ListaAlunos: React.FC<Props> = ({ alunos, selecionado, onSelecionar, carregando }) => {
  const [busca, setBusca] = useState('');
  const visiveis = useMemo(() => filtrarAlunos(alunos, busca), [alunos, busca]);

  return (
    <div className="flex flex-col gap-2">
      <Input placeholder="Buscar aluno" value={busca} onChange={(e) => setBusca(e.target.value)} />
      {carregando && <Skeleton className="h-40 w-full" />}
      {!carregando && visiveis.length === 0 && <p className="text-sm text-muted-foreground px-1">Nenhum aluno encontrado.</p>}
      <ul className="flex flex-col gap-1">
        {visiveis.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onSelecionar(a.id)}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm border transition-colors',
                selecionado === a.id ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted',
              )}
            >
              <span className="font-mono tabular-nums text-xs text-muted-foreground w-6">{a.numero ?? '—'}</span>
              <span className="flex-1 truncate">{a.nome}</span>
              {SITUACAO[a.situacao] && <Badge variant="outline">{SITUACAO[a.situacao]}</Badge>}
              <span className="font-mono tabular-nums text-xs text-muted-foreground">{a.total_trabalhos}</span>
              <span className="font-mono tabular-nums text-sm font-semibold w-8 text-right">{formatarAvaliacao(a.media)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
