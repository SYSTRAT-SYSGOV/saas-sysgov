import React, { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Search, UserMinus } from 'lucide-react';
import { ActionsMenu, Badge, Button, DataTable, Input, Modal, Select, Switch, Textarea } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { useFormValidationModal } from '@/lib/useFormValidationModal';
import { mensagemDeErro, transporteApi, type Alocacao, type AlunoBusca, type ItemItinerario, type Ocupacao, type Opcoes, type Rota } from '../api';
import { data, ROTULO_AVISO, ROTULO_FAIXA, rotuloDe, textoOcupacao } from '../formato';

const NENHUM = '0';
const textoOuNulo = (valor: string): string | null => (valor.trim() === '' ? null : valor.trim());
const hoje = (): string => new Date().toISOString().slice(0, 10);

/** Faixa de ocupação em texto e cor (a cor nunca é a única pista). */
export const SeloOcupacao: React.FC<{ ocupacao: Ocupacao }> = ({ ocupacao }) => {
  if (!ocupacao.calculavel || ocupacao.faixa === null) return <Badge variant="secondary">Sem veículo</Badge>;
  const classe = ocupacao.faixa === 'verde'
    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
    : ocupacao.faixa === 'amarelo' ? 'border-amber-600 text-amber-700 dark:text-amber-400' : 'border-red-600 text-red-700 dark:text-red-400';
  return <Badge variant="outline" className={classe}>{rotuloDe(ROTULO_FAIXA, ocupacao.faixa)}</Badge>;
};

