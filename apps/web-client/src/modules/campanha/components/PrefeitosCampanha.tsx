import React, { useMemo, useState } from 'react';
import { Landmark, Search } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, Input, Select, Skeleton, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi } from '../../escola/api';
import { useCarga } from '../../escola/useCarga';
import { campanhaApi, type RelacaoPrefeito } from '../api';
import { ROTULO_RELACAO, VARIANTE_RELACAO } from '../formato';
import type { PropsAba } from '../ModuloCampanhaMain';

const RELACOES = Object.keys(ROTULO_RELACAO) as RelacaoPrefeito[];

/** Prefeitos eleitos da UF (TSE) e a relação de cada um com a campanha (spec: Prefeitos e vereadores). */
export const PrefeitosCampanha: React.FC<PropsAba> = ({ campanha, permissoes, avisar, alterou, versao, abrirMunicipio }) => {
  const lista = useCarga(() => campanhaApi.prefeitos(), [campanha.id, versao]);
  const [relacao, setRelacao] = useState<RelacaoPrefeito | 'todas'>('todas');
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
      avisar({ type: 'error', title: 'Não foi possível alterar', message: erroApi(e).mensagem });
    } finally {
      setSalvando(null);
    }
  };

  if (lista.erro) return <AlertCard priority="danger" title="Não foi possível carregar os prefeitos" description={lista.erro} actionLabel="Tentar novamente" onAction={() => void lista.recarregar()} />;
  if (!lista.dados) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="grid gap-2 md:grid-cols-[1fr_14rem]">
          <Input label="Buscar" placeholder="Município, prefeito ou partido" value={busca} onChange={(e) => setBusca(e.target.value)} leftIcon={<Search className="h-4 w-4" />} />
          <Select label="Relação" value={relacao} onChange={(v) => setRelacao(v as RelacaoPrefeito | 'todas')} options={[{ value: 'todas', label: 'Todas' }, ...RELACOES.map((r) => ({ value: r, label: ROTULO_RELACAO[r] }))]} />
        </div>
        <p className="text-xs text-muted-foreground">Prefeitos e vices eleitos segundo o TSE. A relação com a campanha pinta a camada "Apoio de Prefeito" do mapa.</p>
        {visiveis.length === 0 ? <EmptyState icon={<Landmark className="h-8 w-8" />} title="Nenhum prefeito encontrado" description="Ajuste os filtros." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Município</TableHead><TableHead>Prefeito</TableHead><TableHead>Vice</TableHead><TableHead>Relação</TableHead></TableRow></TableHeader>
            <TableBody>
              {visiveis.map((p) => (
                <TableRow key={p.codigo_ibge}>
                  <TableCell><Button variant="link" className="h-auto p-0 font-medium" onClick={() => abrirMunicipio(p.codigo_ibge)}>{p.municipio}</Button><p className="text-xs text-muted-foreground">{p.regiao ?? ''}</p></TableCell>
                  <TableCell>{p.nome ?? '—'}{p.partido ? <span className="text-muted-foreground"> ({p.partido})</span> : null}</TableCell>
                  <TableCell className="text-sm">{p.vice ?? '—'}</TableCell>
                  <TableCell className="w-56">
                    {permissoes.equipes ? (
                      <Select value={p.relacao} disabled={salvando === p.codigo_ibge} onChange={(v) => void mudar(p.codigo_ibge, v as RelacaoPrefeito)} options={RELACOES.map((r) => ({ value: r, label: ROTULO_RELACAO[r] }))} />
                    ) : <StatusChip label={ROTULO_RELACAO[p.relacao]} variant={VARIANTE_RELACAO[p.relacao]} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
