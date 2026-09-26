import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowLeft, CalendarPlus, ClipboardCheck, Download, Lock, Pencil, QrCode, Trash2, UserPlus, Users } from 'lucide-react';
import { ActionsMenu, Button, Card, Input, Modal, Select, type ActionsMenuItem } from '@sysgov/ui';
import { ConfirmDialog, DataTable, PageHeader, ScreenState, StatusChip } from '@/components/ui';
import { sysgovApi, type AulaAgendamento, type InscritoTurma, type InstrutorResumo, type ResumoEncerramento, type TurmaDetalhe } from '@sysgov/sdk';
import { useCan } from '@/core/rbac/useCan';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { ChamadaModal } from '../components/ChamadaModal';
import { ErroFormulario } from '../components/ErroFormulario';
import { QrCheckInModal } from '../components/QrCheckInModal';
import { TurmaFormModal } from '../components/TurmaFormModal';
import { UsuarioPicker } from '../components/UsuarioPicker';
import { MODALIDADE, STATUS_INSCRICAO, STATUS_TURMA, baixarBlob, formatarData, formatarDataHora, formatarHora, formatarPercentual } from '../utils/formatos';

interface Props {
  turmaId: number;
  onVoltar: () => void;
}

type Confirmacao =
  | { tipo: 'encerrar' }
  | { tipo: 'cancelar-turma' }
  | { tipo: 'recusar'; inscrito: InscritoTurma }
  | { tipo: 'cancelar-inscricao'; inscrito: InscritoTurma };

/**
 * Operação da turma: agenda de aulas, chamada, QR de check-in, inscritos
 * e encerramento. Instrutor designado vê tudo menos as ações exclusivas do
 * Administrador (editar/cancelar turma, aprovar/recusar, inscrever).
 */
