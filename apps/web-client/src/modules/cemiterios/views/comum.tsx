import React, { useCallback, useEffect, useState } from 'react';
import { AlertCard, Button, Field, Input, Modal, Select, StatusChip, Switch, Textarea } from '@/components/ui';
import { ESTADOS, erroApi, type EstadoJazigo, type ErroApi } from '../api';

/** Carrega dados de um serviço e expõe estado de carga/erro e recarga. */
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

/** Executa uma ação e devolve o erro normalizado (sem alert/confirm nativos). */
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

export const EstadoChip: React.FC<{ estado: EstadoJazigo }> = ({ estado }) => (
  <StatusChip label={ESTADOS[estado]?.rotulo ?? estado} variant={ESTADOS[estado]?.chip ?? 'neutral'} />
);

export const ErroBox: React.FC<{ erro: ErroApi | null }> = ({ erro }) => {
  if (!erro) return null;
  const campos = erro.campos ? Object.values(erro.campos).flat().join(' ') : '';
  const liberada = erro.extra?.liberada_em ?? erro.extra?.prazo_fim;
  const extra = liberada ? ` Data: ${String(liberada).split('-').reverse().join('/')}.` : '';
  return (
    <AlertCard
      priority={erro.status === 409 ? 'warning' : 'danger'}
      title={erro.codigo ?? `Erro ${erro.status || ''}`.trim()}
      description={`${erro.mensagem}${extra} ${campos}`.trim()}
    />
  );
};

export interface CampoForm {
  nome: string;
  rotulo: string;
  tipo?: 'text' | 'number' | 'date' | 'datetime-local' | 'file' | 'textarea' | 'select' | 'switch';
  obrigatorio?: boolean;
  opcoes?: { value: string; label: string }[];
  dica?: string;
  multiplo?: boolean;
  aceitar?: string;
}

/**
 * Formulário genérico em Modal (@sysgov/ui) para as operações do módulo.
 * Valores de arquivo chegam como File/File[]; demais como string/boolean.
 */
export const FormModal: React.FC<{
  aberto: boolean;
  titulo: string;
  description?: string;
  campos: CampoForm[];
  iniciais?: Record<string, unknown>;
  rotuloEnviar?: string;
  onFechar: () => void;
  onEnviar: (valores: Record<string, unknown>) => Promise<unknown>;
}> = ({ aberto, titulo, description, campos, iniciais = {}, rotuloEnviar = 'Salvar', onFechar, onEnviar }) => {
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

  const controle = (c: CampoForm) => {
    const valor = valores[c.nome];
    switch (c.tipo) {
      case 'select':
        return <Select value={valor == null ? null : String(valor)} onChange={(v) => definir(c.nome, v)} options={c.opcoes ?? []} placeholder="Selecione…" />;
      case 'textarea':
        return <Textarea aria-label={c.rotulo} value={String(valor ?? '')} onChange={(e) => definir(c.nome, e.target.value)} required={c.obrigatorio} />;
      case 'switch':
        return <Switch label={c.rotulo} checked={Boolean(valor)} onCheckedChange={(v) => definir(c.nome, v)} />;
      case 'file':
        return (
          <Input
            aria-label={c.rotulo}
            type="file"
            accept={c.aceitar}
            multiple={c.multiplo}
            capture={c.aceitar?.startsWith('image') ? 'environment' : undefined}
            onChange={(e) => definir(c.nome, c.multiplo ? Array.from(e.target.files ?? []) : e.target.files?.[0])}
            required={c.obrigatorio}
          />
        );
      default:
        return (
          <Input
            aria-label={c.rotulo}
            type={c.tipo ?? 'text'}
            step={c.tipo === 'number' ? 'any' : undefined}
            className={c.tipo === 'number' || c.tipo?.startsWith('date') ? 'font-mono tabular-nums' : ''}
            value={String(valor ?? '')}
            onChange={(e) => definir(c.nome, e.target.value)}
            required={c.obrigatorio}
          />
        );
    }
  };

  return (
    <Modal
      open={aberto}
      onClose={onFechar}
      title={titulo}
      description={description}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onFechar} type="button">Cancelar</Button>
          <Button type="submit" form={formId} disabled={enviando}>{enviando ? 'Enviando…' : rotuloEnviar}</Button>
        </div>
      }
    >
      <form id={formId} onSubmit={enviar} className="grid gap-3 sm:grid-cols-2">
        {campos.map((c) => (
          <div key={c.nome} className={c.tipo === 'textarea' ? 'sm:col-span-2' : ''}>
            <Field label={c.rotulo} required={c.obrigatorio} hint={c.dica} error={erro?.campos?.[c.nome]?.[0]}>
              {controle(c)}
            </Field>
          </div>
        ))}
      </form>
      <div className="mt-3"><ErroBox erro={erro} /></div>
    </Modal>
  );
};

/** Converte chaves "falecido.nome" em objeto aninhado para a API. */
export function aninhar(valores: Record<string, unknown>): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  Object.entries(valores).forEach(([chave, valor]) => {
    const partes = chave.split('.');
    let alvo = saida;
    partes.slice(0, -1).forEach((p) => {
      alvo[p] = (alvo[p] as Record<string, unknown>) ?? {};
      alvo = alvo[p] as Record<string, unknown>;
    });
    alvo[partes[partes.length - 1]] = valor;
  });
  return saida;
}
