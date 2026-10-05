import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  UserCheck,
  AlertTriangle,
  Search,
  Plus,
  Trash2,
  MapPin,
  Phone,
  FileText,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button, Field, Input, Modal, Select, Switch, Textarea } from '@/components/ui';
import { PessoaPicker } from '@sysgov/ui';
import {
  cemiteriosApi,
  consultarCep,
  type Concessionario,
  type ContatoAdicional,
} from '../api';
import { ErroBox, sanitizarTextoLegado, useAcao } from './comum';
import { usePessoaPicker } from '@/modules/pessoas/hooks';
import { pessoasApi } from '@/modules/pessoas/api';

export interface ModalEditarConcessionarioProps {
  concessionario: Concessionario | null;
  aberto: boolean;
  onFechar: () => void;
  onSalvo: () => void | Promise<void>;
  onAbrirFichaPessoa?: (pessoaId: number) => void;
}

const OPCOES_TIPO_CONTATO = [
  { value: 'celular', label: 'Celular' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telefone', label: 'Telefone Fixo' },
  { value: 'email', label: 'E-mail Alternativo' },
  { value: 'outro', label: 'Outro / Recado' },
];

export const ModalEditarConcessionario: React.FC<ModalEditarConcessionarioProps> = ({
  concessionario,
  aberto,
  onFechar,
  onSalvo,
  onAbrirFichaPessoa,
}) => {
  const { buscarPessoas, criarPessoaRapido } = usePessoaPicker();
  const { erro, enviando, executar, setErro } = useAcao();

  const [pessoaId, setPessoaId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [mostrarDocCompleto, setMostrarDocCompleto] = useState(false);
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [contatosAdicionais, setContatosAdicionais] = useState<ContatoAdicional[]>([]);

  // Endereço estruturado
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [statusCep, setStatusCep] = useState<'idle' | 'sucesso' | 'erro'>('idle');

  const [observacoes, setObservacoes] = useState('');
  const [baseLegal, setBaseLegal] = useState('execucao_contrato');
  const [titularFalecido, setTitularFalecido] = useState(false);
  const [dataFalecimento, setDataFalecimento] = useState('');
  const [processoInventario, setProcessoInventario] = useState('');

  useEffect(() => {
    if (aberto && concessionario) {
      setErro(null);
      setStatusCep('idle');
      setPessoaId(concessionario.pessoa_id ?? null);
      setNome(sanitizarTextoLegado(concessionario.nome) ?? '');
      // Usa documento desmascarado se disponível para acesso administrativo, senão o mascarado
      setDocumento(concessionario.documento_desmascarado || concessionario.documento_mascarado || '');
      setEmail(sanitizarTextoLegado(concessionario.email) ?? '');
      setTelefone(sanitizarTextoLegado(concessionario.telefone) ?? '');
      setContatosAdicionais(concessionario.contatos_adicionais ?? []);

      setCep(sanitizarTextoLegado(concessionario.cep) ?? '');
      setLogradouro(sanitizarTextoLegado(concessionario.logradouro) ?? (sanitizarTextoLegado(concessionario.endereco) ?? ''));
      setNumero(sanitizarTextoLegado(concessionario.numero) ?? '');
      setComplemento(sanitizarTextoLegado(concessionario.complemento) ?? '');
      setBairro(sanitizarTextoLegado(concessionario.bairro) ?? '');
      setCidade(sanitizarTextoLegado(concessionario.cidade) ?? '');
      setUf(sanitizarTextoLegado(concessionario.uf) ?? '');

      setObservacoes(sanitizarTextoLegado(concessionario.observacoes) ?? '');
      setBaseLegal(concessionario.base_legal || 'execucao_contrato');
      setTitularFalecido(Boolean(concessionario.titular_falecido));
      setDataFalecimento(concessionario.data_falecimento_titular ? String(concessionario.data_falecimento_titular).slice(0, 10) : '');
      setProcessoInventario(sanitizarTextoLegado(concessionario.processo_inventario) ?? '');
    }
  }, [aberto, concessionario, setErro]);

  // Consulta automática via API ViaCEP
  const handleBuscarCep = async (cepParaBuscar?: string) => {
    const valor = (cepParaBuscar ?? cep).replace(/\D/g, '');
    if (valor.length !== 8) return;

    setBuscandoCep(true);
    setStatusCep('idle');
    try {
      const res = await consultarCep(valor);
      if (res && !res.erro) {
        setLogradouro(res.logradouro || '');
        setBairro(res.bairro || '');
        setCidade(res.localidade || '');
        setUf(res.uf || '');
        if (res.complemento && !complemento) {
          setComplemento(res.complemento);
        }
        setStatusCep('sucesso');
      } else {
        setStatusCep('erro');
      }
    } catch {
      setStatusCep('erro');
    } finally {
      setBuscandoCep(false);
    }
  };

  const handlePessoaSelecionada = async (id: number | null, pessoaOption?: { nome?: string; cpf_mascarado?: string } | null) => {
    setPessoaId(id);
    if (!id) return;

    if (pessoaOption) {
      if (pessoaOption.nome) setNome(pessoaOption.nome);
      if (pessoaOption.cpf_mascarado) setDocumento(pessoaOption.cpf_mascarado);
    }

    try {
      const detalhes = await pessoasApi.obter(id);
      if (detalhes) {
        if (detalhes.nome) setNome(detalhes.nome);
        if (detalhes.cpf_mascarado) setDocumento(detalhes.cpf_mascarado);

        if (detalhes.falecido) {
          setTitularFalecido(true);
          if (detalhes.data_falecimento) {
            setDataFalecimento(detalhes.data_falecimento.slice(0, 10));
          }
        }
        const primEndereco = detalhes.enderecos?.[0];
        if (primEndereco) {
          if (primEndereco.cep) setCep(primEndereco.cep);
          if (primEndereco.logradouro) setLogradouro(primEndereco.logradouro);
          if (primEndereco.numero) setNumero(primEndereco.numero);
          if (primEndereco.complemento) setComplemento(primEndereco.complemento);
          if (primEndereco.bairro) setBairro(primEndereco.bairro);
          if (primEndereco.cidade) setCidade(primEndereco.cidade);
          if (primEndereco.uf) setUf(primEndereco.uf);
        }
        const emailContato = detalhes.contatos?.find((c) => c.tipo === 'email')?.valor;
        if (emailContato) setEmail(emailContato);
        const telContato = detalhes.contatos?.find((c) => c.tipo === 'celular' || c.tipo === 'telefone')?.valor;
        if (telContato) setTelefone(telContato);

        // Preenche contatos adicionais com outros contatos da pessoa
        const outrosContatos = detalhes.contatos
          ?.filter((c) => c.valor !== emailContato && c.valor !== telContato)
          .map((c) => ({
            tipo: (c.tipo === 'celular' || c.tipo === 'telefone' || c.tipo === 'email' ? c.tipo : 'outro') as ContatoAdicional['tipo'],
            valor: c.valor,
            descricao: c.principal ? 'Contato principal cadastrado no MDM' : undefined,
          }));
        if (outrosContatos && outrosContatos.length > 0) {
          setContatosAdicionais(outrosContatos);
        }
      }
    } catch (e) {
      console.warn('Não foi possível obter dados adicionais da pessoa:', e);
    }
  };

  const adicionarContatoAdicional = () => {
    setContatosAdicionais((prev) => [...prev, { tipo: 'celular', valor: '', descricao: '' }]);
  };

  const removerContatoAdicional = (index: number) => {
    setContatosAdicionais((prev) => prev.filter((_, i) => i !== index));
  };

  const atualizarContatoAdicional = (index: number, campo: keyof ContatoAdicional, valor: string) => {
    setContatosAdicionais((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [campo]: valor } : c))
    );
  };

  const salvar = async (ev?: React.FormEvent) => {
    if (ev) ev.preventDefault();
    if (!concessionario) return;

    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setErro({
        status: 422,
        mensagem: 'O nome completo do concessionário / titular é obrigatório.',
        campos: { nome: ['Informe o nome completo do titular para salvar.'] },
      });
      return;
    }

    const emailLimpo = email.trim();
    if (emailLimpo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      setErro({
        status: 422,
        mensagem: 'O formato do e-mail informado é inválido.',
        campos: { email: ['Informe um e-mail válido (ex.: nome@dominio.com).'] },
      });
      return;
    }

    const dadosParaEnvio: Partial<Concessionario> = {
      pessoa_id: pessoaId ?? undefined,
      nome: nomeLimpo,
      email: emailLimpo || null,
      telefone: telefone.trim() || null,
      contatos_adicionais: contatosAdicionais
        .filter((c) => c.valor && c.valor.trim() !== '')
        .map((c) => ({ tipo: c.tipo, valor: c.valor.trim(), descricao: c.descricao?.trim() || undefined })),
      cep: cep.trim() || null,
      logradouro: logradouro.trim() || null,
      numero: numero.trim() || null,
      complemento: complemento.trim() || null,
      bairro: bairro.trim() || null,
      cidade: cidade.trim() || null,
      uf: uf.trim() ? uf.trim().toUpperCase() : null,
      observacoes: observacoes.trim() || null,
      base_legal: baseLegal,
      titular_falecido: titularFalecido,
      data_falecimento_titular: titularFalecido && dataFalecimento.trim() ? dataFalecimento.trim() : null,
      processo_inventario: titularFalecido && processoInventario.trim() ? processoInventario.trim() : null,
    };

    const resultado = await executar(() => cemiteriosApi.atualizarConcessionario(concessionario.id, dadosParaEnvio));
    if (resultado) {
      await onSalvo();
      onFechar();
    }
  };

  if (!concessionario) return null;

  return (
    <Modal
      open={aberto}
      onClose={onFechar}
      title={`Editar Concessionário — #${concessionario.id}`}
      description="Gerencie os dados cadastrais, endereço com busca de CEP, múltiplos contatos e observações administrativas."
      size="2xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onFechar} type="button" disabled={enviando}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void salvar()}
            disabled={enviando}
          >
            {enviando ? 'Salvando…' : 'Salvar Alterações'}
          </Button>
        </div>
      }
    >
      <form
        id="form-editar-concessionario"
        onSubmit={(e) => {
          e.preventDefault();
          void salvar();
        }}
        className="space-y-5"
      >
        <ErroBox erro={erro} />
        {/* Banner de status MDM */}
        {pessoaId ? (
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold text-emerald-900 dark:text-emerald-200">Vinculado ao Cadastro Central (MDM)</span>
                <p className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                  Os dados mestres deste concessionário estão integrados ao munícipe #{pessoaId}.
                </p>
              </div>
            </div>
            {onAbrirFichaPessoa && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAbrirFichaPessoa(pessoaId)}
                className="h-7 text-xs gap-1.5 shrink-0 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
              >
                <span>Ficha MDM</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 text-xs">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold text-amber-900 dark:text-amber-200">Registro Legado Local</span>
                <p className="text-amber-700 dark:text-amber-400 text-[11px] mb-2">
                  Vincule este titular ao cadastro geral de munícipes para unificar os registros e evitar duplicidades.
                </p>
                <PessoaPicker
                  value={pessoaId}
                  onChange={(id, opt) => handlePessoaSelecionada(id, opt)}
                  onSearch={buscarPessoas}
                  onCreatePessoa={criarPessoaRapido}
                  placeholder="Pesquisar por nome ou CPF no cadastro central..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Aviso se o registro legado não possuía nome válido */}
        {!sanitizarTextoLegado(concessionario.nome) && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-amber-950 dark:text-amber-100">Titular sem nome no cadastro legado</span>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Este registro foi importado sem o nome completo do titular (gravado originalmente apenas com caracteres de preenchimento). Por favor, insira o nome completo para regularizar a titularidade.
              </p>
            </div>
          </div>
        )}

        {/* SEÇÃO 1: DADOS PRINCIPAIS */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wide border-b border-border pb-1">
            <span>Dados de Identificação</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome Completo / Razão Social" required error={erro?.campos?.nome?.[0]}>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Informe o nome completo do concessionário / titular"
              />
            </Field>

            <Field label="Documento (CPF / CNPJ)">
              <div className="relative">
                <Input
                  value={documento}
                  disabled
                  type={mostrarDocCompleto ? 'text' : 'password'}
                  className="font-mono tabular-nums bg-muted/40 cursor-not-allowed pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarDocCompleto((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                  title={mostrarDocCompleto ? 'Ocultar documento' : 'Visualizar documento completo'}
                >
                  {mostrarDocCompleto ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </Field>

            <div>
              <Field label="Base Legal (LGPD)" required error={erro?.campos?.base_legal?.[0]}>
                <Select
                  value={baseLegal}
                  onChange={(v) => setBaseLegal(String(v))}
                  options={[
                    { value: 'execucao_contrato', label: 'Execução de contrato' },
                    { value: 'obrigacao_legal', label: 'Obrigação legal' },
                    { value: 'consentimento', label: 'Consentimento do titular' },
                  ]}
                />
              </Field>
            </div>

            <div className="flex items-center pt-6">
              <Switch
                label="Titular Falecido (Alerta de Sucessão)"
                checked={titularFalecido}
                onCheckedChange={(v) => setTitularFalecido(v)}
              />
            </div>

            {titularFalecido && (
              <>
                <div>
                  <Field label="Data de Falecimento" error={erro?.campos?.data_falecimento_titular?.[0]}>
                    <Input
                      type="date"
                      value={dataFalecimento}
                      onChange={(e) => setDataFalecimento(e.target.value)}
                      className="font-mono tabular-nums"
                    />
                  </Field>
                </div>

                <div>
                  <Field label="Processo de Inventário / Alvará" error={erro?.campos?.processo_inventario?.[0]}>
                    <Input
                      value={processoInventario}
                      onChange={(e) => setProcessoInventario(e.target.value)}
                      placeholder="Ex.: Proc. 0001234-56.2026.8.26.0001"
                      className="font-mono"
                    />
                  </Field>
                </div>
              </>
            )}
          </div>
        </div>

        {/* SEÇÃO 2: ENDEREÇO COM API DE CEP */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wide">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>Endereço Residencial (Integração CEP)</span>
            </div>
            {statusCep === 'sucesso' && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3 w-3" /> Endereço localizado via ViaCEP
              </span>
            )}
            {statusCep === 'erro' && (
              <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                CEP não localizado. Preencha manualmente.
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Field label="CEP" error={erro?.campos?.cep?.[0]}>
                <div className="flex gap-1.5">
                  <Input
                    value={cep}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCep(v);
                      if (v.replace(/\D/g, '').length === 8) {
                        void handleBuscarCep(v);
                      }
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                    className="font-mono tabular-nums"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleBuscarCep()}
                    disabled={buscandoCep}
                    className="shrink-0 px-2.5 h-9"
                    title="Consultar CEP na API ViaCEP"
                  >
                    {buscandoCep ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Logradouro / Rua" error={erro?.campos?.logradouro?.[0]}>
                <Input
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  placeholder="Rua, Avenida, Praça..."
                />
              </Field>
            </div>

            <div>
              <Field label="Número" error={erro?.campos?.numero?.[0]}>
                <Input
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Ex.: 123 ou S/N"
                />
              </Field>
            </div>

            <div>
              <Field label="Complemento" error={erro?.campos?.complemento?.[0]}>
                <Input
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  placeholder="Apto, Bloco, Casa 2..."
                />
              </Field>
            </div>

            <div>
              <Field label="Bairro" error={erro?.campos?.bairro?.[0]}>
                <Input
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Nome do bairro"
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Cidade" error={erro?.campos?.cidade?.[0]}>
                <Input
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Cidade"
                />
              </Field>
            </div>

            <div>
              <Field label="UF (Estado)" error={erro?.campos?.uf?.[0]}>
                <Input
                  value={uf}
                  onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="SP"
                  maxLength={2}
                  className="uppercase font-mono"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* SEÇÃO 3: CONTATOS (PRINCIPAL E MÚLTIPLOS ADICIONAIS) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wide">
              <Phone className="h-3.5 w-3.5 text-primary" />
              <span>Contatos e Comunicação</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={adicionarContatoAdicional}
              className="h-6 text-[11px] gap-1 px-2 text-primary border-primary/40 hover:bg-primary/10"
            >
              <Plus className="h-3 w-3" />
              <span>Adicionar Mais Contatos</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="E-mail Principal" error={erro?.campos?.email?.[0]}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com.br"
              />
            </Field>

            <Field label="Telefone / Celular Principal" error={erro?.campos?.telefone?.[0]}>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="font-mono tabular-nums"
              />
            </Field>
          </div>

          {/* Lista de Contatos Adicionais */}
          {contatosAdicionais.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-medium text-muted-foreground block">
                Contatos Adicionais Cadastrados:
              </span>
              <div className="space-y-2">
                {contatosAdicionais.map((contato, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 p-2 rounded-md border border-border bg-muted/20">
                    <div className="w-full sm:w-36 shrink-0">
                      <Select
                        value={contato.tipo}
                        onChange={(v) => atualizarContatoAdicional(idx, 'tipo', String(v))}
                        options={OPCOES_TIPO_CONTATO}
                      />
                    </div>
                    <div className="w-full sm:flex-1">
                      <Input
                        value={contato.valor}
                        onChange={(e) => atualizarContatoAdicional(idx, 'valor', e.target.value)}
                        placeholder="Telefone, e-mail ou WhatsApp..."
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="w-full sm:w-44">
                      <Input
                        value={contato.descricao || ''}
                        onChange={(e) => atualizarContatoAdicional(idx, 'descricao', e.target.value)}
                        placeholder="Descrição / Recado"
                        className="text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removerContatoAdicional(idx)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                      title="Remover contato"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 4: OBSERVAÇÕES E NOTAS ADMINISTRATIVAS */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wide border-b border-border pb-1">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span>Observações e Notas Administrativas</span>
          </div>
          <Field label="Anotações Gerais (Visíveis apenas à administração do cemitério)" error={erro?.campos?.observacoes?.[0]}>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Insira detalhes sobre histórico do concessionário, vínculos familiares, acordos judiciais ou pendências de atendimento..."
              rows={3}
            />
          </Field>
        </div>

        <ErroBox erro={erro} />
      </form>
    </Modal>
  );
};
