import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ListOrdered, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { ActionsMenu, Badge, Button, Card, CardContent, ConfirmDialog, DataTable, Input, Modal, Select, Switch, Textarea } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { useFormValidationModal } from '@/lib/useFormValidationModal';
import { mensagemDeErro, transporteApi, type FiltrosRota, type Opcoes, type Rota } from '../api';
import { km, ROTULO_IRREGULARIDADE_ROTA, rotuloDe, textoOcupacao } from '../formato';
import { AlunosDaRota, SeloOcupacao } from './AlunosDaRota';
import { Itinerario } from './Itinerario';

const TODOS = 'todos';
const NENHUM = '0';

const motivosTexto = (r: Rota): string => r.motivos_irregularidade.map((m) => rotuloDe(ROTULO_IRREGULARIDADE_ROTA, m)).join('; ');

/** Rotas por escola, ano letivo e turno. A irregularidade é derivada na leitura: a rota gravada não é alterada. */
export const Rotas: React.FC<{ opcoes: Opcoes; avisar: Toast }> = ({ opcoes, avisar }) => {
  const [filtros, setFiltros] = useState({ ano: TODOS, escola: TODOS, turno: TODOS, situacao: TODOS });
  const [pagina, setPagina] = useState(1);
  const consulta = useMemo<FiltrosRota>(() => ({
    ano_letivo: filtros.ano === TODOS ? undefined : Number(filtros.ano),
    escola_id: filtros.escola === TODOS ? undefined : Number(filtros.escola),
    turno: filtros.turno === TODOS ? undefined : filtros.turno,
    situacao: filtros.situacao === TODOS ? undefined : filtros.situacao,
    page: pagina,
  }), [filtros, pagina]);
  const carga = useCarga(() => transporteApi.rotas(consulta), [consulta]);
  const [editando, setEditando] = useState<Rota | 'nova' | null>(null);
  const [itinerario, setItinerario] = useState<Rota | null>(null);
  const [alunos, setAlunos] = useState<Rota | null>(null);
  const [excluindo, setExcluindo] = useState<Rota | null>(null);
  const gerenciar = opcoes.permissoes.gerenciar_rotas;

  const filtrar = (chave: keyof typeof filtros, valor: string) => { setFiltros((f) => ({ ...f, [chave]: valor })); setPagina(1); };

  const excluir = async (rota: Rota) => {
    try {
      await transporteApi.excluirRota(rota.id);
      avisar({ type: 'success', title: 'Rota', message: `Rota ${rota.nome} excluída.` });
      await carga.recarregar();
    } catch (e) {
      avisar({ type: 'error', title: 'Rota', message: mensagemDeErro(e) });
    }
  };

  const ctx = useRef({ gerenciar });
  ctx.current = { gerenciar };
  const colunas = useMemo<ColumnDef<Rota, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ActionsMenu
            triggerLabel={`Ações da rota ${row.original.nome}`}
            items={[
              { key: 'alunos', label: 'Alunos', icon: <Users className="h-3.5 w-3.5" />, onSelect: () => setAlunos(row.original) },
              { key: 'itinerario', label: 'Itinerário e mapa', icon: <ListOrdered className="h-3.5 w-3.5" />, onSelect: () => setItinerario(row.original) },
              ...(ctx.current.gerenciar ? [
                { key: 'editar', label: 'Editar', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => setEditando(row.original) },
                { key: 'excluir', label: 'Excluir', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setExcluindo(row.original) },
              ] : []),
            ]}
          />
        </div>
      ),
    },
    { id: 'nome', header: 'Rota', accessorKey: 'nome', meta: { exportHeader: 'Rota', exportValue: (r) => r.nome } },
    { id: 'escola', header: 'Escola', accessorFn: (r) => r.escola?.nome ?? '', meta: { exportHeader: 'Escola', exportValue: (r) => r.escola?.nome ?? '' } },
    { id: 'ano', header: 'Ano', accessorKey: 'ano_letivo', cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.ano_letivo}</span>, meta: { exportHeader: 'Ano letivo', exportValue: (r) => String(r.ano_letivo) } },
    { id: 'turno', header: 'Turno', accessorKey: 'turno_rotulo', meta: { exportHeader: 'Turno', exportValue: (r) => r.turno_rotulo } },
    { id: 'veiculo', header: 'Veículo', accessorFn: (r) => r.veiculo?.placa ?? '—', meta: { exportHeader: 'Veículo', exportValue: (r) => r.veiculo?.placa ?? '' } },
    { id: 'motorista', header: 'Motorista', accessorFn: (r) => r.motorista?.nome ?? '—', meta: { exportHeader: 'Motorista', exportValue: (r) => r.motorista?.nome ?? '' } },
    { id: 'km', header: 'Extensão', accessorKey: 'km_total', cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{km(row.original.km_total)}</span>, meta: { exportHeader: 'Extensão (km)', exportValue: (r) => String(r.km_total) } },
    { id: 'paradas', header: 'Paradas', accessorFn: (r) => r.paradas_count ?? 0, cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.paradas_count ?? 0}</span>, meta: { exportHeader: 'Paradas', exportValue: (r) => String(r.paradas_count ?? 0) } },
    {
      id: 'ocupacao',
      header: 'Ocupação',
      accessorFn: (r) => r.ocupacao.alocados,
      cell: ({ row }) => (
        <span className="flex flex-wrap items-center gap-1">
          <span className="font-mono text-xs tabular-nums">{textoOcupacao(row.original.ocupacao)}</span>
          <SeloOcupacao ocupacao={row.original.ocupacao} />
        </span>
      ),
      meta: { exportHeader: 'Ocupação', exportValue: (r) => textoOcupacao(r.ocupacao) },
    },
    {
      id: 'situacao',
      header: 'Situação',
      accessorFn: (r) => (!r.ativa ? 'Inativa' : r.regular ? 'Regular' : 'Irregular'),
      cell: ({ row }) => {
        const r = row.original;
        if (!r.ativa) return <Badge variant="secondary">Inativa</Badge>;
        if (r.regular) return <Badge variant="outline">Regular</Badge>;
        return (
          <span>
            <Badge variant="destructive">Irregular</Badge>
            <span className="ml-2 text-xs text-muted-foreground">{motivosTexto(r)}</span>
          </span>
        );
      },
      meta: { exportHeader: 'Situação', exportValue: (r) => (!r.ativa ? 'Inativa' : r.regular ? 'Regular' : motivosTexto(r)) },
    },
  ], []);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid flex-1 gap-3 sm:grid-cols-4">
            <Select label="Ano letivo" value={filtros.ano} onChange={(v) => filtrar('ano', v)}
              options={[{ value: TODOS, label: 'Todos' }, ...opcoes.anos_letivos.map((a) => ({ value: String(a), label: String(a) }))]} />
            <Select label="Escola" value={filtros.escola} onChange={(v) => filtrar('escola', v)}
              options={[{ value: TODOS, label: 'Todas' }, ...opcoes.escolas.map((e) => ({ value: String(e.id), label: e.nome }))]} />
            <Select label="Turno" value={filtros.turno} onChange={(v) => filtrar('turno', v)}
              options={[{ value: TODOS, label: 'Todos' }, ...opcoes.turnos.map((t) => ({ value: t.valor, label: t.rotulo }))]} />
            <Select label="Situação" value={filtros.situacao} onChange={(v) => filtrar('situacao', v)}
              options={[{ value: TODOS, label: 'Todas' }, { value: 'ativa', label: 'Ativas' }, { value: 'inativa', label: 'Inativas' }]} />
          </div>
          {gerenciar && <Button onClick={() => setEditando('nova')}><Plus className="mr-1 h-4 w-4" />Nova rota</Button>}
        </div>
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && (
          <>
            <DataTable columns={colunas} data={carga.dados.data} emptyText="Nenhuma rota encontrada." exportable exportFileName="transporte-rotas" exportTitle="Transporte Escolar — Rotas" />
            {carga.dados.last_page > 1 && (
              <div className="flex items-center justify-end gap-2 text-sm">
                <span className="text-muted-foreground">Página {carga.dados.current_page} de {carga.dados.last_page} ({carga.dados.total} rotas)</span>
                <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={pagina >= carga.dados.last_page} onClick={() => setPagina((p) => p + 1)}>Próxima</Button>
              </div>
            )}
          </>
        )}
      </CardContent>
      {editando && (
        <RotaModal opcoes={opcoes} rota={editando === 'nova' ? null : editando} aoFechar={() => setEditando(null)}
          aoSalvar={() => { setEditando(null); avisar({ type: 'success', title: 'Rota', message: 'Rota salva.' }); void carga.recarregar(); }} />
      )}
      {alunos && (
        <AlunosDaRota rota={alunos} opcoes={opcoes} avisar={avisar} aoFechar={() => { setAlunos(null); void carga.recarregar(); }} />
      )}
      {itinerario && (
        <Itinerario rota={itinerario} podeEditar={gerenciar} avisar={avisar} aoFechar={() => { setItinerario(null); void carga.recarregar(); }} />
      )}
      <ConfirmDialog
        open={excluindo !== null}
        onClose={() => setExcluindo(null)}
        title="Excluir rota"
        description={`Excluir a rota ${excluindo?.nome ?? ''}? Para só retirá-la de uso, inative-a.`}
        confirmLabel="Excluir"
        requireReason={false}
        onConfirm={() => { const alvo = excluindo; setExcluindo(null); if (alvo) void excluir(alvo); }}
      />
    </Card>
  );
};

