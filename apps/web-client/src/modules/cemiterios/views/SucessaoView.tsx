import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileCheck2,
  FilePlus2,
  FileText,
  Printer,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button, DataTable, StatusChip, Tabs } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import {
  cemiteriosApi,
  formatarData,
  type Concessao,
  type ProcessoSucessao,
  type TermoSucessaoDados,
} from '../api';
import { ErroBox, FormModal, Mono, useAcao, useDados } from './comum';
import { useCemiteriosNavigation } from '../CemiteriosContext';

const STATUS_MAP: Record<string, 'warning' | 'success' | 'danger' | 'neutral'> = {
  em_analise: 'warning',
  deferido: 'success',
  indeferido: 'danger',
  cancelado: 'neutral',
};

export const SucessaoView: React.FC = () => {
  const { can } = useCan();
  const { cemiterioAtivoId } = useCemiteriosNavigation();
  const gerencia = can('cemiterios.concessoes.manage');

  const [subAba, setSubAba] = useState<'pendencias' | 'processos'>('pendencias');
  const [modalAbrir, setModalAbrir] = useState<Concessao | null>(null);
  const [modalHerdeiros, setModalHerdeiros] = useState<ProcessoSucessao | null>(null);
  const [modalDeferir, setModalDeferir] = useState<ProcessoSucessao | null>(null);
  const [modalTermo, setModalTermo] = useState<TermoSucessaoDados | null>(null);
  const [novoHerdeiroForm, setNovoHerdeiroForm] = useState(false);

  const { erro, executar } = useAcao();

  const pendencias = useDados(
    () => cemiteriosApi.sucessoesPendencias({ necropole_id: cemiterioAtivoId ?? undefined, per_page: 50 }),
    [cemiterioAtivoId]
  );

  const processos = useDados(
    () => cemiteriosApi.sucessoes({ per_page: 50 }),
    [cemiterioAtivoId]
  );

  // Colunas de Pendências de Regularização
  const colunasPendencias = useMemo<ColumnDef<Concessao, unknown>[]>(() => [
    {
      id: 'numero',
      header: 'Concessão',
      cell: ({ row }) => <Mono className="font-bold">{row.original.numero}</Mono>,
    },
    {
      id: 'jazigo',
      header: 'Jazigo / Necrópole',
      cell: ({ row }) => (
        <div>
          <Mono className="font-semibold text-foreground">{row.original.jazigo?.codigo ?? '—'}</Mono>
          <div className="text-xs text-muted-foreground">{row.original.jazigo?.cemiterio?.nome ?? 'Necrópole'}</div>
        </div>
      ),
    },
    {
      id: 'titular',
      header: 'Titular Registrado',
      cell: ({ row }) => (
        <div>
          <span className="font-medium text-foreground">{row.original.concessionario?.nome ?? '—'}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              <AlertCircle className="h-3 w-3" /> Titular Falecido
            </span>
            {row.original.concessionario?.documento_mascarado && (
              <Mono className="text-xs text-muted-foreground">({row.original.concessionario.documento_mascarado})</Mono>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'situacao',
      header: 'Situação da Concessão',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1 items-start">
          <StatusChip label={row.original.situacao} variant="info" />
          <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400 font-semibold">
            Trava Anti-Sepultamento Ativa
          </span>
        </div>
      ),
    },
    {
      id: 'acoes',
      header: '',
      cell: ({ row }) => (
        gerencia ? (
          <Button
            size="xs"
            variant="outline"
            className="flex items-center gap-1.5 font-medium"
            onClick={() => setModalAbrir(row.original)}
          >
            <FilePlus2 className="h-3.5 w-3.5 text-primary" />
            Autuar Regularização
          </Button>
        ) : null
      ),
    },
  ], [gerencia]);

  // Colunas de Processos Autuados
  const colunasProcessos = useMemo<ColumnDef<ProcessoSucessao, unknown>[]>(() => [
    {
      id: 'processo',
      header: 'Nº Processo',
      cell: ({ row }) => (
        <div>
          <Mono className="font-bold text-foreground">{row.original.numero_processo}</Mono>
          <div className="text-xs text-muted-foreground capitalize">
            {row.original.tipo_documento.replace('_', ' ')}
          </div>
        </div>
      ),
    },
    {
      id: 'concessao',
      header: 'Concessão / Jazigo',
      cell: ({ row }) => (
        <div>
          <Mono className="font-medium text-foreground">{row.original.concessao?.numero ?? '—'}</Mono>
          <div className="text-xs text-muted-foreground">
            Jazigo: <Mono>{row.original.concessao?.jazigo?.codigo ?? '—'}</Mono>
          </div>
        </div>
      ),
    },
    {
      id: 'herdeiros',
      header: 'Herdeiros Qualificados',
      cell: ({ row }) => {
        const total = row.original.herdeiros?.length ?? 0;
        const indicado = row.original.herdeiros?.find((h) => h.titular_indicado);
        return (
          <div>
            <div className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              {total} {total === 1 ? 'herdeiro qualificado' : 'herdeiros qualificados'}
            </div>
            {indicado ? (
              <div className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                <UserCheck className="h-3 w-3" />
                Repres.: <span className="font-medium">{indicado.nome}</span> ({indicado.parentesco})
              </div>
            ) : (
              <span className="text-[11px] text-amber-600 dark:text-amber-400">Pendente de indicar representante</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'situacao',
      header: 'Status Processual',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1 items-start">
          <StatusChip
            label={row.original.situacao.replace('_', ' ')}
            variant={STATUS_MAP[row.original.situacao] ?? 'neutral'}
          />
          {row.original.termo_numero && (
            <Mono className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
              {row.original.termo_numero}
            </Mono>
          )}
        </div>
      ),
    },
    {
      id: 'acoes',
      header: '',
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex items-center gap-1.5 justify-end">
            <Button
              size="xs"
              variant="outline"
              onClick={() => setModalHerdeiros(p)}
              title="Ver ou adicionar herdeiros"
            >
              <Users className="h-3.5 w-3.5 mr-1" />
              Herdeiros
            </Button>

            {p.situacao === 'em_analise' && gerencia && (
              <Button
                size="xs"
                variant="outline"
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300"
                onClick={() => setModalDeferir(p)}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Deferir
              </Button>
            )}

            {p.situacao === 'deferido' && (
              <Button
                size="xs"
                variant="outline"
                onClick={async () => {
                  const termo = await cemiteriosApi.termoSucessao(p.id);
                  setModalTermo(termo);
                }}
              >
                <Printer className="h-3.5 w-3.5 mr-1" />
                Termo
              </Button>
            )}
          </div>
        );
      },
    },
  ], [gerencia]);

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Concessões c/ Titular Falecido</span>
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-900 dark:text-amber-100">
            {pendencias.dados?.total ?? '—'}
          </div>
          <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-400/80">
            Jazigos com trava preventiva de sepultamento ativa
          </p>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">Processos em Análise</span>
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-blue-900 dark:text-blue-100">
            {processos.dados?.data?.filter((p) => p.situacao === 'em_analise').length ?? 0}
          </div>
          <p className="mt-1 text-xs text-blue-700/80 dark:text-blue-400/80">
            Aguardando qualificação ou decisão administrativa
          </p>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Sucessões Regularizadas</span>
            <FileCheck2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-900 dark:text-emerald-100">
            {processos.dados?.data?.filter((p) => p.situacao === 'deferido').length ?? 0}
          </div>
          <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400/80">
            Termo emitido e jazigos destravados com fé pública
          </p>
        </div>
      </div>

      <ErroBox erro={erro} />

      {/* Navegação entre Pendências e Processos */}
      <Tabs
        items={[
          { key: 'pendencias', label: `Pendências de Regularização (${pendencias.dados?.total ?? 0})` },
          { key: 'processos', label: `Processos Autuados (${processos.dados?.total ?? 0})` },
        ]}
        value={subAba}
        onChange={(k) => setSubAba(k as typeof subAba)}
      />

      {subAba === 'pendencias' && (
        <DataTable
          columns={colunasPendencias}
          data={pendencias.dados?.data ?? []}
          loading={pendencias.carregando}
          searchable
          emptyText="Nenhuma concessão com pendência de sucessão nesta necrópole."
        />
      )}

      {subAba === 'processos' && (
        <DataTable
          columns={colunasProcessos}
          data={processos.dados?.data ?? []}
          loading={processos.carregando}
          searchable
          emptyText="Nenhum processo administrativo de sucessão autuado até o momento."
        />
      )}

      {/* Modal: Autuar Processo de Sucessão */}
      <FormModal
        aberto={modalAbrir !== null}
        titulo="Autuar Processo de Sucessão Hereditária"
        description={`Concessão ${modalAbrir?.numero ?? ''} • Jazigo ${modalAbrir?.jazigo?.codigo ?? '—'}`}
        campos={[
          {
            nome: 'numero_processo',
            rotulo: 'Nº dos Autos / Processo Administrativo',
            obrigatorio: true,
            dica: 'Ex: 0012345-67.2026.8.16.0001 ou PA-1234/2026',
          },
          {
            nome: 'tipo_documento',
            rotulo: 'Instrumento Jurídico Comprobatório',
            tipo: 'select',
            obrigatorio: true,
            opcoes: [
              { value: 'inventario_judicial', label: 'Inventário Judicial / Formal de Partilha' },
              { value: 'inventario_extrajudicial', label: 'Escritura Pública de Inventário (Cartório de Notas)' },
              { value: 'alvara_judicial', label: 'Alvará Judicial Específico' },
              { value: 'outro', label: 'Outro Processo Administrativo Municipal' },
            ],
          },
          { nome: 'vara_ou_cartorio', rotulo: 'Vara Judicial ou Cartório de Origem' },
        ]}
        iniciais={{ tipo_documento: 'inventario_judicial' }}
        onFechar={() => setModalAbrir(null)}
        onEnviar={async (v: Record<string, unknown>) => {
          if (!modalAbrir) return;
          await cemiteriosApi.abrirSucessao({
            concession_id: modalAbrir.id,
            numero_processo: String(v.numero_processo),
            tipo_documento: String(v.tipo_documento),
            vara_ou_cartorio: v.vara_ou_cartorio ? String(v.vara_ou_cartorio) : undefined,
          });
          await pendencias.recarregar();
          await processos.recarregar();
          setSubAba('processos');
        }}
      />

      {/* Modal: Deferir Sucessão */}
      <FormModal
        aberto={modalDeferir !== null}
        titulo="Deferir Sucessão e Transferir Concessão"
        description={`Processo ${modalDeferir?.numero_processo ?? ''} • Concessão ${modalDeferir?.concessao?.numero ?? ''}`}
        campos={[
          {
            nome: 'despacho_fundamentacao',
            rotulo: 'Despacho Administrativo Fundamentado',
            tipo: 'textarea',
            obrigatorio: true,
            dica: 'A titularidade da concessão será transferida para o herdeiro representante e o jazigo será liberado para sepultamentos.',
          },
        ]}
        onFechar={() => setModalDeferir(null)}
        onEnviar={async (v: Record<string, unknown>) => {
          if (!modalDeferir) return;
          await cemiteriosApi.deferirSucessao(modalDeferir.id, {
            despacho_fundamentacao: String(v.despacho_fundamentacao),
          });
          await processos.recarregar();
          await pendencias.recarregar();
        }}
      />

      {/* Modal: Gerenciar Herdeiros */}
      {modalHerdeiros && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background rounded-xl shadow-2xl border border-border w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Qualificação de Herdeiros da Concessão
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Processo {modalHerdeiros.numero_processo} • Concessão {modalHerdeiros.concessao?.numero}
                </p>
              </div>
              <button
                onClick={() => {
                  setModalHerdeiros(null);
                  setNovoHerdeiroForm(false);
                }}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Herdeiros Cadastrados ({modalHerdeiros.herdeiros?.length ?? 0})
                </span>
                {modalHerdeiros.situacao === 'em_analise' && !novoHerdeiroForm && (
                  <Button size="xs" variant="outline" onClick={() => setNovoHerdeiroForm(true)}>
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    Adicionar Herdeiro
                  </Button>
                )}
              </div>

              {/* Lista de Herdeiros */}
              <div className="space-y-2">
                {modalHerdeiros.herdeiros && modalHerdeiros.herdeiros.length > 0 ? (
                  modalHerdeiros.herdeiros.map((h) => (
                    <div
                      key={h.id}
                      className={`p-3 rounded-lg border flex items-center justify-between ${
                        h.titular_indicado
                          ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
                          : 'border-border bg-card'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{h.nome}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium capitalize">
                            {h.parentesco}
                          </span>
                          {h.titular_indicado && (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                              <UserCheck className="h-3 w-3" /> Titular Representante Indicado
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex gap-3 font-mono">
                          {h.documento && <span>Doc: {h.documento}</span>}
                          {h.telefone && <span>Tel: {h.telefone}</span>}
                          {h.email && <span>Email: {h.email}</span>}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg">
                    Nenhum herdeiro qualificado ainda neste processo.
                  </div>
                )}
              </div>

              {/* Formulário de Novo Herdeiro */}
              {novoHerdeiroForm && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    executar(async () => {
                      await cemiteriosApi.adicionarHerdeiro(modalHerdeiros.id, {
                        nome: String(form.get('nome')),
                        parentesco: String(form.get('parentesco')),
                        documento: form.get('documento') ? String(form.get('documento')) : undefined,
                        telefone: form.get('telefone') ? String(form.get('telefone')) : undefined,
                        email: form.get('email') ? String(form.get('email')) : undefined,
                        titular_indicado: form.get('titular_indicado') === 'on',
                      });
                      const atualizado = await cemiteriosApi.sucessao(modalHerdeiros.id);
                      setModalHerdeiros(atualizado);
                      setNovoHerdeiroForm(false);
                      processos.recarregar();
                    });
                  }}
                  className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3"
                >
                  <div className="font-semibold text-xs text-primary flex items-center gap-1.5">
                    <UserPlus className="h-4 w-4" /> Qualificar Novo Herdeiro
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold mb-1">Nome Completo *</label>
                      <input name="nome" required placeholder="Nome do herdeiro" className="w-full rounded border px-2.5 py-1 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold mb-1">Grau de Parentesco *</label>
                      <select name="parentesco" required className="w-full rounded border px-2.5 py-1 text-xs bg-background">
                        <option value="conjuge">Cônjuge / Companheiro(a)</option>
                        <option value="filho">Filho(a)</option>
                        <option value="neto">Neto(a)</option>
                        <option value="irmao">Irmão/Irmã</option>
                        <option value="meeiro">Meeiro(a)</option>
                        <option value="legatario">Legatário(a)</option>
                        <option value="outro">Outro Herdeiro Legal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold mb-1">CPF / Documento</label>
                      <input name="documento" placeholder="000.000.000-00" className="w-full rounded border px-2.5 py-1 text-xs font-mono" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold mb-1">Telefone de Contato</label>
                      <input name="telefone" placeholder="(00) 00000-0000" className="w-full rounded border px-2.5 py-1 text-xs font-mono" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input type="checkbox" id="titular_indicado" name="titular_indicado" className="rounded" />
                    <label htmlFor="titular_indicado" className="text-xs font-semibold text-foreground cursor-pointer">
                      Indicar este herdeiro como Titular Representante da concessão
                    </label>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button size="xs" variant="ghost" type="button" onClick={() => setNovoHerdeiroForm(false)}>
                      Cancelar
                    </Button>
                    <Button size="xs" type="submit">
                      Salvar Herdeiro
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <div className="p-3 border-t border-border bg-muted/20 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setModalHerdeiros(null);
                  setNovoHerdeiroForm(false);
                }}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Termo Oficial de Sucessão */}
      {modalTermo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white text-slate-900 rounded-xl shadow-2xl border w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-700" />
                <span className="font-bold text-sm text-slate-800">
                  Termo Oficial de Transferência de Concessão Hereditária
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="xs" onClick={() => window.print()}>
                  <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir Termo A4
                </Button>
                <button onClick={() => setModalTermo(null)} className="text-slate-500 hover:text-slate-800 font-bold ml-2">
                  ✕
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto space-y-6 text-sm leading-relaxed print:p-0">
              {/* Cabeçalho Oficial */}
              <div className="text-center border-b pb-4">
                <h2 className="font-bold text-base uppercase tracking-wider">MUNICÍPIO DE GESTÃO CEMITERIAL</h2>
                <h3 className="font-medium text-xs text-slate-600 uppercase">SERVIÇO PÚBLICO DE GESTÃO DE NECRÓPOLES E JAZIGOS</h3>
                <div className="mt-3 inline-block bg-slate-100 border border-slate-300 px-3 py-1 rounded font-mono font-bold text-xs">
                  {modalTermo.termo_numero}
                </div>
              </div>

              {/* Certificação */}
              <div className="text-justify space-y-3">
                <p>
                  <strong>CERTIFICO</strong>, no uso das atribuições legais conferidas pela legislação municipal e nos autos do processo administrativo/judicial nº <span className="font-mono font-bold">{modalTermo.processo_numero}</span> ({modalTermo.tipo_documento.replace('_', ' ')}), que foi processada e deferida a <strong>REGULARIZAÇÃO DE SUCESSÃO HEREDITÁRIA</strong> da concessão de uso perpétuo/temporário de jazigo tumular.
                </p>

                <div className="bg-slate-50 p-3.5 rounded border border-slate-200 text-xs space-y-1 font-mono">
                  <div><strong>NECRÓPOLE:</strong> {modalTermo.jazigo.necropole}</div>
                  <div><strong>JAZIGO:</strong> {modalTermo.jazigo.codigo} (Quadra: {modalTermo.jazigo.quadra ?? '—'})</div>
                  <div><strong>TITULAR DE CUJUS:</strong> {modalTermo.titular_anterior.nome} {modalTermo.titular_anterior.documento && `(${modalTermo.titular_anterior.documento})`}</div>
                  <div><strong>NOVO CONCESSIONÁRIO REPRESENTANTE:</strong> {modalTermo.novo_titular.nome} {modalTermo.novo_titular.documento && `(${modalTermo.novo_titular.documento})`}</div>
                </div>

                <div>
                  <h4 className="font-bold text-xs uppercase text-slate-700 mb-1">Herdeiros Qualificados nos Autos:</h4>
                  <ul className="list-disc pl-5 text-xs space-y-0.5">
                    {modalTermo.herdeiros.map((h, i) => (
                      <li key={i}>
                        {h.nome} — <em>{h.parentesco}</em> {h.documento && `(Doc: ${h.documento})`}
                        {h.titular_indicado && <span className="font-bold text-emerald-700"> [Representante Indicado]</span>}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t pt-3">
                  <h4 className="font-bold text-xs uppercase text-slate-700 mb-1">Despacho da Autoridade Competente:</h4>
                  <p className="text-xs italic bg-slate-50 p-2.5 rounded border border-slate-200">
                    "{modalTermo.despacho_fundamentacao}"
                  </p>
                </div>
              </div>

              {/* Data e Assinaturas */}
              <div className="border-t pt-8 mt-8 text-center grid grid-cols-2 gap-8 text-xs">
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold">
                    {modalTermo.novo_titular.nome}
                  </div>
                  <div className="text-[11px] text-slate-500">Novo Titular Representante da Concessão</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold">
                    {modalTermo.deferido_por ?? 'Autoridade Administrativa Cemiterial'}
                  </div>
                  <div className="text-[11px] text-slate-500">Gestor do Serviço de Cemitérios</div>
                </div>
              </div>
            </div>

            <div className="p-3 border-t bg-slate-50 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setModalTermo(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
