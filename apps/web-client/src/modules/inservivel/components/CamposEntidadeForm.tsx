import React from 'react';
import { Input } from '@sysgov/ui';
import { CampoTexto } from './Comuns';

/** Valores do formulário de entidade (texto puro; a conversão fica em `paraDadosEntidade`). */
export interface FormEntidade {
  razao_social: string; nome_fantasia: string; cnpj: string; inscricao_estadual: string; inscricao_municipal: string;
  endereco: string; cep: string; cidade: string; uf: string; telefone: string; celular: string; email: string;
  representante_legal: string; cpf_representante: string; rg_representante: string; cargo_representante: string;
  tempo_funcionamento_anos: string; area_atuacao: string; finalidade: string; numero_beneficiarios: string; certificacoes: string;
  banco: string; agencia: string; conta: string; chave_pix: string;
}

export const FORM_ENTIDADE_VAZIO: FormEntidade = {
  razao_social: '', nome_fantasia: '', cnpj: '', inscricao_estadual: '', inscricao_municipal: '', endereco: '', cep: '', cidade: '', uf: '',
  telefone: '', celular: '', email: '', representante_legal: '', cpf_representante: '', rg_representante: '', cargo_representante: '',
  tempo_funcionamento_anos: '', area_atuacao: '', finalidade: '', numero_beneficiarios: '', certificacoes: '', banco: '', agencia: '', conta: '', chave_pix: '',
};

/** Campos do formulário para o JSON da API (vazio → null; números inteiros). */
export function paraDadosEntidade(f: FormEntidade): Record<string, string | number | null> {
  const t = (v: string) => (v.trim() === '' ? null : v.trim());
  return {
    razao_social: f.razao_social.trim(), nome_fantasia: f.nome_fantasia.trim(), cnpj: f.cnpj.trim(), inscricao_estadual: t(f.inscricao_estadual),
    inscricao_municipal: t(f.inscricao_municipal), endereco: f.endereco.trim(), cep: f.cep.trim(), cidade: f.cidade.trim(), uf: f.uf.trim().toUpperCase(),
    telefone: t(f.telefone), celular: f.celular.trim(), email: f.email.trim(), representante_legal: f.representante_legal.trim(),
    cpf_representante: f.cpf_representante.trim(), rg_representante: t(f.rg_representante), cargo_representante: f.cargo_representante.trim(),
    tempo_funcionamento_anos: Number(f.tempo_funcionamento_anos) || 0, area_atuacao: f.area_atuacao.trim(), finalidade: f.finalidade.trim(),
    numero_beneficiarios: Number(f.numero_beneficiarios) || 0, certificacoes: t(f.certificacoes), banco: t(f.banco), agencia: t(f.agencia), conta: t(f.conta), chave_pix: t(f.chave_pix),
  };
}

/**
 * Campos da entidade (spec: Entidades sem fins lucrativos). `bloquear` desativa campos que o usuário não pode mudar
 * (no portal: CNPJ e e-mail); `ocultar` some com campos que não se aplicam (CPF já cadastrado só sai mascarado).
 */
export const CamposEntidadeForm: React.FC<{
  form: FormEntidade;
  onChange: (f: FormEntidade) => void;
  bloquear?: (keyof FormEntidade)[];
  ocultar?: (keyof FormEntidade)[];
  /** Na edição o CPF só é digitado para trocar (o atual sai mascarado). */
  cpfOpcional?: boolean;
}> = ({ form, onChange, bloquear = [], ocultar = [], cpfOpcional = false }) => {
  const campo = (nome: keyof FormEntidade, rotulo: string, extra: Partial<React.ComponentProps<typeof Input>> = {}) =>
    ocultar.includes(nome) ? null : (
      <Input label={rotulo} value={form[nome]} disabled={bloquear.includes(nome)} onChange={(e) => onChange({ ...form, [nome]: e.target.value })} {...extra} />
    );
  return (
    <div className="space-y-4">
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Identificação</legend>
        <div className="grid gap-3 sm:grid-cols-2">{campo('razao_social', 'Razão social *', { required: true })}{campo('nome_fantasia', 'Nome fantasia *', { required: true })}</div>
        <div className="grid gap-3 sm:grid-cols-3">
          {campo('cnpj', 'CNPJ *', { required: true, className: 'font-mono tabular-nums', placeholder: '00.000.000/0000-00' })}
          {campo('inscricao_estadual', 'Inscrição estadual', { className: 'font-mono' })}
          {campo('inscricao_municipal', 'Inscrição municipal', { className: 'font-mono' })}
        </div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Endereço e contato</legend>
        {campo('endereco', 'Endereço *', { required: true })}
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr_6rem]">{campo('cep', 'CEP *', { required: true, className: 'font-mono' })}{campo('cidade', 'Cidade *', { required: true })}{campo('uf', 'UF *', { required: true, maxLength: 2 })}</div>
        <div className="grid gap-3 sm:grid-cols-3">{campo('telefone', 'Telefone', { className: 'font-mono' })}{campo('celular', 'Celular *', { required: true, className: 'font-mono' })}{campo('email', 'E-mail *', { required: true, type: 'email' })}</div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Representante legal</legend>
        <div className="grid gap-3 sm:grid-cols-2">{campo('representante_legal', 'Nome *', { required: true })}{campo('cargo_representante', 'Cargo *', { required: true })}</div>
        <div className="grid gap-3 sm:grid-cols-2">{campo('cpf_representante', cpfOpcional ? 'CPF (preencha só para trocar)' : 'CPF *', { required: !cpfOpcional, className: 'font-mono tabular-nums', placeholder: '000.000.000-00' })}{campo('rg_representante', 'RG', { className: 'font-mono' })}</div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Atuação</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {campo('area_atuacao', 'Área de atuação *', { required: true })}
          {campo('tempo_funcionamento_anos', 'Anos de funcionamento *', { required: true, type: 'number', min: 0, className: 'font-mono tabular-nums' })}
          {campo('numero_beneficiarios', 'Nº de beneficiários *', { required: true, type: 'number', min: 0, className: 'font-mono tabular-nums' })}
        </div>
        <CampoTexto rotulo="Finalidade *" value={form.finalidade} onChange={(e) => onChange({ ...form, finalidade: e.target.value })} required rows={2} maxLength={5000} />
        <CampoTexto rotulo="Certificações" value={form.certificacoes} onChange={(e) => onChange({ ...form, certificacoes: e.target.value })} rows={2} maxLength={5000} />
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Dados bancários</legend>
        <div className="grid gap-3 sm:grid-cols-4">{campo('banco', 'Banco')}{campo('agencia', 'Agência', { className: 'font-mono' })}{campo('conta', 'Conta', { className: 'font-mono' })}{campo('chave_pix', 'Chave PIX')}</div>
      </fieldset>
    </div>
  );
};