/** Alunos da rota: ocupação, alocar, alterar e encerrar. A observação da necessidade especial só aparece ao abrir a alocação. */
export const AlunosDaRota: React.FC<{ rota: Rota; opcoes: Opcoes; avisar: Toast; aoFechar: () => void }> = ({ rota, opcoes, avisar, aoFechar }) => {
  const [encerradas, setEncerradas] = useState(false);
  const carga = useCarga(() => transporteApi.alunosDaRota(rota.id, encerradas), [encerradas]);
  const [alocando, setAlocando] = useState(false);
  const [editando, setEditando] = useState<Alocacao | null>(null);
  const [encerrando, setEncerrando] = useState<Alocacao | null>(null);
  const gerenciar = opcoes.permissoes.gerenciar_alocacoes;
  const ocupacao = carga.dados?.ocupacao ?? rota.ocupacao;

  const colunas = useMemo<ColumnDef<Alocacao, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => gerenciar && row.original.ativa ? (
        <div className="flex justify-center">
          <ActionsMenu
            triggerLabel={`Ações de ${row.original.aluno?.nome ?? 'aluno'}`}
            items={[
              { key: 'editar', label: 'Editar', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => setEditando(row.original) },
              { key: 'encerrar', label: 'Encerrar', icon: <UserMinus className="h-3.5 w-3.5" />, onSelect: () => setEncerrando(row.original) },
            ]}
          />
        </div>
      ) : null,
    },
    { id: 'aluno', header: 'Aluno', accessorFn: (a) => a.aluno?.nome ?? '', meta: { exportHeader: 'Aluno', exportValue: (a) => a.aluno?.nome ?? '' } },
    { id: 'escola', header: 'Escola / turma', accessorFn: (a) => [a.aluno?.escola, a.aluno?.turma].filter(Boolean).join(' — '), meta: { exportHeader: 'Escola / turma', exportValue: (a) => [a.aluno?.escola, a.aluno?.turma].filter(Boolean).join(' — ') } },
    { id: 'parada', header: 'Parada', accessorFn: (a) => a.parada?.nome ?? '', meta: { exportHeader: 'Parada', exportValue: (a) => a.parada?.nome ?? '' } },
    { id: 'inicio', header: 'Desde', accessorKey: 'data_inicio', cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{data(row.original.data_inicio)}</span> },
    { id: 'poder', header: 'Poder público', accessorFn: (a) => a.poder_publico_rotulo ?? '—', meta: { exportHeader: 'Poder público', exportValue: (a) => a.poder_publico_rotulo ?? '' } },
    {
      id: 'situacao',
      header: 'Situação',
      accessorFn: (a) => (a.ativa ? 'Ativa' : 'Encerrada'),
      cell: ({ row }) => {
        const a = row.original;
        return (
          <span className="flex flex-wrap items-center gap-1">
            {a.ativa ? <Badge variant="outline">Ativa</Badge> : <Badge variant="secondary">Encerrada em {data(a.data_fim)}</Badge>}
            {a.necessidade_especial && <Badge variant="outline">Necessidade especial</Badge>}
            {a.justificativa_excesso && <Badge variant="destructive">Acima da capacidade</Badge>}
            {a.avisos.map((v) => <Badge key={v} variant="secondary">{rotuloDe(ROTULO_AVISO, v)}</Badge>)}
          </span>
        );
      },
      meta: { exportHeader: 'Situação', exportValue: (a) => (a.ativa ? 'Ativa' : `Encerrada em ${data(a.data_fim)}`) },
    },
  ], [gerenciar]);

  return (
    <Modal open onClose={aoFechar} title={`Alunos — ${rota.nome}`} size="xl" footer={<Button variant="outline" onClick={aoFechar}>Fechar</Button>}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm" role="status">
            Ocupação: <strong className="font-mono tabular-nums">{textoOcupacao(ocupacao)}</strong> <SeloOcupacao ocupacao={ocupacao} />
          </p>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><Switch checked={encerradas} onCheckedChange={setEncerradas} aria-label="Mostrar encerradas" />Mostrar encerradas</label>
            {gerenciar && <Button onClick={() => setAlocando(true)}><Plus className="mr-1 h-4 w-4" />Alocar aluno</Button>}
          </div>
        </div>
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && <DataTable columns={colunas} data={carga.dados.data} emptyText="Nenhum aluno alocado nesta rota." exportable exportFileName="transporte-alunos-da-rota" exportTitle={`Transporte Escolar — Alunos da rota ${rota.nome}`} />}
      </div>
      {(alocando || editando) && (
        <AlocacaoModal rota={rota} opcoes={opcoes} ocupacao={ocupacao} alocacao={editando} aoFechar={() => { setAlocando(false); setEditando(null); }}
          aoSalvar={() => { setAlocando(false); setEditando(null); avisar({ type: 'success', title: 'Alocação', message: 'Alocação salva.' }); void carga.recarregar(); }} />
      )}
      {encerrando && (
        <EncerrarModal rota={rota} alocacao={encerrando} aoFechar={() => setEncerrando(null)}
          aoEncerrar={() => { setEncerrando(null); avisar({ type: 'success', title: 'Alocação', message: 'Alocação encerrada.' }); void carga.recarregar(); }} />
      )}
    </Modal>
  );
};

