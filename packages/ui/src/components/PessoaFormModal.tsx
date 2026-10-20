import * as React from 'react';
import { UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Dialog } from './Dialog';
import { Button } from './button';
import { Input } from './input';
import { cn } from '../lib/utils';

export interface NovoCadastroRapidoPessoaInput {
  nome: string;
  /** CPF só com dígitos; vazio quando `sem_cpf` (pessoa com documento pendente). */
  cpf: string;
  nome_social?: string;
  data_nascimento?: string;
  sexo?: 'M' | 'F' | 'outro';
  nome_mae?: string;
  contato_tipo?: 'celular' | 'email' | 'telefone';
  contato_valor?: string;
  falecido?: boolean;
  data_falecimento?: string;
  certidao_obito_numero?: string;
  /** Cadastro sem CPF: a pessoa fica com documento pendente até ser regularizada. */
  sem_cpf?: boolean;
  /** Responsável (pessoa do cadastro central); obrigatório para menor de idade sem CPF. */
  responsavel_id?: number | null;
  /** Confirma que não é uma das pessoas semelhantes sugeridas. */
  confirmar_novo?: boolean;
}

/** Pessoa já cadastrada com o mesmo nome e nascimento, sugerida antes de criar um cadastro sem CPF. */
export interface PessoaSemelhanteOption {
  id: number;
  nome: string;
  cpf_mascarado: string;
  documento_pendente?: boolean;
}

export interface PessoaFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: NovoCadastroRapidoPessoaInput) => Promise<boolean | void> | boolean | void;
  title?: string;
  loading?: boolean;
  /** Mostra a opção "sem CPF". Desligada por padrão: só os módulos que aceitam documento pendente a ativam. */
  permitirSemCpf?: boolean;
  /** Seletor de responsável, desenhado pelo módulo (o componente não conhece HTTP). */
  renderResponsavel?: (contexto: { obrigatorio: boolean; disabled: boolean }) => React.ReactNode;
  /** Responsável escolhido no seletor acima. */
  responsavelId?: number | null;
  /** Pessoas semelhantes devolvidas pelo servidor após uma tentativa de cadastro sem CPF. */
  semelhantes?: PessoaSemelhanteOption[];
  /** O usuário escolheu uma pessoa semelhante em vez de criar outra. */
  onUsarSemelhante?: (pessoa: PessoaSemelhanteOption) => void;
}

const MAIORIDADE = 18;

/** Idade em anos completos a partir de uma data ISO (AAAA-MM-DD); `null` se a data for inválida. */
function calcularIdade(dataIso: string, hoje: Date = new Date()): number | null {
  const [a, m, d] = dataIso.split('-').map(Number);
  if (!a || !m || !d) return null;
  let idade = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) idade -= 1;
  return idade;
}

function aplicarMascaraCpf(valor: string): string {
  const digits = valor.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function validarCpf(cpfLimpo: string): boolean {
  if (cpfLimpo.length !== 11 || /^(\d)\1{10}$/.test(cpfLimpo)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpfLimpo[i] ?? '0', 10) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo[9] ?? '0', 10)) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpfLimpo[i] ?? '0', 10) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpfLimpo[10] ?? '0', 10);
}

