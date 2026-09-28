import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  AlertTriangle,
  Clock,
  HardHat,
  History,
  Pencil,
  Search,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button, DataTable, StatusChip } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import {
  cemiteriosApi,
  formatarData,
  type HistoricoOperador,
  type OperadorCemiterio,
} from '../api';
import { ErroBox, FormModal, Mono, useAcao, useDados } from './comum';

const STATUS_ALVARA_BADGES: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  valido: { label: 'Alvará Válido', variant: 'success' },
  vencendo: { label: 'Alvará a Vencer', variant: 'warning' },
  vencido: { label: 'Alvará Vencido', variant: 'danger' },
  sem_alvara: { label: 'Sem Alvará', variant: 'danger' },
  dispensado: { label: 'Servidor Público', variant: 'neutral' },
};

export const OperadoresView: React.FC = () => {
  const { can } = useCan();
  const gerencia = can('cemiterios.cadastros.manage');

  const [tipoFiltro, setTipoFiltro] = useState<string>('todos');
  const [alvaraFiltro, setAlvaraFiltro] = useState<string>('todos');
  const [busca, setBusca] = useState<string>('');
  const [modalNovo, setModalNovo] = useState(false);
  const [operadorEditando, setOperadorEditando] = useState<OperadorCemiterio | null>(null);
  const [historicoDrawer, setHistoricoDrawer] = useState<HistoricoOperador | null>(null);

  const { erro, executar } = useAcao();

  const operadores = useDados(
    () =>
      cemiteriosApi.operadores({
        tipo: tipoFiltro !== 'todos' ? tipoFiltro : undefined,
        status_alvara: alvaraFiltro !== 'todos' ? alvaraFiltro : undefined,
        q: busca || undefined,
        per_page: 50,
      }),
    [tipoFiltro, alvaraFiltro, busca]
  );

  const colunas = useMemo<ColumnDef<OperadorCemiterio, unknown>[]>(() => [
    {
      id: 'nome',
      header: 'Nome do Profissional',
      cell: ({ row }) => (
        <div>
          <span className="font-semibold text-foreground">{row.original.nome}</span>
          <div className="text-xs text-muted-foreground font-mono mt-0.5">
            {row.original.cpf_cnpj ? `Doc: ${row.original.cpf_cnpj}` : '—'}
            {row.original.telefone ? ` • Tel: ${row.original.telefone}` : ''}
          </div>
        </div>
      ),
    },
    {
      id: 'tipo',
      header: 'Função Operacional',
      cell: ({ row }) => {
        const isCoveiro = row.original.tipo === 'coveiro';
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isCoveiro
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            {isCoveiro ? <Users className="h-3.5 w-3.5" /> : <HardHat className="h-3.5 w-3.5" />}
            {isCoveiro ? 'Coveiro Municipal' : 'Pedreiro de Obras'}
          </span>
        );
      },
    },
    {
      id: 'registro',
      header: 'Matrícula / Alvará',
      cell: ({ row }) => {
        const o = row.original;
        if (o.tipo === 'coveiro') {
          return (
            <div>
              <span className="text-xs text-muted-foreground">Matrícula Funcional:</span>
              <Mono className="font-bold text-foreground block">{o.matricula_funcional ?? '—'}</Mono>
            </div>
          );
        }
        return (
          <div>
            <span className="text-xs text-muted-foreground">Alvará Municipal:</span>
            <Mono className="font-bold text-foreground block">{o.alvara_numero ?? 'Pendente'}</Mono>
            {o.alvara_validade && (
              <span className="text-[11px] text-muted-foreground">Validade: {formatarData(o.alvara_validade)}</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'status_alvara',
      header: 'Regularidade Cadastral',
      cell: ({ row }) => {
        const status = row.original.status_alvara ?? 'dispensado';
        const badge = STATUS_ALVARA_BADGES[status] ?? STATUS_ALVARA_BADGES.dispensado;
        return <StatusChip label={badge.label} variant={badge.variant} />;
      },
    },
    {
      id: 'situacao',
      header: 'Situação',
      cell: ({ row }) => (
        <StatusChip
          label={row.original.situacao}
          variant={row.original.situacao === 'ativo' ? 'success' : 'neutral'}
        />
      ),
    },
    {
      id: 'acoes',
      header: '',
      cell: ({ row }) => {
        const o = row.original;
        return (
          <div className="flex items-center gap-1.5 justify-end">
            <Button
              size="xs"
              variant="outline"
              onClick={async () => {
                const hist = await cemiteriosApi.historicoOperador(o.id);
                setHistoricoDrawer(hist);
              }}
              title="Ver histórico operacional de sepultamentos e obras"
            >
              <History className="h-3.5 w-3.5 mr-1 text-primary" />
              Histórico
            </Button>

            {gerencia && (
              <Button size="xs" variant="outline" onClick={() => setOperadorEditando(o)}>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        );
      },
    },
  ], [gerencia]);

  const stats = operadores.dados?.stats;

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">Coveiros Ativos</span>
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-blue-900 dark:text-blue-100">
            {stats?.total_coveiros ?? '—'}
          </div>
          <p className="mt-1 text-xs text-blue-700/80 dark:text-blue-400/80">Servidores do quadro municipal</p>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Pedreiros Credenciados</span>
            <HardHat className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-900 dark:text-amber-100">
            {stats?.total_pedreiros ?? '—'}
          </div>
          <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-400/80">Profissionais autônomos habilitados</p>
        </div>

        <div className="p-4 rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-orange-800 dark:text-orange-300">Alvarás a Vencer (30 dias)</span>
            <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-orange-900 dark:text-orange-100">
            {stats?.alvaras_vencendo ?? 0}
          </div>
          <p className="mt-1 text-xs text-orange-700/80 dark:text-orange-400/80">Notificação prévia recomendada</p>
        </div>

        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">Alvarás Vencidos</span>
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-rose-900 dark:text-rose-100">
            {stats?.alvaras_vencidos ?? 0}
          </div>
          <p className="mt-1 text-xs text-rose-700/80 dark:text-rose-400/80">Obras particulares impedidas</p>
        </div>
      </div>

      <ErroBox erro={erro} />

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome, matrícula, alvará..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border bg-background"
            />
          </div>

          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="text-xs rounded-lg border px-3 py-1.5 bg-background font-medium"
          >
            <option value="todos">Todos os Profissionais</option>
            <option value="coveiro">Apenas Coveiros</option>
            <option value="pedreiro">Apenas Pedreiros</option>
          </select>

          <select
            value={alvaraFiltro}
            onChange={(e) => setAlvaraFiltro(e.target.value)}
            className="text-xs rounded-lg border px-3 py-1.5 bg-background font-medium"
          >
            <option value="todos">Status de Alvará (Todos)</option>
            <option value="valido">Alvarás Válidos</option>
            <option value="vencendo">Alvarás a Vencer</option>
            <option value="vencido">Alvarás Vencidos</option>
          </select>
        </div>

        {gerencia && (
          <Button size="sm" onClick={() => setModalNovo(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Cadastrar Profissional
          </Button>
        )}
      </div>

      {/* Tabela de Operadores */}
      <DataTable
        columns={colunas}
        data={operadores.dados?.data ?? []}
        loading={operadores.carregando}
        searchable
        emptyText="Nenhum profissional encontrado com os filtros selecionados."
      />

      {/* Modal: Novo Operador */}
      <FormModal
        aberto={modalNovo}
        titulo="Cadastrar Profissional Operacional"
        description="Credenciamento de coveiros e pedreiros de obras funerárias"
        campos={[
          { nome: 'nome', rotulo: 'Nome Completo', obrigatorio: true },
          {
            nome: 'tipo',
            rotulo: 'Função / Categoria',
            tipo: 'select',
            obrigatorio: true,
            opcoes: [
              { value: 'coveiro', label: 'Coveiro (Servidor Municipal)' },
              { value: 'pedreiro', label: 'Pedreiro (Prestador Credenciado)' },
            ],
          },
          { nome: 'cpf_cnpj', rotulo: 'CPF ou CNPJ', dica: 'Apenas números ou formatado.' },
          { nome: 'matricula_funcional', rotulo: 'Matrícula Funcional (se servidor)' },
          { nome: 'alvara_numero', rotulo: 'Nº do Alvará Municipal (se pedreiro)' },
          { nome: 'alvara_validade', rotulo: 'Validade do Alvará', tipo: 'date' },
          { nome: 'telefone', rotulo: 'Telefone de Contato' },
          { nome: 'email', rotulo: 'E-mail' },
        ]}
        iniciais={{ tipo: 'coveiro' }}
        onFechar={() => setModalNovo(false)}
        onEnviar={async (v: Record<string, unknown>) => {
          await cemiteriosApi.criarOperador({
            nome: String(v.nome),
            tipo: v.tipo as 'coveiro' | 'pedreiro',
            cpf_cnpj: v.cpf_cnpj ? String(v.cpf_cnpj) : undefined,
            matricula_funcional: v.matricula_funcional ? String(v.matricula_funcional) : undefined,
            alvara_numero: v.alvara_numero ? String(v.alvara_numero) : undefined,
            alvara_validade: v.alvara_validade ? String(v.alvara_validade) : undefined,
            telefone: v.telefone ? String(v.telefone) : undefined,
            email: v.email ? String(v.email) : undefined,
            situacao: 'ativo',
          });
          setModalNovo(false);
          await operadores.recarregar();
        }}
      />

      {/* Modal: Editar Operador */}
      <FormModal
        aberto={operadorEditando !== null}
        titulo={`Editar Profissional: ${operadorEditando?.nome ?? ''}`}
        campos={[
          { nome: 'nome', rotulo: 'Nome Completo', obrigatorio: true },
          {
            nome: 'tipo',
            rotulo: 'Função',
            tipo: 'select',
            obrigatorio: true,
            opcoes: [
              { value: 'coveiro', label: 'Coveiro (Servidor Municipal)' },
              { value: 'pedreiro', label: 'Pedreiro (Prestador Credenciado)' },
            ],
          },
          {
            nome: 'situacao',
            rotulo: 'Situação Cadastral',
            tipo: 'select',
            obrigatorio: true,
            opcoes: [
              { value: 'ativo', label: 'Ativo / Regular' },
              { value: 'suspenso', label: 'Suspenso Temporariamente' },
              { value: 'inativo', label: 'Inativo / Descredenciado' },
            ],
          },
          { nome: 'cpf_cnpj', rotulo: 'CPF ou CNPJ' },
          { nome: 'matricula_funcional', rotulo: 'Matrícula Funcional' },
          { nome: 'alvara_numero', rotulo: 'Nº do Alvará' },
          { nome: 'alvara_validade', rotulo: 'Validade do Alvará', tipo: 'date' },
          { nome: 'telefone', rotulo: 'Telefone de Contato' },
          { nome: 'email', rotulo: 'E-mail' },
        ]}
        iniciais={
          operadorEditando
            ? {
                nome: operadorEditando.nome,
                tipo: operadorEditando.tipo,
                situacao: operadorEditando.situacao,
                cpf_cnpj: operadorEditando.cpf_cnpj ?? '',
                matricula_funcional: operadorEditando.matricula_funcional ?? '',
                alvara_numero: operadorEditando.alvara_numero ?? '',
                alvara_validade: operadorEditando.alvara_validade ?? '',
                telefone: operadorEditando.telefone ?? '',
                email: operadorEditando.email ?? '',
              }
            : {}
        }
        onFechar={() => setOperadorEditando(null)}
        onEnviar={async (v: Record<string, unknown>) => {
          if (!operadorEditando) return;
          await cemiteriosApi.atualizarOperador(operadorEditando.id, {
            nome: String(v.nome),
            tipo: v.tipo as 'coveiro' | 'pedreiro',
            situacao: String(v.situacao) as 'ativo' | 'suspenso' | 'inativo',
            cpf_cnpj: v.cpf_cnpj ? String(v.cpf_cnpj) : undefined,
            matricula_funcional: v.matricula_funcional ? String(v.matricula_funcional) : undefined,
            alvara_numero: v.alvara_numero ? String(v.alvara_numero) : undefined,
            alvara_validade: v.alvara_validade ? String(v.alvara_validade) : undefined,
            telefone: v.telefone ? String(v.telefone) : undefined,
            email: v.email ? String(v.email) : undefined,
          });
          setOperadorEditando(null);
          await operadores.recarregar();
        }}
      />

      {/* Drawer: Histórico Operacional */}
      {historicoDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-xl h-full bg-background border-l border-border p-6 overflow-y-auto flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Histórico Operacional
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {historicoDrawer.operador.nome} • {historicoDrawer.operador.tipo === 'coveiro' ? 'Coveiro' : 'Pedreiro Credenciado'}
                  </p>
                </div>
                <button onClick={() => setHistoricoDrawer(null)} className="text-muted-foreground hover:text-foreground text-sm font-bold">
                  ✕
                </button>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl text-xs space-y-1">
                <div className="font-semibold text-foreground">
                  Total de operações registradas:{' '}
                  <span className="font-mono text-primary font-bold">{historicoDrawer.total_operacoes}</span>
                </div>
                <div className="text-muted-foreground">
                  Cruzamento automatizado com o acervo e livros de sepultamento municipais.
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Últimos Atendimentos Executados
                </span>
                {historicoDrawer.operacoes.length > 0 ? (
                  historicoDrawer.operacoes.map((op) => (
                    <div key={op.id} className="p-3 rounded-lg border border-border bg-card text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{op.falecido?.nome ?? 'Falecido não identificado'}</span>
                        <Mono className="text-[11px] text-muted-foreground">{formatarData(op.sepultado_em)}</Mono>
                      </div>
                      <div className="text-muted-foreground flex gap-3 font-mono text-[11px]">
                        <span>Jazigo: {op.jazigo?.codigo ?? '—'}</span>
                        <span>Necrópole: {op.jazigo?.cemiterio?.nome ?? 'Central/Independência'}</span>
                        {op.gaveta_numero && <span>Gaveta: {op.gaveta_numero}</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg">
                    Nenhum registro operacional vinculado a este profissional até o momento.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setHistoricoDrawer(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