const AlocacaoModal: React.FC<{ rota: Rota; opcoes: Opcoes; ocupacao: Ocupacao; alocacao: Alocacao | null; aoFechar: () => void; aoSalvar: () => void }> = ({ rota, opcoes, ocupacao, alocacao, aoFechar, aoSalvar }) => {
  const [itinerario, setItinerario] = useState<ItemItinerario[]>([]);
  const [busca, setBusca] = useState('');
  const [achados, setAchados] = useState<AlunoBusca[] | null>(null);
  const [aluno, setAluno] = useState<number | null>(null);
  const [dados, setDados] = useState({
    parada: String(alocacao?.parada?.id ?? NENHUM),
    rural: alocacao?.usa_transporte_rural ?? true,
    poder: String(alocacao?.poder_publico ?? NENHUM),
    necessidade: alocacao?.necessidade_especial ?? false,
    observacaoNecessidade: '',
    curricular: alocacao?.atendimento_curricular ?? true,
    mediacao: alocacao?.mediacao_didatica ?? 'presencial',
    pais: alocacao?.pais_residencia ?? 'BR',
    observacoes: alocacao?.observacoes ?? '',
    justificativa: '',
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { modal: modalValidacao, invalidar, tratarErro } = useFormValidationModal();
  const campo = <K extends keyof typeof dados>(chave: K, valor: (typeof dados)[K]) => setDados((d) => ({ ...d, [chave]: valor }));
  const lotada = ocupacao.calculavel && ocupacao.capacidade !== null && ocupacao.alocados >= ocupacao.capacidade;

  useEffect(() => { void transporteApi.itinerario(rota.id).then(setItinerario).catch(() => setItinerario([])); }, [rota.id]);
  // Na edição, a observação sensível vem da ficha (a leitura é auditada no servidor).
  useEffect(() => {
    if (!alocacao) return;
    void transporteApi.alocacao(rota.id, alocacao.id).then((f) => setDados((d) => ({ ...d, observacaoNecessidade: f.necessidade_observacao ?? '' }))).catch(() => undefined);
  }, [alocacao, rota.id]);

  const procurar = async () => {
    if (busca.trim().length < 2) return;
    try { setAchados(await transporteApi.buscarAlunos(rota.id, busca.trim())); } catch (e) { setErro(mensagemDeErro(e)); }
  };

  const salvar = async () => {
    setErro(null);
    const faltando: [string, string][] = [];
    if (!alocacao && aluno === null) faltando.push(['Aluno', 'Busque e escolha o aluno.']);
    if (dados.parada === NENHUM) faltando.push(['Parada', 'Escolha a parada do itinerário.']);
    if (!alocacao && lotada && opcoes.permissoes.exceder_capacidade && !dados.justificativa.trim()) faltando.push(['Justificativa', 'A rota está lotada: informe a justificativa para alocar acima da capacidade.']);
    if (faltando.length > 0) return invalidar(faltando);
    const corpo = {
      parada_id: Number(dados.parada),
      usa_transporte_rural: dados.rural,
      poder_publico: dados.poder === NENHUM ? null : Number(dados.poder),
      necessidade_especial: dados.necessidade,
      necessidade_observacao: dados.necessidade ? textoOuNulo(dados.observacaoNecessidade) : null,
      atendimento_curricular: dados.curricular,
      mediacao_didatica: dados.mediacao,
      pais_residencia: dados.pais.trim().toUpperCase() || 'BR',
      observacoes: textoOuNulo(dados.observacoes),
    };
    setSalvando(true);
    try {
      if (alocacao) await transporteApi.atualizarAlocacao(rota.id, alocacao.id, corpo);
      else await transporteApi.alocar(rota.id, { ...corpo, aluno_id: aluno as number, justificativa_excesso: textoOuNulo(dados.justificativa) });
      aoSalvar();
    } catch (e) {
      if (!tratarErro(e)) setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open onClose={aoFechar} title={alocacao ? `Alocação de ${alocacao.aluno?.nome ?? 'aluno'}` : 'Alocar aluno'} size="lg"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void salvar()} isLoading={salvando}>Salvar</Button></>}>
      {modalValidacao}
      <div className="space-y-4">
        {!alocacao && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Aluno *</legend>
            <div className="flex items-end gap-2">
              <Input label="Buscar por nome ou CGM" value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void procurar(); } }} />
              <Button variant="outline" onClick={() => void procurar()}><Search className="mr-1 h-4 w-4" />Buscar</Button>
            </div>
            {achados && achados.length === 0 && <p className="text-sm text-muted-foreground">Nenhum aluno ativo do ano letivo {rota.ano_letivo} encontrado.</p>}
            {achados && achados.map((a) => (
              <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded border border-border px-3 py-2 text-sm">
                <input type="radio" name="aluno" checked={aluno === a.id} onChange={() => setAluno(a.id)} />
                <span className="flex-1">{a.nome}</span>
                <span className="text-xs text-muted-foreground">{[a.escola, a.turma, a.turno].filter(Boolean).join(' — ')}</span>
              </label>
            ))}
          </fieldset>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Parada *" value={dados.parada} onChange={(v) => campo('parada', v)}
            options={[{ value: NENHUM, label: 'Selecione…' }, ...itinerario.map((i) => ({ value: String(i.parada.id), label: `${i.ordem}. ${i.parada.nome}` }))]} />
          <Select label="Poder público responsável" value={dados.poder} onChange={(v) => campo('poder', v)}
            options={[{ value: NENHUM, label: 'Não informado' }, ...opcoes.poderes_publicos.map((p) => ({ value: String(p.valor), label: p.rotulo }))]} />
          <Select label="Mediação didática" value={dados.mediacao} onChange={(v) => campo('mediacao', v)} options={opcoes.mediacoes.map((m) => ({ value: m.valor, label: m.rotulo }))} />
          <Input label="País de residência" value={dados.pais} maxLength={2} className="uppercase" onChange={(e) => campo('pais', e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm"><Switch checked={dados.rural} onCheckedChange={(v) => campo('rural', v)} aria-label="Usa transporte rural" />Usa transporte rural</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={dados.curricular} onCheckedChange={(v) => campo('curricular', v)} aria-label="Atendimento curricular" />Atendimento curricular</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={dados.necessidade} onCheckedChange={(v) => campo('necessidade', v)} aria-label="Necessidade especial" />Precisa de transporte adaptado</label>
        </div>
        {dados.necessidade && (
          <label className="block space-y-1 text-sm">
            <span className="font-semibold">Observação da necessidade</span>
            <Textarea value={dados.observacaoNecessidade} rows={2} maxLength={2000} onChange={(e) => campo('observacaoNecessidade', e.target.value)} />
            <span className="text-xs text-muted-foreground">Dado de saúde: fica restrito a quem gerencia alocações e não sai em listagens nem exportações.</span>
          </label>
        )}
        {!alocacao && lotada && (
          opcoes.permissoes.exceder_capacidade
            ? <Input label="Justificativa para alocar acima da capacidade *" value={dados.justificativa} maxLength={1000} onChange={(e) => campo('justificativa', e.target.value)} />
            : <p role="alert" className="text-sm text-destructive">A rota está lotada ({ocupacao.alocados} de {ocupacao.capacidade}). Só quem tem a permissão de exceção de capacidade pode alocar mais alunos.</p>
        )}
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};

const EncerrarModal: React.FC<{ rota: Rota; alocacao: Alocacao; aoFechar: () => void; aoEncerrar: () => void }> = ({ rota, alocacao, aoFechar, aoEncerrar }) => {
  const [fim, setFim] = useState(hoje());
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { modal: modalValidacao, invalidar, tratarErro } = useFormValidationModal();

  const encerrar = async () => {
    setErro(null);
    const faltando: [string, string][] = [];
    if (!fim) faltando.push(['Data de término', 'Informe a data de término.']);
    if (!motivo.trim()) faltando.push(['Motivo', 'Informe o motivo do encerramento.']);
    if (faltando.length > 0) return invalidar(faltando);
    setSalvando(true);
    try {
      await transporteApi.encerrarAlocacao(rota.id, alocacao.id, { data_fim: fim, motivo: motivo.trim() });
      aoEncerrar();
    } catch (e) {
      if (!tratarErro(e)) setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open onClose={aoFechar} title={`Encerrar alocação de ${alocacao.aluno?.nome ?? 'aluno'}`} size="md"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void encerrar()} isLoading={salvando}>Encerrar</Button></>}>
      {modalValidacao}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Início em {data(alocacao.data_inicio)}. O registro continua no histórico e a vaga é liberada.</p>
        <Input label="Data de término *" type="date" value={fim} className="font-mono tabular-nums" onChange={(e) => setFim(e.target.value)} />
        <Input label="Motivo *" value={motivo} maxLength={255} onChange={(e) => setMotivo(e.target.value)} />
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};
