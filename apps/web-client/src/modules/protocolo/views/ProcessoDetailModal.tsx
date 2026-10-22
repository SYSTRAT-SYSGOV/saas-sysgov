import React, { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Timeline,
  Button,
  Badge,
  Card,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  Select,
  Textarea,
} from '@sysgov/ui';
import type { ProtocoloSdk } from '@sysgov/sdk';
import { protocoloApi } from '../api';
import { ProcessoStatusBadge } from '../components/ProcessoStatusBadge';
import { apiClient } from '@/core/api/client';
import {
  GitCommit,
  FileText,
  Tag,
  Link2,
  GitBranch,
  MapPin,
  ArrowRight,
  CheckCircle,
  Download,
  Trash2,
  Plus,
  AlertTriangle,
  Clock,
  Archive,
  FolderOpen,
  RotateCcw,
} from 'lucide-react';

interface ProcessoDetailModalProps {
  processoId: number | null;
  open: boolean;
  onClose: () => void;
  onProcessoUpdated?: () => void;
}

export function ProcessoDetailModal({
  processoId,
  open,
  onClose,
  onProcessoUpdated,
}: ProcessoDetailModalProps) {
  const [processo, setProcesso] = useState<ProtocoloSdk.Processo | null>(null);
  const [andamentos, setAndamentos] = useState<ProtocoloSdk.Andamento[]>([]);
  const [documentos, setDocumentos] = useState<ProtocoloSdk.Documento[]>([]);
  const [atributos, setAtributos] = useState<ProtocoloSdk.Atributo[]>([]);
  const [vinculos, setVinculos] = useState<ProtocoloSdk.Vinculo[]>([]);
  const [filhos, setFilhos] = useState<ProtocoloSdk.Processo[]>([]);
  const [localizacao, setLocalizacao] = useState<ProtocoloSdk.ProcessoLocalizacao | null>(null);
  const [permanencia, setPermanencia] = useState<ProtocoloSdk.ProcessoPermanenciaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('andamentos');

  // Modais de ação interna
  const [modalTramitarOpen, setModalTramitarOpen] = useState(false);
  const [modalConcluirOpen, setModalConcluirOpen] = useState(false);
  const [modalArquivarOpen, setModalArquivarOpen] = useState(false);
  const [modalReabrirOpen, setModalReabrirOpen] = useState(false);
  const [tipoArquivamento, setTipoArquivamento] = useState<'corrente' | 'intermediario' | 'permanente'>('corrente');
  const [despachoCicloVida, setDespachoCicloVida] = useState('');
  const [orgaos, setOrgaos] = useState<{ value: string; label: string }[]>([]);
  const [tiposTramitacao, setTiposTramitacao] = useState<{ value: string; label: string }[]>([]);
  const [destinoTramitarId, setDestinoTramitarId] = useState('');
  const [tipoTramitarId, setTipoTramitarId] = useState('');
  const [despachoTramitar, setDespachoTramitar] = useState('');
  const [submittingAcao, setSubmittingAcao] = useState(false);
  const [acaoErro, setAcaoErro] = useState<string | null>(null);

  // Novo Documento
  const [novoDocTitulo, setNovoDocTitulo] = useState('');
  const [novoDocCategoria, setNovoDocCategoria] = useState('');
  const [novoDocArquivo, setNovoDocArquivo] = useState<File | null>(null);

  // Novo Atributo
  const [novoAttrChave, setNovoAttrChave] = useState('');
  const [novoAttrLabel, setNovoAttrLabel] = useState('');
  const [novoAttrTipo, setNovoAttrTipo] = useState<ProtocoloSdk.TipoAtributo>('texto');
  const [novoAttrValor, setNovoAttrValor] = useState('');

  // Novo Vínculo
  const [novoVincTipo, setNovoVincTipo] = useState('');
  const [novoVincId, setNovoVincId] = useState('');
  const [novoVincPapel, setNovoVincPapel] = useState<ProtocoloSdk.PapelVinculo>('referencia');

  const carregarDados = () => {
    if (!processoId) return;
    setLoading(true);

    Promise.all([
      protocoloApi.obterProcesso(processoId),
      protocoloApi.listarAndamentos(processoId),
      protocoloApi.listarDocumentos(processoId),
      protocoloApi.listarAtributos(processoId),
      protocoloApi.listarVinculos(processoId),
      protocoloApi.listarFilhos(processoId),
      protocoloApi.obterLocalizacao(processoId),
      protocoloApi.obterPermanencia(processoId),
    ])
      .then(([proc, ands, docs, attrs, vincs, flhs, loc, perm]) => {
        setProcesso(proc);
        setAndamentos(ands);
        setDocumentos(docs);
        setAtributos(attrs);
        setVinculos(vincs);
        setFilhos(flhs);
        setLocalizacao(loc);
        setPermanencia(perm);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open && processoId) {
      carregarDados();

      // Carregar opções de apoio
      apiClient.get<{ id: number; name: string; code?: string }[]>('/org/units')
        .then((res) => {
          const list = (res.data || []).map((o) => ({
            value: String(o.id),
            label: o.code ? `[${o.code}] ${o.name}` : o.name,
          }));
          setOrgaos(list);
          if (list.length > 0 && !destinoTramitarId) setDestinoTramitarId(list[0].value);
        })
        .catch(() => {});

      protocoloApi.listarTiposTramitacao()
        .then((lista) => {
          const list = lista.filter((t) => t.ativo).map((t) => ({
            value: String(t.id),
            label: t.nome,
          }));
          setTiposTramitacao(list);
          if (list.length > 0 && !tipoTramitarId) setTipoTramitarId(list[0].value);
        })
        .catch(() => {});
    }
  }, [open, processoId]);

  const handleTramitar = async () => {
    if (!processoId || !destinoTramitarId || !tipoTramitarId) return;
    setSubmittingAcao(true);
    setAcaoErro(null);

    try {
      await protocoloApi.tramitarProcesso(processoId, {
        orgao_destino_id: Number(destinoTramitarId),
        tipo_tramitacao_id: Number(tipoTramitarId),
        despacho: despachoTramitar.trim() || undefined,
      });
      setModalTramitarOpen(false);
      setDespachoTramitar('');
      carregarDados();
      onProcessoUpdated?.();
    } catch (err: any) {
      setAcaoErro(err.response?.data?.message || 'Falha ao tramitar processo.');
    } finally {
      setSubmittingAcao(false);
    }
  };

  const handleReceber = async () => {
    if (!processoId) return;
    setSubmittingAcao(true);
    setAcaoErro(null);

    try {
      await protocoloApi.receberProcesso(processoId);
      carregarDados();
      onProcessoUpdated?.();
    } catch (err: any) {
      setAcaoErro(err.response?.data?.message || 'Falha ao confirmar recebimento.');
    } finally {
      setSubmittingAcao(false);
    }
  };

  const handleConcluir = async () => {
    if (!processoId) return;
    setSubmittingAcao(true);
    setAcaoErro(null);

    try {
      await protocoloApi.concluirProcesso(processoId, { despacho: despachoCicloVida.trim() || undefined });
      setModalConcluirOpen(false);
      setDespachoCicloVida('');
      carregarDados();
      onProcessoUpdated?.();
    } catch (err: any) {
      setAcaoErro(err.response?.data?.message || 'Falha ao concluir processo.');
    } finally {
      setSubmittingAcao(false);
    }
  };

  const handleArquivar = async () => {
    if (!processoId) return;
    setSubmittingAcao(true);
    setAcaoErro(null);

    try {
      await protocoloApi.arquivarProcesso(processoId, {
        tipo_arquivamento: tipoArquivamento,
        despacho: despachoCicloVida.trim() || undefined,
      });
      setModalArquivarOpen(false);
      setDespachoCicloVida('');
      carregarDados();
      onProcessoUpdated?.();
    } catch (err: any) {
      setAcaoErro(err.response?.data?.message || 'Falha ao arquivar processo.');
    } finally {
      setSubmittingAcao(false);
    }
  };

  const handleDesarquivar = async () => {
    if (!processoId) return;
    setSubmittingAcao(true);
    setAcaoErro(null);

    try {
      await protocoloApi.desarquivarProcesso(processoId);
      carregarDados();
      onProcessoUpdated?.();
    } catch (err: any) {
      setAcaoErro(err.response?.data?.message || 'Falha ao desarquivar processo.');
    } finally {
      setSubmittingAcao(false);
    }
  };

  const handleReabrir = async () => {
    if (!processoId) return;
    setSubmittingAcao(true);
    setAcaoErro(null);

    try {
      await protocoloApi.reabrirProcesso(processoId, { motivo: despachoCicloVida.trim() || undefined });
      setModalReabrirOpen(false);
      setDespachoCicloVida('');
      carregarDados();
      onProcessoUpdated?.();
    } catch (err: any) {
      setAcaoErro(err.response?.data?.message || 'Falha ao reabrir processo.');
    } finally {
      setSubmittingAcao(false);
    }
  };

  const handleAnexarDoc = async () => {
    if (!processoId || !novoDocArquivo) return;
    const formData = new FormData();
    formData.append('arquivo', novoDocArquivo);
    formData.append('titulo', novoDocTitulo.trim() || novoDocArquivo.name);
    if (novoDocCategoria.trim()) formData.append('categoria', novoDocCategoria.trim());

    try {
      await protocoloApi.anexarDocumento(processoId, formData);
      setNovoDocArquivo(null);
      setNovoDocTitulo('');
      setNovoDocCategoria('');
      const docs = await protocoloApi.listarDocumentos(processoId);
      setDocumentos(docs);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao anexar documento.');
    }
  };

  const handleExcluirDoc = async (docId: number) => {
    if (!processoId) return;
    if (!confirm('Deseja excluir este documento?')) return;
    try {
      await protocoloApi.excluirDocumento(processoId, docId);
      setDocumentos((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao excluir documento.');
    }
  };

  const handleAdicionarAttr = async () => {
    if (!processoId || !novoAttrChave.trim() || !novoAttrValor.trim()) return;
    try {
      await protocoloApi.salvarAtributo(processoId, {
        chave: novoAttrChave.trim().toLowerCase(),
        label: novoAttrLabel.trim() || novoAttrChave.trim(),
        tipo: novoAttrTipo,
        valor: novoAttrValor.trim(),
      });
      setNovoAttrChave('');
      setNovoAttrLabel('');
      setNovoAttrValor('');
      const atts = await protocoloApi.listarAtributos(processoId);
      setAtributos(atts);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao salvar atributo.');
    }
  };

  const handleRemoverAttr = async (chave: string) => {
    if (!processoId) return;
    if (!confirm(`Deseja remover o atributo "${chave}"?`)) return;
    try {
      await protocoloApi.removerAtributo(processoId, chave);
      setAtributos((prev) => prev.filter((a) => a.chave !== chave));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao remover atributo.');
    }
  };

  const handleAdicionarVinc = async () => {
    if (!processoId || !novoVincTipo.trim() || !novoVincId.trim()) return;
    try {
      await protocoloApi.criarVinculo(processoId, {
        entidade_tipo: novoVincTipo.trim().toLowerCase(),
        entidade_id: Number(novoVincId),
        papel_vinculo: novoVincPapel,
      });
      setNovoVincTipo('');
      setNovoVincId('');
      const vincs = await protocoloApi.listarVinculos(processoId);
      setVinculos(vincs);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao criar vínculo.');
    }
  };

  const handleRemoverVinc = async (vincId: number) => {
    if (!processoId) return;
    if (!confirm('Deseja remover este vínculo?')) return;
    try {
      await protocoloApi.removerVinculo(processoId, vincId);
      setVinculos((prev) => prev.filter((v) => v.id !== vincId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao remover vínculo.');
    }
  };

  if (!processo) {
    return null;
  }

  const andamentoAtual = processo.andamento_atual;
  const podeReceber = andamentoAtual && andamentoAtual.data_recebimento === null && processo.status !== 'concluido' && processo.status !== 'arquivado';
  const podeTramitar = processo.status !== 'concluido' && processo.status !== 'arquivado';
  const podeConcluir = processo.status !== 'concluido' && processo.status !== 'arquivado';
  const podeArquivar = processo.status !== 'arquivado';
  const podeDesarquivar = processo.status === 'arquivado';
  const podeReabrir = processo.status === 'concluido' || processo.status === 'arquivado';

  // Montar itens de timeline para andamentos
  const timelineItems = andamentos.map((and) => ({
    id: and.id,
    title: (
      <span className="flex items-center gap-2">
        <span>#{and.sequencia} - {and.tipo_tramitacao?.nome || 'Tramitação'}</span>
        {and.and_atual && <Badge variant="cyan">Atual</Badge>}
      </span>
    ),
    subtitle: `${and.orgao_origem?.name || 'Origem'} ➔ ${and.orgao_destino?.name || 'Destino'} (por ${and.usuario?.name || 'Sistema'})`,
    date: and.data_recebimento
      ? `Recebido em: ${new Date(and.data_recebimento).toLocaleString('pt-BR')}`
      : `Enviado em: ${new Date(and.created_at).toLocaleString('pt-BR')} (Em trânsito)`,
    content: and.despacho ? `Despacho: ${and.despacho}` : undefined,
    status: and.and_atual ? ('current' as const) : ('completed' as const),
  }));

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`Processo ${processo.numero_formatado}`}
        size="2xl"
        footer={
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {podeReceber && (
                <Button variant="outline" onClick={handleReceber} isLoading={submittingAcao}>
                  <CheckCircle className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Confirmar Recebimento
                </Button>
              )}
              {podeTramitar && (
                <Button onClick={() => setModalTramitarOpen(true)}>
                  <ArrowRight className="w-4 h-4 mr-1.5" />
                  Tramitar
                </Button>
              )}
              {podeConcluir && (
                <Button variant="secondary" onClick={() => { setDespachoCicloVida(''); setModalConcluirOpen(true); }}>
                  <CheckCircle className="w-4 h-4 mr-1.5 text-indigo-600" />
                  Concluir
                </Button>
              )}
              {podeArquivar && (
                <Button variant="outline" onClick={() => { setDespachoCicloVida(''); setModalArquivarOpen(true); }}>
                  <Archive className="w-4 h-4 mr-1.5 text-amber-600" />
                  Arquivar
                </Button>
              )}
              {podeDesarquivar && (
                <Button variant="outline" onClick={handleDesarquivar} isLoading={submittingAcao}>
                  <FolderOpen className="w-4 h-4 mr-1.5 text-cyan-600" />
                  Desarquivar
                </Button>
              )}
              {podeReabrir && (
                <Button variant="outline" onClick={() => { setDespachoCicloVida(''); setModalReabrirOpen(true); }}>
                  <RotateCcw className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Reabrir
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="flex items-center gap-3 pb-2 border-b border-border flex-wrap">
            <span className="font-mono tabular-nums text-lg font-bold text-foreground">
              {processo.numero_formatado}
            </span>
            <ProcessoStatusBadge status={processo.status} />
            {processo.tipo_processo && (
              <Badge variant="indigo">{processo.tipo_processo.replace('_', ' ').toUpperCase()}</Badge>
            )}
            {processo.arquivamento_tipo && (
              <Badge variant="warning">Fase: {processo.arquivamento_tipo.toUpperCase()}</Badge>
            )}
            {processo.sigiloso && <Badge variant="danger">Sigiloso</Badge>}
          </div>
          {/* Cabeçalho de metadados do processo */}
          <div className="p-4 bg-muted/30 border border-border rounded-lg grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Assunto:</span>
              <span className="font-semibold text-foreground">{processo.assunto}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Interessado:</span>
              <span className="text-foreground">
                {processo.interessado?.nome || 'Não especificado'}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Localização Atual:</span>
              <span className="font-semibold text-primary">
                {processo.orgao_atual?.name || 'Não atribuído'}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Data de Abertura:</span>
              <span className="font-mono tabular-nums text-foreground">
                {new Date(processo.data_abertura).toLocaleString('pt-BR')}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Origem:</span>
              <span className="capitalize text-foreground">{processo.origem}</span>
            </div>
            {processo.data_conclusao && (
              <div>
                <span className="text-xs text-muted-foreground block">Conclusão:</span>
                <span className="font-mono tabular-nums text-emerald-600 font-semibold">
                  {new Date(processo.data_conclusao).toLocaleString('pt-BR')}
                </span>
              </div>
            )}
          </div>

          {/* Abas de Detalhe */}
          <div className="border-b border-border flex gap-4 text-sm font-medium">
            <button
              onClick={() => setActiveTab('andamentos')}
              className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'andamentos'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <GitCommit className="w-4 h-4" />
              Andamentos ({andamentos.length})
            </button>
            <button
              onClick={() => setActiveTab('documentos')}
              className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'documentos'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-4 h-4" />
              Documentos ({documentos.length})
            </button>
            <button
              onClick={() => setActiveTab('atributos')}
              className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'atributos'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Tag className="w-4 h-4" />
              Atributos ({atributos.length})
            </button>
            <button
              onClick={() => setActiveTab('vinculos')}
              className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'vinculos'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Link2 className="w-4 h-4" />
              Vínculos ({vinculos.length})
            </button>
            <button
              onClick={() => setActiveTab('filhos')}
              className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'filhos'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              Subprocessos ({filhos.length})
            </button>
            <button
              onClick={() => setActiveTab('rastreamento')}
              className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'rastreamento'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="w-4 h-4" />
              Permanência
            </button>
          </div>

          {/* ABA 1: ANDAMENTOS EM TIMELINE */}
          {activeTab === 'andamentos' && (
            <div className="py-2">
              {timelineItems.length > 0 ? (
                <Timeline items={timelineItems} />
              ) : (
                <p className="text-center text-sm text-muted-foreground py-6">
                  Nenhum andamento registrado.
                </p>
              )}
            </div>
          )}

          {/* ABA 2: DOCUMENTOS */}
          {activeTab === 'documentos' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/20 border border-border rounded-md">
                <input
                  type="file"
                  onChange={(e) => setNovoDocArquivo(e.target.files?.[0] || null)}
                  className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-border file:text-xs file:font-medium file:bg-muted"
                />
                <Input
                  placeholder="Título (opcional)"
                  value={novoDocTitulo}
                  onChange={(e) => setNovoDocTitulo(e.target.value)}
                  className="max-w-[200px]"
                />
                <Input
                  placeholder="Categoria"
                  value={novoDocCategoria}
                  onChange={(e) => setNovoDocCategoria(e.target.value)}
                  className="max-w-[150px]"
                />
                <Button size="sm" onClick={handleAnexarDoc} disabled={!novoDocArquivo}>
                  <Plus className="w-4 h-4 mr-1" /> Anexar
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Hash SHA-256</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentos.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium text-foreground">{doc.titulo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{doc.nome_arquivo}</TableCell>
                      <TableCell className="font-mono tabular-nums text-xs">
                        {(doc.tamanho_bytes / 1024).toFixed(1)} KB
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground" title={doc.hash_sha256}>
                        {doc.hash_sha256.slice(0, 12)}...
                      </TableCell>
                      <TableCell className="font-mono tabular-nums text-xs">
                        {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <a
                          href={protocoloApi.downloadDocumentoUrl(doc.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center p-1.5 text-primary hover:bg-primary/10 rounded"
                          title="Download seguro"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExcluirDoc(doc.id)}
                          className="text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {documentos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                        Nenhum documento anexado ao processo.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* ABA 3: ATRIBUTOS */}
          {activeTab === 'atributos' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 p-3 bg-muted/20 border border-border rounded-md">
                <Input
                  placeholder="Chave"
                  value={novoAttrChave}
                  onChange={(e) => setNovoAttrChave(e.target.value)}
                />
                <Input
                  placeholder="Rótulo"
                  value={novoAttrLabel}
                  onChange={(e) => setNovoAttrLabel(e.target.value)}
                />
                <Select
                  value={novoAttrTipo}
                  onChange={(val) => setNovoAttrTipo(val as ProtocoloSdk.TipoAtributo)}
                  options={[
                    { value: 'texto', label: 'Texto' },
                    { value: 'numerico', label: 'Numérico' },
                    { value: 'decimal', label: 'Decimal' },
                    { value: 'data', label: 'Data' },
                    { value: 'texto_longo', label: 'Texto Longo' },
                  ]}
                />
                <Input
                  placeholder="Valor"
                  value={novoAttrValor}
                  onChange={(e) => setNovoAttrValor(e.target.value)}
                />
                <Button size="sm" onClick={handleAdicionarAttr} disabled={!novoAttrChave.trim() || !novoAttrValor.trim()}>
                  <Plus className="w-4 h-4 mr-1" /> Salvar
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chave</TableHead>
                    <TableHead>Rótulo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atributos.map((att) => (
                    <TableRow key={att.id}>
                      <TableCell className="font-mono text-xs">{att.chave}</TableCell>
                      <TableCell className="font-medium">{att.label}</TableCell>
                      <TableCell className="text-xs text-muted-foreground uppercase">{att.tipo}</TableCell>
                      <TableCell className="font-mono tabular-nums text-sm font-semibold text-foreground">
                        {String(att.valor_formatado ?? att.valor)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoverAttr(att.chave)}
                          className="text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {atributos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        Nenhum atributo dinâmico cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* ABA 4: VÍNCULOS */}
          {activeTab === 'vinculos' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 bg-muted/20 border border-border rounded-md">
                <Input
                  placeholder="Tipo (ex: processo, contrato)"
                  value={novoVincTipo}
                  onChange={(e) => setNovoVincTipo(e.target.value)}
                />
                <Input
                  placeholder="ID da Entidade"
                  value={novoVincId}
                  onChange={(e) => setNovoVincId(e.target.value)}
                />
                <Select
                  value={novoVincPapel}
                  onChange={(val) => setNovoVincPapel(val as ProtocoloSdk.PapelVinculo)}
                  options={[
                    { value: 'referencia', label: 'Referência' },
                    { value: 'apensado', label: 'Apensado' },
                    { value: 'origem', label: 'Origem' },
                  ]}
                />
                <Button size="sm" onClick={handleAdicionarVinc} disabled={!novoVincTipo.trim() || !novoVincId.trim()}>
                  <Plus className="w-4 h-4 mr-1" /> Vincular
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Papel</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Resumo</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vinculos.map((vinc) => (
                    <TableRow key={vinc.id}>
                      <TableCell>
                        <Badge variant={vinc.papel_vinculo === 'origem' ? 'cyan' : 'neutral'}>
                          {vinc.papel_vinculo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{vinc.entidade_tipo}</TableCell>
                      <TableCell className="font-mono tabular-nums text-xs">#{vinc.entidade_id}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {vinc.resumo?.titulo || 'Sem detalhes adicionais'}
                      </TableCell>
                      <TableCell className="text-right">
                        {vinc.papel_vinculo !== 'origem' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoverVinc(vinc.id)}
                            className="text-rose-600 hover:text-rose-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {vinculos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        Nenhum vínculo externo cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* ABA 5: SUBPROCESSOS FILHOS */}
          {activeTab === 'filhos' && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Órgão Atual</TableHead>
                    <TableHead>Data Abertura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filhos.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono tabular-nums font-semibold">
                        {f.numero_formatado}
                      </TableCell>
                      <TableCell>{f.assunto}</TableCell>
                      <TableCell>
                        <ProcessoStatusBadge status={f.status} />
                      </TableCell>
                      <TableCell className="text-xs">{f.orgao_atual?.name}</TableCell>
                      <TableCell className="font-mono tabular-nums text-xs">
                        {new Date(f.data_abertura).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filhos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        Nenhum subprocesso filho vinculado hierarquicamente.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* ABA 6: TEMPO DE PERMANÊNCIA E RASTREAMENTO */}
          {activeTab === 'rastreamento' && (
            <div className="space-y-4">
              {localizacao && (
                <div className="p-3.5 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-md grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Situação Atual:</span>
                    <span className="font-semibold capitalize text-sky-800 dark:text-sky-300">
                      {localizacao.situacao.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Órgão em Posse:</span>
                    <span className="font-semibold text-foreground">
                      {localizacao.orgao_atual?.name || 'Em trânsito'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Tempo Aberto:</span>
                    <span className="font-mono tabular-nums font-bold text-foreground">
                      {(localizacao.tempo_aberto_segundos / 86400).toFixed(1)} dias
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Prazo Regimental:</span>
                    <span className="font-mono tabular-nums text-foreground">
                      {localizacao.prazo_dias ? `${localizacao.prazo_dias} dias` : 'Não definido'}
                    </span>
                  </div>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seq</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Órgão Destino</TableHead>
                    <TableHead>Recebido Em</TableHead>
                    <TableHead>Tempo em Trânsito</TableHead>
                    <TableHead>Tempo de Posse</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permanencia.map((item) => (
                    <TableRow key={item.andamento_id}>
                      <TableCell className="font-mono tabular-nums">#{item.sequencia}</TableCell>
                      <TableCell>
                        <Badge variant={item.situacao === 'concluido' ? 'success' : item.situacao === 'em_posse' ? 'cyan' : 'warning'}>
                          {item.situacao}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-xs">{item.orgao_destino?.name}</TableCell>
                      <TableCell className="font-mono tabular-nums text-xs">
                        {item.data_recebimento ? new Date(item.data_recebimento).toLocaleString('pt-BR') : 'Não recebido'}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums text-xs">
                        {(item.tempo_transito_segundos / 3600).toFixed(1)} h
                      </TableCell>
                      <TableCell className="font-mono tabular-nums text-xs font-semibold text-foreground">
                        {(item.tempo_permanencia_segundos / 86400).toFixed(1)} dias
                      </TableCell>
                    </TableRow>
                  ))}
                  {permanencia.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                        Nenhum registro de permanência disponível.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL DE TRAMITAÇÃO */}
      <Modal
        open={modalTramitarOpen}
        onClose={() => setModalTramitarOpen(false)}
        title={`Tramitar Processo ${processo.numero_formatado}`}
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setModalTramitarOpen(false)} disabled={submittingAcao}>
              Cancelar
            </Button>
            <Button onClick={handleTramitar} isLoading={submittingAcao}>
              Enviar Processo
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {acaoErro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{acaoErro}</span>
            </div>
          )}

          <Select
            label="Órgão de Destino *"
            value={destinoTramitarId}
            onChange={setDestinoTramitarId}
            options={orgaos}
          />

          <Select
            label="Tipo de Tramitação *"
            value={tipoTramitarId}
            onChange={setTipoTramitarId}
            options={tiposTramitacao}
          />

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Despacho / Justificativa
            </label>
            <Textarea
              value={despachoTramitar}
              onChange={(e) => setDespachoTramitar(e.target.value)}
              rows={4}
              placeholder="Insira as determinações ou considerações deste despacho..."
            />
          </div>
        </div>
      </Modal>

      {/* MODAL DE CONCLUIR PROCESSO */}
      <Modal
        open={modalConcluirOpen}
        onClose={() => setModalConcluirOpen(false)}
        title={`Concluir Processo ${processo.numero_formatado}`}
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setModalConcluirOpen(false)} disabled={submittingAcao}>
              Cancelar
            </Button>
            <Button onClick={handleConcluir} isLoading={submittingAcao}>
              Confirmar Conclusão
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {acaoErro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{acaoErro}</span>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            A conclusão encerra as tramitações ativas do processo e registra a data formal de encerramento.
          </p>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Despacho Final de Conclusão (opcional)
            </label>
            <Textarea
              value={despachoCicloVida}
              onChange={(e) => setDespachoCicloVida(e.target.value)}
              rows={3}
              placeholder="Termo de encerramento / parecer conclusivo..."
            />
          </div>
        </div>
      </Modal>

      {/* MODAL DE ARQUIVAR PROCESSO */}
      <Modal
        open={modalArquivarOpen}
        onClose={() => setModalArquivarOpen(false)}
        title={`Arquivar Processo ${processo.numero_formatado}`}
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setModalArquivarOpen(false)} disabled={submittingAcao}>
              Cancelar
            </Button>
            <Button onClick={handleArquivar} isLoading={submittingAcao}>
              Confirmar Arquivamento
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {acaoErro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{acaoErro}</span>
            </div>
          )}
          <Select
            label="Fase de Arquivamento *"
            value={tipoArquivamento}
            onChange={(val) => setTipoArquivamento(val as 'corrente' | 'intermediario' | 'permanente')}
            options={[
              { value: 'corrente', label: 'Arquivo Corrente (fácil acesso / em uso periódico)' },
              { value: 'intermediario', label: 'Arquivo Intermediário (aguardando prazo prescricional)' },
              { value: 'permanente', label: 'Arquivo Permanente / Histórico (guarda definitiva)' },
            ]}
          />
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Guia de Arquivamento / Despacho
            </label>
            <Textarea
              value={despachoCicloVida}
              onChange={(e) => setDespachoCicloVida(e.target.value)}
              rows={3}
              placeholder="Localização física/digital na caixa ou arquivo..."
            />
          </div>
        </div>
      </Modal>

      {/* MODAL DE REABRIR PROCESSO */}
      <Modal
        open={modalReabrirOpen}
        onClose={() => setModalReabrirOpen(false)}
        title={`Reabrir Processo ${processo.numero_formatado}`}
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setModalReabrirOpen(false)} disabled={submittingAcao}>
              Cancelar
            </Button>
            <Button onClick={handleReabrir} isLoading={submittingAcao}>
              Confirmar Reabertura
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {acaoErro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{acaoErro}</span>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            A reabertura cria um novo andamento auditado de reabertura, permitindo novas tramitações e andamentos.
          </p>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Motivação da Reabertura *
            </label>
            <Textarea
              value={despachoCicloVida}
              onChange={(e) => setDespachoCicloVida(e.target.value)}
              rows={3}
              placeholder="Descreva o motivo legal ou administrativo para desarquivamento e reabertura..."
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
