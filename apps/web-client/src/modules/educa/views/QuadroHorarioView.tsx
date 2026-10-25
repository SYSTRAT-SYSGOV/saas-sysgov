import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal,
  Input,
} from '@sysgov/ui';
import {
  Clock,
  Calendar,
  UserCheck,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  Eye,
  BookOpen,
} from 'lucide-react';
import { useEduca } from '../context/EducaContext';
import { apiClient } from '@/core/api/client';

interface TurmaOpcao {
  id: string;
  nome: string;
  turno: string;
  matrix_id?: string;
}

interface SlotTempo {
  id: string;
  numero_tempo: number;
  hora_inicio: string;
  hora_fim: string;
  tipo: string;
  descricao?: string | null;
}

interface AulaAlocada {
  id: string;
  timetable_slot_id: string;
  dia_semana: number;
  curriculum_component_id: string;
  componente_nome?: string;
  teacher_employee_id: string;
  professor_titular_nome?: string;
  substitute_employee_id?: string | null;
  professor_substituto_nome?: string | null;
  substituicao_inicio?: string | null;
  substituicao_fim?: string | null;
  substituicao_motivo?: string | null;
}

interface QuadroDetalhado {
  id: string;
  nome: string;
  turno: string;
  ativo: boolean;
  data_inicio_vigencia: string;
  data_fim_vigencia?: string | null;
  slots: SlotTempo[];
  aulas: AulaAlocada[];
}

interface ComponenteOpcao {
  id: string;
  nome: string;
}

interface DocenteOpcao {
  id: string;
  nome: string;
}

const DIAS_SEMANA = [
  { num: 2, label: 'Segunda-feira' },
  { num: 3, label: 'Terça-feira' },
  { num: 4, label: 'Quarta-feira' },
  { num: 5, label: 'Quinta-feira' },
  { num: 6, label: 'Sexta-feira' },
  { num: 7, label: 'Sábado' },
];

