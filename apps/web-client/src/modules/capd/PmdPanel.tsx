import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Input,
  Select,
  Modal,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@sysgov/ui';
import {
  TrendingUp,
  Plus,
  Eye,
  Edit2,
  CheckCircle,
  AlertTriangle,
  ClipboardList,
  ArrowUpRight,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';

const api = new SysgovApi();

interface PlanoMelhoria {
  id: number;
  servidor_id: number;
  ciclo_id: number;
  ciclo_verificacao_id?: number;
  nfc_gatilho: string;
  objetivos: string;
  acoes?: Array<{ descricao: string; prazo?: string; status?: string }>;
  prazo: string;
  status: 'pendente' | 'em_andamento' | 'concluido' | 'cancelado';
  concluido_em?: string;
  observacoes_verificacao?: string;
  ciclo?: { id: number; nome: string; ano_competencia: number };
  ciclo_verificacao?: { id: number; nome: string; ano_competencia: number };
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pendente:      { label: 'Pendente',      color: 'default' },
  em_andamento:  { label: 'Em Andamento',  color: 'secondary' },
  concluido:     { label: 'Concluído',     color: 'default' },
  cancelado:     { label: 'Outline',       color: 'outline' },
};

const STATUS_OPTIONS = [
  { value: '',           label: 'Todos os status' },
  { value: 'pendente',   label: 'Pendente' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluido',  label: 'Concluído' },
  { value: 'cancelado',  label: 'Cancelado' },
];

export const PmdPanel: React.FC = () => {
  const [pmds, setPmds]         = useState<PlanoMelhoria[]>([]);
  const [loading, setLoading]   = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [erro, setErro]         = useState<string | null>(null);
  const [detalhePmd, setDetalhePmd] = useState<PlanoMelhoria | null>(null);

  // Form verificação
  const [verModal, setVerModal]   = useState(false);
  const [nfcNova, setNfcNova]     = useState('');
  const [obsVerif, setObsVerif]   = useState('');
  const [pmdVerif, setPmdVerif]   = useState<PlanoMelhoria | null>(null);
  const [savingVerif, setSavingVerif] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const params = filtroStatus ? `?status=${filtroStatus}` : '';
      const resp = await api.get<PlanoMelhoria[]>(`/capd/pmd${params}`);
      setPmds(resp.data ?? []);
    } catch {
      setErro('Não foi possível carregar os PMDs.');
    } finally {
      setLoading(false);
    }
  }, [filtroStatus]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirVerificacao = (pmd: PlanoMelhoria) => {
    setPmdVerif(pmd);
    setNfcNova('');
    setObsVerif('');
    setVerModal(true);
  };

  const registrarVerificacao = async () => {
    if (!pmdVerif || !nfcNova || !obsVerif) return;
    setSavingVerif(true);
    try {
      await api.post(`/capd/pmd/${pmdVerif.id}/verificacao`, {
        nfc_novo_ciclo: parseFloat(nfcNova),
        observacoes: obsVerif,
      });
      setVerModal(false);
      carregar();
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao registrar verificação.');
    } finally {
      setSavingVerif(false);
    }
  };

  const badgeVariant = (status: string) => {
    if (status === 'concluido') return 'default';
    if (status === 'pendente') return 'secondary';
    if (status === 'cancelado') return 'outline';
    return 'secondary';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Planos de Melhoria de Desempenho (PMD)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerados automaticamente quando NFC está abaixo da nota de corte do ciclo (RF-09)
          </p>
        </div>
        <Select
          options={STATUS_OPTIONS}
          value={filtroStatus}
          onChange={v => setFiltroStatus(v as string)}
          placeholder="Filtrar status"
          className="w-44 text-xs"
        />
      </div>

      {erro && (
        <div className="flex items-start gap-2 bg-rose-950/50 border border-rose-500/30 rounded-lg p-3 text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm text-center py-8">Carregando...</div>
      ) : pmds.length === 0 ? (
        <div className="text-center py-10 bg-[#152244] rounded-xl border border-[#1a2a52]">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-slate-500" />
          <p className="text-slate-400 text-sm">Nenhum PMD {filtroStatus ? `com status "${filtroStatus}"` : 'cadastrado'}.</p>
        </div>
      ) : (
        <Card className="bg-[#152244] border-[#1a2a52]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Servidor</TableHead>
                <TableHead className="text-xs">Ciclo</TableHead>
                <TableHead className="text-xs text-center">NFC Gatilho</TableHead>
                <TableHead className="text-xs">Prazo</TableHead>
                <TableHead className="text-xs text-center">Status</TableHead>
                <TableHead className="text-xs">Verificação</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pmds.map(pmd => (
                <TableRow key={pmd.id}>
                  <TableCell>
                    <span className="font-mono text-xs text-slate-400">#{pmd.servidor_id}</span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {pmd.ciclo?.nome ?? `Ciclo #${pmd.ciclo_id}`}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-xs text-rose-400 font-bold">{pmd.nfc_gatilho}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {new Date(pmd.prazo).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={badgeVariant(pmd.status)} className="text-[10px]">
                      {STATUS_LABEL[pmd.status]?.label ?? pmd.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {pmd.ciclo_verificacao?.nome ?? '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Detalhes"
                        onClick={() => setDetalhePmd(pmd)}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      {(pmd.status === 'pendente' || pmd.status === 'em_andamento') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Registrar verificação de evolução"
                          onClick={() => abrirVerificacao(pmd)}
                        >
                          <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal Detalhe */}
      <Modal
        open={!!detalhePmd}
        onClose={() => setDetalhePmd(null)}
        title={`PMD #${detalhePmd?.id} — Servidor #${detalhePmd?.servidor_id}`}
        size="md"
      >
        {detalhePmd && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-slate-400 block">NFC Gatilho</span>
                <span className="font-mono text-rose-400 font-bold">{detalhePmd.nfc_gatilho} pts</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Prazo</span>
                <span className="font-mono text-xs">{new Date(detalhePmd.prazo).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">Objetivos</span>
              <p className="text-xs bg-[#101a3a] rounded p-2 text-slate-300">{detalhePmd.objetivos}</p>
            </div>
            {detalhePmd.acoes && detalhePmd.acoes.length > 0 && (
              <div>
                <span className="text-xs text-slate-400 block mb-1">Ações planejadas</span>
                <ul className="space-y-1">
                  {detalhePmd.acoes.map((acao, i) => (
                    <li key={i} className="text-xs bg-[#101a3a] rounded p-2 text-slate-300">
                      {acao.descricao}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {detalhePmd.observacoes_verificacao && (
              <div>
                <span className="text-xs text-slate-400 block mb-1">Observações de verificação</span>
                <p className="text-xs bg-[#101a3a] rounded p-2 text-slate-300">{detalhePmd.observacoes_verificacao}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Verificação */}
      <Modal
        open={verModal}
        onClose={() => setVerModal(false)}
        title="Registrar Verificação de Evolução"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-400">PMD #{pmdVerif?.id} — NFC gatilho: {pmdVerif?.nfc_gatilho} pts</p>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">NFC do novo ciclo (0–100) *</label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={nfcNova}
              onChange={e => setNfcNova(e.target.value)}
              placeholder="Ex.: 75.50"
              className="font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Observações da Comissão *</label>
            <textarea
              value={obsVerif}
              onChange={e => setObsVerif(e.target.value)}
              rows={3}
              placeholder="Descreva a evolução do servidor no período..."
              className="w-full bg-[#101a3a] border border-[#1a2a52] rounded-lg p-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setVerModal(false)}>Cancelar</Button>
            <Button
              variant="default"
              onClick={registrarVerificacao}
              disabled={savingVerif || !nfcNova || !obsVerif}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              {savingVerif ? 'Registrando...' : 'Confirmar Verificação'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PmdPanel;