export const PessoaFormModal: React.FC<PessoaFormModalProps> = ({
  open,
  onClose,
  onSubmit,
  title = 'Cadastro Rápido de Pessoa Física',
  loading = false,
  permitirSemCpf = false,
  renderResponsavel,
  responsavelId = null,
  semelhantes = [],
  onUsarSemelhante,
}) => {
  const [nome, setNome] = React.useState('');
  const [cpf, setCpf] = React.useState('');
  const [nomeSocial, setNomeSocial] = React.useState('');
  const [dataNascimento, setDataNascimento] = React.useState('');
  const [sexo, setSexo] = React.useState<'M' | 'F' | 'outro'>('outro');
  const [nomeMae, setNomeMae] = React.useState('');
  const [contatoTipo, setContatoTipo] = React.useState<'celular' | 'email' | 'telefone'>('celular');
  const [contatoValor, setContatoValor] = React.useState('');
  const [falecido, setFalecido] = React.useState(false);
  const [dataFalecimento, setDataFalecimento] = React.useState('');
  const [certidaoObito, setCertidaoObito] = React.useState('');
  const [semCpf, setSemCpf] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setNome('');
      setCpf('');
      setNomeSocial('');
      setDataNascimento('');
      setSexo('outro');
      setNomeMae('');
      setContatoTipo('celular');
      setContatoValor('');
      setFalecido(false);
      setDataFalecimento('');
      setCertidaoObito('');
      setSemCpf(false);
      setErro(null);
    }
  }, [open]);

  const cpfLimpo = cpf.replace(/\D/g, '');
  const isCpfCompleto = cpfLimpo.length === 11;
  const isCpfValido = isCpfCompleto && validarCpf(cpfLimpo);
  const idade = semCpf && dataNascimento ? calcularIdade(dataNascimento) : null;
  const responsavelObrigatorio = semCpf && idade !== null && idade < MAIORIDADE;

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(aplicarMascaraCpf(e.target.value));
    if (erro) setErro(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void enviar(false);
  };

  const enviar = async (confirmarNovo: boolean) => {
    setErro(null);

    const nomeTrimmed = nome.trim();
    if (!nomeTrimmed) {
      setErro('O nome completo é obrigatório.');
      return;
    }

    if (semCpf) {
      if (!dataNascimento) {
        setErro('A data de nascimento é obrigatória para pessoa sem CPF.');
        return;
      }
      if (responsavelObrigatorio && !responsavelId) {
        setErro('O responsável é obrigatório para menor de idade sem CPF.');
        return;
      }
    } else {
      if (cpfLimpo.length !== 11) {
        setErro('Informe um CPF completo com 11 dígitos.');
        return;
      }

      if (!validarCpf(cpfLimpo)) {
        setErro('O CPF informado possui dígitos verificadores matematicamente inválidos.');
        return;
      }
    }

    if (falecido) {
      if (!dataFalecimento) {
        setErro('Informe a data de falecimento da pessoa.');
        return;
      }
      if (dataNascimento && dataFalecimento < dataNascimento) {
        setErro('A data de falecimento não pode ser anterior à data de nascimento.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await onSubmit({
        nome: nomeTrimmed,
        cpf: semCpf ? '' : cpfLimpo,
        nome_social: nomeSocial.trim() || undefined,
        data_nascimento: dataNascimento || undefined,
        sexo,
        nome_mae: nomeMae.trim() || undefined,
        contato_tipo: contatoValor.trim() ? contatoTipo : undefined,
        contato_valor: contatoValor.trim() || undefined,
        falecido,
        data_falecimento: falecido ? dataFalecimento : undefined,
        certidao_obito_numero: falecido && certidaoObito.trim() ? certidaoObito.trim() : undefined,
        ...(semCpf ? { sem_cpf: true, responsavel_id: responsavelId ?? null, confirmar_novo: confirmarNovo || undefined } : {}),
      });

      if (res !== false) {
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao realizar cadastro rápido.';
      setErro(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy = loading || submitting;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description="Cadastre os dados essenciais para registrar a pessoa no cadastro central."
      icon={<UserPlus className="size-5 text-gov-primary" />}
      size="xl"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button type="button" variant="outline" onClick={onClose} disabled={isBusy}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={() => void enviar(false)} disabled={isBusy}>
            {isBusy ? 'Salvando...' : 'Salvar Pessoa'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {erro && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{erro}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gov-text-secondary uppercase tracking-wider mb-1.5">
              Nome Completo <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Maria da Silva"
              disabled={isBusy}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gov-text-secondary uppercase tracking-wider mb-1.5">
              CPF {!semCpf && <span className="text-destructive">*</span>}
            </label>
            <Input
              type="text"
              required={!semCpf}
              value={semCpf ? '' : cpf}
              onChange={handleCpfChange}
              placeholder="000.000.000-00"
              maxLength={14}
              className="font-mono tabular-nums"
              disabled={isBusy || semCpf}
            />
            {permitirSemCpf && (
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gov-text-secondary mt-1.5">
                <input
                  type="checkbox"
                  checked={semCpf}
                  onChange={(e) => {
                    setSemCpf(e.target.checked);
                    setErro(null);
                  }}
                  className="rounded border-gov-border text-gov-primary focus:ring-gov-primary/30"
                  disabled={isBusy}
                />
                <span>Pessoa sem CPF (documento pendente)</span>
              </label>
            )}
            {!semCpf && isCpfCompleto && (
              <span
                className={cn(
                  'text-xs flex items-center gap-1 font-medium mt-1',
                  isCpfValido ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                )}
              >
                {isCpfValido ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
                {isCpfValido ? 'CPF válido' : 'Dígitos verificadores inválidos'}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gov-text-secondary uppercase tracking-wider mb-1.5">
              Nome Social (Opcional)
            </label>
            <Input
              type="text"
              value={nomeSocial}
              onChange={(e) => setNomeSocial(e.target.value)}
              placeholder="Como prefere ser chamada(o)"
              disabled={isBusy}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gov-text-secondary uppercase tracking-wider mb-1.5">
              Nome da Mãe (Opcional)
            </label>
            <Input
              type="text"
              value={nomeMae}
              onChange={(e) => setNomeMae(e.target.value)}
              placeholder="Filiação materna"
              disabled={isBusy}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gov-text-secondary uppercase tracking-wider mb-1.5">
              Data de Nascimento {semCpf && <span className="text-destructive">*</span>}
            </label>
            <Input
              type="date"
              required={semCpf}
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              className="font-mono tabular-nums"
              disabled={isBusy}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gov-text-secondary uppercase tracking-wider mb-1.5">
              Sexo / Identidade
            </label>
            <select
              value={sexo}
              onChange={(e) => setSexo(e.target.value as 'M' | 'F' | 'outro')}
              disabled={isBusy}
              className={cn(
                'w-full h-9 px-3 text-sm bg-popover border border-gov-border rounded-lg',
                'text-gov-text-primary focus:outline-none focus:ring-2 focus:ring-gov-primary/30 focus:border-gov-primary'
              )}
            >
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="outro">Outro / Não informado</option>
            </select>
          </div>

          {semCpf && renderResponsavel && (
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gov-text-secondary uppercase tracking-wider mb-1.5">
                Responsável {responsavelObrigatorio ? <span className="text-destructive">*</span> : '(Opcional)'}
              </label>
              {renderResponsavel({ obrigatorio: responsavelObrigatorio, disabled: isBusy })}
              {responsavelObrigatorio && (
                <p className="text-xs text-gov-text-secondary mt-1">
                  Menor de idade sem CPF: informe a pessoa responsável, já cadastrada no cadastro central.
                </p>
              )}
            </div>
          )}

          {semCpf && semelhantes.length > 0 && (
            <div
              role="alert"
              className="md:col-span-2 p-3 rounded-lg border border-warning/40 bg-warning/15 text-sm space-y-2"
            >
              <p className="font-medium text-gov-text-primary">
                Já existe pessoa com o mesmo nome e data de nascimento. É a mesma pessoa?
              </p>
              <ul className="space-y-1.5">
                {semelhantes.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">
                      {p.nome} <span className="font-mono tabular-nums text-xs text-gov-text-secondary">{p.cpf_mascarado}</span>
                      {p.documento_pendente && <span className="text-xs text-gov-text-secondary"> · documento pendente</span>}
                    </span>
                    {onUsarSemelhante && (
                      <Button type="button" size="sm" variant="outline" onClick={() => onUsarSemelhante(p)} disabled={isBusy}>
                        Usar esta pessoa
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              <Button type="button" size="sm" variant="ghost" onClick={() => void enviar(true)} disabled={isBusy}>
                Não é a mesma pessoa, cadastrar mesmo assim
              </Button>
            </div>
          )}

          <div className="md:col-span-2 pt-2 border-t border-gov-border/60">
            <span className="block text-xs font-semibold text-gov-text-secondary uppercase tracking-wider mb-2">
              Contato Inicial (Opcional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <select
                  value={contatoTipo}
                  onChange={(e) => setContatoTipo(e.target.value as 'celular' | 'email' | 'telefone')}
                  disabled={isBusy}
                  className={cn(
                    'w-full h-9 px-3 text-sm bg-popover border border-gov-border rounded-lg',
                    'text-gov-text-primary focus:outline-none focus:ring-2 focus:ring-gov-primary/30 focus:border-gov-primary'
                  )}
                >
                  <option value="celular">Celular</option>
                  <option value="email">E-mail</option>
                  <option value="telefone">Telefone</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Input
                  type={contatoTipo === 'email' ? 'email' : 'text'}
                  value={contatoValor}
                  onChange={(e) => setContatoValor(e.target.value)}
                  placeholder={
                    contatoTipo === 'email'
                      ? 'exemplo@dominio.gov.br'
                      : '(00) 00000-0000'
                  }
                  className={contatoTipo !== 'email' ? 'font-mono tabular-nums' : ''}
                  disabled={isBusy}
                />
              </div>
            </div>
          </div>

          {/* Situação Vital / Óbito */}
          <div className="md:col-span-2 p-3 rounded-lg border border-gov-border/60 bg-gov-border/10">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gov-text-primary">
              <input
                type="checkbox"
                checked={falecido}
                onChange={(e) => setFalecido(e.target.checked)}
                className="rounded border-gov-border text-gov-primary focus:ring-gov-primary/30"
                disabled={isBusy}
              />
              <span>Pessoa Falecida (Registro de Óbito)</span>
            </label>

            {falecido && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-gov-border/40">
                <div>
                  <label className="block text-xs font-semibold text-gov-text-secondary uppercase tracking-wider mb-1">
                    Data do Falecimento <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    required={falecido}
                    value={dataFalecimento}
                    onChange={(e) => setDataFalecimento(e.target.value)}
                    className="font-mono tabular-nums"
                    disabled={isBusy}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gov-text-secondary uppercase tracking-wider mb-1">
                    Nº Certidão de Óbito (Opcional)
                  </label>
                  <Input
                    type="text"
                    value={certidaoObito}
                    onChange={(e) => setCertidaoObito(e.target.value)}
                    placeholder="Número da certidão"
                    className="font-mono tabular-nums"
                    disabled={isBusy}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </Dialog>
  );
};
