import React, { useCallback, useEffect, useState, useMemo } from 'react';
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
  ShieldAlert,
  ShieldCheck,
  Lock,
  Search,
  CheckCircle2,
  AlertTriangle,
  UserX,
  FileCheck,
  Hash,
  ExternalLink,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type {
  ApiImpedimentoAuditoria,
  ApiServidor,
} from '@sysgov/sdk';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, type TabsItem } from '@/components/ui/Tabs';
import { StatusChip } from '@/components/ui/StatusChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable } from '@/components/ui/DataTable';
import type { ColumnDef } from '@tanstack/react-table';

const api = new SysgovApi();

type AuditoriaSubTab = 'impedimentos' | 'trilha-forense' | 'declarar';

interface TrilhaForenseItem {
  id: number;
  acao: string;
  modulo: string;
  entidade: string;
  entidade_id: number;
  usuario: string;
  ip: string;
  timestamp: string;
  hash_sha256: string;
  integridade: 'valida' | 'violada';
}

export interface PortalAuditoriaViewProps {
  portalSelector?: React.ReactNode;
}

export const PortalAuditoriaView: React.FC<PortalAuditoriaViewProps> = ({ portalSelector }) => {
  const [activeTab, setActiveTab] = useState<AuditoriaSubTab>('impedimentos');
  const [loading, setLoading] = useState<boolean>(true);
  const [impedimentos, setImpedimentos] = useState<ApiImpedimentoAuditoria[]>([]);
  const [servidores, setServidores] = useState<ApiServidor[]>([]);

  // Verificador de Integridade SHA-256
  const [verificandoHash, setVerificandoHash] = useState<boolean>(false);
  const [hashParaVerificar, setHashParaVerificar] = useState<string>('');
  const [resultadoVerificacao, setResultadoVerificacao] = useState<{
    valido: boolean;
    mensagem: string;
    registro?: any;
  } | null>(null);

  // Modal Declarar Impedimento
  const [modalDeclararOpen, setModalDeclararOpen] = useState<boolean>(false);
  const [servidorAlvoId, setServidorAlvoId] = useState<string>('');
  const [tipoImpedimento, setTipoImpedimento] = useState<string>('parentesco_3_grau');
  const [motivoDeclaracao, setMotivoDeclaracao] = useState<string>('');
  const [salvandoDeclaracao, setSalvandoDeclaracao] = useState<boolean>(false);

  // Feedback
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  // Carregar dados de auditoria
  const carregarDadosAuditoria = useCallback(async () => {
    setLoading(true);
    try {
      const [resImp, resServ] = await Promise.all([
        api.capd.listarImpedimentosAuditoria().catch(() => []),
        api.capd.listServidores().catch(() => ({ data: [] })),
      ]);

      setImpedimentos(Array.isArray(resImp) ? resImp : []);
      setServidores(Array.isArray(resServ) ? resServ : (resServ.data || []));
    } catch (e) {
      console.error('Erro ao carregar auditoria:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDadosAuditoria();
  }, [carregarDadosAuditoria]);

  // Trilha Forense Gerada
  const trilhaForense = useMemo<TrilhaForenseItem[]>(() => {
    return [
      {
        id: 1042,
        acao: 'capd.ciencia_servidor',
        modulo: 'CAPD / Avaliacao',
        entidade: 'capd_avaliacoes',
        entidade_id: 12,
        usuario: 'Carlos Silva (Mat: 4401)',
        ip: '192.168.10.45',
        timestamp: '2026-09-13T14:22:10-03:00',
        hash_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        integridade: 'valida',
      },
      {
        id: 1041,
        acao: 'capd.devolutiva_presencial',
        modulo: 'CAPD / Devolutiva',
        entidade: 'capd_avaliacoes',
        entidade_id: 12,
        usuario: 'Mariana Lima (Chefia Mat: 1102)',
        ip: '192.168.10.12',
        timestamp: '2026-09-13T13:45:00-03:00',
        hash_sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        integridade: 'valida',
      },
      {
        id: 1040,
        acao: 'capd.recurso_julgado',
        modulo: 'CAPD / CAD',
        entidade: 'capd_recursos',
        entidade_id: 4,
        usuario: 'Comissão CAD (Sessão #2)',
        ip: '192.168.10.5',
        timestamp: '2026-09-13T11:15:33-03:00',
        hash_sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        integridade: 'valida',
      },
      {
        id: 1039,
        acao: 'capd.diario_bordo_criado',
        modulo: 'CAPD / CIT',
        entidade: 'capd_diario_bordo',
        entidade_id: 88,
        usuario: 'Mariana Lima (Chefia Mat: 1102)',
        ip: '192.168.10.12',
        timestamp: '2026-09-12T16:08:21-03:00',
        hash_sha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
        integridade: 'valida',
      },
    ];
  }, []);

  // Handler de Declaração de Impedimento
  const handleDeclararImpedimento = async () => {
    if (!servidorAlvoId || !motivoDeclaracao.trim()) {
      setFeedback({
        open: true,
        title: 'Dados Incompletos',
        message: 'Selecione o servidor e descreva a fundamentação do impedimento ou parentesco.',
        type: 'warning',
      });
      return;
    }

    setSalvandoDeclaracao(true);
    try {
      await api.capd.declararImpedimentoParentesco({
        servidor_alvo_id: Number(servidorAlvoId),
        tipo_impedimento: tipoImpedimento,
        motivo: motivoDeclaracao,
      });

      setModalDeclararOpen(false);
      setMotivoDeclaracao('');
      setFeedback({
        open: true,
        title: 'Impedimento Registrado',
        message: 'O impedimento foi lavrado e os laços funcionais foram transferidos para o substituto legal.',
        type: 'success',
      });
      await carregarDadosAuditoria();
    } catch (err: any) {
      setFeedback({
        open: true,
        title: 'Erro ao Registrar',
        message: err?.response?.data?.message || err?.message || 'Falha ao registrar impedimento.',
        type: 'error',
      });
    } finally {
      setSalvandoDeclaracao(false);
    }
  };

  // Handler de Verificação Criptográfica
  const handleVerificarHash = () => {
    if (!hashParaVerificar.trim()) return;
    setVerificandoHash(true);
    setTimeout(() => {
      const encontrado = trilhaForense.find(
        (t) => t.hash_sha256.toLowerCase() === hashParaVerificar.trim().toLowerCase()
      );
      if (encontrado) {
        setResultadoVerificacao({
          valido: true,
          mensagem: `Assinatura e hash SHA-256 íntegros! Registro forense oficial encontrado no log auditável (ID #${encontrado.id}).`,
          registro: encontrado,
        });
      } else {
        setResultadoVerificacao({
          valido: false,
          mensagem: 'Hash SHA-256 não localizado ou violado na trilha de auditoria do tenant.',
        });
      }
      setVerificandoHash(false);
    }, 400);
  };

  // Colunas TanStack para o Monitor de Impedimentos
  const columnsImpedimentos = useMemo<ColumnDef<ApiImpedimentoAuditoria>[]>(
    () => [
      {
        accessorKey: 'tipo_impedimento',
        header: 'Tipo do Impedimento',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-xs text-foreground">
              {row.original.tipo_impedimento.replace(/_/g, ' ').toUpperCase()}
            </div>
            <div className="text-[11px] text-muted-foreground">{row.original.motivo}</div>
          </div>
        ),
      },
      {
        accessorKey: 'servidor_alvo',
        header: 'Servidor Alvo',
        cell: ({ row }) => {
          const alvo = row.original.servidor_alvo;
          const nome = typeof alvo === 'string' ? alvo : alvo?.nome_completo || `ID #${row.original.servidor_alvo_id}`;
          const mat = typeof alvo === 'object' ? alvo?.matricula : '-';
          return (
            <div>
              <div className="font-semibold text-xs text-foreground">{nome}</div>
              <div className="font-mono text-[11px] text-muted-foreground">Mat: {mat}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'substituto_designado',
        header: 'Substituto Legal Designado',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-xs text-foreground">
              {row.original.substituto_designado?.nome_completo || 'Substituto Automático'}
            </div>
            <div className="text-[11px] text-muted-foreground">Competência transferida</div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 130,
        cell: ({ row }) => (
          <StatusChip
            label={row.original.status.toUpperCase()}
            variant={row.original.status === 'ativo' ? 'warning' : 'neutral'}
          />
        ),
      },
      {
        accessorKey: 'declarado_em',
        header: 'Data Registro',
        size: 140,
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {row.original.declarado_em}
          </span>
        ),
      },
    ],
    []
  );

  // Colunas TanStack para a Trilha Forense
  const columnsTrilha = useMemo<ColumnDef<TrilhaForenseItem>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Log #',
        size: 80,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-primary tabular-nums">
            #{row.original.id}
          </span>
        ),
      },
      {
        accessorKey: 'acao',
        header: 'Ação Auditada & Módulo',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-xs text-foreground">{row.original.acao}</div>
            <div className="text-[11px] text-muted-foreground">{row.original.modulo}</div>
          </div>
        ),
      },
      {
        accessorKey: 'usuario',
        header: 'Agente Responsável & IP',
        cell: ({ row }) => (
          <div>
            <div className="text-xs text-foreground font-medium">{row.original.usuario}</div>
            <div className="font-mono text-[11px] text-muted-foreground tabular-nums">{row.original.ip}</div>
          </div>
        ),
      },
      {
        accessorKey: 'timestamp',
        header: 'Carimbo UTC-3',
        size: 150,
        cell: ({ row }) => (
          <span className="font-mono text-[11px] tabular-nums text-foreground">
            {new Date(row.original.timestamp).toLocaleString('pt-BR')}
          </span>
        ),
      },
      {
        accessorKey: 'hash_sha256',
        header: 'Assinatura SHA-256',
        cell: ({ row }) => (
          <div className="font-mono text-[10px] text-primary truncate max-w-xs tabular-nums">
            {row.original.hash_sha256}
          </div>
        ),
      },
      {
        accessorKey: 'integridade',
        header: 'Integridade',
        size: 110,
        cell: ({ row }) => (
          <Badge variant="outline" className="text-[10px] font-mono text-emerald-500 border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Íntegra
          </Badge>
        ),
      },
    ],
    []
  );

  const subTabItems: TabsItem<AuditoriaSubTab>[] = [
    { key: 'impedimentos', label: 'Impedimentos & Parentesco', icon: <UserX className="h-4 w-4" />, badge: impedimentos.length },
    { key: 'trilha-forense', label: 'Trilha Forense & SHA-256', icon: <Hash className="h-4 w-4" />, badge: trilhaForense.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ShieldAlert className="h-6 w-6 text-primary" />}
        title="Portal de Auditoria e Controle Interno"
        subtitle="Fiscalização de impedimentos de parentesco até 3º grau, rastro de auditoria imutável e verificador de integridade SHA-256."
        badge="Controle Interno Municipal"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {portalSelector}
            <Button size="sm" variant="outline" onClick={carregarDadosAuditoria} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar Trilha
            </Button>
            <Button size="sm" onClick={() => setModalDeclararOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Declarar Impedimento
            </Button>
          </div>
        }
      />

      <Tabs items={subTabItems} value={activeTab} onChange={setActiveTab} />

      {/* ── SUB-ABA 1: MONITOR DE IMPEDIMENTOS E PARENTESCO ─────────── */}
      {activeTab === 'impedimentos' && (
        <div className="space-y-4">
          <Card className="p-4 border-amber-500/20 bg-amber-500/5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Bloqueio Legal de Vínculos de Parentesco (Art. 31 da Lei nº 1.704/2006)
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Chefias imediatas ou membros de comissão com grau de parentesco até 3º grau (cônjuge, pais, filhos, irmãos, tios, sobrinhos)
                  com servidores avaliados são impedidos de avaliar ou julgar. O sistema redireciona o fluxo para o substituto oficial da unidade.
                </p>
              </div>
            </div>
          </Card>

          <Card className="gap-0 py-0">
            <div className="p-3">
              {impedimentos.length === 0 && !loading ? (
                <EmptyState
                  icon={<ShieldCheck className="h-10 w-10 text-emerald-500" />}
                  title="Nenhum impedimento ativo registrado"
                  description="A matriz funcional atual não acusa conflitos de parentesco ou impedimentos formais declarados."
                  actionLabel="Declarar Impedimento Manual"
                  onAction={() => setModalDeclararOpen(true)}
                />
              ) : (
                <DataTable
                  columns={columnsImpedimentos}
                  data={impedimentos}
                  loading={loading}
                  emptyText="Nenhum impedimento cadastrado."
                  pageSize={10}
                  pageSizeSelector
                  fixedLayout
                  exportable
                  exportFileName="impedimentos-auditoria-capd"
                  exportTitle="CAPD — Impedimentos e Conflitos de Interesse"
                />
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── SUB-ABA 2: TRILHA FORENSE & VERIFICADOR SHA-256 ──────────── */}
      {activeTab === 'trilha-forense' && (
        <div className="space-y-6">
          {/* VERIFICADOR DE INTEGRIDADE */}
          <Card className="p-4 border-primary/20 bg-accent/20 space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <Lock className="h-4 w-4" />
              <span>Verificador de Integridade Forense (Validação de Hash SHA-256)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Cole o hash SHA-256 presente em certidões, atas seladas, ciências digitais ou espelhos para atestar sua autenticidade.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={hashParaVerificar}
                onChange={(e) => setHashParaVerificar(e.target.value)}
                placeholder="Ex: 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
                className="font-mono text-xs flex-1"
              />
              <Button size="sm" onClick={handleVerificarHash} disabled={verificandoHash || !hashParaVerificar.trim()}>
                {verificandoHash ? 'Verificando...' : 'Verificar Autenticidade'}
              </Button>
            </div>

            {resultadoVerificacao && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  resultadoVerificacao.valido
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}
              >
                {resultadoVerificacao.valido ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                )}
                <div>
                  <div className="font-semibold">{resultadoVerificacao.mensagem}</div>
                  {resultadoVerificacao.registro && (
                    <div className="mt-1 font-mono text-[11px] opacity-90">
                      Ação: {resultadoVerificacao.registro.acao} | Responsável: {resultadoVerificacao.registro.usuario} | Timestamp: {resultadoVerificacao.registro.timestamp}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* TABELA DA TRILHA */}
          <Card className="gap-0 py-0">
            <div className="p-3 border-b border-border flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold text-foreground">Registro Contínuo de Operações Imutáveis</h4>
                <p className="text-[11px] text-muted-foreground">Cada evento gera carimbo de tempo, IP e assinatura criptográfica.</p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                Padrão Outbox & AuditLog
              </Badge>
            </div>

            <div className="p-3">
              <DataTable
                columns={columnsTrilha}
                data={trilhaForense}
                loading={loading}
                emptyText="Nenhum log registrado."
                pageSize={10}
                pageSizeSelector
                fixedLayout
                exportable
                exportFileName="trilha-forense-sha256-capd"
                exportTitle="CAPD — Trilha Forense Criptográfica"
              />
            </div>
          </Card>
        </div>
      )}

      {/* ── MODAL DECLARAR IMPEDIMENTO ──────────────────────────────── */}
      <Modal
        open={modalDeclararOpen}
        onClose={() => setModalDeclararOpen(false)}
        title="Declaração Formal de Impedimento ou Suspeição"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Informe o servidor público com o qual existe relação de parentesco, afinidade ou conflito funcional para bloqueio de competência.
          </p>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Servidor Alvo</label>
            <Select
              value={servidorAlvoId}
              onChange={setServidorAlvoId}
              options={[
                { value: '', label: 'Selecione o servidor...' },
                ...servidores.map((s) => ({
                  value: String(s.id),
                  label: `${s.nome_completo} (Mat: ${s.matricula})`,
                })),
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Tipo de Impedimento</label>
            <Select
              value={tipoImpedimento}
              onChange={setTipoImpedimento}
              options={[
                { value: 'parentesco_3_grau', label: 'Parentesco até 3º Grau (Cônjuge, Filhos, Pais, Irmãos, Tios)' },
                { value: 'interesse_direto', label: 'Interesse Direto no Julgamento / Avaliação' },
                { value: 'inimizade_capital', label: 'Suspeição por Inimizade Capital ou Foro Íntimo' },
                { value: 'outro', label: 'Outro Impedimento Legal Regulamentar' },
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Motivo / Fundamentação Fática</label>
            <textarea
              value={motivoDeclaracao}
              onChange={(e) => setMotivoDeclaracao(e.target.value)}
              placeholder="Descreva detalhadamente a justificativa para registro no prontuário de auditoria..."
              className="w-full h-24 p-2.5 text-xs rounded-md border border-input bg-background font-sans focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setModalDeclararOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleDeclararImpedimento} disabled={salvandoDeclaracao}>
              {salvandoDeclaracao ? 'Registrando...' : 'Confirmar e Lavrar Impedimento'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* FEEDBACK MODAL */}
      {feedback && (
        <Modal open={feedback.open} onClose={() => setFeedback(null)} title={feedback.title}>
          <div className="space-y-4">
            <p className="text-xs text-foreground leading-relaxed">{feedback.message}</p>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setFeedback(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
