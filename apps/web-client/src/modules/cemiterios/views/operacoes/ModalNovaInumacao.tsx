import React, { useEffect, useState } from 'react';
import {
  User,
  FileText,
  Calendar,
  Clock,
  MapPin,
  HardHat,
  UploadCloud,
  FileCheck,
  X,
  History,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import {
  Button,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
  Tabs,
  StatusChip,
} from '@/components/ui';
import {
  cemiteriosApi,
  type Cemiterio,
  type Jazigo,
} from '../../api';
import { ErroBox, Mono, useAcao } from '../comum';

interface ModalNovaInumacaoProps {
  aberto: boolean;
  modoInicial?: 'regular' | 'historica';
  cemiterioAtivo?: Cemiterio | null;
  cemiterioAtivoId?: number | null;
  onFechar: () => void;
  onSucesso: () => Promise<void>;
}

export const ModalNovaInumacao: React.FC<ModalNovaInumacaoProps> = ({
  aberto,
  modoInicial = 'regular',
  cemiterioAtivo,
  cemiterioAtivoId,
  onFechar,
  onSucesso,
}) => {
  const [modo, setModo] = useState<'regular' | 'historica'>(modoInicial);
  const { erro, enviando, executar, setErro } = useAcao();

  // Estados dos campos
  const [nome, setNome] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [falecimento, setFalecimento] = useState('');
  const [causaMorte, setCausaMorte] = useState('');

  const [certidaoNumero, setCertidaoNumero] = useState('');
  const [certidaoCartorio, setCertidaoCartorio] = useState('');
  const [cartorioRegistro, setCartorioRegistro] = useState('');
  const [medico, setMedico] = useState('');
  const [certidaoArquivo, setCertidaoArquivo] = useState<File | null>(null);

  const [plotId, setPlotId] = useState<string>('');
  const [gavetaNumero, setGavetaNumero] = useState<string>('');

  const [sepultadoEm, setSepultadoEm] = useState('');
  const [coveiroNome, setCoveiroNome] = useState('');
  const [pedreiroNome, setPedreiroNome] = useState('');
  const [equipe, setEquipe] = useState('');

  // Campos específicos de Inumação Histórica
  const [livroReferencia, setLivroReferencia] = useState('');

  // Jazigos disponíveis para seleção
  const [jazigos, setJazigos] = useState<Jazigo[]>([]);
  const [carregandoJazigos, setCarregandoJazigos] = useState(false);

  useEffect(() => {
    if (aberto) {
      setModo(modoInicial);
      setErro(null);
      setNome('');
      setNascimento('');
      setFalecimento('');
      setCausaMorte('');
      setCertidaoNumero('');
      setCertidaoCartorio('');
      setCartorioRegistro('');
      setMedico('');
      setCertidaoArquivo(null);
      setPlotId('');
      setGavetaNumero('');
      setSepultadoEm('');
      setCoveiroNome('');
      setPedreiroNome('');
      setEquipe('');
      setLivroReferencia('');

      // Carregar jazigos do cemitério ativo
      if (cemiterioAtivoId) {
        setCarregandoJazigos(true);
        cemiteriosApi
          .jazigos({ park_id: cemiterioAtivoId, per_page: 100 })
          .then((res) => {
            setJazigos(res.data ?? []);
          })
          .catch(() => {
            setJazigos([]);
          })
          .finally(() => {
            setCarregandoJazigos(false);
          });
      }
    }
  }, [aberto, modoInicial, cemiterioAtivoId, setErro]);

  const opcoesJazigos = jazigos.map((j) => ({
    value: String(j.id),
    label: `${j.codigo} — Setor: ${j.setor?.descricao || j.setor?.codigo || 'Geral'} · Tipo: ${j.tipo} (${j.estado})`,
  }));

  const jazigoSelecionado = jazigos.find((j) => String(j.id) === plotId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!plotId) {
      return;
    }

    const payload: Record<string, unknown> = {
      falecido: {
        nome,
        nascimento: nascimento || undefined,
        falecimento,
        certidao_numero: certidaoNumero || undefined,
        certidao_cartorio: certidaoCartorio || undefined,
        causa_morte: causaMorte || undefined,
      },
      plot_id: Number(plotId),
      gaveta_numero: gavetaNumero ? Number(gavetaNumero) : undefined,
      sepultado_em: sepultadoEm,
      coveiro_nome: coveiroNome || undefined,
      pedreiro_nome: pedreiroNome || undefined,
      equipe: equipe || undefined,
      cartorio: cartorioRegistro || undefined,
      medico: medico || undefined,
    };

    if (certidaoArquivo) {
      payload.certidao_arquivo = certidaoArquivo;
    }

    if (modo === 'historica') {
      payload.livro_referencia = livroReferencia;
    }

    const resultado = await executar(async () => {
      if (modo === 'historica') {
        return await cemiteriosApi.inumarHistorica(payload);
      } else {
        return await cemiteriosApi.inumar(payload);
      }
    });

    if (resultado) {
      await onSucesso();
      onFechar();
    }
  };

  const formId = 'form-nova-inumacao';

  return (
    <Modal
      open={aberto}
      onClose={onFechar}
      size="2xl"
      title={modo === 'historica' ? 'Lançamento de Inumação Histórica' : 'Nova Inumação'}
      description={
        cemiterioAtivo
          ? `Registro de sepultamento vinculado à necrópole ${cemiterioAtivo.nome}.`
          : 'Registro oficial de sepultamento municipal.'
      }
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            <span className="text-destructive font-bold">*</span> Campos de preenchimento obrigatório.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" type="button" onClick={onFechar} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" form={formId} disabled={enviando}>
              {enviando ? 'Gravando registro…' : modo === 'historica' ? 'Salvar Registro Histórico' : 'Confirmar Inumação'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Seletor de Tipo de Lançamento */}
        <div className="flex items-center justify-between border-b pb-3">
          <Tabs
            items={[
              { key: 'regular', label: 'Inumação Regular (Com Certidão)' },
              { key: 'historica', label: 'Lançamento Histórico (Livro / Arquivo)' },
            ]}
            value={modo}
            onChange={(v) => setModo(v as 'regular' | 'historica')}
          />
          {cemiterioAtivo && (
            <StatusChip
              label={cemiterioAtivo.nome}
              variant="info"
              className="max-w-[240px] truncate hidden sm:inline-flex"
            />
          )}
        </div>

        <form id={formId} onSubmit={handleSubmit} className="space-y-6">
          {/* ── 1. Dados do Falecido ── */}
          <div className="rounded-xl border border-border bg-card/50 p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
              <User className="h-4 w-4 text-primary" />
              <span>1. Identificação do Falecido</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-6">
                <Field
                  label="Nome Completo do Falecido"
                  required
                  error={erro?.campos?.['falecido.nome']?.[0]}
                >
                  <Input
                    placeholder="Nome completo conforme certidão"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </Field>
              </div>

              <div className="sm:col-span-3">
                <Field
                  label="Data de Nascimento"
                  error={erro?.campos?.['falecido.nascimento']?.[0]}
                >
                  <Input
                    type="date"
                    className="font-mono tabular-nums"
                    value={nascimento}
                    onChange={(e) => setNascimento(e.target.value)}
                  />
                </Field>
              </div>

              <div className="sm:col-span-3">
                <Field
                  label="Data do Falecimento"
                  required
                  error={erro?.campos?.['falecido.falecimento']?.[0]}
                >
                  <Input
                    type="date"
                    className="font-mono tabular-nums"
                    value={falecimento}
                    onChange={(e) => setFalecimento(e.target.value)}
                    required
                  />
                </Field>
              </div>

              <div className="sm:col-span-12">
                <Field
                  label="Causa da Morte (Informação Sigilosa)"
                  hint="Cifrada no banco de dados. Visível apenas sob permissão estrita e auditoria."
                  error={erro?.campos?.['falecido.causa_morte']?.[0]}
                >
                  <div className="relative">
                    <Textarea
                      placeholder="Descreva a causa básica ou intermediária do óbito..."
                      value={causaMorte}
                      onChange={(e) => setCausaMorte(e.target.value)}
                      rows={2}
                    />
                    <div className="absolute right-2.5 top-2.5 flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded pointer-events-none">
                      <ShieldAlert className="h-3 w-3 text-amber-500" />
                      <span>Sigiloso</span>
                    </div>
                  </div>
                </Field>
              </div>
            </div>
          </div>

          {/* ── 2. Registro Civil & Certidão de Óbito ── */}
          <div className="rounded-xl border border-border bg-card/50 p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>2. Registro Civil e Certidão de Óbito</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-6">
                <Field
                  label="Nº da Certidão de Óbito"
                  required={modo === 'regular'}
                  error={erro?.campos?.['falecido.certidao_numero']?.[0]}
                >
                  <Input
                    placeholder="Matrícula da certidão (32 dígitos ou livro)"
                    className="font-mono tabular-nums"
                    value={certidaoNumero}
                    onChange={(e) => setCertidaoNumero(e.target.value)}
                    required={modo === 'regular'}
                  />
                </Field>
              </div>

              <div className="sm:col-span-6">
                <Field
                  label="Cartório Emissor da Certidão"
                  required={modo === 'regular'}
                  error={erro?.campos?.['falecido.certidao_cartorio']?.[0]}
                >
                  <Input
                    placeholder="Ex.: 1º Ofício de Registro Civil das Pessoas Naturais"
                    value={certidaoCartorio}
                    onChange={(e) => setCertidaoCartorio(e.target.value)}
                    required={modo === 'regular'}
                  />
                </Field>
              </div>

              <div className="sm:col-span-6">
                <Field
                  label="Cartório do Registro"
                  hint="Cartório de registro do óbito (opcional)"
                  error={erro?.campos?.cartorio?.[0]}
                >
                  <Input
                    placeholder="Nome ou comarca do cartório"
                    value={cartorioRegistro}
                    onChange={(e) => setCartorioRegistro(e.target.value)}
                  />
                </Field>
              </div>

              <div className="sm:col-span-6">
                <Field
                  label="Médico Atestante"
                  hint="Nome e CRM do médico que atestou o óbito"
                  error={erro?.campos?.medico?.[0]}
                >
                  <Input
                    placeholder="Dr(a). Nome Completo - CRM/UF"
                    value={medico}
                    onChange={(e) => setMedico(e.target.value)}
                  />
                </Field>
              </div>

              {/* Upload da Certidão com Visual Profissional */}
              <div className="sm:col-span-12">
                <Field
                  label="Arquivo da Certidão de Óbito (PDF ou Imagem)"
                  required={modo === 'regular'}
                  hint="Formatos aceitos: PDF, PNG, JPG até 10 MB."
                  error={erro?.campos?.certidao_arquivo?.[0]}
                >
                  <div className="space-y-2">
                    <input
                      id="upload-certidao-arquivo"
                      type="file"
                      accept=".pdf,image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setCertidaoArquivo(file);
                      }}
                      required={modo === 'regular' && !certidaoArquivo}
                    />

                    {certidaoArquivo ? (
                      <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 p-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileCheck className="h-5 w-5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <span className="font-mono text-xs font-semibold text-foreground block truncate">
                              {certidaoArquivo.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground block font-mono">
                              {(certidaoArquivo.size / 1024).toFixed(1)} KB · Documento pronto para envio
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-3">
                          <label
                            htmlFor="upload-certidao-arquivo"
                            className="cursor-pointer text-xs font-medium text-primary hover:underline px-2 py-1 rounded bg-background border border-border"
                          >
                            Trocar
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setCertidaoArquivo(null)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            title="Remover anexo"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="upload-certidao-arquivo"
                        className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-muted/15 p-4 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30"
                      >
                        <UploadCloud className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground">
                          Clique para anexar a certidão digitalizada
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          PDF ou Imagem digitalizada legível (máx. 10MB)
                        </span>
                      </label>
                    )}
                  </div>
                </Field>
              </div>
            </div>
          </div>

          {/* ── 3. Destinação & Jazigo ── */}
          <div className="rounded-xl border border-border bg-card/50 p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>3. Destinação e Localização do Jazigo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-8">
                <Field
                  label="Jazigo / Sepultura de Destino"
                  required
                  hint={
                    jazigoSelecionado
                      ? `Jazigo ${jazigoSelecionado.codigo} · Estado: ${jazigoSelecionado.estado}`
                      : 'Selecione o túmulo cadastrado na necrópole'
                  }
                  error={erro?.campos?.plot_id?.[0]}
                >
                  {opcoesJazigos.length > 0 ? (
                    <Select
                      value={plotId}
                      onChange={(v) => setPlotId(v ?? '')}
                      options={opcoesJazigos}
                      placeholder={carregandoJazigos ? 'Carregando jazigos…' : 'Selecione o jazigo…'}
                    />
                  ) : (
                    <Input
                      type="number"
                      placeholder="Informe o ID numérico do jazigo"
                      className="font-mono tabular-nums"
                      value={plotId}
                      onChange={(e) => setPlotId(e.target.value)}
                      required
                    />
                  )}
                </Field>
              </div>

              <div className="sm:col-span-4">
                <Field
                  label="Nº da Gaveta / Nicho"
                  hint="Nº da carneira ocupada"
                  error={erro?.campos?.gaveta_numero?.[0]}
                >
                  <Input
                    type="number"
                    min={1}
                    placeholder="Ex.: 1, 2, 3..."
                    className="font-mono tabular-nums"
                    value={gavetaNumero}
                    onChange={(e) => setGavetaNumero(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* ── 4. Operação & Equipe de Campo ── */}
          <div className="rounded-xl border border-border bg-card/50 p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
              <HardHat className="h-4 w-4 text-primary" />
              <span>4. Agendamento e Equipe Operacional</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-6">
                <Field
                  label={modo === 'historica' ? 'Data do Sepultamento' : 'Data e Hora do Sepultamento'}
                  required
                  error={erro?.campos?.sepultado_em?.[0]}
                >
                  <Input
                    type={modo === 'historica' ? 'date' : 'datetime-local'}
                    className="font-mono tabular-nums"
                    value={sepultadoEm}
                    onChange={(e) => setSepultadoEm(e.target.value)}
                    required
                  />
                </Field>
              </div>

              <div className="sm:col-span-6">
                <Field
                  label="Equipe de Sepultamento"
                  hint="Designação da equipe de campo"
                  error={erro?.campos?.equipe?.[0]}
                >
                  <Input
                    placeholder="Ex.: Equipe Alfa / Turno Matutino"
                    value={equipe}
                    onChange={(e) => setEquipe(e.target.value)}
                  />
                </Field>
              </div>

              <div className="sm:col-span-6">
                <Field
                  label="Coveiro Responsável"
                  hint="Profissional responsável pela abertura e fechamento"
                  error={erro?.campos?.coveiro_nome?.[0]}
                >
                  <Input
                    placeholder="Nome do coveiro municipal"
                    value={coveiroNome}
                    onChange={(e) => setCoveiroNome(e.target.value)}
                  />
                </Field>
              </div>

              <div className="sm:col-span-6">
                <Field
                  label="Pedreiro de Alvenaria"
                  hint="Profissional da alvenaria (se houver obra ou reforma)"
                  error={erro?.campos?.pedreiro_nome?.[0]}
                >
                  <Input
                    placeholder="Nome do pedreiro"
                    value={pedreiroNome}
                    onChange={(e) => setPedreiroNome(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* ── 5. Documentação Histórica (Apenas modo Histórica) ── */}
          {modo === 'historica' && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-500 border-b border-amber-500/20 pb-2">
                <History className="h-4 w-4" />
                <span>5. Assento no Livro de Registro Histórico</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-12">
                  <Field
                    label="Referência do Livro / Folha / Termo"
                    required
                    hint="Identificação do livro cartorial histórico para fins de conferência e auditoria"
                    error={erro?.campos?.livro_referencia?.[0]}
                  >
                    <Input
                      placeholder="Ex.: Livro B-12, Folha 45, Termo nº 1842"
                      value={livroReferencia}
                      onChange={(e) => setLivroReferencia(e.target.value)}
                      required
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}
        </form>

        <ErroBox erro={erro} />
      </div>
    </Modal>
  );
};
