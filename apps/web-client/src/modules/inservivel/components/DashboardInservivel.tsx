import React, { useState } from 'react';
import { AlertTriangle, ArrowLeftRight, Building2, ClipboardCheck, FileWarning, Package, Plus, Search, Ticket } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, CardHeader, CardTitle, Input, KpiCard, Select, Skeleton, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { useCarga } from '../../escola/useCarga';
import { inservivelApi } from '../api';
import { formatarCentavos, formatarData, rotuloUnidade, secretarias, textoValidade, VARIANTE_STATUS_ENTIDADE } from '../formato';
import type { PropsAba } from '../ModuloInservivelMain';
import { ChipSituacao, useOpcoes } from './Comuns';

const numero = new Intl.NumberFormat('pt-BR');

/** Dashboard (spec: Dashboard; Validade dos documentos da entidade). */
export const DashboardInservivel: React.FC<PropsAba> = ({ permissoes, irPara }) => {
  const [filtros, setFiltros] = useState({ q: '', situacao_id: '', secretaria_unit_id: '' });
  const [aplicados, setAplicados] = useState(filtros);
  const { opcoes } = useOpcoes();
  const dados = useCarga(() => inservivelApi.dashboard({
    q: aplicados.q || undefined,
    situacao_id: aplicados.situacao_id ? Number(aplicados.situacao_id) : undefined,
    secretaria_unit_id: aplicados.secretaria_unit_id ? Number(aplicados.secretaria_unit_id) : undefined,
  }), [aplicados]);

  if (dados.erro) return <AlertCard priority="danger" title="Não foi possível carregar o dashboard" description={dados.erro} actionLabel="Tentar novamente" onAction={() => void dados.recarregar()} />;
  if (!dados.dados) return <Skeleton className="h-96 w-full" />;
  const d = dados.dados;
  const i = d.indicadores;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Bens cadastrados" value={numero.format(i.bens)} subtitle={`${numero.format(i.bens_inserviveis)} inservíveis`} icon={<Package className="h-5 w-5" />} />
        <KpiCard title="Em avaliação" value={numero.format(i.bens_em_avaliacao)} subtitle="aguardando laudo" icon={<Search className="h-5 w-5" />} />
        <KpiCard title="Lotes ativos" value={numero.format(i.lotes_ativos)} subtitle="abertos ou publicados" icon={<Ticket className="h-5 w-5" />} />
        <KpiCard title="Entidades" value={numero.format(i.entidades)} subtitle="cadastradas" icon={<Building2 className="h-5 w-5" />} />
        <KpiCard title="Aguardando análise" value={numero.format(i.entidades_aguardando)} subtitle="entidades pendentes" icon={<ClipboardCheck className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" />Últimos bens incorporados</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <form className="grid gap-3 md:grid-cols-[1fr_12rem_14rem_auto] md:items-end" onSubmit={(e) => { e.preventDefault(); setAplicados(filtros); }}>
              <Input label="Buscar" placeholder="Nº patrimonial ou descrição" value={filtros.q} onChange={(e) => setFiltros((f) => ({ ...f, q: e.target.value }))} />
              <Select placeholder="Todas" label="Situação" value={filtros.situacao_id} onChange={(v) => setFiltros((f) => ({ ...f, situacao_id: v }))}
                options={[{ value: '', label: 'Todas' }, ...(opcoes?.situacoes ?? []).map((s) => ({ value: String(s.id), label: s.nome }))]} />
              <Select placeholder="Todas" label="Secretaria" value={filtros.secretaria_unit_id} onChange={(v) => setFiltros((f) => ({ ...f, secretaria_unit_id: v }))}
                options={[{ value: '', label: 'Todas' }, ...secretarias(opcoes?.unidades ?? []).map((u) => ({ value: String(u.id), label: u.sigla ?? u.nome }))]} />
              <Button type="submit" variant="outline" leftIcon={<Search className="h-4 w-4" />}>Filtrar</Button>
            </form>
            {d.ultimos_bens.length === 0 ? <EmptyState icon={<Package className="h-8 w-8" />} title="Nenhum bem encontrado" /> : (
              <Table>
                <TableHeader><TableRow><TableHead>Nº patrimonial</TableHead><TableHead>Descrição</TableHead><TableHead>Secretaria / setor</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                <TableBody>
                  {d.ultimos_bens.map((b) => (
                    <TableRow key={b.id} className="cursor-pointer" onClick={() => irPara('bens', { bem: String(b.id) })}>
                      <TableCell className="font-mono tabular-nums">{b.numero_patrimonial}</TableCell>
                      <TableCell className="max-w-xs truncate">{b.descricao}</TableCell>
                      <TableCell className="text-sm">{rotuloUnidade(b.secretaria, b.setor)}</TableCell>
                      <TableCell><ChipSituacao situacao={b.situacao} /></TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatarCentavos(b.valor_referencia_cents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Ações rápidas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {permissoes.bens && <Button className="w-full justify-start" variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => irPara('bens', { novo: '1' })}>Novo bem</Button>}
              {(permissoes.lotes || permissoes.lotesGestao) && <Button className="w-full justify-start" variant="outline" leftIcon={<Ticket className="h-4 w-4" />} onClick={() => irPara('lotes', { novo: '1' })}>Novo lote</Button>}
              {d.solicitacoes_pendentes !== null && (
                <Button className="w-full justify-start" variant="outline" leftIcon={<ArrowLeftRight className="h-4 w-4" />} onClick={() => irPara('solicitacoes')}>
                  Solicitações pendentes <span className="ml-auto font-mono tabular-nums">{d.solicitacoes_pendentes}</span>
                </Button>
              )}
              {permissoes.entidades && (
                <div className="pt-2">
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Entidades aguardando análise</p>
                  {d.entidades_aguardando.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma entidade aguardando.</p> : (
                    <ul className="space-y-1">
                      {d.entidades_aguardando.map((e) => (
                        <li key={e.id}>
                          <Button variant="ghost" className="h-auto w-full justify-between gap-2 px-2 py-1.5 text-left text-sm font-normal" onClick={() => irPara('entidades', { entidade: String(e.id) })}>
                            <span className="truncate">{e.razao_social}</span>
                            <StatusChip label={e.status_rotulo} variant={VARIANTE_STATUS_ENTIDADE[e.status]} />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {permissoes.entidades && d.alertas_documentos.length > 0 && (
            <Card className="border-amber-300">
              <CardHeader><CardTitle className="flex items-center gap-2 text-amber-700"><FileWarning className="h-5 w-5" />Documentos de entidades</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {d.alertas_documentos.map((a) => (
                    <li key={`${a.entidade_id}-${a.tipo}`}>
                      <Button variant="ghost" className="h-auto w-full flex-col items-start gap-0 px-2 py-1.5 text-left text-sm font-normal whitespace-normal" onClick={() => irPara('entidades', { entidade: String(a.entidade_id) })}>
                        <span className="flex items-center gap-1 font-medium">{a.vencido && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}{a.razao_social}</span>
                        <span className="text-xs text-muted-foreground">{a.nome} — <span className="font-mono tabular-nums">{formatarData(a.validade)}</span> ({textoValidade(a.validade)}){a.vencido ? ' · bloqueada' : ''}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
