import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { FileDown, Receipt } from 'lucide-react';
import { Button, Card, DataTable, KpiCard, StatusChip, Tabs } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import { cemiteriosApi, formatarCentavos, formatarData, type Guia, type Preco } from '../api';
import { ErroBox, FormModal, Mono, useAcao, useDados } from './comum';

const SERVICOS: Record<string, string> = {
  concessao_temporaria: 'Concessão temporária', concessao_perpetua: 'Concessão perpétua', renovacao: 'Renovação',
  inumacao: 'Inumação', exumacao: 'Exumação', trasladacao: 'Trasladação', taxa_manutencao_anual: 'Taxa anual de manutenção', alvara_obra: 'Alvará de obra',
};
const opcoesServico = Object.entries(SERVICOS).map(([value, label]) => ({ value, label }));

const SituacaoGuia: React.FC<{ guia: Guia }> = ({ guia }) => (
  <StatusChip label={guia.vencida ? 'vencida' : guia.situacao} variant={guia.situacao === 'paga' ? 'success' : guia.vencida ? 'danger' : guia.situacao === 'cancelada' ? 'neutral' : 'info'} />
);

/** Preços com vigência, reajuste IPCA, guias próprias, baixa manual e inadimplência (RF-20..RF-23). */
export const FinanceiroView: React.FC = () => {
  const [aba, setAba] = useState<'precos' | 'guias' | 'inadimplencia'>('guias');
  return (
    <div className="space-y-4">
      <Tabs items={[{ key: 'guias', label: 'Guias' }, { key: 'precos', label: 'Tabela de preços' }, { key: 'inadimplencia', label: 'Inadimplência' }]} value={aba} onChange={setAba} />
      {aba === 'precos' && <Precos />}
      {aba === 'guias' && <Guias />}
      {aba === 'inadimplencia' && <Inadimplencia />}
    </div>
  );
};

const Precos: React.FC = () => {
  const { can } = useCan();
  const tabela = useDados(() => cemiteriosApi.precos(), []);
  const reajustes = useDados(() => (can('cemiterios.financeiro.manage') ? cemiteriosApi.reajustes() : Promise.resolve([])), []);
  const [modal, setModal] = useState<'preco' | 'reajuste' | null>(null);

  const colunas = useMemo<ColumnDef<Preco, unknown>[]>(() => [
    { id: 'servico', header: 'Serviço', accessorFn: (r) => SERVICOS[r.servico] ?? r.servico },
    { id: 'valor', header: 'Valor', cell: ({ row }) => <Mono className="font-bold">{formatarCentavos(row.original.valor_centavos)}</Mono> },
    { id: 'inicio', header: 'Vigência', cell: ({ row }) => <Mono>{formatarData(row.original.vigencia_inicio)} → {row.original.vigencia_fim ? formatarData(row.original.vigencia_fim) : 'atual'}</Mono> },
  ], []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {can('cemiterios.financeiro.manage') && <Button onClick={() => setModal('preco')}>Nova vigência de preço</Button>}
        {can('cemiterios.financeiro.reajuste') && <Button variant="outline" onClick={() => setModal('reajuste')}>Reajuste manual</Button>}
      </div>
      <ErroBox erro={tabela.erro} />
      <DataTable columns={colunas} data={tabela.dados?.historico ?? []} loading={tabela.carregando} emptyText="Tabela de preços vazia." />
      {(reajustes.dados ?? []).length > 0 && (
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold">Reajustes aplicados</h3>
          <ul className="space-y-1 text-sm">
            {reajustes.dados?.map((r) => (
              <li key={r.id}>Competência <Mono>{r.competencia}</Mono>: <Mono>{Number(r.percentual).toFixed(4)}%</Mono> ({r.origem})</li>
            ))}
          </ul>
        </Card>
      )}
      <FormModal aberto={modal === 'preco'} titulo="Nova vigência de preço" onFechar={() => setModal(null)}
        campos={[
          { nome: 'servico', rotulo: 'Serviço', tipo: 'select', opcoes: opcoesServico, obrigatorio: true },
          { nome: 'valor', rotulo: 'Valor (R$)', obrigatorio: true, dica: 'Ex.: 150,00 — no máximo 2 casas decimais.' },
          { nome: 'vigencia_inicio', rotulo: 'Início da vigência', tipo: 'date', obrigatorio: true },
        ]}
        onEnviar={async (v) => { await cemiteriosApi.novoPreco(v as { servico: string; valor: string; vigencia_inicio: string }); await tabela.recarregar(); }} />
      <FormModal aberto={modal === 'reajuste'} titulo="Reajuste manual da tabela" onFechar={() => setModal(null)} iniciais={{ competencia: String(new Date().getFullYear() + 1) }}
        campos={[
          { nome: 'competencia', rotulo: 'Competência (ano de vigência)', tipo: 'number', obrigatorio: true },
          { nome: 'percentual', rotulo: 'Percentual (%)', obrigatorio: true, dica: 'Até 4 casas decimais, ex.: 4.5000.' },
        ]}
        onEnviar={async (v) => { await cemiteriosApi.reajusteManual(Number(v.competencia), String(v.percentual)); await Promise.all([tabela.recarregar(), reajustes.recarregar()]); }} />
    </div>
  );
};