const textoOuNulo = (valor: string): string | null => (valor.trim() === '' ? null : valor.trim());
const decimal = (valor: string): number => (valor.trim() === '' ? 0 : Number(valor.replace(',', '.')));

const RotaModal: React.FC<{ opcoes: Opcoes; rota: Rota | null; aoFechar: () => void; aoSalvar: () => void }> = ({ opcoes, rota, aoFechar, aoSalvar }) => {
  const [dados, setDados] = useState({
    nome: rota?.nome ?? '',
    escola_id: String(rota?.escola?.id ?? opcoes.escolas[0]?.id ?? NENHUM),
    ano_letivo: String(rota?.ano_letivo ?? opcoes.anos_letivos[0] ?? new Date().getFullYear()),
    turno: rota?.turno ?? opcoes.turnos[0]?.valor ?? 'manha',
    tipo_rede: rota?.tipo_rede ?? opcoes.tipos_rede[0]?.valor ?? 'rural',
    empresa_id: String(rota?.empresa?.id ?? NENHUM),
    veiculo_id: String(rota?.veiculo?.id ?? NENHUM),
    motorista_id: String(rota?.motorista?.id ?? NENHUM),
    km_pavimentado: rota ? String(rota.km_pavimentado) : '',
    km_nao_pavimentado: rota ? String(rota.km_nao_pavimentado) : '',
    horario_saida: rota?.horario_saida ?? '',
    horario_chegada: rota?.horario_chegada ?? '',
    horario_retorno: rota?.horario_retorno ?? '',
    ativa: rota?.ativa ?? true,
    observacoes: rota?.observacoes ?? '',
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { modal: modalValidacao, invalidar, tratarErro } = useFormValidationModal();
  const campo = <K extends keyof typeof dados>(chave: K, valor: (typeof dados)[K]) => setDados((d) => ({ ...d, [chave]: valor }));
  const total = decimal(dados.km_pavimentado) + decimal(dados.km_nao_pavimentado);
  const idOuNulo = (v: string): number | null => (v === NENHUM ? null : Number(v));

  const salvar = async () => {
    setErro(null);
    const faltando: [string, string][] = [];
    if (!dados.nome.trim()) faltando.push(['Nome', 'Informe o nome da rota.']);
    if (dados.escola_id === NENHUM) faltando.push(['Escola', 'Escolha a escola de destino.']);
    if (!/^\d{4}$/.test(dados.ano_letivo)) faltando.push(['Ano letivo', 'Informe o ano letivo com 4 dígitos.']);
    if (decimal(dados.km_pavimentado) < 0 || decimal(dados.km_nao_pavimentado) < 0 || Number.isNaN(total)) faltando.push(['Quilometragem', 'A quilometragem não pode ser negativa.']);
    if (faltando.length > 0) return invalidar(faltando);
    setSalvando(true);
    try {
      await transporteApi.salvarRota(rota?.id ?? null, {
        escola_id: Number(dados.escola_id),
        ano_letivo: Number(dados.ano_letivo),
        empresa_id: idOuNulo(dados.empresa_id),
        veiculo_id: idOuNulo(dados.veiculo_id),
        motorista_id: idOuNulo(dados.motorista_id),
        nome: dados.nome.trim(),
        turno: dados.turno,
        tipo_rede: dados.tipo_rede,
        km_pavimentado: decimal(dados.km_pavimentado),
        km_nao_pavimentado: decimal(dados.km_nao_pavimentado),
        horario_saida: textoOuNulo(dados.horario_saida),
        horario_chegada: textoOuNulo(dados.horario_chegada),
        horario_retorno: textoOuNulo(dados.horario_retorno),
        ativa: dados.ativa,
        observacoes: textoOuNulo(dados.observacoes),
      });
      aoSalvar();
    } catch (e) {
      if (!tratarErro(e)) setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open onClose={aoFechar} title={rota ? `Editar rota ${rota.nome}` : 'Nova rota'} size="xl"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void salvar()} isLoading={salvando}>Salvar</Button></>}>
      {modalValidacao}
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Nome *" value={dados.nome} maxLength={150} onChange={(e) => campo('nome', e.target.value)} />
          <Select label="Escola de destino *" value={dados.escola_id} onChange={(v) => campo('escola_id', v)} placeholder="Selecione…"
            options={opcoes.escolas.map((e) => ({ value: String(e.id), label: e.nome }))} />
          <Input label="Ano letivo *" type="number" value={dados.ano_letivo} className="font-mono tabular-nums" onChange={(e) => campo('ano_letivo', e.target.value)} />
          <Select label="Turno *" value={dados.turno} onChange={(v) => campo('turno', v)} options={opcoes.turnos.map((t) => ({ value: t.valor, label: t.rotulo }))} />
          <Select label="Tipo de rede *" value={dados.tipo_rede} onChange={(v) => campo('tipo_rede', v)} options={opcoes.tipos_rede.map((t) => ({ value: t.valor, label: t.rotulo }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Veículo" value={dados.veiculo_id} onChange={(v) => campo('veiculo_id', v)}
            options={[{ value: NENHUM, label: 'Nenhum' }, ...opcoes.veiculos.map((v) => ({ value: String(v.id), label: `${v.placa} — ${v.descricao}` }))]} />
          <Select label="Motorista" value={dados.motorista_id} onChange={(v) => campo('motorista_id', v)}
            options={[{ value: NENHUM, label: 'Nenhum' }, ...opcoes.motoristas.map((m) => ({ value: String(m.id), label: m.nome }))]} />
          <Select label="Empresa" value={dados.empresa_id} onChange={(v) => campo('empresa_id', v)}
            options={[{ value: NENHUM, label: 'Nenhuma' }, ...opcoes.empresas.map((e) => ({ value: String(e.id), label: e.nome }))]} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Km pavimentados" inputMode="decimal" value={dados.km_pavimentado} className="font-mono tabular-nums" onChange={(e) => campo('km_pavimentado', e.target.value)} />
          <Input label="Km não pavimentados" inputMode="decimal" value={dados.km_nao_pavimentado} className="font-mono tabular-nums" onChange={(e) => campo('km_nao_pavimentado', e.target.value)} />
          <p className="self-end pb-2 text-sm">Total: <strong className="font-mono tabular-nums">{km(Number.isNaN(total) ? 0 : total)}</strong></p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Saída" type="time" value={dados.horario_saida} className="font-mono tabular-nums" onChange={(e) => campo('horario_saida', e.target.value)} />
          <Input label="Chegada à escola" type="time" value={dados.horario_chegada} className="font-mono tabular-nums" onChange={(e) => campo('horario_chegada', e.target.value)} />
          <Input label="Retorno" type="time" value={dados.horario_retorno} className="font-mono tabular-nums" onChange={(e) => campo('horario_retorno', e.target.value)} />
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">Observações</span>
          <Textarea value={dados.observacoes} rows={2} maxLength={2000} onChange={(e) => campo('observacoes', e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={dados.ativa} onCheckedChange={(v) => campo('ativa', v)} aria-label="Rota ativa" />Rota ativa</label>
        <p className="text-xs text-muted-foreground">A rota só aceita empresa com contrato vigente, veículo ativo com vistoria válida e motorista elegível.</p>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};
