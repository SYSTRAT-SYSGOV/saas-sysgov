import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, ClipboardList, FileText, HelpCircle, ImagePlus, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { ActionsMenu, Button, Card, type ActionsMenuItem } from '@sysgov/ui';
import { ConfirmDialog, EmptyState, PageHeader, ScreenState, StatusChip, Tabs, type TabsItem } from '@/components/ui';
import { sysgovApi, type Aula, type CursoDetalhe, type StatusCurso } from '@sysgov/sdk';
import { useCan } from '@/core/rbac/useCan';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { AulaFormModal } from '../components/AulaFormModal';
import { AvaliacoesTab } from '../components/AvaliacoesTab';
import { CursoFormModal } from '../components/CursoFormModal';
import { ErroFormulario } from '../components/ErroFormulario';
import { MateriaisTab } from '../components/MateriaisTab';
import { QuestoesTab } from '../components/QuestoesTab';
import { TurmaFormModal } from '../components/TurmaFormModal';
import { MODALIDADE, STATUS_CURSO, STATUS_TURMA, TIPO_CURSO, formatarCargaHoraria, formatarData, formatarNota } from '../utils/formatos';

interface Props {
  cursoId: number;
  onVoltar: () => void;
  onAbrirTurma: (id: number) => void;
}

type AbaCurso = 'geral' | 'materiais' | 'questoes' | 'avaliacoes';

const PROXIMO_STATUS: Partial<Record<StatusCurso, { status: StatusCurso; label: string }>> = {
  rascunho: { status: 'publicado', label: 'Publicar' },
  publicado: { status: 'encerrado', label: 'Encerrar curso' },
};