export const QuadroHorarioView: React.FC = () => {
  const { escolaAtiva, anoLetivoAtivo } = useEduca();
  const [turmas, setTurmas] = useState<TurmaOpcao[]>([]);
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState<string>('');
  const [quadro, setQuadro] = useState<QuadroDetalhado | null>(null);
  const [carregando, setCarregando] = useState<boolean>(false);

  // Componentes e Docentes para alocação
  const [componentes, setComponentes] = useState<ComponenteOpcao[]>([]);
  const [docentes, setDocentes] = useState<DocenteOpcao[]>([]);

  // Modais
  const [modalAlocacaoAberta, setModalAlocacaoAberta] = useState<boolean>(false);
  const [modalQuadroAberta, setModalQuadroAberta] = useState<boolean>(false);
  const [slotAlvo, setSlotAlvo] = useState<{ slotId: string; diaSemana: number; tempoLabel: string } | null>(null);

  // Form states
  const [formComponenteId, setFormComponenteId] = useState<string>('');
  const [formDocenteId, setFormDocenteId] = useState<string>('');
  const [formSubstitutoId, setFormSubstitutoId] = useState<string>('');
  const [erroAlocacao, setErroAlocacao] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Form Novo Quadro
  const [novoQuadroNome, setNovoQuadroNome] = useState<string>('Grade Oficial 2026');
  const [novoQuadroTurno, setNovoQuadroTurno] = useState<string>('matutino');
  const [novoQuadroInicio, setNovoQuadroInicio] = useState<string>('2026-02-05');

  // Carrega turmas da escola ativa
  useEffect(() => {
    if (!escolaAtiva) return;
    apiClient
      .get(`/educa/core/turmas`, {
        params: { school_id: escolaAtiva.id, academic_year_id: anoLetivoAtivo },
      })
      .then((res) => {
        const lista = res.data?.data || [];
        setTurmas(lista);
        if (lista.length > 0 && !turmaSelecionadaId) {
          setTurmaSelecionadaId(lista[0].id);
        }
      })
      .catch(() => setTurmas([]));

    // Carrega docentes e componentes da rede
    apiClient
      .get('/educa/servidores/servidores')
      .then((res) => {
        const docs = (res.data?.data || []).map((s: any) => ({
          id: s.id,
          nome: s.pessoa?.nome || 'Servidor',
        }));
        setDocentes(docs);
      })
      .catch(() => setDocentes([]));

    apiClient
      .get('/educa/core/componentes-curriculares')
      .then((res) => {
        const comps = (res.data?.data || []).map((c: any) => ({
          id: c.id,
          nome: c.nome,
        }));
        setComponentes(comps);
      })
      .catch(() => setComponentes([]));
  }, [escolaAtiva, anoLetivoAtivo]);

  // Carrega o quadro da turma selecionada
  const carregarQuadro = () => {
    if (!turmaSelecionadaId) return;
    setCarregando(true);
    apiClient
      .get(`/educa/core/turmas/${turmaSelecionadaId}/quadro-horario`)
      .then((res) => {
        setQuadro(res.data?.data || null);
      })
      .catch(() => setQuadro(null))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregarQuadro();
  }, [turmaSelecionadaId]);

  const abrirModalAlocacao = (slot: SlotTempo, diaSemana: number) => {
    setSlotAlvo({
      slotId: slot.id,
      diaSemana,
      tempoLabel: `${slot.numero_tempo}º Tempo (${slot.hora_inicio} - ${slot.hora_fim})`,
    });
    setFormComponenteId('');
    setFormDocenteId('');
    setFormSubstitutoId('');
    setErroAlocacao(null);
    setModalAlocacaoAberta(true);
  };

  const handleSalvarAlocacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotAlvo || !turmaSelecionadaId) return;

    setSalvando(true);
    setErroAlocacao(null);

    try {
      await apiClient.post(`/educa/core/turmas/${turmaSelecionadaId}/quadro-horario/aulas`, {
        timetable_slot_id: slotAlvo.slotId,
        dia_semana: slotAlvo.diaSemana,
        curriculum_component_id: formComponenteId,
        teacher_employee_id: formDocenteId,
        substitute_employee_id: formSubstitutoId || undefined,
      });

      setMensagemSucesso('Aula alocada com sucesso!');
      setModalAlocacaoAberta(false);
      carregarQuadro();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Falha ao alocar aula. Verifique choque de horários.';
      setErroAlocacao(msg);
    } finally {
      setSalvando(false);
    }
  };

  const handleRemoverAula = async (aulaId: string) => {
    if (!turmaSelecionadaId) return;
    try {
      await apiClient.delete(`/educa/core/turmas/${turmaSelecionadaId}/quadro-horario/aulas/${aulaId}`);
      setMensagemSucesso('Aula removida com sucesso!');
      carregarQuadro();
    } catch {
      // erro
    }
  };

  const handleCriarQuadroPadrao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turmaSelecionadaId) return;

    setSalvando(true);
    try {
      await apiClient.post(`/educa/core/turmas/${turmaSelecionadaId}/quadro-horario`, {
        nome: novoQuadroNome,
        turno: novoQuadroTurno,
        data_inicio_vigencia: novoQuadroInicio,
      });

      // Configura slots padrão (5 tempos com intervalo)
      await apiClient.put(`/educa/core/turmas/${turmaSelecionadaId}/quadro-horario/slots`, {
        slots: [
          { numero_tempo: 1, hora_inicio: '07:30', hora_fim: '08:20', tipo: 'aula', descricao: '1º Tempo' },
          { numero_tempo: 2, hora_inicio: '08:20', hora_fim: '09:10', tipo: 'aula', descricao: '2º Tempo' },
          { numero_tempo: 3, hora_inicio: '09:10', hora_fim: '10:00', tipo: 'aula', descricao: '3º Tempo' },
          { numero_tempo: 4, hora_inicio: '10:00', hora_fim: '10:20', tipo: 'intervalo', descricao: 'Recreio' },
          { numero_tempo: 5, hora_inicio: '10:20', hora_fim: '11:10', tipo: 'aula', descricao: '4º Tempo' },
          { numero_tempo: 6, hora_inicio: '11:10', hora_fim: '12:00', tipo: 'aula', descricao: '5º Tempo' },
        ],
      });

      setModalQuadroAberta(false);
      setMensagemSucesso('Quadro de horários e matriz de tempos configurados com sucesso!');
      carregarQuadro();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Falha ao criar quadro.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      {mensagemSucesso && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-md flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{mensagemSucesso}</span>
          </div>
          <button onClick={() => setMensagemSucesso(null)} className="text-emerald-700 hover:underline">
            Fechar
          </button>
        </div>
      )}

      {/* Barra Superior de Seleção de Turma */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-700" />
            <div>
              <h3 className="text-sm font-semibold text-gov-text">Quadro de Horários e Grade Semanal</h3>
              <p className="text-xs text-gov-text-muted">
                Distribuição de componentes curriculares e docentes com validação anti-choque
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gov-text">Turma:</label>
            <select
              value={turmaSelecionadaId}
              onChange={(e) => setTurmaSelecionadaId(e.target.value)}
              className="text-xs border border-gov-border rounded-md px-3 py-1.5 bg-white text-gov-text font-medium"
            >
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({t.turno})
                </option>
              ))}
            </select>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalQuadroAberta(true)}
              className="text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Quadro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grade Semanal */}
      {quadro ? (
        <Card>
          <CardHeader className="border-b border-gov-border pb-3 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold text-gov-text flex items-center gap-2">
                <span>{quadro.nome}</span>
                <Badge variant="outline" className="text-xs font-mono capitalize">
                  {quadro.turno}
                </Badge>
                {quadro.ativo && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                    Vigente
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs font-mono text-gov-text-muted">
                Vigência: {quadro.data_inicio_vigencia} {quadro.data_fim_vigencia ? `até ${quadro.data_fim_vigencia}` : ''}
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40 text-xs">Tempo / Horário</TableHead>
                  {DIAS_SEMANA.map((dia) => (
                    <TableHead key={dia.num} className="text-xs text-center font-semibold">
                      {dia.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {quadro.slots.map((slot) => {
                  const isIntervalo = slot.tipo !== 'aula';

                  return (
                    <TableRow key={slot.id} className={isIntervalo ? 'bg-amber-50/60' : ''}>
                      <TableCell className="font-mono text-xs font-medium text-gov-text">
                        <div className="font-semibold">{slot.numero_tempo}º Tempo</div>
                        <div className="text-gov-text-muted tabular-nums">
                          {slot.hora_inicio} - {slot.hora_fim}
                        </div>
                        {slot.descricao && (
                          <div className="text-[10px] text-amber-700 font-sans">{slot.descricao}</div>
                        )}
                      </TableCell>

                      {DIAS_SEMANA.map((dia) => {
                        if (isIntervalo) {
                          return (
                            <TableCell key={dia.num} className="text-center text-xs text-amber-700 italic">
                              Recreio Geral
                            </TableCell>
                          );
                        }

                        // Localiza aula alocada neste slot e dia
                        const aula = quadro.aulas.find(
                          (a) => a.timetable_slot_id === slot.id && a.dia_semana === dia.num
                        );

                        return (
                          <TableCell key={dia.num} className="p-2 align-top text-center border-l border-gov-border">
                            {aula ? (
                              <div className="bg-blue-50 border border-blue-200 rounded p-2 text-left space-y-1 relative group">
                                <div className="text-xs font-semibold text-blue-900 leading-tight">
                                  {aula.componente_nome}
                                </div>
                                <div className="text-[11px] text-gov-text flex items-center gap-1 font-mono">
                                  <UserCheck className="w-3 h-3 text-blue-600 shrink-0" />
                                  <span className="truncate">{aula.professor_titular_nome}</span>
                                </div>
                                {aula.professor_substituto_nome && (
                                  <div className="text-[10px] text-amber-700 bg-amber-100 rounded px-1 py-0.5">
                                    Subst: {aula.professor_substituto_nome}
                                  </div>
                                )}
                                <button
                                  onClick={() => handleRemoverAula(aula.id)}
                                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-rose-600 hover:text-rose-800 transition-opacity"
                                  title="Remover aula"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => abrirModalAlocacao(slot, dia.num)}
                                className="w-full h-12 border border-dashed border-gray-300 rounded hover:border-blue-500 hover:bg-blue-50/50 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors text-xs gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Alocar</span>
                              </button>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Clock className="w-12 h-12 text-gov-text-muted mx-auto" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-gov-text">Nenhum quadro de horários ativo para esta turma</h4>
              <p className="text-xs text-gov-text-muted max-w-md mx-auto">
                Crie o quadro de horários e a matriz de tempos da turma para iniciar a alocação semanal de aulas.
              </p>
            </div>
            <Button size="sm" onClick={() => setModalQuadroAberta(true)} className="text-xs">
              Criar Quadro de Horários
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal de Alocação de Aula */}
      <Modal
        open={modalAlocacaoAberta}
        onOpenChange={setModalAlocacaoAberta}
        title="Alocar Aula na Grade Semanal"
      >
        <form onSubmit={handleSalvarAlocacao} className="space-y-4">
          <div className="bg-blue-50 p-3 rounded text-xs text-blue-900 font-mono">
            Slot: {slotAlvo?.tempoLabel} — {DIAS_SEMANA.find((d) => d.num === slotAlvo?.diaSemana)?.label}
          </div>

          {erroAlocacao && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded flex items-start gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{erroAlocacao}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gov-text">Componente Curricular *</label>
            <select
              required
              value={formComponenteId}
              onChange={(e) => setFormComponenteId(e.target.value)}
              className="w-full text-xs border border-gov-border rounded px-3 py-2 bg-white text-gov-text"
            >
              <option value="">Selecione a disciplina...</option>
              {componentes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gov-text">Professor Titular *</label>
            <select
              required
              value={formDocenteId}
              onChange={(e) => setFormDocenteId(e.target.value)}
              className="w-full text-xs border border-gov-border rounded px-3 py-2 bg-white text-gov-text"
            >
              <option value="">Selecione o docente...</option>
              {docentes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gov-text">Professor Substituto (Opcional)</label>
            <select
              value={formSubstitutoId}
              onChange={(e) => setFormSubstitutoId(e.target.value)}
              className="w-full text-xs border border-gov-border rounded px-3 py-2 bg-white text-gov-text"
            >
              <option value="">Sem professor substituto</option>
              {docentes
                .filter((d) => d.id !== formDocenteId)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gov-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalAlocacaoAberta(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={salvando}>
              {salvando ? 'Verificando Choque...' : 'Salvar Alocação'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Criação de Quadro */}
      <Modal
        open={modalQuadroAberta}
        onOpenChange={setModalQuadroAberta}
        title="Configurar Novo Quadro de Horários"
      >
        <form onSubmit={handleCriarQuadroPadrao} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gov-text">Nome do Quadro *</label>
            <Input
              required
              value={novoQuadroNome}
              onChange={(e) => setNovoQuadroNome(e.target.value)}
              placeholder="Ex: Grade Oficial Matutino 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gov-text">Turno *</label>
              <select
                value={novoQuadroTurno}
                onChange={(e) => setNovoQuadroTurno(e.target.value)}
                className="w-full text-xs border border-gov-border rounded px-3 py-2 bg-white text-gov-text"
              >
                <option value="matutino">Matutino</option>
                <option value="vespertino">Vespertino</option>
                <option value="noturno">Noturno</option>
                <option value="integral">Integral</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gov-text">Início da Vigência *</label>
              <Input
                type="date"
                required
                value={novoQuadroInicio}
                onChange={(e) => setNovoQuadroInicio(e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-gov-text-muted">
            Ao salvar, o sistema inicializa automaticamente a matriz com 5 tempos de aula e intervalo de recreio.
          </p>

          <div className="flex justify-end gap-2 pt-4 border-t border-gov-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalQuadroAberta(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Criar Quadro'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
