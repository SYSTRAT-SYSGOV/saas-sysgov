import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { History, Plus } from 'lucide-react';
import { Drawer } from '@sysgov/ui';
import { Button, Card, ConfirmDialog, DataTable, Select } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import { cemiteriosApi, ESTADOS, formatarData, type Jazigo, type Parque } from '../api';
import { ErroBox, EstadoChip, FormModal, Mono, useAcao, useDados } from './comum';

const TIPOS_JAZIGO = [
  { value: 'jazigo', label: 'Jazigo' }, { value: 'gaveta', label: 'Gaveta' },
  { value: 'ossuario', label: 'Ossuário/Nicho' }, { value: 'cova_publica', label: 'Cova pública' },
];
const ZONAS = [
  { value: 'jazigos', label: 'Jazigos' }, { value: 'gavetas', label: 'Gavetas' },
  { value: 'ossuario', label: 'Ossuário' }, { value: 'cova_publica', label: 'Cova pública' },
];

/** Inventário: cemitérios, setores/quadras e jazigos com histórico (RF-01..RF-04, RF-19). */
export const InventarioView: React.FC = () => {
  const { can } = useCan();
  const gerencia = can('cemiterios.inventario.manage');
  const [parqueId, setParqueId] = useState<string | null>(null);
  const [estado, setEstado] = useState<string | null>(null);
  const [modal, setModal] = useState<'parque' | 'setor' | 'jazigo' | null>(null);
  const [selecionado, setSelecionado] = useState<Jazigo | null>(null);

  const parques = useDados(() => cemiteriosApi.parques(), []);
  const parque = useDados(() => (parqueId ? cemiteriosApi.parque(Number(parqueId)) : Promise.resolve(null)), [parqueId]);
  const jazigos = useDados(
    () => cemiteriosApi.jazigos({ parque: parqueId ?? undefined, estado: estado ?? undefined, per_page: 200 }),
    [parqueId, estado],
  );

  const colunas = useMemo<ColumnDef<Jazigo, unknown>[]>(() => [
    { id: 'codigo', header: 'Código', accessorKey: 'codigo', cell: ({ row }) => <Mono className="font-bold">{row.original.codigo}</Mono> },
    { id: 'tipo', header: 'Tipo', accessorKey: 'tipo' },
    { id: 'ocupacao', header: 'Ocupação', cell: ({ row }) => <Mono>{row.original.ocupacao}/{row.original.capacidade}</Mono> },
    { id: 'dim', header: 'Dimensões (m)', cell: ({ row }) => <Mono>{row.original.comprimento_m ?? '—'} × {row.original.largura_m ?? '—'}</Mono> },
    { id: 'estado', header: 'Estado', accessorKey: 'estado', cell: ({ row }) => <EstadoChip estado={row.original.estado} /> },
  ], []);

  const opcoesParques = (parques.dados ?? []).map((p) => ({ value: String(p.id), label: `${p.codigo} — ${p.nome}` }));

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="md:w-72"><Select label="Cemitério" value={parqueId} onChange={setParqueId} options={opcoesParques} placeholder="Todos" /></div>
          <div className="md:w-60">
            <Select label="Estado" value={estado} onChange={(v) => setEstado(v || null)} placeholder="Todos"
              options={Object.entries(ESTADOS).map(([value, e]) => ({ value, label: e.rotulo }))} />
          </div>
          {gerencia && (
            <div className="flex flex-wrap gap-2 md:ml-auto">
              <Button variant="outline" onClick={() => setModal('parque')}><Plus className="h-4 w-4" /> Cemitério</Button>
              <Button variant="outline" disabled={!parqueId} onClick={() => setModal('setor')}><Plus className="h-4 w-4" /> Setor/Quadra</Button>
              <Button disabled={!parque.dados?.setores?.length} onClick={() => setModal('jazigo')}><Plus className="h-4 w-4" /> Jazigo</Button>
            </div>
          )}
        </div>
        {parque.dados && (
          <p className="mt-3 text-xs text-muted-foreground">
            {parque.dados.endereco ?? 'Sem endereço'} · Setores:{' '}
            {parque.dados.setores?.map((s) => <Mono key={s.id} className="mr-2">{s.codigo}{s.area_m2 ? ` (${s.area_m2} m²)` : ''}</Mono>)}
          </p>
        )}
      </Card>

      <ErroBox erro={jazigos.erro ?? parques.erro} />
      <DataTable columns={colunas} data={jazigos.dados?.data ?? []} loading={jazigos.carregando} searchable
        searchPlaceholder="Buscar código…" onRowClick={setSelecionado} emptyText="Nenhum jazigo cadastrado." pagination pageSize={25} />

      <DetalheJazigo jazigo={selecionado} onFechar={() => setSelecionado(null)} onAlterado={() => void jazigos.recarregar()} />

      <FormModal aberto={modal === 'parque'} titulo="Novo cemitério" onFechar={() => setModal(null)}
        campos={[
          { nome: 'codigo', rotulo: 'Código', obrigatorio: true }, { nome: 'nome', rotulo: 'Nome', obrigatorio: true },
          { nome: 'endereco', rotulo: 'Endereço' }, { nome: 'responsavel', rotulo: 'Responsável' },
          { nome: 'tipo', rotulo: 'Tipo', tipo: 'select', opcoes: [{ value: 'municipal', label: 'Municipal' }, { value: 'distrital', label: 'Distrital' }, { value: 'outro', label: 'Outro' }] },
        ]}
        onEnviar={async (v) => { await cemiteriosApi.criarParque(v as Partial<Parque>); await parques.recarregar(); }} />
      <FormModal aberto={modal === 'setor'} titulo="Novo setor/quadra" onFechar={() => setModal(null)}
        campos={[{ nome: 'codigo', rotulo: 'Código', obrigatorio: true }, { nome: 'tipo_zona', rotulo: 'Tipo de zona', tipo: 'select', opcoes: ZONAS, obrigatorio: true }, { nome: 'descricao', rotulo: 'Descrição' }]}
        onEnviar={async (v) => { await cemiteriosApi.criarSetor(Number(parqueId), v); await parque.recarregar(); }} />
      <FormModal aberto={modal === 'jazigo'} titulo="Novo jazigo" onFechar={() => setModal(null)} iniciais={{ tipo: 'jazigo', capacidade: '3' }}
        campos={[
          { nome: 'sector_id', rotulo: 'Setor/Quadra', tipo: 'select', obrigatorio: true, opcoes: (parque.dados?.setores ?? []).map((s) => ({ value: String(s.id), label: s.codigo })) },
          { nome: 'codigo', rotulo: 'Código', obrigatorio: true }, { nome: 'tipo', rotulo: 'Tipo', tipo: 'select', opcoes: TIPOS_JAZIGO, obrigatorio: true },
          { nome: 'capacidade', rotulo: 'Capacidade', tipo: 'number', obrigatorio: true },
          { nome: 'comprimento_m', rotulo: 'Comprimento (m)', tipo: 'number' }, { nome: 'largura_m', rotulo: 'Largura (m)', tipo: 'number' },
        ]}
        onEnviar={async (v) => { await cemiteriosApi.criarJazigo({ ...v, sector_id: Number(v.sector_id), capacidade: Number(v.capacidade) } as Partial<Jazigo>); await jazigos.recarregar(); }} />
    </div>
  );
};

