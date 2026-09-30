import React, { useState } from 'react';
import {
  User,
  Briefcase,
  MapPin,
  Contact,
  Search,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { Button, Modal, Select, Switch, Input, Field } from '@/components/ui';
import { pessoasApi, TIPOS_VINCULO, type TipoVinculo } from './api';
import { useCep } from './hooks/useCep';
import { ErroBox, useAcao } from './views/comum';

const opcoesVinculo = Object.entries(TIPOS_VINCULO).map(([value, label]) => ({ value, label }));

const opcoesSexo = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
  { value: 'Outro', label: 'Outro' },
];

const opcoesEstadoCivil = [
  { value: 'Solteiro(a)', label: 'Solteiro(a)' },
  { value: 'Casado(a)', label: 'Casado(a)' },
  { value: 'Divorciado(a)', label: 'Divorciado(a)' },
  { value: 'Viúvo(a)', label: 'Viúvo(a)' },
  { value: 'União Estável', label: 'União Estável' },
];

type Passo = 1 | 2 | 3 | 4;

interface NovaPessoaWizardProps {
  onFechar: () => void;
  onConcluido: () => Promise<void>;
}

export const NovaPessoaWizard: React.FC<NovaPessoaWizardProps> = ({ onFechar, onConcluido }) => {
  const [passo, setPasso] = useState<Passo>(1);
  const [pessoaId, setPessoaId] = useState<number | null>(null);

  // Estados dos formulários por etapa
  // Etapa 1: Dados Civis
  const [civil, setCivil] = useState({
    nome: '',
    cpf: '',
    nome_social: '',
    data_nascimento: '',
    sexo: '',
    nome_mae: '',
    nome_pai: '',
    estado_civil: '',
    nacionalidade: 'Brasileira',
    naturalidade: '',
    nis: '',
  });

  // Etapa 2: Vínculo
  const [vinculo, setVinculo] = useState({
    tipo_vinculo: '' as TipoVinculo | '',
    matricula: '',
    inicio: '',
  });

  // Etapa 3: Endereço
  const [endereco, setEndereco] = useState({
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  });

  // Etapa 4: Documento e Contato
  const [documento, setDocumento] = useState({
    tipo: 'rg' as 'rg' | 'cnh' | 'titulo_eleitor',
    numero: '',
    orgao_emissor: '',
    uf_emissao: '',
    data_emissao: '',
  });

  const [contato, setContato] = useState({
    tipo: 'celular' as 'celular' | 'email' | 'telefone',
    valor: '',
    principal: true,
    autoriza_notificacoes: true,
  });

  const { erro, enviando, executar, setErro } = useAcao();
  const { buscando: buscandoCep, erro: erroCep, buscarCep, limparErroCep } = useCep();
  const [cepMensagemSucesso, setCepMensagemSucesso] = useState<string | null>(null);

  // Formatar CPF com máscara ao digitar
  const handleCpfChange = (valor: string) => {
    const limpo = valor.replace(/\D/g, '').slice(0, 11);
    let formatado = limpo;
    if (limpo.length > 9) {
      formatado = `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-${limpo.slice(9)}`;
    } else if (limpo.length > 6) {
      formatado = `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6)}`;
    } else if (limpo.length > 3) {
      formatado = `${limpo.slice(0, 3)}.${limpo.slice(3)}`;
    }
    setCivil((c) => ({ ...c, cpf: formatado }));
  };

  // Consulta de CEP integrada
  const handleConsultarCep = async (cepParaBuscar?: string) => {
    limparErroCep();
    setCepMensagemSucesso(null);
    const cepAlvo = cepParaBuscar ?? endereco.cep;
    const res = await buscarCep(cepAlvo);
    if (res) {
      setEndereco((prev) => ({
        ...prev,
        cep: res.cep || cepAlvo,
        logradouro: res.logradouro || prev.logradouro,
        bairro: res.bairro || prev.bairro,
        cidade: res.localidade || prev.cidade,
        uf: res.uf || prev.uf,
      }));
      setCepMensagemSucesso(`Endereço localizado: ${res.localidade}/${res.uf}`);
    }
  };

  const handleCepInput = (valor: string) => {
    const limpo = valor.replace(/\D/g, '').slice(0, 8);
    const formatado = limpo.length > 5 ? `${limpo.slice(0, 5)}-${limpo.slice(5)}` : limpo;
    setEndereco((e) => ({ ...e, cep: formatado }));

    if (limpo.length === 8) {
      void handleConsultarCep(limpo);
    }
  };

  const concluir = () => {
    onFechar();
    void onConcluido();
  };

  // Submissão do passo atual
  const submeterPassoAtual = async (): Promise<boolean> => {
    if (!pessoaId) return true;

    // Passo 2: Vínculo
    if (passo === 2 && vinculo.tipo_vinculo) {
      const ok = await executar(() =>
        pessoasApi.adicionarVinculo(pessoaId, {
          tipo_vinculo: vinculo.tipo_vinculo as TipoVinculo,
          matricula: vinculo.matricula || undefined,
          inicio: vinculo.inicio || undefined,
        })
      );
      if (!ok) return false;
    }

    // Passo 3: Endereço
    if (passo === 3) {
      const temEndereco = endereco.cep || endereco.logradouro || endereco.cidade || endereco.uf;
      if (temEndereco) {
        const ok = await executar(() =>
          pessoasApi.adicionarEndereco(pessoaId, {
            cep: endereco.cep || null,
            logradouro: endereco.logradouro || null,
            numero: endereco.numero || null,
            complemento: endereco.complemento || null,
            bairro: endereco.bairro || null,
            cidade: endereco.cidade || null,
            uf: endereco.uf || null,
          })
        );
        if (!ok) return false;
      }
    }

    // Passo 4: Documento e Contato
    if (passo === 4) {
      if (documento.numero.trim()) {
        const okDoc = await executar(() =>
          pessoasApi.adicionarDocumento(pessoaId, {
            tipo: documento.tipo,
            numero: documento.numero.trim(),
            orgao_emissor: documento.orgao_emissor || undefined,
            uf_emissao: documento.uf_emissao || undefined,
            data_emissao: documento.data_emissao || undefined,
          })
        );
        if (!okDoc) return false;
      }

      if (contato.valor.trim()) {
        const okCtc = await executar(() =>
          pessoasApi.adicionarContato(pessoaId, {
            tipo: contato.tipo,
            valor: contato.valor.trim(),
            principal: contato.principal,
            autoriza_notificacoes: contato.autoriza_notificacoes,
          })
        );
        if (!okCtc) return false;
      }
    }

    return true;
  };

  const criarPessoa = async () => {
    setErro(null);
    const dadosEnvio: Record<string, unknown> = {
      nome: civil.nome.trim(),
      cpf: civil.cpf,
      nome_social: civil.nome_social.trim() || undefined,
      data_nascimento: civil.data_nascimento || undefined,
      sexo: civil.sexo || undefined,
      nome_mae: civil.nome_mae.trim() || undefined,
      nome_pai: civil.nome_pai.trim() || undefined,
      estado_civil: civil.estado_civil || undefined,
      nacionalidade: civil.nacionalidade.trim() || undefined,
      naturalidade: civil.naturalidade.trim() || undefined,
      nis: civil.nis.trim() || undefined,
    };

    const pessoa = await executar(() => pessoasApi.criar(dadosEnvio));
    if (!pessoa) return;
    setPessoaId(pessoa.id);
    setPasso(2);
  };

  const avancar = async () => {
    const ok = await submeterPassoAtual();
    if (!ok) return;
    if (passo === 4) {
      concluir();
      return;
    }
    setPasso((p) => (p + 1) as Passo);
  };

  const pular = () => {
    if (passo === 4) {
      concluir();
      return;
    }
    setPasso((p) => (p + 1) as Passo);
  };

  const passosConfig = [
    { num: 1, rotulo: 'Identificação Civil', icon: User },
    { num: 2, rotulo: 'Vínculo Funcional', icon: Briefcase },
    { num: 3, rotulo: 'Endereço e CEP', icon: MapPin },
    { num: 4, rotulo: 'Documentos e Contatos', icon: Contact },
  ];

  return (
    <Modal
      open
      onClose={onFechar}
      title="Cadastro de Pessoa Física"
      description="Cadastramento no Master Data (MDM) do ecossistema SYSGOV."
      size="2xl"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div>
            {passo > 1 && (
              <Button
                variant="outline"
                type="button"
                disabled={enviando}
                onClick={() => setPasso((p) => (p - 1) as Passo)}
              >
                ← Voltar
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" type="button" onClick={onFechar}>
              Cancelar
            </Button>
            {passo > 1 && passo < 4 && (
              <Button variant="ghost" type="button" disabled={enviando} onClick={pular}>
                Pular etapa
              </Button>
            )}
            {passo > 1 && passo < 4 && (
              <Button
                variant="outline"
                type="button"
                disabled={enviando}
                onClick={async () => {
                  const ok = await submeterPassoAtual();
                  if (ok) concluir();
                }}
              >
                Concluir agora
              </Button>
            )}
            <Button
              type="button"
              disabled={enviando}
              onClick={() => void (passo === 1 ? criarPessoa() : avancar())}
            >
              {enviando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…
                </>
              ) : passo === 4 ? (
                'Finalizar Cadastro'
              ) : (
                'Avançar →'
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* STEPPER VISUAL */}
        <div className="grid grid-cols-4 gap-2 border-b border-border pb-4">
          {passosConfig.map((item) => {
            const Icone = item.icon;
            const ativo = passo === item.num;
            const completado = passo > item.num;
            return (
              <div
                key={item.num}
                className={`flex items-center gap-2 rounded-lg border p-2.5 transition-colors ${
                  ativo
                    ? 'border-primary bg-primary/10 text-primary'
                    : completado
                    ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                    : 'border-border/60 bg-muted/20 text-muted-foreground'
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    ativo
                      ? 'bg-primary text-primary-foreground'
                      : completado
                      ? 'bg-emerald-600 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {completado ? <CheckCircle className="h-4 w-4" /> : item.num}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold">{item.rotulo}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {item.num === 1 ? 'Obrigatório' : 'Opcional'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <ErroBox erro={erro} />

        {/* PASSO 1: IDENTIFICAÇÃO CIVIL */}
        {passo === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">1. Identificação Básica</h3>
              <p className="text-xs text-muted-foreground">
                Informe os dados do documento oficial da pessoa física.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2">
                <Field label="Nome Completo" required>
                  <Input
                    placeholder="Ex: Maria Aparecida da Silva"
                    value={civil.nome}
                    onChange={(e) => setCivil({ ...civil, nome: e.target.value })}
                    required
                  />
                </Field>
              </div>

              <div>
                <Field label="CPF" required hint="Validação algorítmica de 11 dígitos">
                  <Input
                    className="font-mono tabular-nums"
                    placeholder="000.000.000-00"
                    value={civil.cpf}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    required
                  />
                </Field>
              </div>

              <div>
                <Field label="Nome Social" hint="Se houver registro oficial">
                  <Input
                    placeholder="Nome de preferência social"
                    value={civil.nome_social}
                    onChange={(e) => setCivil({ ...civil, nome_social: e.target.value })}
                  />
                </Field>
              </div>

              <div>
                <Field label="Data de Nascimento">
                  <Input
                    type="date"
                    className="font-mono tabular-nums"
                    value={civil.data_nascimento}
                    onChange={(e) => setCivil({ ...civil, data_nascimento: e.target.value })}
                  />
                </Field>
              </div>

              <div>
                <Field label="Sexo">
                  <Select
                    value={civil.sexo || null}
                    onChange={(v) => setCivil({ ...civil, sexo: String(v ?? '') })}
                    options={opcoesSexo}
                    placeholder="Selecione o sexo"
                  />
                </Field>
              </div>

              <div>
                <Field label="Estado Civil">
                  <Select
                    value={civil.estado_civil || null}
                    onChange={(v) => setCivil({ ...civil, estado_civil: String(v ?? '') })}
                    options={opcoesEstadoCivil}
                    placeholder="Selecione o estado civil"
                  />
                </Field>
              </div>

              <div>
                <Field label="Nacionalidade">
                  <Input
                    value={civil.nacionalidade}
                    onChange={(e) => setCivil({ ...civil, nacionalidade: e.target.value })}
                  />
                </Field>
              </div>

              <div>
                <Field label="Naturalidade (Cidade/UF)">
                  <Input
                    placeholder="Ex: Curitiba/PR"
                    value={civil.naturalidade}
                    onChange={(e) => setCivil({ ...civil, naturalidade: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Filiação e Identificadores Governamentais
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Field label="Nome da Mãe">
                    <Input
                      placeholder="Nome completo da mãe"
                      value={civil.nome_mae}
                      onChange={(e) => setCivil({ ...civil, nome_mae: e.target.value })}
                    />
                  </Field>
                </div>
                <div>
                  <Field label="Nome do Pai">
                    <Input
                      placeholder="Nome completo do pai"
                      value={civil.nome_pai}
                      onChange={(e) => setCivil({ ...civil, nome_pai: e.target.value })}
                    />
                  </Field>
                </div>
                <div>
                  <Field label="NIS (PIS/PASEP/NIT)" hint="Apenas dígitos">
                    <Input
                      className="font-mono tabular-nums"
                      placeholder="Ex: 12345678901"
                      value={civil.nis}
                      onChange={(e) => setCivil({ ...civil, nis: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASSO 2: VÍNCULO MUNICIPAL */}
        {passo === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">2. Vínculo com a Administração Pública</h3>
              <p className="text-xs text-muted-foreground">
                Associe esta pessoa a um cargo funcional, vínculo de servidor ou munícipe da cidade (opcional).
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Tipo de Vínculo Jurídico" hint="Define os papéis e permissões no município">
                  <Select
                    value={vinculo.tipo_vinculo || null}
                    onChange={(v) => setVinculo({ ...vinculo, tipo_vinculo: (v as TipoVinculo) || '' })}
                    options={opcoesVinculo}
                    placeholder="Selecione o tipo de vínculo (ou deixe em branco se não houver)"
                  />
                </Field>
              </div>

              <div>
                <Field label="Matrícula Funcional" hint="Para servidores públicos ou contratos CLT">
                  <Input
                    className="font-mono tabular-nums"
                    placeholder="Ex: MAT-2026-0042"
                    value={vinculo.matricula}
                    onChange={(e) => setVinculo({ ...vinculo, matricula: e.target.value })}
                  />
                </Field>
              </div>

              <div>
                <Field label="Data de Início do Vínculo">
                  <Input
                    type="date"
                    className="font-mono tabular-nums"
                    value={vinculo.inicio}
                    onChange={(e) => setVinculo({ ...vinculo, inicio: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* PASSO 3: ENDEREÇO COM BUSCA DE CEP */}
        {passo === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">3. Endereço Residencial ou Comercial</h3>
                <p className="text-xs text-muted-foreground">
                  Busca instantânea por CEP com auto-preenchimento de logradouro, bairro e cidade.
                </p>
              </div>
            </div>

            {/* BARRA DE CEP COM API INTEGRADA */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-48">
                  <Field label="CEP" hint="Digite os 8 dígitos">
                    <Input
                      className="font-mono tabular-nums font-semibold"
                      placeholder="00000-000"
                      value={endereco.cep}
                      onChange={(e) => handleCepInput(e.target.value)}
                    />
                  </Field>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mb-1"
                  disabled={buscandoCep}
                  onClick={() => void handleConsultarCep()}
                >
                  {buscandoCep ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando…
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" /> Consultar CEP
                    </>
                  )}
                </Button>
                {cepMensagemSucesso && (
                  <span className="mb-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    ✓ {cepMensagemSucesso}
                  </span>
                )}
                {erroCep && (
                  <span className="mb-2 text-xs font-medium text-destructive">
                    ✕ {erroCep}
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Logradouro (Rua, Avenida, Praça)">
                  <Input
                    placeholder="Ex: Rua das Flores"
                    value={endereco.logradouro}
                    onChange={(e) => setEndereco({ ...endereco, logradouro: e.target.value })}
                  />
                </Field>
              </div>

              <div>
                <Field label="Número" hint="Ou S/N">
                  <Input
                    className="font-mono tabular-nums"
                    placeholder="123"
                    value={endereco.numero}
                    onChange={(e) => setEndereco({ ...endereco, numero: e.target.value })}
                  />
                </Field>
              </div>

              <div>
                <Field label="Complemento">
                  <Input
                    placeholder="Apto 102, Bloco B"
                    value={endereco.complemento}
                    onChange={(e) => setEndereco({ ...endereco, complemento: e.target.value })}
                  />
                </Field>
              </div>

              <div>
                <Field label="Bairro">
                  <Input
                    placeholder="Centro"
                    value={endereco.bairro}
                    onChange={(e) => setEndereco({ ...endereco, bairro: e.target.value })}
                  />
                </Field>
              </div>

              <div>
                <Field label="Cidade">
                  <Input
                    placeholder="Curitiba"
                    value={endereco.cidade}
                    onChange={(e) => setEndereco({ ...endereco, cidade: e.target.value })}
                  />
                </Field>
              </div>

              <div>
                <Field label="UF">
                  <Input
                    className="font-mono uppercase"
                    maxLength={2}
                    placeholder="PR"
                    value={endereco.uf}
                    onChange={(e) => setEndereco({ ...endereco, uf: e.target.value.toUpperCase() })}
                  />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* PASSO 4: DOCUMENTOS E CONTATOS */}
        {passo === 4 && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* DOCUMENTO COMPLEMENTAR */}
            <div className="space-y-4 rounded-lg border border-border p-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Documento Adicional (RG / CNH)</h4>
                <p className="text-xs text-muted-foreground">
                  Adicione um segundo documento comprobatório para a identidade civil.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Tipo de Documento">
                    <Select
                      value={documento.tipo}
                      onChange={(v) =>
                        setDocumento({
                          ...documento,
                          tipo: (v as 'rg' | 'cnh' | 'titulo_eleitor') || 'rg',
                        })
                      }
                      options={[
                        { value: 'rg', label: 'RG — Registro Geral' },
                        { value: 'cnh', label: 'CNH — Carteira de Habilitação' },
                        { value: 'titulo_eleitor', label: 'Título de Eleitor' },
                      ]}
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field label="Número do Documento">
                    <Input
                      className="font-mono tabular-nums"
                      placeholder="Ex: 12.345.678-9"
                      value={documento.numero}
                      onChange={(e) => setDocumento({ ...documento, numero: e.target.value })}
                    />
                  </Field>
                </div>

                <div>
                  <Field label="Órgão Emissor">
                    <Input
                      placeholder="Ex: SESP, DETRAN"
                      value={documento.orgao_emissor}
                      onChange={(e) => setDocumento({ ...documento, orgao_emissor: e.target.value })}
                    />
                  </Field>
                </div>

                <div>
                  <Field label="UF de Emissão">
                    <Input
                      className="font-mono uppercase"
                      maxLength={2}
                      placeholder="PR"
                      value={documento.uf_emissao}
                      onChange={(e) =>
                        setDocumento({ ...documento, uf_emissao: e.target.value.toUpperCase() })
                      }
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field label="Data de Emissão">
                    <Input
                      type="date"
                      className="font-mono tabular-nums"
                      value={documento.data_emissao}
                      onChange={(e) => setDocumento({ ...documento, data_emissao: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* CONTATO PRINCIPAL */}
            <div className="space-y-4 rounded-lg border border-border p-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Canal de Contato Oficial</h4>
                <p className="text-xs text-muted-foreground">
                  Meio de contato para envio de avisos e notificações oficiais do município.
                </p>
              </div>

              <div className="space-y-3">
                <Field label="Tipo de Contato">
                  <Select
                    value={contato.tipo}
                    onChange={(v) =>
                      setContato({
                        ...contato,
                        tipo: (v as 'celular' | 'email' | 'telefone') || 'celular',
                      })
                    }
                    options={[
                      { value: 'celular', label: 'Celular (WhatsApp / SMS)' },
                      { value: 'email', label: 'E-mail' },
                      { value: 'telefone', label: 'Telefone Residencial/Fixo' },
                    ]}
                  />
                </Field>

                <Field
                  label="Valor do Contato"
                  hint={contato.tipo === 'email' ? 'Ex: cidadao@email.com' : 'Ex: (41) 99999-8888'}
                >
                  <Input
                    className="font-mono tabular-nums"
                    placeholder={contato.tipo === 'email' ? 'nome@dominio.com.br' : '(00) 00000-0000'}
                    value={contato.valor}
                    onChange={(e) => setContato({ ...contato, valor: e.target.value })}
                  />
                </Field>

                <div className="space-y-2 pt-2">
                  <Switch
                    label="Marcar como contato principal"
                    checked={contato.principal}
                    onCheckedChange={(v) => setContato({ ...contato, principal: v })}
                  />

                  <Switch
                    label="Autoriza envio de notificações oficiais"
                    checked={contato.autoriza_notificacoes}
                    onCheckedChange={(v) => setContato({ ...contato, autoriza_notificacoes: v })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default NovaPessoaWizard;