const Guias: React.FC = () => {
  const guias = useDados(() => cemiteriosApi.guias({ per_page: 100 }), []);
  const [baixa, setBaixa] = useState<Guia | null>(null);
  const [lote, setLote] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const { erro, executar } = useAcao();

  const colunas = useMemo<ColumnDef<Guia, unknown>[]>(() => [
    { id: 'numero', header: 'Número', accessorKey: 'numero', cell: ({ row }) => <Mono className="font-bold">{row.original.numero}</Mono> },
    { id: 'contribuinte', header: 'Contribuinte', accessorKey: 'contribuinte_nome' },
    { id: 'servico', header: 'Serviço', accessorFn: (r) => `${SERVICOS[r.servico] ?? r.servico}${r.exercicio ? ` ${r.exercicio}` : ''}` },
    { id: 'valor', header: 'Valor', cell: ({ row }) => <Mono>{formatarCentavos(row.original.valor_centavos)}</Mono> },
    { id: 'vencimento', header: 'Vencimento', cell: ({ row }) => <Mono>{formatarData(row.original.vencimento)}</Mono> },
    { id: 'situacao', header: 'Situação', cell: ({ row }) => <SituacaoGuia guia={row.original} /> },
    {
      id: 'acoes', header: '', cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="xs" variant="outline" aria-label="PDF" onClick={() => void cemiteriosApi.pdfGuia(row.original)}><FileDown className="h-3 w-3" /></Button>
          {row.original.situacao === 'emitida' && (
            <>
              <Button size="xs" variant="outline" onClick={async () => { if (await executar(() => cemiteriosApi.segundaVia(row.original.id))) await guias.recarregar(); }}>2ª via</Button>
              <Button size="xs" onClick={() => setBaixa(row.original)}>Baixa</Button>
            </>
          )}
        </div>
      ),
    },
  ], [executar, guias]);

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={() => setLote(true)}><Receipt className="h-4 w-4" /> Gerar guias anuais</Button>
      {aviso && <p className="rounded-md border border-border bg-accent/50 p-3 text-sm" role="status">{aviso}</p>}
      <ErroBox erro={erro ?? guias.erro} />
      <DataTable columns={colunas} data={guias.dados?.data ?? []} loading={guias.carregando} searchable emptyText="Nenhuma guia emitida." />
      <FormModal aberto={baixa !== null} titulo={`Baixa manual da guia ${baixa?.numero ?? ''}`} rotuloEnviar="Registrar pagamento" onFechar={() => setBaixa(null)}
        campos={[
          { nome: 'pago_em', rotulo: 'Data do pagamento', tipo: 'date', obrigatorio: true },
          { nome: 'valor_pago', rotulo: 'Valor pago (R$)', obrigatorio: true },
          { nome: 'comprovante', rotulo: 'Comprovante', tipo: 'file', aceitar: '.pdf,image/*', obrigatorio: true },
        ]}
        onEnviar={async (v) => { await cemiteriosApi.baixa(Number(baixa?.id), v as { pago_em: string; valor_pago: string; comprovante: File }); await guias.recarregar(); }} />
      <FormModal aberto={lote} titulo="Gerar guias da taxa anual" rotuloEnviar="Gerar" onFechar={() => setLote(false)} iniciais={{ exercicio: String(new Date().getFullYear()) }}
        campos={[{ nome: 'exercicio', rotulo: 'Exercício', tipo: 'number', obrigatorio: true, dica: 'Reprocessar gera apenas as guias que faltam.' }]}
        onEnviar={async (v) => {
          const r = await cemiteriosApi.loteAnual(Number(v.exercicio));
          setAviso(`Exercício ${r.exercicio}: ${r.geradas} gerada(s), ${r.existentes} já existente(s), ${r.falhas.length} falha(s).`);
          await guias.recarregar();
        }} />
    </div>
  );
};

const Inadimplencia: React.FC = () => {
  const [servico, setServico] = useState<string | null>(null);
  const dados = useDados(() => cemiteriosApi.inadimplencia({ servico: servico ?? undefined }), [servico]);
  const colunas = useMemo<ColumnDef<Guia, unknown>[]>(() => [
    { id: 'numero', header: 'Guia', cell: ({ row }) => <Mono>{row.original.numero}</Mono> },
    { id: 'contribuinte', header: 'Contribuinte', accessorKey: 'contribuinte_nome' },
    { id: 'servico', header: 'Serviço', accessorFn: (r) => SERVICOS[r.servico] ?? r.servico },
    { id: 'valor', header: 'Valor', cell: ({ row }) => <Mono>{formatarCentavos(row.original.valor_centavos)}</Mono> },
    { id: 'vencimento', header: 'Vencida em', cell: ({ row }) => <Mono>{formatarData(row.original.vencimento)}</Mono> },
  ], []);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard title="Total em aberto" value={formatarCentavos(dados.dados?.total_centavos ?? 0)} />
        <KpiCard title="Guias vencidas" value={dados.dados?.quantidade ?? 0} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={servico === null ? 'primary' : 'outline'} onClick={() => setServico(null)}>Todos</Button>
        {opcoesServico.map((o) => (
          <Button key={o.value} size="sm" variant={servico === o.value ? 'primary' : 'outline'} onClick={() => setServico(o.value)}>{o.label}</Button>
        ))}
      </div>
      <ErroBox erro={dados.erro} />
      <DataTable columns={colunas} data={dados.dados?.guias ?? []} loading={dados.carregando} emptyText="Nenhuma guia vencida." />
    </div>
  );
};