/** Painel lateral do jazigo: estado, ocupação e linha do tempo (RF-19). Reusado pelo mapa. */
export const DetalheJazigo: React.FC<{ jazigo: Pick<Jazigo, 'id'> | null; onFechar: () => void; onAlterado?: () => void }> = ({ jazigo, onFechar, onAlterado }) => {
  const { can } = useCan();
  const pode = can('cemiterios.inventario.manage') || can('cemiterios.gis.edit');
  const id = jazigo?.id ?? null;
  const detalhe = useDados(() => (id ? cemiteriosApi.jazigo(id) : Promise.resolve(null)), [id]);
  const historico = useDados(() => (id ? cemiteriosApi.historico(id) : Promise.resolve([])), [id]);
  const [confirmar, setConfirmar] = useState(false);
  const { erro, executar } = useAcao();
  const j = detalhe.dados;
  const emManutencao = j?.estado === 'manutencao';

  const transicionar = async (motivo: string) => {
    setConfirmar(false);
    if (!j) return;
    const ok = await executar(() => cemiteriosApi.alterarEstado(j.id, emManutencao ? 'restaurar' : 'manutencao', motivo, j.lock_version));
    if (ok) {
      await Promise.all([detalhe.recarregar(), historico.recarregar()]);
      onAlterado?.();
    }
  };

  return (
    <Drawer open={id !== null} onClose={onFechar} title={j ? `Jazigo ${j.codigo}` : 'Jazigo'} icon={<History className="h-5 w-5" />}
      footer={pode && j ? <Button variant={emManutencao ? 'outline' : 'destructive'} onClick={() => setConfirmar(true)}>
        {emManutencao ? 'Sair de Em Ruína/Manutenção' : 'Marcar Em Ruína/Manutenção'}</Button> : undefined}>
      {j && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <EstadoChip estado={j.estado} />
            <Mono className="text-sm">Ocupação {j.ocupacao}/{j.capacidade}</Mono>
          </div>
          <p className="text-sm text-muted-foreground">{j.cemiterio?.nome} · Setor <Mono>{j.setor?.codigo}</Mono> · {j.tipo}</p>
          <ErroBox erro={erro} />
          <h4 className="text-sm font-semibold">Linha do tempo</h4>
          <ol className="space-y-2 border-l border-border pl-4">
            {(historico.dados ?? []).map((e, i) => (
              <li key={i} className="text-sm">
                <Mono className="block text-xs text-muted-foreground">{formatarData(e.data)}</Mono>
                <span className="font-medium capitalize">{e.tipo}</span> — {e.descricao}
              </li>
            ))}
            {!historico.carregando && historico.dados?.length === 0 && <li className="text-sm text-muted-foreground">Sem eventos.</li>}
          </ol>
        </div>
      )}
      <ConfirmDialog open={confirmar} onClose={() => setConfirmar(false)} onConfirm={(motivo) => void transicionar(motivo)} requireReason
        title={emManutencao ? 'Restaurar jazigo' : 'Marcar Em Ruína/Manutenção'} description="Informe o motivo; a transição fica no histórico do jazigo."
        confirmLabel="Confirmar" destructive={!emManutencao} reasonPlaceholder="Motivo" />
    </Drawer>
  );
};
