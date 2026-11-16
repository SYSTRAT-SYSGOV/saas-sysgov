import React, { createContext, useContext, useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button, Card, ScreenState } from '@sysgov/ui';
import { erroApi } from '../../escola/api';
import { CORES_TURNO, SERIES, linkWhats, parecerApi, useImagemAutenticada, type Catalogo, type TurmaParecer } from '../api';

/**
 * Barra de filtros padrão do Parecer: grade responsiva com os controles alinhados pela base. Todos os campos da barra
 * têm a mesma altura (`ALTURA_CONTROLE`, a do Select); o Input e o Button do @sysgov/ui nascem menores (36 e 40 px).
 */
export const ALTURA_CONTROLE = 'h-11';
export const BarraFiltros: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Card className="grid items-end gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">{children}</Card>
);

/* Navegação interna do módulo (equivale às páginas do PHP). */
export type Aba = 'inicio' | 'notas' | 'frequencia' | 'ocorrencias' | 'conteudos' | 'relatorios' | 'configuracoes' | 'auditoria';
export interface Rota {
  aba: Aba;
  turmaId?: number;
  alunoId?: number;
  /** Em Início: a turma aberta mostra os alunos; com aluno, a tela Avaliar. */
  tela?: 'alunos' | 'avaliar';
  turno?: string;
  serie?: number;
  materia?: string;
}

export interface Impressao { alunoId?: number; turmaId?: number; tri?: number }

interface Ctx {
  catalogo: Catalogo;
  ano: number;
  ir: (r: Rota) => void;
  imprimir: (alvo: Impressao) => void;
}
export const ParecerContext = createContext<Ctx | null>(null);
export const useParecer = (): Ctx => {
  const c = useContext(ParecerContext);
  if (c === null) throw new Error('Fora do módulo Parecer');
  return c;
};

