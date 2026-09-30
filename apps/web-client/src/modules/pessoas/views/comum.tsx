import React, { useCallback, useEffect, useState } from 'react';
import { AlertCard, Button, Field, Input, Modal, Select, Switch, Textarea } from '@/components/ui';
import { erroApi, type ErroApi } from '../api';

/** Carrega dados de um serviço e expõe estado de carga/erro/recarga. */
export function useDados<T>(carregar: () => Promise<T>, deps: React.DependencyList = []) {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<ErroApi | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await carregar());
    } catch (e) {
      setErro(erroApi(e));
    } finally {
      setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  return { dados, carregando, erro, recarregar };
}

export function useAcao() {
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  const executar = useCallback(async <T,>(acao: () => Promise<T>): Promise<T | null> => {
    setEnviando(true);
    setErro(null);
    try {
      return await acao();
    } catch (e) {
      setErro(erroApi(e));
      return null;
    } finally {
      setEnviando(false);
    }
  }, []);

  return { erro, setErro, enviando, executar };
}

export const Mono: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`font-mono tabular-nums ${className}`}>{children}</span>
);

/** Formata data ISO ("1982-05-28") para o padrão brasileiro ("28/05/1982") sem deslocamento de fuso. */
export function formatarData(valor: string | null | undefined): string {
  if (!valor) return '';
  const limpo = valor.slice(0, 10);
  const partes = limpo.split('-');
  if (partes.length === 3) {
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
  }
  return valor;
}

export const ErroBox: React.FC<{ erro: ErroApi | null }> = ({ erro }) => {
  if (!erro) return null;
  const campos = erro.campos ? Object.values(erro.campos).flat().join(' ') : '';
  return <AlertCard priority={erro.status === 409 ? 'warning' : 'danger'} title={erro.codigo ?? `Erro ${erro.status || ''}`.trim()} description={`${erro.mensagem} ${campos}`.trim()} />;
};

export interface CampoForm {
  nome: string;
  rotulo: string;
  tipo?: 'text' | 'number' | 'date' | 'password' | 'textarea' | 'select' | 'switch';
  obrigatorio?: boolean;
  opcoes?: { value: string; label: string }[];
  dica?: string;
  /** Dado técnico (CPF, RG, NIS, códigos) — exibido em `font-mono tabular-nums`. */
  mono?: boolean;
}

/** Renderiza o controle de input adequado ao tipo do campo. Compartilhado entre `FormModal` e fluxos em passos (wizard). */
export function renderCampoControle(c: CampoForm, valor: unknown, definir: (valor: unknown) => void): React.ReactNode {
  switch (c.tipo) {
    case 'select':
      return <Select value={valor == null ? null : String(valor)} onChange={definir} options={c.opcoes ?? []} placeholder="Selecione…" />;
    case 'textarea':
      return <Textarea aria-label={c.rotulo} value={String(valor ?? '')} onChange={(e) => definir(e.target.value)} required={c.obrigatorio} rows={3} />;
    case 'switch':
      return <Switch label={c.rotulo} checked={Boolean(valor)} onCheckedChange={definir} />;
    default:
      return (
        <Input
          aria-label={c.rotulo}
          type={c.tipo ?? 'text'}
          className={c.tipo === 'date' || c.mono ? 'font-mono tabular-nums' : ''}
          value={String(valor ?? '')}
          onChange={(e) => definir(e.target.value)}
          required={c.obrigatorio}
        />
      );
  }
}

/** Grid de campos com rótulo/erro — o corpo reutilizável de um `FormModal`, também usado passo a passo pelo wizard. */
export const CamposFormulario: React.FC<{
  campos: CampoForm[];
  valores: Record<string, unknown>;
  onChange: (nome: string, valor: unknown) => void;
  erro?: ErroApi | null;
}> = ({ campos, valores, onChange, erro }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    {campos.map((c) => (
      <div key={c.nome} className={c.tipo === 'textarea' ? 'sm:col-span-2' : ''}>
        <Field label={c.rotulo} required={c.obrigatorio} hint={c.dica} error={erro?.campos?.[c.nome]?.[0]}>
          {renderCampoControle(c, valores[c.nome], (v) => onChange(c.nome, v))}
        </Field>
      </div>
    ))}
  </div>
);

export const FormModal: React.FC<{
  aberto: boolean;
  titulo: string;
  campos: CampoForm[];
  iniciais?: Record<string, unknown>;
  rotuloEnviar?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  onFechar: () => void;
  onEnviar: (valores: Record<string, unknown>) => Promise<unknown>;
}> = ({ aberto, titulo, campos, iniciais = {}, rotuloEnviar = 'Salvar', size = 'xl', onFechar, onEnviar }) => {
  const [valores, setValores] = useState<Record<string, unknown>>(iniciais);
  const { erro, enviando, executar, setErro } = useAcao();
  const formId = `form-${titulo.replace(/\W+/g, '-').toLowerCase()}`;

  useEffect(() => {
    if (aberto) {
      setValores(iniciais);
      setErro(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const definir = (nome: string, valor: unknown) => setValores((v) => ({ ...v, [nome]: valor }));

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const resultado = await executar(async () => (await onEnviar(valores)) ?? true);
    if (resultado !== null) onFechar();
  };

  return (
    <Modal
      open={aberto}
      onClose={onFechar}
      title={titulo}
      size={size}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onFechar} type="button">Cancelar</Button>
          <Button type="submit" form={formId} disabled={enviando}>{enviando ? 'Enviando…' : rotuloEnviar}</Button>
        </div>
      }
    >
      <form id={formId} onSubmit={enviar}>
        <CamposFormulario campos={campos} valores={valores} onChange={definir} erro={erro} />
      </form>
      <div className="mt-3"><ErroBox erro={erro} /></div>
    </Modal>
  );
};
