import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Select, Badge, Card, Input } from '@sysgov/ui';
import {
  CheckCircle2,
  History,
  ClipboardList,
  User,
  Building2,
  Calendar,
  Search,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  ShieldAlert,
  Briefcase,
  AlertCircle,
  FileSpreadsheet,
  Check,
  UserCheck,
  Eye,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiCiclo, ApiServidor, ApiDiarioBordo, ApiAvaliacao } from '@sysgov/sdk';
import { useAuth } from '@/core/auth/useAuth';
import { EspelhoAvaliacaoModal } from './EspelhoAvaliacaoModal';

const api = new SysgovApi();

type Step = 1 | 2 | 3;

const STEPS: { step: Step; label: string; desc: string }[] = [
  { step: 1, label: 'Parâmetros', desc: 'Ciclo & Lotação' },
  { step: 2, label: 'Servidor', desc: 'Identificação' },
  { step: 3, label: 'Finalização', desc: 'Conferência Legal' },
];

export interface NovaAvaliacaoWizardProps {
  open: boolean;
  onClose: () => void;
  onCreated: (avaliacao: ApiAvaliacao) => void;
  departamentoPadrao?: string;
  cicloAtivoId?: number | string;
  servidoresIniciais?: ApiServidor[];
}

export const NovaAvaliacaoWizard: React.FC<NovaAvaliacaoWizardProps> = ({
  open,
  onClose,
  onCreated,
  departamentoPadrao,
  cicloAtivoId,
  servidoresIniciais = [],
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [ciclos, setCiclos] = useState<ApiCiclo[]>([]);
  const [meusSubordinados, setMeusSubordinados] = useState<ApiServidor[]>([]);
  const [servidoresDisponiveis, setServidoresDisponiveis] = useState<ApiServidor[]>([]);
  const [secretariasList, setSecretariasList] = useState<string[]>([]);
  const [perfilServidor, setPerfilServidor] = useState<any | null>(null);

  const [cicloId, setCicloId] = useState<string>('');
  const [lotacao, setLotacao] = useState<string>('');
  const [servidorId, setServidorId] = useState<string>('');
  const [filtroBuscaServidor, setFiltroBuscaServidor] = useState<string>('');

  const [historico, setHistorico] = useState<{ diario: ApiDiarioBordo[]; anteriores: ApiAvaliacao[] } | null>(null);
  const [espelhoModalAvaliacaoId, setEspelhoModalAvaliacaoId] = useState<number | null>(null);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Inicialização e carregamento automático
  useEffect(() => {
    if (!open) return;

    setStep(1);
    setCicloId('');
    setLotacao('');
    setServidorId('');
    setFiltroBuscaServidor('');
    setHistorico(null);
    setErro(null);
    setCarregandoDados(true);

    const carregarTudo = async () => {
      try {
        // 1. Carrega ciclos e seleciona automaticamente o ativo
        const listaCiclos = await api.capd.listCiclos().catch(() => []);
        setCiclos(listaCiclos);

        let cicloAtivo: ApiCiclo | undefined;
        if (cicloAtivoId) {
          cicloAtivo = listaCiclos.find((c) => String(c.id) === String(cicloAtivoId));
        }
        if (!cicloAtivo) {
          cicloAtivo = listaCiclos.find((c) => {
            const st = (c.status as string) || '';
            return st === 'em_avaliacao' || st === 'aberto' || st === 'ativo' || st === 'vigente';
          });
        }
        if (!cicloAtivo) {
          // Prioridade 2: ciclo com data atual ou não encerrado
          cicloAtivo = listaCiclos.find((c) => c.status !== 'encerrado' && c.status !== 'homologado');
        }
        if (!cicloAtivo && listaCiclos.length > 0) {
          cicloAtivo = listaCiclos[0];
        }

        if (cicloAtivo) {
          setCicloId(String(cicloAtivo.id));
        }

        // 2. Carrega perfil do avaliador logado para puxar a secretaria
        const perfilRes = await api.capd.getMeuPerfil().catch(() => null);
        if (perfilRes?.servidor) {
          setPerfilServidor(perfilRes.servidor);
        }
        if (perfilRes?.secretarias_disponiveis?.length) {
          setSecretariasList(perfilRes.secretarias_disponiveis);
        }

        // Determina a secretaria do usuário avaliador logado
        const secretariaUsuario =
          perfilRes?.lotacao ||
          perfilRes?.servidor?.orgao_lotacao ||
          perfilRes?.servidor?.lotacao_fisica ||
          departamentoPadrao ||
          'SMAD / Depto. Protocolo e Arquivo';

        setLotacao(secretariaUsuario);

        // 3. Carrega lista de subordinados diretos
        const resSub = await api.capd
          .listServidores({ meus_subordinados: true, per_page: 200 })
          .catch(() => ({ data: [] }));

        const subList = resSub.data || [];
        setMeusSubordinados(subList);

        // Se o usuário não tiver subordinados diretos vinculados no momento,
        // carrega os servidores da lotação do avaliador para não travar a avaliação
        let todosDisponiveis = [...subList];
        if (todosDisponiveis.length === 0) {
          const resLotacao = await api.capd
            .listServidores({ orgao_lotacao: secretariaUsuario, per_page: 200 })
            .catch(() => ({ data: [] }));

          const servidoresLotacao = resLotacao.data || [];
          if (servidoresLotacao.length > 0) {
            todosDisponiveis = servidoresLotacao;
          } else if (servidoresIniciais.length > 0) {
            todosDisponiveis = servidoresIniciais;
          }
        } else {
          // Acrescenta servidores da lotação inicial caso haja outros
          servidoresIniciais.forEach((s) => {
            if (!todosDisponiveis.some((item) => (item.user_id || item.id) === (s.user_id || s.id))) {
              todosDisponiveis.push(s);
            }
          });
        }

        setServidoresDisponiveis(todosDisponiveis);
      } catch (err: any) {
        console.error('Erro na inicialização do assistente:', err);
      } finally {
        setCarregandoDados(false);
      }
    };

    carregarTudo();
  }, [open, cicloAtivoId, departamentoPadrao]);

  // Recalcula servidores disponíveis caso a lotação mude
  useEffect(() => {
    if (!lotacao) return;

    // Se já temos servidores dessa lotação no cache local, mantém
    const existentes = servidoresDisponiveis.filter(
      (s) => s.orgao_lotacao === lotacao || s.lotacao_fisica === lotacao
    );

    if (existentes.length === 0) {
      api.capd
        .listServidores({ orgao_lotacao: lotacao, per_page: 200 })
        .then((res) => {
          if (res.data && res.data.length > 0) {
            setServidoresDisponiveis((prev) => {
              const ids = new Set(prev.map((item) => item.user_id || item.id));
              const novos = res.data.filter((item: ApiServidor) => !ids.has(item.user_id || item.id));
              return [...prev, ...novos];
            });
          }
        })
        .catch(() => {});
    }
  }, [lotacao]);

  // Opções de Lotação com a do avaliador em primeiro destaque
  const lotacaoOptions = useMemo(() => {
    const set = new Set<string>();

    if (lotacao) set.add(lotacao);
    if (departamentoPadrao) set.add(departamentoPadrao);
    if (perfilServidor?.orgao_lotacao) set.add(perfilServidor.orgao_lotacao);
    if (perfilServidor?.lotacao_fisica) set.add(perfilServidor.lotacao_fisica);

    secretariasList.forEach((sec) => set.add(sec));
    servidoresDisponiveis.forEach((s) => {
      if (s.orgao_lotacao) set.add(s.orgao_lotacao);
    });
    meusSubordinados.forEach((s) => {
      if (s.orgao_lotacao) set.add(s.orgao_lotacao);
    });

    const list = Array.from(set).filter(Boolean);

    return list.map((val) => {
      const isMinhaLotacao =
        val === perfilServidor?.orgao_lotacao ||
        val === perfilServidor?.lotacao_fisica ||
        val === departamentoPadrao;

      return {
        value: val,
        label: isMinhaLotacao ? `${val} (Sua Secretaria / Lotação)` : val,
      };
    });
  }, [
    lotacao,
    departamentoPadrao,
    perfilServidor,
    secretariasList,
    servidoresDisponiveis,
    meusSubordinados,
  ]);

  // Servidores elegíveis da lotação selecionada
  const servidoresDaLotacao = useMemo(() => {
    let filtrados = servidoresDisponiveis.filter(
      (s) =>
        !lotacao ||
        s.orgao_lotacao === lotacao ||
        s.lotacao_fisica === lotacao ||
        (lotacao.includes('SMAD') && s.orgao_lotacao?.includes('SMAD'))
    );

    // Se nenhum filtro exato bateu mas temos subordinados ou amostra
    if (filtrados.length === 0 && servidoresDisponiveis.length > 0) {
      filtrados = servidoresDisponiveis;
    }

    if (filtroBuscaServidor.trim()) {
      const term = filtroBuscaServidor.toLowerCase();
      filtrados = filtrados.filter(
        (s) =>
          s.nome_completo?.toLowerCase().includes(term) ||
          s.matricula?.toLowerCase().includes(term) ||
          s.cargo_efetivo?.toLowerCase().includes(term)
      );
    }

    return filtrados;
  }, [servidoresDisponiveis, lotacao, filtroBuscaServidor]);

  const servidorSelecionado = useMemo(
    () => servidoresDisponiveis.find((s) => String(s.user_id || s.id) === servidorId) || null,
    [servidoresDisponiveis, servidorId]
  );

  const cicloSelecionado = useMemo(
    () => ciclos.find((c) => String(c.id) === cicloId) || null,
    [ciclos, cicloId]
  );

  const avaliacaoExistenteCiclo = useMemo(
    () => historico?.anteriores.find((a) => String(a.ciclo_id) === String(cicloId)) || null,
    [historico?.anteriores, cicloId]
  );

  const grupoFuncionalDetectado = useMemo(() => {
    if (!servidorSelecionado) return null;
    const texto = `${servidorSelecionado.cargo_efetivo || ''} ${servidorSelecionado.orgao_lotacao || ''} ${lotacao || ''}`.toLowerCase();
    if (/guarda|gcm|seguran|vigilante|patrimonial|transito|trânsito|smsp|polic/.test(texto)) {
      return { nome: 'Segurança Pública', codigo: 'FORM_SEGURANCA_V1', icon: '🛡️' };
    }
    if (/medico|médico|enferm|tecnico|odont|dentist|farmac|saude|saúde|sms|upa|ubs|acs|ace/.test(texto)) {
      return { nome: 'Saúde Pública', codigo: 'FORM_SAUDE_V1', icon: '🩺' };
    }
    if (/professor|pedagog|educador|educac|educaç|smed|escola|cmei/.test(texto)) {
      return { nome: 'Magistério', codigo: 'FORM_MAGISTERIO_V1', icon: '📚' };
    }
    return { nome: 'Quadro Geral', codigo: 'FORM_GERAL_V1', icon: '🏛️' };
  }, [servidorSelecionado, lotacao]);

  // Carrega histórico e CIT do servidor selecionado
  useEffect(() => {
    if (!servidorSelecionado) {
      setHistorico(null);
      return;
    }
    const targetId = servidorSelecionado.user_id || servidorSelecionado.id;
    setCarregandoHistorico(true);
    Promise.all([
      api.capd.listDiarioBordo({ servidor_id: targetId }).catch(() => ({ data: [] })),
      api.capd.listAvaliacoes({ servidor_id: targetId }).catch(() => ({ data: [] })),
    ])
      .then(([diarioRes, avRes]) => {
        setHistorico({ diario: diarioRes.data || [], anteriores: avRes.data || [] });
      })
      .finally(() => setCarregandoHistorico(false));
  }, [servidorSelecionado]);

  const handleConfirmar = async () => {
    if (!servidorSelecionado || !cicloId) return;
    setSalvando(true);
    setErro(null);
    try {
      const targetId = servidorSelecionado.user_id || servidorSelecionado.id;
      const avaliacao = await api.capd.createAvaliacao({
        ciclo_id: Number(cicloId),
        servidor_id: Number(targetId),
      });
      onCreated(avaliacao);
      onClose();
    } catch (err: any) {
      setErro(err?.response?.data?.message || err?.message || 'Falha ao iniciar a avaliação.');
    } finally {
      setSalvando(false);
    }
  };

  const footer = (
    <div className="flex w-full items-center justify-between">
      <div className="text-xs text-muted-foreground">
        {step === 1 && (
          <span>
            Passo <strong className="font-mono text-foreground">1</strong> de{' '}
            <strong className="font-mono text-foreground">3</strong> — Parâmetros do Ciclo
          </span>
        )}
        {step === 2 && (
          <span>
            Passo <strong className="font-mono text-foreground">2</strong> de{' '}
            <strong className="font-mono text-foreground">3</strong> — Seleção de Servidor
          </span>
        )}
        {step === 3 && (
          <span>
            Passo <strong className="font-mono text-foreground">3</strong> de{' '}
            <strong className="font-mono text-foreground">3</strong> — Conferência Final
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {step === 1 && (
          <Button variant="outline" size="sm" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
        )}
        {step > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep((s) => (s - 1) as Step)}
            disabled={salvando}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>
        )}
        {step < 3 && (
          <Button
            size="sm"
            onClick={() => setStep((s) => (s + 1) as Step)}
            disabled={(step === 1 && !(cicloId && lotacao)) || (step === 2 && !servidorId)}
            className="flex items-center gap-1"
          >
            Avançar
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        {step === 3 && (
          <Button
            size="sm"
            onClick={handleConfirmar}
            disabled={salvando || !cicloId || !servidorId}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground font-semibold"
          >
            {salvando ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Iniciando Avaliação...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Confirmar e Iniciar Avaliação
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Modal
        open={open}
      onClose={onClose}
      title="Inicializar Nova Avaliação Regulamentar"
      icon={
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ClipboardList className="h-5 w-5" />
        </div>
      }
      size="full"
      className="sm:max-w-6xl lg:max-w-7xl w-[96vw] max-h-[94vh]"
      footer={footer}
    >
      <div className="flex flex-col gap-3 w-full overflow-x-hidden">
        {/* Subtítulo institucional */}
        <p className="text-xs text-muted-foreground -mt-1 leading-relaxed">
          Assistente regulamentar para abertura de ciclo de avaliação de desempenho conforme a Lei Municipal nº
          1.704/2006 (Escala Gráfica Chiavenato e Técnica do Incidente Crítico — CIT).
        </p>

        {/* Stepper de Navegação */}
        <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5">
          <div className="flex items-center justify-between gap-3">
            {STEPS.map(({ step: s, label, desc }, idx) => {
              const isCurrent = s === step;
              const isPast = s < step;

              return (
                <React.Fragment key={s}>
                  <div
                    onClick={() => {
                      if (isPast) setStep(s);
                    }}
                    className={`flex items-center gap-2.5 cursor-pointer select-none transition-all ${
                      isPast ? 'hover:opacity-80' : ''
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold font-mono transition-colors shadow-sm ${
                        isCurrent
                          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                          : isPast
                            ? 'bg-status-success text-white'
                            : 'bg-muted border border-border text-muted-foreground'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="h-4 w-4" /> : s}
                    </div>
                    <div>
                      <span
                        className={`text-xs font-semibold block ${
                          isCurrent ? 'text-primary font-bold' : isPast ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {label}
                      </span>
                      <span className="text-[10px] text-muted-foreground block -mt-0.5">{desc}</span>
                    </div>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 transition-colors ${
                        idx + 1 < step ? 'bg-status-success' : 'bg-border/60'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Alerta de erro */}
        {erro && (
          <div className="flex items-center gap-2 rounded-lg border border-status-danger/30 bg-status-danger/10 px-3.5 py-2 text-xs text-status-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {/* Grade de Conteúdo: Wizard à Esquerda + Apoio à Decisão à Direita */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start w-full">
          {/* Coluna Central do Wizard */}
          <div className="space-y-3.5">
            {/* ── PASSO 1: Ciclo & Lotação ─────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-3.5">
                {/* Card do Avaliador Logado */}
                <Card className="p-3 border-primary/20 bg-primary/5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-foreground">
                            {user?.name || perfilServidor?.nome_completo || 'Avaliador Autenticado'}
                          </h4>
                          <Badge variant="success" className="text-[9px] px-1.5 py-0 font-mono">
                            Chefia Imediata
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {user?.email || perfilServidor?.email || 'sessao.ativa@sysgov.local'}
                          {perfilServidor?.matricula && (
                            <span className="font-mono ml-2">Matrícula: {perfilServidor.matricula}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="hidden sm:inline-flex text-[10px] border-primary/30 text-primary">
                      Detectado da Sessão
                    </Badge>
                  </div>
                </Card>

                {/* Ciclo Avaliativo */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-foreground">
                      Ciclo Avaliativo Vigente *
                    </label>
                    {cicloSelecionado && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Ano Competência: <strong className="text-foreground">{cicloSelecionado.ano_competencia || '2026'}</strong>
                      </span>
                    )}
                  </div>
                  <Select
                    value={cicloId}
                    onChange={setCicloId}
                    options={ciclos.map((c) => {
                      const st = (c.status as string) || '';
                      const isVigente =
                        st === 'em_avaliacao' ||
                        st === 'aberto' ||
                        st === 'ativo' ||
                        st === 'vigente';
                      return {
                        value: String(c.id),
                        label: `${c.nome}${isVigente ? ' ★ (Ciclo Ativo / Vigente)' : ` (${c.status})`}`,
                      };
                    })}
                    placeholder="Selecione o ciclo avaliativo..."
                  />
                  {cicloSelecionado && (
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        Vigência:{' '}
                        <strong className="font-mono text-foreground">
                          {cicloSelecionado.data_inicio
                            ? new Date(cicloSelecionado.data_inicio).toLocaleDateString('pt-BR')
                            : '01/01/2026'}{' '}
                          a{' '}
                          {cicloSelecionado.data_fim
                            ? new Date(cicloSelecionado.data_fim).toLocaleDateString('pt-BR')
                            : '31/12/2026'}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Secretaria / Lotação */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-foreground">
                      Secretaria / Lotação de Exercício *
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      Puxada automaticamente da sua lotação
                    </span>
                  </div>
                  <Select
                    value={lotacao}
                    onChange={setLotacao}
                    options={lotacaoOptions}
                    placeholder="Selecione a secretaria ou departamento..."
                  />
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-muted-foreground">
                      Unidade selecionada com{' '}
                      <strong className="font-mono text-foreground">{servidoresDaLotacao.length}</strong> servidor(es)
                      elegíveis para avaliação.
                    </p>
                    {meusSubordinados.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {meusSubordinados.length} subordinado(s) direto(s)
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── PASSO 2: Servidor Avaliado ───────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Selecione o Servidor Avaliado</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Lista de servidores públicos ativos vinculados a <strong>{lotacao}</strong>.
                    </p>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {servidoresDaLotacao.length} encontrado(s)
                  </Badge>
                </div>

                {/* Filtro de Busca Rápida */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar servidor por nome, matrícula ou cargo..."
                    value={filtroBuscaServidor}
                    onChange={(e) => setFiltroBuscaServidor(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>

                {/* Lista Visual de Cards de Servidores */}
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                  {servidoresDaLotacao.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center">
                      <User className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                      <p className="text-xs font-medium text-foreground">Nenhum servidor encontrado</p>
                      <p className="text-[11px] text-muted-foreground">
                        Não há servidores cadastrados com os termos informados nesta lotação.
                      </p>
                    </div>
                  ) : (
                    servidoresDaLotacao.map((s) => {
                      const idStr = String(s.user_id || s.id);
                      const isSelected = servidorId === idStr;
                      const isSubordinadoDireto = meusSubordinados.some(
                        (sub) => (sub.user_id || sub.id) === (s.user_id || s.id)
                      );

                      return (
                        <div
                          key={idStr}
                          onClick={() => setServidorId(idStr)}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                              : 'border-border/70 hover:border-primary/40 hover:bg-muted/30 bg-card'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-xs font-mono transition-colors ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground border border-border'
                              }`}
                            >
                              {s.nome_completo?.slice(0, 2).toUpperCase() || 'SP'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">{s.nome_completo}</span>
                                {isSubordinadoDireto && (
                                  <Badge variant="success" className="text-[9px] px-1 py-0 font-mono">
                                    Subordinado Direto
                                  </Badge>
                                )}
                                {s.estagio_probatorio && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">
                                    Estágio Probatório
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                                <span className="flex items-center gap-1">
                                  <Briefcase className="h-3 w-3" />
                                  {s.cargo_efetivo || 'Servidor Efetivo'}
                                </span>
                                <span>•</span>
                                <span>
                                  Matrícula: <strong className="font-mono text-foreground">{s.matricula}</strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 pl-2">
                            <div
                              className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : 'border-muted-foreground/40'
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ── PASSO 3: Finalização & Conferência Regulamentar ─────────── */}
            {step === 3 && (
              <div className="space-y-3.5">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Conferência dos Parâmetros Regulamentares</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Verifique os dados antes de formalizar a inicialização do instrumento de avaliação de desempenho.
                  </p>
                </div>

                <Card className="p-4 border-border space-y-3 bg-muted/10 rounded-xl divide-y divide-border/50">
                  <div className="grid grid-cols-2 gap-2 text-xs pb-2">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-mono">
                        Ciclo Avaliativo
                      </span>
                      <span className="font-bold text-foreground text-xs">{cicloSelecionado?.nome || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-mono">
                        Ano / Competência
                      </span>
                      <span className="font-bold font-mono text-foreground text-xs">
                        {cicloSelecionado?.ano_competencia || '2026'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-mono">
                        Avaliador Responsável
                      </span>
                      <span className="font-semibold text-foreground text-xs">
                        {user?.name || perfilServidor?.nome_completo || 'Chefia Imediata'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-mono">
                        Secretaria / Lotação
                      </span>
                      <span className="font-semibold text-foreground text-xs">{lotacao || '—'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-mono">
                        Servidor Avaliado
                      </span>
                      <span className="font-bold text-foreground text-xs">
                        {servidorSelecionado?.nome_completo || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-mono">
                        Matrícula Funcional
                      </span>
                      <span className="font-mono font-bold text-foreground text-xs">
                        {servidorSelecionado?.matricula || '—'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-mono">Cargo Efetivo</span>
                      <span className="font-medium text-foreground text-xs">
                        {servidorSelecionado?.cargo_efetivo || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-mono">
                        Grupo Funcional & Instrumento
                      </span>
                      <span className="font-semibold text-primary text-xs flex items-center gap-1">
                        <span>{grupoFuncionalDetectado?.icon}</span>
                        <span>{grupoFuncionalDetectado?.nome}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">({grupoFuncionalDetectado?.codigo})</span>
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Nota de conformidade com a Lei 1.704 */}
                <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Ao confirmar, será gerada a avaliação regulamentar em estado preliminar. A chefia poderá preencher
                    a Escala Gráfica (Graus 1 a 5) associada aos apontamentos do Diário de Bordo Digital (CIT).
                  </p>
                </div>

                {/* Alerta caso este servidor já possua avaliação submetida ou homologada neste ciclo */}
                {avaliacaoExistenteCiclo && (avaliacaoExistenteCiclo.homologada || avaliacaoExistenteCiclo.data_conclusao) && (
                  <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-status-warning-border bg-status-warning-bg p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-status-warning shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground">Avaliação já concluída/submetida para este ciclo</p>
                        <p className="text-[11px] text-muted-foreground">
                          Nota registrada: <strong className="font-mono tabular-nums">{Number(avaliacaoExistenteCiclo.nota_final || 0).toFixed(2)}</strong> ({avaliacaoExistenteCiclo.homologada ? 'Homologada' : 'Submetida'})
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs font-semibold gap-1.5 shadow-2xs"
                      onClick={() => setEspelhoModalAvaliacaoId(avaliacaoExistenteCiclo.id)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver Espelho da Avaliação
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── PAINEL LATERAL: Apoio à Decisão (Histórico & CIT) ─────────── */}
          <Card className="p-3.5 space-y-2.5 bg-muted/15 border-border rounded-xl w-full">
            <div className="flex items-center gap-2 border-b border-border/50 pb-2">
              <History className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Apoio à Decisão (CIT)
              </h4>
            </div>

            {!servidorSelecionado ? (
              <div className="space-y-2.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Critérios & Diário de Bordo</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Conforme a Lei nº 1.704/2006, as avaliações utilizam a metodologia da{' '}
                  <strong className="text-foreground">Escala Gráfica (Chiavenato, Graus 1 a 5)</strong> combinada com
                  o <strong className="text-foreground">Incidente Crítico (CIT)</strong>.
                </p>
                <div className="rounded-lg bg-background p-2.5 border border-border/60 space-y-1 text-[10px]">
                  <p className="font-semibold text-foreground">Trava Anti-Leniência (Art. 24):</p>
                  <p className="text-muted-foreground">
                    Notas de excelência (Grau 5) ou insatisfatórias (Grau 1) exigem obrigatoriamente lançamento de
                    apontamento circunstanciado no Diário de Bordo.
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Selecione um servidor no Passo 2 para carregar o histórico de avaliações anteriores e apontamentos
                  registrados.
                </p>
              </div>
            ) : carregandoHistorico ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-[11px] text-muted-foreground">Carregando histórico do servidor...</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Avaliações Anteriores */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                      Avaliações Anteriores
                    </p>
                    <Badge variant="outline" className="text-[9px] font-mono">
                      {historico?.anteriores.length || 0}
                    </Badge>
                  </div>
                  {historico?.anteriores && historico.anteriores.length > 0 ? (
                    <ul className="space-y-1.5">
                      {historico.anteriores.map((av) => (
                        <li
                          key={av.id}
                          className="text-xs flex flex-wrap items-center justify-between gap-2 border border-border/60 bg-background/50 rounded-lg px-2.5 py-1.5 hover:border-primary/40 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-[11px]">Ciclo #{av.ciclo_id}</span>
                            <span className="font-mono font-bold text-foreground text-xs">
                              {av.nota_final ? Number(av.nota_final).toFixed(2) : '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {av.homologada ? (
                              <Badge variant="success" className="text-[9px] px-1 py-0 font-mono">
                                Homologada
                              </Badge>
                            ) : av.data_conclusao ? (
                              <Badge variant="success" className="text-[9px] px-1 py-0 font-mono">
                                Submetida
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">
                                Em Curso
                              </Badge>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-[10px] font-semibold text-primary hover:bg-primary/10 flex items-center gap-1 cursor-pointer"
                              title="Visualizar Espelho Funcional desta Avaliação (somente leitura)"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEspelhoModalAvaliacaoId(av.id);
                              }}
                            >
                              <Eye className="h-3 w-3" />
                              Espelho
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic bg-background/40 p-2 rounded border border-border/40">
                      Nenhuma avaliação anterior registrada.
                    </p>
                  )}
                </div>

                {/* Apontamentos no Diário de Bordo CIT */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                      Diário de Bordo (CIT)
                    </p>
                    <Badge variant="outline" className="text-[9px] font-mono">
                      {historico?.diario.length || 0}
                    </Badge>
                  </div>
                  {historico?.diario && historico.diario.length > 0 ? (
                    <ul className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                      {historico.diario.slice(0, 5).map((d) => (
                        <li
                          key={d.id}
                          className="text-xs border border-border/60 bg-background/50 rounded-lg p-2 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <Badge
                              variant={d.tipo === 'positivo' ? 'success' : 'warning'}
                              className="text-[9px] uppercase px-1 py-0 font-mono"
                            >
                              {d.tipo === 'positivo' ? 'Positivo' : 'A Desenvolver'}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(d.data_ocorrencia).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                            {d.descricao_fato}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic bg-background/40 p-2 rounded border border-border/40">
                      Nenhum incidente crítico registrado no ciclo.
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Modal>

    {/* Modal de Espelho Funcional da Avaliação aberto a partir do Assistente */}
    <EspelhoAvaliacaoModal
      avaliacaoId={espelhoModalAvaliacaoId}
      open={espelhoModalAvaliacaoId !== null}
      onClose={() => setEspelhoModalAvaliacaoId(null)}
    />
  </>
  );
};