/** Mensagem de retorno de uma ação (como o flash do PHP). */
export type Mensagem = { tipo: 'ok' | 'erro'; texto: string } | null;
export const Aviso: React.FC<{ msg: Mensagem; onFechar?: () => void }> = ({ msg, onFechar }) =>
  msg === null ? null : (
    <div
      role={msg.tipo === 'erro' ? 'alert' : 'status'}
      className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm print:hidden ${
        msg.tipo === 'erro'
          ? 'border-destructive/40 bg-destructive/10 text-destructive'
          : 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-300'
      }`}
    >
      <span>{msg.texto}</span>
      {onFechar && (
        <Button variant="ghost" size="icon-xs" onClick={onFechar} aria-label="Fechar aviso">
          ✕
        </Button>
      )}
    </div>
  );

export const mensagemDeErro = (e: unknown): Mensagem => ({ tipo: 'erro', texto: erroApi(e).mensagem });

/** Carrega dados da API com estado de carregando/erro e recarga. */
export function useCarga<T>(carregar: () => Promise<T>, deps: React.DependencyList): { dados: T | null; erro: string | null; carregando: boolean; recarregar: () => void } {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [vez, setVez] = useState(0);
  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    carregar()
      .then((d) => {
        if (ativo) {
          setDados(d);
          setErro(null);
        }
      })
      .catch((e: unknown) => ativo && setErro(erroApi(e).mensagem))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, vez]);
  return { dados, erro, carregando, recarregar: () => setVez((v) => v + 1) };
}

/** Estado de carga padronizado: devolve o conteúdo só quando há dados. */
export function Carga<T>({ carga, children }: { carga: { dados: T | null; erro: string | null; carregando: boolean; recarregar: () => void }; children: (d: T) => React.ReactNode }): React.ReactElement {
  if (carga.erro !== null) return <ScreenState type="error" title="Não foi possível carregar" description={carga.erro} actionLabel="Tentar de novo" onAction={carga.recarregar} />;
  if (carga.dados === null) return <ScreenState type="loading" />;
  return <>{children(carga.dados)}</>;
}

export const BotaoWhats: React.FC<{ tel: string | null | undefined; mensagem?: string; rotulo?: string }> = ({ tel, mensagem = '', rotulo }) => {
  const url = linkWhats(tel, mensagem);
  if (url === null) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Abrir conversa no WhatsApp"
      className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-300"
    >
      <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
      {rotulo ?? tel}
    </a>
  );
};

/** Foto do aluno (rota autenticada) ou a inicial do nome. */
export const FotoAluno: React.FC<{ id: number; nome: string; temFoto: boolean; tamanho?: string }> = ({ id, nome, temFoto, tamanho = 'h-10 w-10' }) => {
  const url = useImagemAutenticada(temFoto ? `/alunos/${id}/foto` : null);
  return url ? (
    <img src={url} alt={`Foto de ${nome}`} className={`${tamanho} shrink-0 rounded-full object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${tamanho} inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground`}>
      {nome.charAt(0).toUpperCase()}
    </span>
  );
};

export const corTurno = (turno: string | null | undefined): string => CORES_TURNO[turno ?? ''] ?? '#1351b4';

/** Grade de turmas para escolher (escolherTurma do PHP). */
export const EscolherTurma: React.FC<{ texto: string; onEscolher: (t: TurmaParecer) => void }> = ({ texto, onEscolher }) => {
  const { ano } = useParecer();
  const carga = useCarga(() => parecerApi.turmas(ano), [ano]);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{texto}</p>
      <Carga carga={carga}>
        {(d) =>
          d.turmas.length === 0 ? (
            <ScreenState type="empty" title="Nenhuma turma disponível para você." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {d.turmas.map((t) => (
                <CartaoTurma key={t.turma_id} turma={t} onClick={() => onEscolher(t)} />
              ))}
            </div>
          )
        }
      </Carga>
    </div>
  );
};

export const CartaoTurma: React.FC<{ turma: TurmaParecer; onClick: () => void; mostrarRegente?: boolean }> = ({ turma, onClick, mostrarRegente }) => (
  <button type="button" onClick={onClick} className="text-left">
    <Card className="h-full border-l-4 p-4 transition hover:shadow-md" style={{ borderLeftColor: corTurno(turma.turno) }}>
      <span className="text-xs font-medium uppercase" style={{ color: corTurno(turma.turno) }}>
        {turma.turno ?? '—'}
      </span>
      <strong className="block text-base text-foreground">
        {SERIES[turma.serie]} · {turma.nome}
      </strong>
      <span className="block text-sm text-muted-foreground">
        <b className="font-mono tabular-nums">{turma.alunos_ativos}</b> aluno{turma.alunos_ativos === 1 ? '' : 's'} ativo{turma.alunos_ativos === 1 ? '' : 's'}
      </span>
      {mostrarRegente && <span className="block text-xs text-muted-foreground">{turma.regente ? `Regente: ${turma.regente}` : 'Sem regente informado'}</span>}
    </Card>
  </button>
);

/** Abas da turma (navTurma do PHP): Alunos/Parecer, Notas, Frequência, Ocorrências. */
export const AbasTurma: React.FC<{ turma: { id: number; nome: string; serie: number; turno: string | null }; atual: Aba | 'alunos' }> = ({ turma, atual }) => {
  const { ir } = useParecer();
  const abas: [Aba | 'alunos', string, Rota][] = [
    ['alunos', 'Alunos / Parecer', { aba: 'inicio', tela: 'alunos', turmaId: turma.id }],
    ['notas', 'Notas', { aba: 'notas', turmaId: turma.id }],
    ['frequencia', 'Frequência', { aba: 'frequencia', turmaId: turma.id }],
    ['ocorrencias', 'Ocorrências', { aba: 'ocorrencias', turmaId: turma.id }],
  ];
  return (
    <div className="space-y-2 print:hidden">
      <p className="text-sm">
        <strong>
          {SERIES[turma.serie]} · {turma.nome}
        </strong>{' '}
        <span className="text-muted-foreground">{turma.turno}</span>
      </p>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Seções da turma">
        {abas.map(([chave, rotulo, rota]) => (
          <Button key={chave} size="sm" variant={chave === atual ? 'primary' : 'outline'} role="tab" aria-selected={chave === atual} onClick={() => ir(rota)}>
            {rotulo}
          </Button>
        ))}
      </div>
    </div>
  );
};

/** Seletor de botões (abas de trimestre, matéria, série). */
export function Botoes<T extends string | number>({ itens, atual, onChange, rotulo }: { itens: [T, React.ReactNode][]; atual: T; onChange: (v: T) => void; rotulo: string }): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={rotulo}>
      {itens.map(([v, r]) => (
        <Button key={String(v)} size="sm" variant={v === atual ? 'primary' : 'outline'} role="tab" aria-selected={v === atual} onClick={() => onChange(v)}>
          {r}
        </Button>
      ))}
    </div>
  );
}