export const CursoDetalhePage: React.FC<Props> = ({ cursoId, onVoltar, onAbrirTurma }) => {
  const { can } = useCan();
  const administra = can('cursos.manage');
  const [curso, setCurso] = useState<CursoDetalhe | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [aulaEmEdicao, setAulaEmEdicao] = useState<Aula | null | undefined>(undefined);
  const [novaTurma, setNovaTurma] = useState(false);
  const [aba, setAba] = useState<AbaCurso>('geral');
  const [confirmarExclusao, setConfirmarExclusao] = useState<{ tipo: 'curso' } | { tipo: 'aula'; aula: Aula } | null>(null);
  const inputCapa = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    setErroCarga(null);
    try {
      setCurso(await sysgovApi.cursos.getCurso(cursoId));
    } catch (e) {
      setErroCarga(getApiErrorMessage(e, 'Não foi possível carregar o curso.'));
    }
  }, [cursoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const executar = async (acao: () => Promise<unknown>, falha: string) => {
    setErro(null);
    try {
      await acao();
      await carregar();
    } catch (e) {
      setErro(getApiErrorMessage(e, falha));
    }
  };

  if (erroCarga) return <ScreenState type="error" title="Erro ao carregar" description={erroCarga} actionLabel="Tentar novamente" onAction={carregar} />;
  if (!curso) return <ScreenState type="loading" title="Carregando curso..." />;

  const proximo = PROXIMO_STATUS[curso.status];
  const editavel = administra && curso.status !== 'encerrado';
  const podeNovaTurma = editavel && !(curso.tipo === 'evento' && curso.turmas.some((t) => t.status !== 'cancelada'));

  // Materiais, questões e avaliações são do Administrador (o servidor confere; a aba só some da tela).
  const abas: TabsItem<AbaCurso>[] = [
    { key: 'geral', label: 'Aulas e turmas', icon: <Layers className="h-4 w-4" /> },
    ...(administra
      ? [
          { key: 'materiais' as const, label: 'Materiais', icon: <FileText className="h-4 w-4" /> },
          { key: 'questoes' as const, label: 'Questões', icon: <HelpCircle className="h-4 w-4" /> },
          { key: 'avaliacoes' as const, label: 'Avaliações', icon: <ClipboardList className="h-4 w-4" /> },
        ]
      : []),
  ];

  const acoes: ActionsMenuItem[] = [
    ...(editavel ? [{ key: 'editar', label: 'Editar dados', icon: <Pencil className="h-4 w-4" />, onSelect: () => setEditando(true) }] : []),
    ...(editavel ? [{ key: 'capa', label: curso.capa_url ? 'Trocar capa' : 'Enviar capa', icon: <ImagePlus className="h-4 w-4" />, onSelect: () => inputCapa.current?.click() }] : []),
    ...(administra ? [{ key: 'excluir', label: 'Excluir curso', icon: <Trash2 className="h-4 w-4" />, onSelect: () => setConfirmarExclusao({ tipo: 'curso' }) }] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BookOpen className="h-6 w-6" />}
        title={curso.titulo}
        badge={TIPO_CURSO[curso.tipo]}
        subtitle={
          <span>
            <span className="font-mono tabular-nums">{formatarCargaHoraria(curso.carga_horaria_minutos)}</span> · frequência mínima{' '}
            <span className="font-mono tabular-nums">{curso.frequencia_minima}%</span>
            {curso.nota_minima !== null && (
              <>
                {' '}· nota mínima <span className="font-mono tabular-nums">{formatarNota(curso.nota_minima)}</span>
              </>
            )}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusChip label={STATUS_CURSO[curso.status].label} variant={STATUS_CURSO[curso.status].variant} />
            {administra && proximo && (
              <Button onClick={() => executar(() => sysgovApi.cursos.alterarStatusCurso(curso.id, proximo.status), 'Não foi possível alterar o status.')}>
                {proximo.label}
              </Button>
            )}
            {acoes.length > 0 && <ActionsMenu items={acoes} triggerLabel="Ações do curso" />}
            <Button variant="outline" onClick={onVoltar}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          </div>
        }
      />
      <input
        ref={inputCapa}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        aria-label="Arquivo da capa"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo) void executar(() => sysgovApi.cursos.definirCapa(curso.id, arquivo), 'Não foi possível enviar a capa.');
          e.target.value = '';
        }}
      />

      <ErroFormulario mensagem={erro} />

      {abas.length > 1 && <Tabs items={abas} value={aba} onChange={setAba} />}

      {aba === 'materiais' && administra && <MateriaisTab cursoId={curso.id} aulas={curso.aulas} editavel={editavel} />}
      {aba === 'questoes' && administra && <QuestoesTab cursoId={curso.id} editavel={editavel} />}
      {aba === 'avaliacoes' && administra && <AvaliacoesTab cursoId={curso.id} aulas={curso.aulas} editavel={editavel} evento={curso.tipo === 'evento'} />}

      {aba === 'geral' && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="space-y-3 p-4 lg:col-span-1">
              {curso.capa_url && <img src={curso.capa_url} alt="Capa do curso" className="w-full rounded-lg object-cover" />}
              <p className="whitespace-pre-line text-sm text-muted-foreground">{curso.descricao || 'Sem descrição.'}</p>
              {curso.formacoes.length > 0 && (
                <p className="text-xs text-muted-foreground">Faz parte de: {curso.formacoes.map((f) => f.titulo).join(', ')}</p>
              )}
            </Card>

            <Card className="space-y-3 p-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Aulas</h2>
                {editavel && (
                  <Button size="sm" variant="outline" onClick={() => setAulaEmEdicao(null)}>
                    <Plus className="h-4 w-4" /> Nova aula
                  </Button>
                )}
              </div>
              {curso.aulas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma aula cadastrada. As aulas do curso são agendadas em cada turma.</p>
              ) : (
                <ol className="divide-y divide-border rounded-lg border border-border">
                  {curso.aulas.map((aula) => (
                    <li key={aula.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          <span className="font-mono tabular-nums text-muted-foreground">{aula.ordem}.</span> {aula.titulo}
                        </p>
                        <p className="font-mono text-xs tabular-nums text-muted-foreground">{formatarCargaHoraria(aula.duracao_minutos)}</p>
                      </div>
                      {editavel && (
                        <div className="flex gap-1">
                          <Button size="icon-sm" variant="ghost" aria-label={`Editar ${aula.titulo}`} onClick={() => setAulaEmEdicao(aula)}>
                            <Pencil />
                          </Button>
                          <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${aula.titulo}`} onClick={() => setConfirmarExclusao({ tipo: 'aula', aula })}>
                            <Trash2 />
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Turmas</h2>
              {podeNovaTurma && (
                <Button size="sm" onClick={() => setNovaTurma(true)}>
                  <Plus className="h-4 w-4" /> Nova turma
                </Button>
              )}
            </div>
            {curso.turmas.length === 0 ? (
              <EmptyState title="Nenhuma turma" description={curso.tipo === 'evento' ? 'Crie a turma do evento para abrir as inscrições.' : 'Crie uma turma para abrir inscrições.'} />
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {curso.turmas.map((turma) => (
                  <li key={turma.id}>
                    <Button variant="ghost" className="h-auto w-full justify-between px-3 py-2" onClick={() => onAbrirTurma(turma.id)}>
                      <span className="text-left">
                        <span className="block text-sm font-medium text-foreground">{turma.nome}</span>
                        <span className="block font-mono text-xs tabular-nums text-muted-foreground">
                          {formatarData(turma.data_inicio)} a {formatarData(turma.data_fim)} · {MODALIDADE[turma.modalidade]} · {turma.vagas} vagas
                        </span>
                      </span>
                      <StatusChip label={STATUS_TURMA[turma.status].label} variant={STATUS_TURMA[turma.status].variant} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      <CursoFormModal
        open={editando}
        curso={curso}
        onClose={() => setEditando(false)}
        onSalvo={() => {
          setEditando(false);
          void carregar();
        }}
      />
      <AulaFormModal
        open={aulaEmEdicao !== undefined}
        cursoId={curso.id}
        aula={aulaEmEdicao}
        onClose={() => setAulaEmEdicao(undefined)}
        onSalvo={() => {
          setAulaEmEdicao(undefined);
          void carregar();
        }}
      />
      <TurmaFormModal
        open={novaTurma}
        cursoId={curso.id}
        onClose={() => setNovaTurma(false)}
        onSalvo={(turma) => {
          setNovaTurma(false);
          onAbrirTurma(turma.id);
        }}
      />
      <ConfirmDialog
        open={confirmarExclusao !== null}
        onClose={() => setConfirmarExclusao(null)}
        requireReason={false}
        title={confirmarExclusao?.tipo === 'aula' ? 'Excluir aula' : 'Excluir curso'}
        description={
          confirmarExclusao?.tipo === 'aula'
            ? `Excluir a aula "${confirmarExclusao.aula.titulo}"? Os agendamentos dela nas turmas também são removidos.`
            : 'Excluir este curso? Só é possível enquanto ninguém se inscreveu; depois disso, encerre o curso.'
        }
        confirmLabel="Excluir"
        onConfirm={() => {
          const alvo = confirmarExclusao;
          setConfirmarExclusao(null);
          if (alvo?.tipo === 'aula') {
            void executar(() => sysgovApi.cursos.excluirAula(alvo.aula.id), 'Não foi possível excluir a aula.');
          } else if (alvo?.tipo === 'curso') {
            setErro(null);
            sysgovApi.cursos
              .excluirCurso(curso.id)
              .then(onVoltar)
              .catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível excluir o curso.')));
          }
        }}
      />
    </div>
  );
};

export default CursoDetalhePage;
