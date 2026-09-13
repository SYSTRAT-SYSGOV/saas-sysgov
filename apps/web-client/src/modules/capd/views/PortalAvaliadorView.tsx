import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Modal,
} from '@sysgov/ui';
import {
  UserCheck,
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  Plus,
  Send,
  MessageSquare,
  Sparkles,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type {
  ApiAvaliacao,
  ApiDiarioBordo,
  ApiRecurso,
  ApiServidor,
} from '@sysgov/sdk';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, type TabsItem } from '@/components/ui/Tabs';
import { StatusChip } from '@/components/ui/StatusChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenState } from '@/components/ui/ScreenState';

const api = new SysgovApi();

type AvaliadorSubTab = 'avaliacoes' | 'cit' | 'devolutivas' | 'contrarrazoes' | 'pmd';

export const PortalAvaliadorView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AvaliadorSubTab>('avaliacoes');
  const [loading, setLoading] = useState<boolean>(true);
  const [avaliacoes, setAvaliacoes] = useState<ApiAvaliacao[]>([]);
  const [incidentes, setIncidentes] = useState<ApiDiarioBordo[]>([]);
  const [recursos, setRecursos] = useState<ApiRecurso[]>([]);
  const [servidores, setServidores] = useState<ApiServidor[]>([]);

  // Modal Novo Incidente CIT
  const [modalCitOpen, setModalCitOpen] = useState<boolean>(false);
  const [citServidorId, setCitServidorId] = useState<string>('');
  const [citFatorId, setCitFatorId] = useState<number>(1);
  const [citTipo, setCitTipo] = useState<'positivo' | 'negativo'>('positivo');
  const [citDataOcorrencia, setCitDataOcorrencia] = useState<string>(new Date().toISOString().split('T')[0]);
  const [citDescricao, setCitDescricao] = useState<string>('');
  const [salvandoCit, setSalvandoCit] = useState<boolean>(false);

  // Modal Registro de Devolutiva Presencial (Art. 27)
  const [modalDevolutivaOpen, setModalDevolutivaOpen] = useState<boolean>(false);
  const [selectedAvaliacaoId, setSelectedAvaliacaoId] = useState<number | null>(null);
  const [dataDevolutiva, setDataDevolutiva] = useState<string>(new Date().toISOString().split('T')[0]);
  const [resumoEntrevista, setResumoEntrevista] = useState<string>('');
  const [acordosDesenvolvimento, setAcordosDesenvolvimento] = useState<string>('');
  const [salvandoDevolutiva, setSalvandoDevolutiva] = useState<boolean>(false);

  // Modal Contrarrazões Recursais (5 dias)
  const [modalContrarrazaoOpen, setModalContrarrazaoOpen] = useState<boolean>(false);
  const [selectedRecursoId, setSelectedRecursoId] = useState<number | null>(null);
  const [textoContrarrazao, setTextoContrarrazao] = useState<string>('');
  const [manterOuRetificar, setManterOuRetificar] = useState<'manter' | 'reconsiderar'>('manter');
  const [novoGrauProposto, setNovoGrauProposto] = useState<number>(3);
  const [salvandoContrarrazao, setSalvandoContrarrazao] = useState<boolean>(false);

  // Feedback Modal
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  const carregarDadosAvaliador = useCallback(async () => {
    setLoading(true);
    try {
      const [resAv, resCit, resRec, resServ] = await Promise.all([
        api.capd.listAvaliacoes().catch(() => ({ data: [] })),
        api.capd.listDiarioBordo().catch(() => ({ data: [] })),
        api.capd.listRecursos().catch(() => ({ data: [] })),
        api.capd.listServidores().catch(() => ({ data: [] })),
      ]);

      setAvaliacoes(resAv.data || []);
      setIncidentes(resCit.data || []);
      setRecursos(resRec.data || []);
      setServidores(Array.isArray(resServ) ? resServ : (resServ.data || []));

      if (resServ.data?.[0]) {
        setCitServidorId(String(resServ.data[0].id));
      }
    } catch (e) {
      console.error('Erro ao carregar dados do avaliador:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDadosAvaliador();
  }, [carregarDadosAvaliador]);

  const handleSalvarCit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citServidorId) return;
    setSalvandoCit(true);
    try {
      await api.capd.createDiarioBordo({
        ciclo_id: 1,
        servidor_id: Number(citServidorId),
        fator_id: citFatorId,
        tipo: citTipo,
        data_ocorrencia: citDataOcorrencia,
        descricao_fato: citDescricao,
      });

      setModalCitOpen(false);
      setCitDescricao('');
      await carregarDadosAvaliador();

      setFeedback({
        open: true,
        type: 'success',
        title: 'Incidente Crítico Registrado no Diário de Bordo',
        message: 'O fato observável foi registrado no histórico contínuo do servidor. Caso se trate de nota extrema futura (< 60 ou > 90), o requisito de fundamentação prévia foi satisfeito.',
      });
    } catch (err: any) {
      setFeedback({
        open: true,
        type: 'error',
        title: 'Erro ao Gravar Apontamento',
        message: err?.response?.data?.message || err?.message || 'Falha ao salvar incidente.',
      });
    } finally {
      setSalvandoCit(false);
    }
  };

  const handleSalvarDevolutiva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAvaliacaoId) return;
    setSalvandoDevolutiva(true);
    try {
      await api.capd.registrarDevolutiva(selectedAvaliacaoId, {
        data_devolutiva: dataDevolutiva,
        resumo_entrevista: resumoEntrevista,
        acordos_desenvolvimento: acordosDesenvolvimento,
      });

      setModalDevolutivaOpen(false);
      setResumoEntrevista('');
      setAcordosDesenvolvimento('');
      await carregarDadosAvaliador();

      setFeedback({
        open: true,
        type: 'success',
        title: 'Entrevista Devolutiva Concluída e Registrada',
        message: 'A realização da devolutiva presencial foi arquivada com sucesso, habilitando o servidor a emitir ciência digital nos autos.',
      });
    } catch (err: any) {
      setFeedback({
        open: true,
        type: 'error',
        title: 'Erro ao Registrar Devolutiva',
        message: err?.response?.data?.message || err?.message || 'Falha ao registrar devolutiva presencial.',
      });
    } finally {
      setSalvandoDevolutiva(false);
    }
  };

  const handleSalvarContrarrazao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecursoId) return;
    setSalvandoContrarrazao(true);
    try {
      await api.capd.contestarRecursoChefia(selectedRecursoId, {
        contestacao_chefia: textoContrarrazao,
      });

      setModalContrarrazaoOpen(false);
      setTextoContrarrazao('');
      await carregarDadosAvaliador();

      setFeedback({
        open: true,
        type: 'success',
        title: 'Contrarrazões Protocoladas com Sucesso',
        message: 'Sua manifestação formal foi registrada e o processo foi redistribuído à Comissão Especial (CAD) para julgamento soberano colegiado.',
      });
    } catch (err: any) {
      setFeedback({
        open: true,
        type: 'error',
        title: 'Erro ao Registrar Contrarrazões',
        message: err?.response?.data?.message || err?.message || 'Falha ao emitir manifestação.',
      });
    } finally {
      setSalvandoContrarrazao(false);
    }
  };

  const subTabItems: TabsItem<AvaliadorSubTab>[] = [
    { key: 'avaliacoes', label: 'Avaliações de Subordinados', icon: <UserCheck className="h-4 w-4" />, badge: avaliacoes.length },
    { key: 'cit', label: 'Diário de Bordo (CIT)', icon: <BookOpen className="h-4 w-4" />, badge: incidentes.length },
    { key: 'devolutivas', label: 'Entrevistas de Devolutiva', icon: <Calendar className="h-4 w-4" /> },
    { key: 'contrarrazoes', label: 'Contrarrazões Recursais', icon: <MessageSquare className="h-4 w-4" />, badge: recursos.length },
  ];

  if (loading) {
    return <ScreenState type="loading" title="Carregando portal do avaliador..." />;
  }

  return (
    <div className="space-y-6">
      {/* ── Topo do Portal do Avaliador ───────────────────────────────── */}
      <PageHeader
        title="Portal do Avaliador (Chefia Imediata)"
        subtitle="Avaliação funcional de 90° na Escala Gráfica, Trava Anti-Leniência (CIT), Devolutiva Presencial e Contrarrazões"
        badge="Chefia Imediata"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setModalCitOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Apontamento no CIT
            </Button>
          </div>
        }
      />

      {/* ── Sub-abas de Navegação ──────────────────────────────────────── */}
      <Tabs items={subTabItems} value={activeTab} onChange={setActiveTab} />

      {/* ── Sub-Aba 1: Avaliações de Subordinados ──────────────────────── */}
      {activeTab === 'avaliacoes' && (
        <div className="space-y-4">
          <Card className="gap-0 py-0 overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">Equipe Funcional para Avaliação Periódica</h3>
                <p className="text-xs text-muted-foreground">
                  Notas extremas (&lt; 60 ou &gt; 90 pontos / Graus 1 e 5) são bloqueadas pela Trava Anti-Leniência se não houver CIT prévio.
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                Nota de Corte: 70,00 pts
              </Badge>
            </div>

            <div className="divide-y divide-border">
              {avaliacoes.length === 0 ? (
                <div className="p-12 text-center">
                  <EmptyState
                    icon={<UserCheck className="h-10 w-10 text-muted-foreground" />}
                    title="Nenhuma avaliação pendente na sua chefia"
                    description="Não constam servidores subordinados atribuídos para avaliação neste ciclo vigente."
                  />
                </div>
              ) : (
                avaliacoes.map((av) => (
                  <div key={av.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-muted/10 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          #{av.servidor_id}
                        </span>
                        <span className="font-semibold text-sm text-foreground">
                          {av.servidor?.nome_completo || `Servidor #${av.servidor_id}`}
                        </span>
                        <StatusChip
                          label={av.data_conclusao ? 'Concluída' : 'Rascunho'}
                          variant={av.data_conclusao ? 'success' : 'neutral'}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        Ciclo #{av.ciclo_id} {av.data_conclusao ? `| Concluída em: ${new Date(av.data_conclusao).toLocaleDateString('pt-BR')}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {av.nota_final && (
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Nota Nc</span>
                          <span className="font-mono text-lg font-black text-primary tabular-nums">
                            {Number(av.nota_final).toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {!av.devolutiva_realizada && av.data_conclusao && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAvaliacaoId(av.id);
                              setModalDevolutivaOpen(true);
                            }}
                          >
                            <Calendar className="h-3.5 w-3.5 mr-1.5 text-primary" />
                            Registrar Devolutiva
                          </Button>
                        )}

                        {av.devolutiva_realizada && (
                          <Badge variant="success" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Devolutiva OK
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── Sub-Aba 2: Diário de Bordo Contínuo (CIT) ──────────────────── */}
      {activeTab === 'cit' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-muted/20 p-3 rounded-lg border border-border">
            <div>
              <h4 className="text-xs font-bold text-foreground">Fatos Observáveis Lançados</h4>
              <p className="text-[11px] text-muted-foreground">
                Mantenha apontamentos fáticos atualizados durante o ano para permitir a avaliação fidedigna da equipe.
              </p>
            </div>
            <Button size="sm" onClick={() => setModalCitOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Lançamento CIT
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incidentes.map((inc) => (
              <Card key={inc.id} className="p-4 border-border space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge
                      variant={inc.tipo === 'positivo' ? 'success' : 'outline'}
                      className="text-[10px] uppercase"
                    >
                      {inc.tipo === 'positivo' ? 'Positivo' : 'A Desenvolver'}
                    </Badge>
                    <span className="font-semibold text-xs text-foreground ml-2">
                      Servidor #{inc.servidor_id}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {new Date(inc.data_ocorrencia).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {inc.descricao_fato}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Sub-Aba 3: Devolutivas Presenciais ─────────────────────────── */}
      {activeTab === 'devolutivas' && (
        <div className="space-y-4">
          <Card className="p-4 border-border bg-muted/20">
            <h3 className="text-sm font-bold text-foreground">Devolutivas Presenciais e Feedback (Art. 27)</h3>
            <p className="text-xs text-muted-foreground mt-1">
              A entrevista presencial de feedback é obrigatória por lei antes da ciência eletrônica do servidor. Registre o alinhamento e eventuais planos de melhoria.
            </p>
          </Card>

          <div className="divide-y divide-border bg-card rounded-lg border border-border">
            {avaliacoes.filter((a) => a.data_conclusao).map((av) => (
              <div key={av.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-foreground">
                    {av.servidor?.nome_completo || `Servidor #${av.servidor_id}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Status: {av.devolutiva_realizada ? 'Devolutiva Realizada' : 'Pendente de Devolutiva'}
                  </div>
                </div>

                <div>
                  {av.devolutiva_realizada ? (
                    <Badge variant="success" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Entrevista Concluída em {av.devolutiva_em ? new Date(av.devolutiva_em).toLocaleDateString('pt-BR') : 'Data informada'}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedAvaliacaoId(av.id);
                        setModalDevolutivaOpen(true);
                      }}
                    >
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      Registrar Entrevista Devolutiva
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sub-Aba 4: Contrarrazões Recursais ─────────────────────────── */}
      {activeTab === 'contrarrazoes' && (
        <div className="space-y-4">
          <Card className="p-4 border-border bg-muted/20">
            <h3 className="text-sm font-bold text-foreground">Manifestação de Contrarrazões da Chefia (Arts. 30 e 31)</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Prazo regimental de 5 (cinco) dias úteis para manifestação formal sobre recursos interpostos por servidores subordinados.
            </p>
          </Card>

          {recursos.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-10 w-10 text-muted-foreground" />}
              title="Nenhum recurso pendente de contrarrazões"
              description="Não constam contestações administrativas protocoladas para servidores da sua unidade."
            />
          ) : (
            <div className="space-y-3">
              {recursos.map((rec) => (
                <Card key={rec.id} className="p-4 border-border space-y-3">
                  <div className="flex justify-between items-start border-b border-border pb-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-primary">Recurso #{rec.id}</span>
                      <h4 className="font-semibold text-sm text-foreground mt-0.5">
                        Fator Contestado: {rec.fatorContestado?.nome || rec.fator_contestado?.nome || `Fator #${rec.fator_contestado_id}`}
                      </h4>
                    </div>
                    <StatusChip
                      label={rec.status.replace('_', ' ').toUpperCase()}
                      variant={rec.status.startsWith('julgado') ? 'success' : 'warning'}
                    />
                  </div>

                  <div className="text-xs space-y-1">
                    <strong className="text-foreground">Razões Recursais do Servidor:</strong>
                    <p className="text-muted-foreground italic bg-muted/20 p-2.5 rounded border border-border/40">
                      "{rec.justificativa_servidor}"
                    </p>
                  </div>

                  {['interposto', 'em_instrucao'].includes(rec.status) && (
                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedRecursoId(rec.id);
                          setModalContrarrazaoOpen(true);
                        }}
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                        Emitir Contrarrazões (5 dias)
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Novo Apontamento no CIT (Diário de Bordo) ───────────── */}
      <Modal
        open={modalCitOpen}
        onClose={() => setModalCitOpen(false)}
        title="Novo Apontamento no Diário de Bordo Digital (CIT)"
        size="md"
      >
        <form onSubmit={handleSalvarCit} className="space-y-4 py-2 text-xs">
          <div>
            <label className="block font-semibold text-foreground mb-1">Servidor Avaliado:</label>
            <Select
              value={citServidorId}
              onChange={setCitServidorId}
              options={servidores.map((s) => ({
                value: String(s.id),
                label: `${s.nome_completo} (${s.matricula})`,
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-foreground mb-1">Tipo de Incidente:</label>
              <Select
                value={citTipo}
                onChange={(val) => setCitTipo(val as 'positivo' | 'negativo')}
                options={[
                  { value: 'positivo', label: 'Fato Observável Positivo' },
                  { value: 'negativo', label: 'Ponto a Desenvolver / Deficiência' },
                ]}
              />
            </div>

            <div>
              <label className="block font-semibold text-foreground mb-1">Data da Ocorrência:</label>
              <Input
                type="date"
                value={citDataOcorrencia}
                onChange={(e) => setCitDataOcorrencia(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">
              Descrição Circunstanciada do Fato:
            </label>
            <textarea
              rows={4}
              value={citDescricao}
              onChange={(e) => setCitDescricao(e.target.value)}
              placeholder="Descreva com clareza a conduta observável, contexto funcional e reflexos nas entregas do setor..."
              required
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalCitOpen(false)}>
              Cancelar
            </Button>
            <Button variant="default" size="sm" type="submit" disabled={salvandoCit}>
              {salvandoCit ? 'Salvando...' : 'Gravar Apontamento CIT'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Registrar Devolutiva Presencial (Art. 27) ───────────── */}
      <Modal
        open={modalDevolutivaOpen}
        onClose={() => setModalDevolutivaOpen(false)}
        title="Registro de Entrevista de Devolutiva Presencial (Art. 27)"
        size="md"
      >
        <form onSubmit={handleSalvarDevolutiva} className="space-y-4 py-2 text-xs">
          <div>
            <label className="block font-semibold text-foreground mb-1">Data da Reunião de Feedback:</label>
            <Input
              type="date"
              value={dataDevolutiva}
              onChange={(e) => setDataDevolutiva(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">Resumo da Entrevista Presencial:</label>
            <textarea
              rows={3}
              value={resumoEntrevista}
              onChange={(e) => setResumoEntrevista(e.target.value)}
              placeholder="Principais pontos debatidos na reunião com o servidor..."
              required
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">Acordos de Desenvolvimento e Metas:</label>
            <textarea
              rows={3}
              value={acordosDesenvolvimento}
              onChange={(e) => setAcordosDesenvolvimento(e.target.value)}
              placeholder="Metas pactuadas para superação de pontos a desenvolver no próximo ciclo..."
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalDevolutivaOpen(false)}>
              Cancelar
            </Button>
            <Button variant="default" size="sm" type="submit" disabled={salvandoDevolutiva}>
              {salvandoDevolutiva ? 'Registrando...' : 'Confirmar Devolutiva Presencial'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Contrarrazões da Chefia (Arts. 30 e 31) ───────────────── */}
      <Modal
        open={modalContrarrazaoOpen}
        onClose={() => setModalContrarrazaoOpen(false)}
        title="Manifestação Formal de Contrarrazões da Chefia"
        size="md"
      >
        <form onSubmit={handleSalvarContrarrazao} className="space-y-4 py-2 text-xs">
          <div>
            <label className="block font-semibold text-foreground mb-1">Posicionamento da Chefia:</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="posicionamento"
                  checked={manterOuRetificar === 'manter'}
                  onChange={() => setManterOuRetificar('manter')}
                  className="accent-primary"
                />
                <span>Manter Nota Original</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="posicionamento"
                  checked={manterOuRetificar === 'reconsiderar'}
                  onChange={() => setManterOuRetificar('reconsiderar')}
                  className="accent-primary"
                />
                <span>Reconsiderar Parcialmente</span>
              </label>
            </div>
          </div>

          {manterOuRetificar === 'reconsiderar' && (
            <div>
              <label className="block font-semibold text-foreground mb-1">Novo Grau Proposto (1 a 5):</label>
              <Input
                type="number"
                min={1}
                max={5}
                value={novoGrauProposto}
                onChange={(e) => setNovoGrauProposto(Number(e.target.value))}
                className="font-mono w-24"
                required
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-foreground mb-1">Fundamentação Técnica das Contrarrazões:</label>
            <textarea
              rows={4}
              value={textoContrarrazao}
              onChange={(e) => setTextoContrarrazao(e.target.value)}
              placeholder="Descreva tecnicamente as razões pelas quais a pontuação inicial deve ser mantida ou os fundamentos da reconsideração proposta..."
              required
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalContrarrazaoOpen(false)}>
              Cancelar
            </Button>
            <Button variant="default" size="sm" type="submit" disabled={salvandoContrarrazao}>
              {salvandoContrarrazao ? 'Protocolando...' : 'Protocolar Contrarrazões'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Feedback ─────────────────────────────────────────────── */}
      {feedback && (
        <Modal
          open={feedback.open}
          onClose={() => setFeedback(null)}
          title={feedback.title}
          size="sm"
        >
          <div className="space-y-3 py-2 text-xs">
            <p className="text-foreground leading-relaxed">{feedback.message}</p>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setFeedback(null)}>
                OK
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
