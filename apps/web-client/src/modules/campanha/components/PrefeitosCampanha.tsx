import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Landmark, Search } from 'lucide-react';
import { ActionsMenu, AlertCard, Button, Card, CardContent, DataTable, Input, Select, Skeleton, StatusChip } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi } from '../../escola/api';
import { useCarga } from '../../escola/useCarga';
import { campanhaApi, type RelacaoPrefeito } from '../api';
import { ROTULO_RELACAO, VARIANTE_RELACAO } from '../formato';
import type { PropsAba } from '../ModuloCampanhaMain';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

const RELACOES = Object.keys(ROTULO_RELACAO) as RelacaoPrefeito[];

/** Prefeitos eleitos da UF (TSE) e a relação de cada um com a campanha (spec: Prefeitos e vereadores). */
export const PrefeitosCampanha: React.FC<PropsAba> = ({ campanha, permissoes, avisar, alterou, versao, abrirMunicipio }) => {
  const lista = useCarga(() => campanhaApi.prefeitos(), [campanha.id, versao]);
  const [relacao, setRelacao] = useState<RelacaoPrefeito | 'todas'>('todas');
  const { tratarErro } = useFormValidationModal();
  const [busca, setBusca] = useState('');
  const [salvando, setSalvando] = useState<number | null>(null);

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return (lista.dados ?? []).filter((p) => (relacao === 'todas' || p.relacao === relacao) && (!t || `${p.municipio} ${p.nome ?? ''} ${p.partido ?? ''}`.toLowerCase().includes(t)));
  }, [lista.dados, relacao, busca]);

  const mudar = async (ibge: number, nova: RelacaoPrefeito) => {
    setSalvando(ibge);
    try {
      if (nova === 'sem_informacao') await campanhaApi.excluirPrefeito(ibge);
      else await campanhaApi.salvarPrefeito(ibge, { relacao: nova });
      alterou();
    } catch (e) {
      if (!tratarErro(e)) avisar({ type: 'error', title: 'Não foi possível alterar', message: erroApi(e).mensagem });
    } finally {
      setSalvando(null);
    }
  };

  // Colunas estáveis (o Select da relação não remonta ao gravar); o estado atual vem por ref.
  type LinhaPrefeito = Awaited<ReturnType<typeof campanhaApi.prefeitos>>[number];
  const ctx = useRef({} as { permissoes: PropsAba['permissoes']; salvando: number | null; mudar: (ibge: number, nova: RelacaoPrefeito) => Promise<void>; abrirMunicipio: PropsAba['abrirMunicipio'] });
  const colunas = useMemo<ColumnDef<LinhaPrefeito, unknown>[]>(() => [
    {
      id: 'municipio', header: 'Município', accessorKey: 'municipio',
      cell: ({ row }) => (
        <div>
          <Button variant="link" className="h-auto p-0 font-medium" onClick={() => ctx.current.abrirMunicipio(row.original.codigo_ibge)}>{row.original.municipio}</Button>
          <p className="text-xs text-muted-foreground">{row.original.regiao ?? ''}</p>
        </div>
      ),
      meta: { exportHeader: 'Município', exportValue: (p) => p.municipio },
    },
    {
      id: 'prefeito', header: 'Prefeito', accessorFn: (p) => `${p.nome ?? '—'}${p.partido ? ` (${p.partido})` : ''}`,
      cell: ({ row }) => <span>{row.original.nome ?? '—'}{row.original.partido ? <span className="text-muted-foreground"> ({row.original.partido})</span> : null}</span>,
      meta: { exportHeader: 'Prefeito', exportValue: (p) => `${p.nome ?? ''}${p.partido ? ` (${p.partido})` : ''}` },
    },
    { id: 'vice', header: 'Vice', accessorFn: (p) => p.vice ?? '—', meta: { exportHeader: 'Vice', exportValue: (p) => p.vice ?? '' } },
    {
      id: 'relacao', header: 'Relação', accessorFn: (p) => ROTULO_RELACAO[p.relacao],
      cell: ({ row }) => {
        const p = row.original;
        const { permissoes: perm, salvando: emGravacao, mudar: gravar } = ctx.current;
        return perm.equipes ? (
          <div className="w-56">
            <Select value={p.relacao} disabled={emGravacao === p.codigo_ibge} onChange={(v) => void gravar(p.codigo_ibge, v as RelacaoPrefeito)} options={RELACOES.map((r) => ({ value: r, label: ROTULO_RELACAO[r] }))} />
          </div>
        ) : <StatusChip label={ROTULO_RELACAO[p.relacao]} variant={VARIANTE_RELACAO[p.relacao]} />;
      },
      meta: { exportHeader: 'Relação', exportValue: (p) => ROTULO_RELACAO[p.relacao] },
    },
  ], []);

  if (lista.erro) return <AlertCard priority="danger" title="Não foi possível carregar os prefeitos" description={lista.erro} actionLabel="Tentar novamente" onAction={() => void lista.recarregar()} />;
  if (!lista.dados) return <Skeleton className="h-64 w-full" />;

  ctx.current = { permissoes, salvando, mudar, abrirMunicipio };

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="grid gap-2 md:grid-cols-[1fr_14rem]">
          <Input label="Buscar" placeholder="Município, prefeito ou partido" value={busca} onChange={(e) => setBusca(e.target.value)} leftIcon={<Search className="h-4 w-4" />} />
          <Select label="Relação" value={relacao} onChange={(v) => setRelacao(v as RelacaoPrefeito | 'todas')} options={[{ value: 'todas', label: 'Todas' }, ...RELACOES.map((r) => ({ value: r, label: ROTULO_RELACAO[r] }))]} />
        </div>
        <p className="text-xs text-muted-foreground">Prefeitos e vices eleitos segundo o TSE. A relação com a campanha pinta a camada "Apoio de Prefeito" do mapa.</p>
        {visiveis.length === 0 ? <EmptyState icon={<Landmark className="h-8 w-8" />} title="Nenhum prefeito encontrado" description="Ajuste os filtros." /> : (
          <DataTable
            columns={colunas}
            data={visiveis}
            emptyText="Nenhum prefeito encontrado."
            exportable
            exportFileName="campanha-prefeitos"
            exportTitle="Campanha — Prefeitos"
          />
        )}
      </CardContent>
    </Card>
  );
};
