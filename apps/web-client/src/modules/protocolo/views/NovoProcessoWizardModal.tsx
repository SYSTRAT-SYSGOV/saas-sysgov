import React, { useState, useEffect } from 'react';
import {
  Modal,
  Stepper,
  Button,
  Input,
  Textarea,
  Select,
  Card,
  CardContent,
  PessoaPicker,
} from '@sysgov/ui';
import type { ProtocoloSdk } from '@sysgov/sdk';
import { protocoloApi } from '../api';
import { apiClient } from '@/core/api/client';
import { FileText, User, Upload, Tag, Send, AlertCircle, Trash2, Plus } from 'lucide-react';

interface NovoProcessoWizardModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (processo: ProtocoloSdk.Processo) => void;
}

interface OrgaoOption {
  value: string;
  label: string;
}

interface AtributoItem {
  chave: string;
  label: string;
  tipo: ProtocoloSdk.TipoAtributo;
  valor: string;
}

export function NovoProcessoWizardModal({
  open,
  onClose,
  onSuccess,
}: NovoProcessoWizardModalProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  // Dados Etapa 1: Dados Gerais
  const [assunto, setAssunto] = useState('');
  const [origem, setOrigem] = useState<ProtocoloSdk.ProcessoOrigem>('interna');
  const [orgaoOrigemId, setOrgaoOrigemId] = useState<string>('');
  const [descricao, setDescricao] = useState('');
  const [sigiloso, setSigiloso] = useState(false);

  // Dados Etapa 2: Interessado
  const [interessadoId, setInteressadoId] = useState<number | null>(null);

  // Dados Etapa 3: Documentos
  const [arquivos, setArquivos] = useState<{ file: File; titulo: string; categoria: string }[]>([]);
  const [docTitulo, setDocTitulo] = useState('');
  const [docCategoria, setDocCategoria] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Dados Etapa 4: Atributos Dinâmicos
  const [atributos, setAtributos] = useState<AtributoItem[]>([]);
  const [novoAttrChave, setNovoAttrChave] = useState('');
  const [novoAttrLabel, setNovoAttrLabel] = useState('');
  const [novoAttrTipo, setNovoAttrTipo] = useState<ProtocoloSdk.TipoAtributo>('texto');
  const [novoAttrValor, setNovoAttrValor] = useState('');

  // Dados Etapa 5: Primeiro Andamento
  const [orgaoDestinoId, setOrgaoDestinoId] = useState<string>('');
  const [tipoTramitacaoId, setTipoTramitacaoId] = useState<string>('');
  const [despachoInicial, setDespachoInicial] = useState('');

  // Opções de apoio
  const [orgaos, setOrgaos] = useState<OrgaoOption[]>([]);
  const [tiposTramitacao, setTiposTramitacao] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (open) {
      // Carregar órgãos da prefeitura
      apiClient.get<{ id: number; name: string; code?: string }[]>('/org/units')
        .then((res) => {
          const list = (res.data || []).map((o) => ({
            value: String(o.id),
            label: o.code ? `[${o.code}] ${o.name}` : o.name,
          }));
          setOrgaos(list);
          if (list.length > 0 && !orgaoOrigemId) {
            setOrgaoOrigemId(list[0].value);
            setOrgaoDestinoId(list[0].value);
          }
        })
        .catch(() => {});

      // Carregar tipos de tramitação
      protocoloApi.listarTiposTramitacao()
        .then((lista) => {
          const list = lista.filter((t) => t.ativo).map((t) => ({
            value: String(t.id),
            label: t.nome,
          }));
          setTiposTramitacao(list);
          if (list.length > 0 && !tipoTramitacaoId) {
            setTipoTramitacaoId(list[0].value);
          }
        })
        .catch(() => {});
    }
  }, [open]);

  const steps = [
    { title: 'Geral', description: 'Assunto e origem', icon: <FileText className="w-4 h-4" /> },
    { title: 'Interessado', description: 'Cidadão ou Órgão', icon: <User className="w-4 h-4" /> },
    { title: 'Documentos', description: 'Anexos iniciais', icon: <Upload className="w-4 h-4" /> },
    { title: 'Atributos', description: 'Dados customizados', icon: <Tag className="w-4 h-4" /> },
    { title: 'Envio', description: 'Destino inicial', icon: <Send className="w-4 h-4" /> },
  ];

  const handleNext = () => {
    setErroValidacao(null);
    if (step === 0) {
      if (!assunto.trim()) {
        setErroValidacao('O assunto do processo é obrigatório.');
        return;
      }
      if (!orgaoOrigemId) {
        setErroValidacao('Selecione o órgão de origem.');
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handlePrev = () => {
    setErroValidacao(null);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleAdicionarArquivo = () => {
    if (!selectedFile) return;
    setArquivos((prev) => [
      ...prev,
      {
        file: selectedFile,
        titulo: docTitulo.trim() || selectedFile.name,
        categoria: docCategoria.trim() || 'Geral',
      },
    ]);
    setSelectedFile(null);
    setDocTitulo('');
    setDocCategoria('');
  };

  const handleRemoverArquivo = (index: number) => {
    setArquivos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAdicionarAtributo = () => {
    if (!novoAttrChave.trim() || !novoAttrValor.trim()) return;
    setAtributos((prev) => [
      ...prev,
      {
        chave: novoAttrChave.trim().toLowerCase(),
        label: novoAttrLabel.trim() || novoAttrChave.trim(),
        tipo: novoAttrTipo,
        valor: novoAttrValor.trim(),
      },
    ]);
    setNovoAttrChave('');
    setNovoAttrLabel('');
    setNovoAttrValor('');
  };

  const handleRemoverAtributo = (index: number) => {
    setAtributos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFinalizar = async () => {
    setErroValidacao(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('assunto', assunto.trim());
      formData.append('origem', origem);
      formData.append('orgao_origem_id', orgaoOrigemId);
      if (descricao.trim()) formData.append('descricao', descricao.trim());
      if (sigiloso) formData.append('sigiloso', '1');
      if (interessadoId) formData.append('interessado_id', String(interessadoId));

      if (orgaoDestinoId) formData.append('orgao_destino_id', orgaoDestinoId);
      if (tipoTramitacaoId) formData.append('tipo_tramitacao_id', tipoTramitacaoId);
      if (despachoInicial.trim()) formData.append('despacho_inicial', despachoInicial.trim());

      // Atributos dinâmicos
      atributos.forEach((attr, idx) => {
        formData.append(`atributos[${idx}][chave]`, attr.chave);
        formData.append(`atributos[${idx}][label]`, attr.label);
        formData.append(`atributos[${idx}][tipo_atributo]`, attr.tipo);
        formData.append(`atributos[${idx}][tipo]`, attr.tipo);
        formData.append(`atributos[${idx}][valor]`, attr.valor);
      });

      // Documentos anexos
      arquivos.forEach((item, idx) => {
        formData.append(`documentos[${idx}][arquivo]`, item.file);
        formData.append(`documentos[${idx}][titulo]`, item.titulo);
        formData.append(`documentos[${idx}][tipo_documento]`, item.categoria || 'anexo');
        formData.append(`documentos[${idx}][categoria]`, item.categoria || 'anexo');
      });

      const novo = await protocoloApi.criarProcesso(formData);
      onSuccess(novo);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Falha ao autuar processo administrativo.';
      setErroValidacao(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Abertura de Processo Administrativo"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" onClick={step === 0 ? onClose : handlePrev} disabled={submitting}>
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </Button>
          <div className="flex gap-2">
            {step < steps.length - 1 ? (
              <Button onClick={handleNext} disabled={submitting}>
                Próximo
              </Button>
            ) : (
              <Button onClick={handleFinalizar} isLoading={submitting}>
                Autuar Processo
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <Stepper steps={steps} currentStep={step} onStepClick={setStep} />

        {erroValidacao && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erroValidacao}</span>
          </div>
        )}

        {/* ETAPA 1: DADOS GERAIS */}
        {step === 0 && (
          <div className="space-y-4">
            <Input
              label="Assunto do Processo *"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Ex: Solicitação de Alvará de Construção"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Origem do Processo *"
                value={origem}
                onChange={(val) => setOrigem(val as ProtocoloSdk.ProcessoOrigem)}
                options={[
                  { value: 'interna', label: 'Interna (Iniciativa do Órgão)' },
                  { value: 'externa', label: 'Externa (Cidadão / Empresa)' },
                ]}
              />

              <Select
                label="Órgão de Origem / Autuação *"
                value={orgaoOrigemId}
                onChange={setOrgaoOrigemId}
                options={orgaos}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                Descrição Detalhada / Resumo do Pedido
              </label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
                placeholder="Descreva o contexto ou objetivo do processo..."
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="sigiloso"
                checked={sigiloso}
                onChange={(e) => setSigiloso(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="sigiloso" className="text-sm font-medium text-foreground cursor-pointer">
                Processo com tramitação sigilosa (restrito)
              </label>
            </div>
          </div>
        )}

        {/* ETAPA 2: INTERESSADO */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vincule a pessoa física ou jurídica interessada cadastrada no município (MDM).
            </p>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Selecionar Pessoa Interessada
              </label>
              <PessoaPicker
                value={interessadoId}
                onChange={(id) => setInteressadoId(id)}
              />
            </div>
          </div>
        )}

        {/* ETAPA 3: DOCUMENTOS */}
        {step === 2 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-semibold">Anexar Documento</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label="Título do Documento"
                    value={docTitulo}
                    onChange={(e) => setDocTitulo(e.target.value)}
                    placeholder="Ex: Requerimento Assinado"
                  />
                  <Input
                    label="Categoria"
                    value={docCategoria}
                    onChange={(e) => setDocCategoria(e.target.value)}
                    placeholder="Ex: Petição, Comprovante, Parecer"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-border file:text-xs file:font-medium file:bg-muted"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAdicionarArquivo}
                    disabled={!selectedFile}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Adicionar à Lista
                  </Button>
                </div>
              </CardContent>
            </Card>

            {arquivos.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Documentos Anexados ({arquivos.length})
                </h4>
                {arquivos.map((arq, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-muted/40 border border-border rounded-md text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">{arq.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {arq.file.name} • {arq.categoria} •{' '}
                        <span className="font-mono tabular-nums">
                          {(arq.file.size / 1024).toFixed(1)} KB
                        </span>
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoverArquivo(idx)}
                      className="text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ETAPA 4: ATRIBUTOS DINÂMICOS */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-semibold">Adicionar Atributo Dinâmico</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <Input
                    label="Chave (slug)"
                    value={novoAttrChave}
                    onChange={(e) => setNovoAttrChave(e.target.value)}
                    placeholder="ex: valor_estimado"
                  />
                  <Input
                    label="Rótulo (Label)"
                    value={novoAttrLabel}
                    onChange={(e) => setNovoAttrLabel(e.target.value)}
                    placeholder="ex: Valor Estimado"
                  />
                  <Select
                    label="Tipo"
                    value={novoAttrTipo}
                    onChange={(val) => setNovoAttrTipo(val as ProtocoloSdk.TipoAtributo)}
                    options={[
                      { value: 'texto', label: 'Texto Curto' },
                      { value: 'numerico', label: 'Numérico (Inteiro)' },
                      { value: 'decimal', label: 'Decimal / Monetário' },
                      { value: 'data', label: 'Data (AAAA-MM-DD)' },
                      { value: 'texto_longo', label: 'Texto Longo' },
                      { value: 'lista', label: 'Lista' },
                    ]}
                  />
                  <Input
                    label="Valor"
                    value={novoAttrValor}
                    onChange={(e) => setNovoAttrValor(e.target.value)}
                    placeholder="ex: 150000.00"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAdicionarAtributo}
                  disabled={!novoAttrChave.trim() || !novoAttrValor.trim()}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Incluir Atributo
                </Button>
              </CardContent>
            </Card>

            {atributos.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Atributos Definidos ({atributos.length})
                </h4>
                {atributos.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-muted/40 border border-border rounded-md text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">{att.label}</p>
                      <p className="text-xs text-muted-foreground font-mono tabular-nums">
                        {att.chave} [{att.tipo}] = {att.valor}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoverAtributo(idx)}
                      className="text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ETAPA 5: PRIMEIRO ANDAMENTO */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Defina o despacho inaugural e o órgão inicial de destino do processo.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Órgão de Destino Inicial *"
                value={orgaoDestinoId}
                onChange={setOrgaoDestinoId}
                options={orgaos}
              />

              <Select
                label="Tipo de Tramitação Inicial *"
                value={tipoTramitacaoId}
                onChange={setTipoTramitacaoId}
                options={tiposTramitacao}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                Despacho Inicial de Abertura
              </label>
              <Textarea
                value={despachoInicial}
                onChange={(e) => setDespachoInicial(e.target.value)}
                rows={4}
                placeholder="Despacho inicial de encaminhamento do processo..."
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
