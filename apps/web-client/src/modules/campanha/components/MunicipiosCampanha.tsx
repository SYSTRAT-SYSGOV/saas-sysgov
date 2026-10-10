import React, { useMemo, useState } from 'react';
import { MapPinned, Search } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, Input, Select, Skeleton, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { useCarga } from '../../escola/useCarga';
import { campanhaApi, type Situacao } from '../api';
import { ROTULO_RELACAO, ROTULO_SITUACAO, SITUACOES, VARIANTE_RELACAO, VARIANTE_SITUACAO, formatarNumero } from '../formato';
import type { PropsAba } from '../ModuloCampanhaMain';

/** Municípios da UF da campanha com filtros; a linha abre a ficha (spec: Municípios na campanha). */
export const MunicipiosCampanha: React.FC<PropsAba> = ({ campanha, abrirMunicipio, versao }) => {
  const [situacao, setSituacao] = useState<Situacao | 'todas'>('todas');
  const [regiao, setRegiao] = useState('todas');
  const [coordenador, setCoordenador] = useState<number | 'todos'>('todos');
  const [busca, setBusca] = useState('');
  const dados = useCarga(async () => {
    const [municipios, coordenadores] = await Promise.all([campanhaApi.municipios(), campanhaApi.coordenadores()]);
    return { municipios, coordenadores };
  }, [campanha.id, versao]);

  const regioes = useMemo(() => [...new Set((dados.dados?.municipios ?? []).map((m) => m.regiao_intermediaria ?? ''))].filter(Boolean).sort(), [dados.dados]);
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '');
    return (dados.dados?.municipios ?? []).filter((m) => (situacao === 'todas' || m.situacao === situacao)
      && (regiao === 'todas' || m.regiao_intermediaria === regiao)
      && (coordenador === 'todos' || m.coordenador?.id === coordenador)
      && (!termo || m.nome.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '').includes(termo)));
  }, [dados.dados, situacao, regiao, coordenador, busca]);

  if (dados.erro) return <AlertCard priority="danger" title="Não foi possível carregar os municípios" description={dados.erro} actionLabel="Tentar novamente" onAction={() => void dados.recarregar()} />;
  if (!dados.dados) return <Skeleton className="h-96 w-full" />;

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="grid gap-2 md:grid-cols-[1fr_12rem_14rem_14rem]">
          <Input label="Buscar" placeholder="Nome do município" value={busca} onChange={(e) => setBusca(e.target.value)} leftIcon={<Search className="h-4 w-4" />} />
          <Select label="Situação" value={situacao} onChange={(v) => setSituacao(v as Situacao | 'todas')} options={[{ value: 'todas', label: 'Todas' }, ...SITUACOES.map((s) => ({ value: s, label: ROTULO_SITUACAO[s] }))]} />
          <Select label="Região" value={regiao} onChange={setRegiao} options={[{ value: 'todas', label: 'Todas' }, ...regioes.map((r) => ({ value: r, label: r }))]} />
          <Select label="Coordenador" value={coordenador} onChange={(v) => setCoordenador(v === 'todos' ? 'todos' : Number(v))} options={[{ value: 'todos', label: 'Todos' }, ...dados.dados.coordenadores.map((c) => ({ value: c.id, label: c.nome }))]} />
        </div>
        <p className="text-sm text-muted-foreground"><span className="font-mono tabular-nums">{visiveis.length}</span> de <span className="font-mono tabular-nums">{dados.dados.municipios.length}</span> municípios</p>
        {visiveis.length === 0 ? (
          <EmptyState icon={<MapPinned className="h-8 w-8" />} title="Nenhum município encontrado" description={dados.dados.municipios.length === 0 ? `A base pública de ${campanha.uf} ainda não foi importada.` : 'Ajuste os filtros.'} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Município</TableHead><TableHead>Região</TableHead><TableHead className="text-right">Eleitores</TableHead>
                <TableHead>Situação</TableHead><TableHead className="text-right">Meta</TableHead><TableHead>Coordenador</TableHead><TableHead>Prefeito</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((m) => (
                <TableRow key={m.codigo_ibge}>
                  <TableCell><Button variant="link" className="h-auto p-0 font-medium" onClick={() => abrirMunicipio(m.codigo_ibge)} aria-label={`Abrir ficha de ${m.nome}`}>{m.nome}</Button></TableCell>
                  <TableCell className="text-sm">{m.regiao_intermediaria ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatarNumero(m.eleitores)}</TableCell>
                  <TableCell><StatusChip label={ROTULO_SITUACAO[m.situacao]} variant={VARIANTE_SITUACAO[m.situacao]} /></TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatarNumero(m.meta_votos)}</TableCell>
                  <TableCell className="text-sm">{m.coordenador?.nome ?? '—'}</TableCell>
                  <TableCell className="text-sm">
                    {m.prefeito.nome ?? '—'}{m.prefeito.partido ? <span className="text-muted-foreground"> ({m.prefeito.partido})</span> : null}
                    {m.prefeito.relacao !== 'sem_informacao' && <StatusChip label={ROTULO_RELACAO[m.prefeito.relacao]} variant={VARIANTE_RELACAO[m.prefeito.relacao]} className="ml-2" />}
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