export const TurmaDetalhePage: React.FC<Props> = ({ turmaId, onVoltar }) => {
  const { can } = useCan();
  const administra = can('cursos.manage');
  const [turma, setTurma] = useState<TurmaDetalhe | null>(null);
  const [inscritos, setInscritos] = useState<InscritoTurma[]>([]);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [resumo, setResumo] = useState<ResumoEncerramento | null>(null);
  const [chamada, setChamada] = useState<AulaAgendamento | null>(null);
  const [qr, setQr] = useState<AulaAgendamento | null>(null);
  const [editando, setEditando] = useState(false);
  const [agendando, setAgendando] = useState(false);
  const [inscrevendo, setInscrevendo] = useState(false);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);

  const carregar = useCallback(async () => {
    setErroCarga(null);
    try {
      const [t, i] = await Promise.all([sysgovApi.cursos.getTurma(turmaId), sysgovApi.cursos.listarInscritos(turmaId)]);
      setTurma(t);
      setInscritos(i);
    } catch (e) {
      setErroCarga(getApiErrorMessage(e, 'Não foi possível carregar a turma.'));
    }
  }, [turmaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const executar = useCallback(
    async (acao: () => Promise<unknown>, falha: string, sucesso?: string) => {
      setErro(null);
      setAviso(null);
      try {
        await acao();
        if (sucesso) setAviso(sucesso);
        await carregar();
      } catch (e) {
        setErro(getApiErrorMessage(e, falha));
      }
    },
    [carregar],
  );

  const colunas = useMemo<ColumnDef<InscritoTurma>[]>(
    () => [
      { id: 'nome', header: 'Participante', size: 260, meta: { exportValue: (i) => i.nome, sortValue: (i) => i.nome }, cell: ({ row }) => <span className="block truncate text-left">{row.original.nome}</span> },
      { id: 'email', header: 'E-mail', size: 240, meta: { exportValue: (i) => i.email }, cell: ({ row }) => <span className="block truncate text-left text-muted-foreground">{row.original.email}</span> },
      {
        id: 'status',
        header: 'Situação',
        size: 150,
        meta: { exportValue: (i) => i.status_label },
        cell: ({ row }) => {
          const s = STATUS_INSCRICAO[row.original.status];
          return <StatusChip label={row.original.posicao_fila ? `${s.label} (${row.original.posicao_fila}º)` : s.label} variant={s.variant} />;
        },
      },
      {
        id: 'frequencia',
        header: 'Frequência',
        size: 110,
        meta: { exportValue: (i) => i.frequencia.percentual, sortValue: (i) => i.frequencia.percentual },
        cell: ({ row }) => <span className="font-mono tabular-nums">{formatarPercentual(row.original.frequencia.percentual)}</span>,
      },
      {
        id: 'acoes',
        header: '',
        size: 60,
        cell: ({ row }) => {
          const i = row.original;
          const itens: ActionsMenuItem[] = [];
          if (administra && i.status === 'pendente') {
            itens.push({ key: 'aprovar', label: 'Aprovar', onSelect: () => void executar(() => sysgovApi.cursos.aprovarInscricao(i.id), 'Não foi possível aprovar.') });
            itens.push({ key: 'recusar', label: 'Recusar', onSelect: () => setConfirmacao({ tipo: 'recusar', inscrito: i }) });
          }
          if (administra && ['pendente', 'confirmada', 'lista_espera'].includes(i.status)) {
            itens.push({ key: 'cancelar', label: 'Cancelar inscrição', onSelect: () => setConfirmacao({ tipo: 'cancelar-inscricao', inscrito: i }) });
          }
          return itens.length > 0 ? <ActionsMenu items={itens} triggerLabel={`Ações de ${i.nome}`} /> : null;
        },
      },
    ],
    [administra, executar],
  );

  if (erroCarga) return <ScreenState type="error" title="Erro ao carregar" description={erroCarga} actionLabel="Tentar novamente" onAction={carregar} />;
  if (!turma) return <ScreenState type="loading" title="Carregando turma..." />;

  const aberta = turma.status === 'aberta';
  const agendadas = new Set(turma.agendamentos.map((a) => a.aula_id));

  const acoesTurma: ActionsMenuItem[] = [
    ...(administra && aberta ? [{ key: 'editar', label: 'Editar turma', icon: <Pencil className="h-4 w-4" />, onSelect: () => setEditando(true) }] : []),
    ...(administra && aberta ? [{ key: 'inscrever', label: 'Inscrever participante', icon: <UserPlus className="h-4 w-4" />, onSelect: () => setInscrevendo(true) }] : []),
    ...(administra && aberta ? [{ key: 'cancelar', label: 'Cancelar turma', icon: <Trash2 className="h-4 w-4" />, onSelect: () => setConfirmacao({ tipo: 'cancelar-turma' }) }] : []),
    ...(administra && turma.status === 'encerrada'
      ? [{ key: 'pendentes', label: 'Emitir certificados pendentes', onSelect: () => void executar(async () => {
          const r = await sysgovApi.cursos.emitirCertificadosPendentes(turma.id);
          setAviso(`${r.emitidos} certificado(s) emitido(s); ${r.pendentes} ainda pendente(s) por falta de modelo.`);
        }, 'Não foi possível emitir os certificados.') }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Users className="h-6 w-6" />}
        title={`${turma.curso.titulo} — ${turma.nome}`}
        subtitle={
          <span>
            <span className="font-mono tabular-nums">{formatarData(turma.data_inicio)} a {formatarData(turma.data_fim)}</span> · {MODALIDADE[turma.modalidade]}
            {turma.local ? ` · ${turma.local}` : ''} · instrutores: {turma.instrutores.map((i) => i.name).join(', ')}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusChip label={STATUS_TURMA[turma.status].label} variant={STATUS_TURMA[turma.status].variant} />
            {aberta && (
              <Button onClick={() => setConfirmacao({ tipo: 'encerrar' })}>
                <Lock className="h-4 w-4" /> Encerrar turma
              </Button>
            )}
            {acoesTurma.length > 0 && <ActionsMenu items={acoesTurma} triggerLabel="Ações da turma" />}
            <Button variant="outline" onClick={onVoltar}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          </div>
        }
      />

      <ErroFormulario mensagem={erro} />
      {aviso && <div role="status" className="rounded-lg border border-status-success-border bg-status-success-bg px-3 py-2 text-sm text-status-success">{aviso}</div>}

      {resumo && (
        <Card className="space-y-1 p-4 text-sm">
          <p className="font-semibold text-foreground">Turma encerrada</p>
          <p className="text-muted-foreground">
            <span className="font-mono tabular-nums">{resumo.concluidas}</span> concluíram, <span className="font-mono tabular-nums">{resumo.nao_concluidas}</span> não atingiram a frequência mínima,{' '}
            <span className="font-mono tabular-nums">{resumo.canceladas}</span> inscrições pendentes/na fila canceladas. Certificados emitidos:{' '}
            <span className="font-mono tabular-nums">{resumo.certificados_emitidos}</span>.
          </p>
          {resumo.certificados_pendentes.length > 0 && (
            <p className="text-status-warning">
              {resumo.certificados_pendentes.length} certificado(s) ficaram pendentes porque o órgão não tem modelo de certificado padrão. Cadastre um modelo e use
              “Emitir certificados pendentes”.
            </p>
          )}
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Vagas ocupadas</p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">
            {turma.vagas_ocupadas}/{turma.vagas}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Lista de espera</p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">{turma.lista_espera}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Inscrições</p>
          <p className="font-mono text-sm tabular-nums text-foreground">
            {formatarDataHora(turma.inscricoes_inicio)} a {formatarDataHora(turma.inscricoes_fim)}
          </p>
        </Card>
      </div>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Aulas agendadas</h2>
          {aberta && (
            <Button size="sm" variant="outline" onClick={() => setAgendando(true)}>
              <CalendarPlus className="h-4 w-4" /> Agendar aula
            </Button>
          )}
        </div>
        {turma.agendamentos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma aula agendada. A frequência é calculada sobre as aulas agendadas da turma.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {turma.agendamentos.map((a) => {
              const emAndamento = new Date(a.inicio) <= new Date() && new Date() <= new Date(a.fim);
              const comecou = new Date(a.inicio) <= new Date();
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.aula?.titulo}</p>
                    <p className="font-mono text-xs tabular-nums text-muted-foreground">
                      {formatarDataHora(a.inicio)} – {formatarHora(a.fim)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {emAndamento && aberta && (
                      <Button size="sm" onClick={() => setQr(a)}>
                        <QrCode className="h-4 w-4" /> QR de check-in
                      </Button>
                    )}
                    {comecou && (
                      <Button size="sm" variant="outline" onClick={() => setChamada(a)}>
                        <ClipboardCheck className="h-4 w-4" /> {aberta ? 'Chamada' : 'Ver chamada'}
                      </Button>
                    )}
                    {aberta && !comecou && (
                      <Button size="icon-sm" variant="ghost" aria-label={`Desagendar ${a.aula?.titulo ?? 'aula'}`} onClick={() => void executar(() => sysgovApi.cursos.desagendarAula(a.id), 'Não foi possível desagendar a aula.')}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Inscritos</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void executar(async () => baixarBlob(await sysgovApi.cursos.exportarInscritos(turma.id), `inscritos-turma-${turma.id}.csv`), 'Não foi possível exportar.')}
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>
        <DataTable columns={colunas} data={inscritos} searchable searchPlaceholder="Buscar participante..." emptyText="Nenhuma inscrição ainda." />
      </Card>

      <ChamadaModal agendamento={chamada} somenteLeitura={!aberta} onClose={() => { setChamada(null); void carregar(); }} />
      <QrCheckInModal agendamento={qr} onClose={() => { setQr(null); void carregar(); }} />
      <TurmaFormModal open={editando} cursoId={turma.curso_id} turma={turma} onClose={() => setEditando(false)} onSalvo={() => { setEditando(false); void carregar(); }} />
      <AgendarAulaModal
        open={agendando}
        turma={turma}
        jaAgendadas={agendadas}
        onClose={() => setAgendando(false)}
        onSalvo={() => {
          setAgendando(false);
          void carregar();
        }}
      />
      <InscreverParticipanteModal
        open={inscrevendo}
        turmaId={turma.id}
        onClose={() => setInscrevendo(false)}
        onSalvo={(msg) => {
          setInscrevendo(false);
          setAviso(msg);
          void carregar();
        }}
      />
      <ConfirmDialog
        open={confirmacao !== null}
        onClose={() => setConfirmacao(null)}
        requireReason={confirmacao?.tipo === 'recusar' || confirmacao?.tipo === 'cancelar-turma'}
        destructive={confirmacao?.tipo !== 'encerrar'}
        title={
          confirmacao?.tipo === 'encerrar' ? 'Encerrar turma'
            : confirmacao?.tipo === 'cancelar-turma' ? 'Cancelar turma'
              : confirmacao?.tipo === 'recusar' ? 'Recusar inscrição' : 'Cancelar inscrição'
        }
        description={
          confirmacao?.tipo === 'encerrar'
            ? 'Encerrar apura a frequência de cada inscrição confirmada, emite os certificados de quem atingiu o mínimo e cancela pendentes e lista de espera. Depois disso, presenças e inscrições não podem mais ser alteradas.'
            : confirmacao?.tipo === 'cancelar-turma'
              ? 'Todas as inscrições ativas da turma serão canceladas.'
              : confirmacao && 'inscrito' in confirmacao
                ? `${confirmacao.inscrito.nome} — a vaga liberada passa para o primeiro da lista de espera.`
                : ''
        }
        confirmLabel={confirmacao?.tipo === 'encerrar' ? 'Encerrar turma' : 'Confirmar'}
        reasonPlaceholder="Motivo"
        onConfirm={(motivo) => {
          const alvo = confirmacao;
          setConfirmacao(null);
          if (!alvo) return;
          if (alvo.tipo === 'encerrar') {
            void executar(async () => setResumo(await sysgovApi.cursos.encerrarTurma(turma.id)), 'Não foi possível encerrar a turma.');
          } else if (alvo.tipo === 'cancelar-turma') {
            void executar(() => sysgovApi.cursos.cancelarTurma(turma.id, motivo), 'Não foi possível cancelar a turma.');
          } else if (alvo.tipo === 'recusar') {
            void executar(() => sysgovApi.cursos.recusarInscricao(alvo.inscrito.id, motivo), 'Não foi possível recusar a inscrição.');
          } else {
            void executar(() => sysgovApi.cursos.cancelarInscricao(alvo.inscrito.id, motivo || undefined), 'Não foi possível cancelar a inscrição.');
          }
        }}
      />
    </div>
  );
};

const AgendarAulaModal: React.FC<{
  open: boolean;
  turma: TurmaDetalhe;
  jaAgendadas: Set<number>;
  onClose: () => void;
  onSalvo: () => void;
}> = ({ open, turma, jaAgendadas, onClose, onSalvo }) => {
  const [aulas, setAulas] = useState<{ id: number; titulo: string; duracao_minutos: number }[]>([]);
  const [aulaId, setAulaId] = useState<string>('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setInicio('');
    setFim('');
    sysgovApi.cursos.listarAulas(turma.curso_id).then((lista) => {
      setAulas(lista);
      setAulaId(String(lista.find((a) => !jaAgendadas.has(a.id))?.id ?? lista[0]?.id ?? ''));
    }).catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível carregar as aulas do curso.')));
  }, [open, turma.curso_id, jaAgendadas]);

  // Sugere o fim pela duração da aula.
  const aoMudarInicio = (valor: string) => {
    setInicio(valor);
    const aula = aulas.find((a) => String(a.id) === aulaId);
    if (valor && aula) {
      const d = new Date(valor);
      d.setMinutes(d.getMinutes() + aula.duracao_minutos);
      const pad = (n: number) => String(n).padStart(2, '0');
      setFim(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await sysgovApi.cursos.agendarAula(turma.id, { aula_id: Number(aulaId), inicio, fim });
      onSalvo();
    } catch (err) {
      setErro(getApiErrorMessage(err, 'Não foi possível agendar a aula.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Agendar aula" icon={<CalendarPlus className="h-5 w-5" />} size="md">
      <form onSubmit={salvar} className="space-y-4">
        <ErroFormulario mensagem={erro} />
        <Select
          label="Aula"
          value={aulaId}
          onChange={setAulaId}
          options={aulas.map((a) => ({ value: String(a.id), label: a.titulo, hint: jaAgendadas.has(a.id) ? 'já agendada — será reagendada' : undefined }))}
          emptyText="O curso não tem aulas cadastradas."
        />
        <Input label="Início" type="datetime-local" value={inicio} onChange={(e) => aoMudarInicio(e.target.value)} required className="font-mono tabular-nums" />
        <Input label="Fim" type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} required className="font-mono tabular-nums" />
        <p className="text-xs text-muted-foreground">
          Período da turma: <span className="font-mono tabular-nums">{formatarData(turma.data_inicio)} a {formatarData(turma.data_fim)}</span>
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={salvando} disabled={!aulaId}>
            Agendar
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const InscreverParticipanteModal: React.FC<{
  open: boolean;
  turmaId: number;
  onClose: () => void;
  onSalvo: (mensagem: string) => void;
}> = ({ open, turmaId, onClose, onSalvo }) => {
  const [usuario, setUsuario] = useState<InstrutorResumo[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setUsuario([]);
      setErro(null);
    }
  }, [open]);

  const salvar = async () => {
    if (usuario.length === 0) return;
    setSalvando(true);
    setErro(null);
    try {
      const inscricao = await sysgovApi.cursos.inscreverUsuario(turmaId, usuario[0].id);
      onSalvo(`${usuario[0].name} inscrito(a): ${STATUS_INSCRICAO[inscricao.status].label.toLowerCase()}.`);
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível inscrever.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Inscrever participante"
      icon={<UserPlus className="h-5 w-5" />}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={salvar} isLoading={salvando} disabled={usuario.length === 0}>
            Inscrever
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <ErroFormulario mensagem={erro} />
        <p className="text-sm text-muted-foreground">A inscrição direta dispensa o período de inscrição e a aprovação. Se a turma estiver lotada, entra na lista de espera.</p>
        <UsuarioPicker label="Participante" selecionados={usuario} onChange={setUsuario} unico />
      </div>
    </Modal>
  );
};

export default TurmaDetalhePage;
