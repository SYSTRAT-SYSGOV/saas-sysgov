import React, { useMemo, useState } from 'react';
import { FileText , Gavel , CheckCircle2 , XCircle } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button, DataTable, StatusChip, Tabs } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import { cemiteriosApi, formatarData, type AlvaraObra, type Empreiteiro } from '../api';
import { ErroBox, FormModal, Mono, useAcao, useDados } from './comum';
import { useCemiteriosNavigation } from '../CemiteriosContext';
import { PessoaPicker, PessoaCard, PessoaFormModal, type NovoCadastroRapidoPessoaInput, type PessoaPickerOption, ActionsMenu } from '@sysgov/ui';
import { usePessoas } from '@/modules/pessoas/hooks';
import { pessoasApi } from '@/modules/pessoas/api';

const SITUACAO: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = { apto: 'success', inapto: 'warning', suspenso: 'danger', cancelado: 'neutral' };

/** Empreiteiros com alvará anual, alvarás de obra e penalidades (RF-29..RF-32). */
export const EmpreiteirosView: React.FC = () => {
  const { can } = useCan();
  const { cemiterioAtivoId } = useCemiteriosNavigation();
  const {
    pessoas: pessoasList,
    loading: loadingPessoas,
    setBusca: setBuscaPessoas,
    recarregar: recarregarPessoas,
  } = usePessoas({ porPagina: 20 });

  const [modalPessoaRapida, setModalPessoaRapida] = useState(false);
  const [pessoaSelecionadaEmpreiteiro, setPessoaSelecionadaEmpreiteiro] = useState<PessoaPickerOption | null>(null);

  const pessoasOptions = useMemo<PessoaPickerOption[]>(
    () =>
      pessoasList.map((p) => ({
        id: p.id,
        nome: p.nome,
        nome_social: p.nome_social,
        cpf_mascarado: p.cpf_mascarado,
        status: p.status,
        falecido: Boolean(p.falecido),
        data_falecimento: p.data_falecimento ?? null,
      })),
    [pessoasList]
  );

  const [aba, setAba] = useState<'empreiteiros' | 'obras'>('empreiteiros');
  const [modal, setModal] = useState<{ tipo: 'novo' | 'alvara' | 'penalidade' | 'obra'; alvo?: Empreiteiro } | null>(null);
  const empreiteiros = useDados(() => cemiteriosApi.empreiteiros(), []);
  const obras = useDados(
    () => cemiteriosApi.obras({ park_id: cemiterioAtivoId ?? undefined, per_page: 100 }),
    [cemiterioAtivoId]
  );
  const { erro, executar } = useAcao();
  const recarregar = () => Promise.all([empreiteiros.recarregar(), obras.recarregar()]);

  const colEmpreiteiros = useMemo<ColumnDef<Empreiteiro, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => {
        return (
          <div className="flex justify-center">
            <ActionsMenu
              triggerLabel="Ações do empreiteiro"
              items={[
                ...(row.original.situacao !== 'cancelado' ? [{ key: 'alvara', label: 'Alvará anual', icon: <FileText className="h-3.5 w-3.5" />, onSelect: () => setModal({ tipo: 'alvara', alvo: row.original }) }] : []),
                ...(row.original.situacao !== 'cancelado' ? [{ key: 'penalidade', label: 'Penalidade', icon: <Gavel className="h-3.5 w-3.5" />, onSelect: () => setModal({ tipo: 'penalidade', alvo: row.original }) }] : []),
              ]}
            />
          </div>
        );
      },
    },
    {
      id: 'nome',
      header: 'Nome', meta: { exportValue: (r) => r.pessoa?.nome ?? r.nome },
      cell: ({ row }) => {
        const nomeExibicao = row.original.pessoa?.nome ?? row.original.nome;
        return (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{nomeExibicao}</span>
            {row.original.pessoa_id && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gov-primary/10 text-gov-primary font-medium">
                Cadastro Central
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'doc',
      header: 'CPF/CNPJ', meta: { exportValue: (r) => r.pessoa?.cpf_mascarado ?? r.documento_mascarado },
      cell: ({ row }) => {
        const docExibicao = row.original.pessoa?.cpf_mascarado ?? row.original.documento_mascarado;
        return <Mono>{docExibicao}</Mono>;
      },
    },
    { id: 'rt', header: 'Responsável técnico', accessorFn: (r) => r.responsavel_tecnico ?? '—' },
    { id: 'situacao', header: 'Situação', meta: { exportValue: (r) => r.situacao }, cell: ({ row }) => <StatusChip label={row.original.situacao} variant={SITUACAO[row.original.situacao]} /> },
  ], []);

  const colObras = useMemo<ColumnDef<AlvaraObra, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => {
        return (
          <div className="flex justify-center">
            <ActionsMenu
              triggerLabel="Ações do alvará de obra"
              items={[
                ...(row.original.situacao === 'pendente' ? [{ key: 'concluir', label: 'Concluir obra', icon: <CheckCircle2 className="h-3.5 w-3.5" />, onSelect: () => { void (async () => { if (await executar(() => cemiteriosApi.encerrarObra(row.original.id, 'concluida'))) await recarregar(); })(); } }] : []),
                ...(row.original.situacao === 'pendente' ? [{ key: 'cancelar', label: 'Cancelar obra', icon: <XCircle className="h-3.5 w-3.5" />, onSelect: () => { void (async () => { if (await executar(() => cemiteriosApi.encerrarObra(row.original.id, 'cancelada'))) await recarregar(); })(); } }] : []),
              ]}
            />
          </div>
        );
      },
    },
    { id: 'id', header: 'Alvará', meta: { exportValue: (r) => `#${r.id}` }, cell: ({ row }) => <Mono>#{row.original.id}</Mono> },
    { id: 'jazigo', header: 'Jazigo (ID)', meta: { exportValue: (r) => r.plot_id }, cell: ({ row }) => <Mono>{row.original.plot_id}</Mono> },
    { id: 'descricao', header: 'Descrição', accessorKey: 'descricao' },
    { id: 'dim', header: 'Projeto (m)', meta: { exportValue: (r) => `${r.comprimento_m} × ${r.largura_m}` }, cell: ({ row }) => <Mono>{row.original.comprimento_m} × {row.original.largura_m}</Mono> },
    { id: 'prazo', header: 'Prazo', meta: { exportValue: (r) => r.prazo_fim }, cell: ({ row }) => <Mono>{formatarData(row.original.prazo_fim)}</Mono> },
    {
      id: 'situacao', header: 'Situação', meta: { exportValue: (r) => r.sinalizada ? `${r.situacao} (providência)` : r.situacao }, cell: ({ row }) => (
        <div className="flex gap-1">
          <StatusChip label={row.original.situacao} variant={row.original.situacao === 'pendente' ? 'info' : 'neutral'} />
          {row.original.sinalizada && <StatusChip label="providência" variant="danger" />}
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [executar]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs items={[{ key: 'empreiteiros', label: 'Empreiteiros' }, { key: 'obras', label: 'Alvarás de obra' }]} value={aba} onChange={setAba} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setModal({ tipo: 'novo' })}>Novo empreiteiro</Button>
          <Button onClick={() => setModal({ tipo: 'obra' })}>Novo alvará de obra</Button>
        </div>
      </div>
      <ErroBox erro={erro ?? empreiteiros.erro ?? obras.erro} />
      {aba === 'empreiteiros'
        ? <DataTable exportable exportFileName="cemiterios-empreiteiros-1" exportTitle="Cemitérios — Empreiteiros 1" columns={colEmpreiteiros} data={empreiteiros.dados?.data ?? []} loading={empreiteiros.carregando} searchable emptyText="Nenhum empreiteiro." />
        : <DataTable exportable exportFileName="cemiterios-empreiteiros-2" exportTitle="Cemitérios — Empreiteiros 2" columns={colObras} data={obras.dados?.data ?? []} loading={obras.carregando} emptyText="Nenhuma obra." />}

      <FormModal
        aberto={modal?.tipo === 'novo'}
        titulo="Novo empreiteiro"
        onFechar={() => {
          setModal(null);
          setPessoaSelecionadaEmpreiteiro(null);
        }}
        campos={[
          {
            nome: 'pessoa_id',
            rotulo: 'Vincular Pessoa Física (Cadastro Central)',
            tipo: 'custom',
            dica: 'Opcional. Preencha se o empreiteiro for uma pessoa física cadastrada no município.',
            renderCustom: (valor, onChange, setValores) => (
              <div className="space-y-3">
                <PessoaPicker
                  value={valor ? Number(valor) : null}
                  pessoas={pessoasOptions}
                  loading={loadingPessoas}
                  onSearch={(termo) => setBuscaPessoas(termo)}
                  onSelect={async (id, pessoaOption) => {
                    onChange(id);
                    if (id && pessoaOption) {
                      setPessoaSelecionadaEmpreiteiro(pessoaOption);
                      if (setValores) {
                        setValores((prev) => ({
                          ...prev,
                          nome: pessoaOption.nome || prev.nome,
                          documento: pessoaOption.cpf_mascarado || prev.documento,
                          responsavel_tecnico: pessoaOption.nome || prev.responsavel_tecnico,
                        }));
                        try {
                          const detalhes = await pessoasApi.obter(id);
                          if (detalhes) {
                            setValores((prev) => ({
                              ...prev,
                              nome: detalhes.nome || prev.nome,
                              documento: detalhes.cpf_mascarado || prev.documento,
                              responsavel_tecnico: detalhes.nome || prev.responsavel_tecnico,
                            }));
                          }
                        } catch (e) {
                          console.warn('Não foi possível obter detalhes adicionais da pessoa civil:', e);
                        }
                      }
                    } else {
                      setPessoaSelecionadaEmpreiteiro(null);
                    }
                  }}
                  canCreate={can('cadastros.pessoas.create')}
                  onQuickCreate={() => setModalPessoaRapida(true)}
                  placeholder="Buscar por nome ou CPF no cadastro geral..."
                />
                {pessoaSelecionadaEmpreiteiro && (
                  <PessoaCard
                    compact
                    pessoa={{
                      id: pessoaSelecionadaEmpreiteiro.id,
                      nome: pessoaSelecionadaEmpreiteiro.nome,
                      nome_social: pessoaSelecionadaEmpreiteiro.nome_social,
                      cpf_mascarado: pessoaSelecionadaEmpreiteiro.cpf_mascarado,
                      status: pessoaSelecionadaEmpreiteiro.status,
                    }}
                  />
                )}
              </div>
            ),
          },
          { nome: 'nome', rotulo: 'Nome / razão social', obrigatorio: true },
          { nome: 'documento', rotulo: 'CPF ou CNPJ', obrigatorio: true },
          { nome: 'responsavel_tecnico', rotulo: 'Responsável técnico' },
        ]}
        onEnviar={async (v) => {
          const nomeFinal = (v.nome as string) || pessoaSelecionadaEmpreiteiro?.nome || '';
          const docFinal = (v.documento as string) || pessoaSelecionadaEmpreiteiro?.cpf_mascarado || '';
          await cemiteriosApi.criarEmpreiteiro({
            nome: nomeFinal,
            documento: docFinal,
            responsavel_tecnico: v.responsavel_tecnico ? String(v.responsavel_tecnico) : undefined,
            pessoa_id: v.pessoa_id ? Number(v.pessoa_id) : (pessoaSelecionadaEmpreiteiro?.id ?? undefined),
          });
          setModal(null);
          setPessoaSelecionadaEmpreiteiro(null);
          await recarregar();
        }}
      />
      <FormModal aberto={modal?.tipo === 'alvara'} titulo={`Alvará anual — ${modal?.alvo?.nome ?? ''}`} onFechar={() => setModal(null)}
        campos={[{ nome: 'numero', rotulo: 'Número', obrigatorio: true }, { nome: 'validade', rotulo: 'Validade', tipo: 'date', obrigatorio: true }]}
        onEnviar={async (v) => { await cemiteriosApi.alvaraAnual(Number(modal?.alvo?.id), v as { numero: string; validade: string }); await recarregar(); }} />
      <FormModal aberto={modal?.tipo === 'penalidade'} titulo={`Penalidade — ${modal?.alvo?.nome ?? ''}`} onFechar={() => setModal(null)} iniciais={{ tipo: 'advertencia' }}
        campos={[
          { nome: 'tipo', rotulo: 'Tipo', tipo: 'select', obrigatorio: true, opcoes: [{ value: 'advertencia', label: 'Advertência' }, { value: 'suspensao', label: 'Suspensão' }] },
          { nome: 'inicio', rotulo: 'Início (suspensão)', tipo: 'date' }, { nome: 'fim', rotulo: 'Fim (suspensão)', tipo: 'date' },
          { nome: 'motivo', rotulo: 'Motivo', tipo: 'textarea', obrigatorio: true },
        ]}
        onEnviar={async (v) => { await cemiteriosApi.penalidade(Number(modal?.alvo?.id), v); await recarregar(); }} />
      <FormModal aberto={modal?.tipo === 'obra'} titulo="Novo alvará de obra" onFechar={() => setModal(null)}
        campos={[
          { nome: 'contractor_id', rotulo: 'Empreiteiro', tipo: 'select', obrigatorio: true,
            opcoes: (empreiteiros.dados?.data ?? []).filter((e) => e.situacao === 'apto').map((e) => ({ value: String(e.id), label: e.nome })) },
          { nome: 'plot_id', rotulo: 'ID do jazigo (com concessão vigente)', tipo: 'number', obrigatorio: true },
          { nome: 'comprimento_m', rotulo: 'Comprimento do projeto (m)', tipo: 'number', obrigatorio: true },
          { nome: 'largura_m', rotulo: 'Largura do projeto (m)', tipo: 'number', obrigatorio: true },
          { nome: 'prazo_fim', rotulo: 'Prazo de execução', tipo: 'date', obrigatorio: true },
          { nome: 'descricao', rotulo: 'Descrição da obra', tipo: 'textarea', obrigatorio: true },
        ]}
        onEnviar={async (v) => { await cemiteriosApi.criarObra({ ...v, contractor_id: Number(v.contractor_id), plot_id: Number(v.plot_id) }); await recarregar(); }} />

      {/* Modal: Cadastro Rápido de Pessoa Física (MDM) */}
      <PessoaFormModal
        open={modalPessoaRapida}
        onClose={() => setModalPessoaRapida(false)}
        onSubmit={async (dados: NovoCadastroRapidoPessoaInput) => {
          try {
            const nova = await pessoasApi.criar({
              nome: dados.nome,
              cpf: dados.cpf,
              nome_social: dados.nome_social,
              data_nascimento: dados.data_nascimento,
              sexo: dados.sexo,
              nome_mae: dados.nome_mae,
            });

            if (dados.contato_tipo && dados.contato_valor) {
              try {
                await pessoasApi.adicionarContato(nova.id, {
                  tipo: dados.contato_tipo,
                  valor: dados.contato_valor,
                  principal: true,
                  autoriza_notificacoes: true,
                });
              } catch {
                // opcional
              }
            }

            await recarregarPessoas();
            const optionNova: PessoaPickerOption = {
              id: nova.id,
              nome: nova.nome,
              nome_social: nova.nome_social,
              cpf_mascarado: nova.cpf_mascarado,
              status: nova.status,
            };

            setPessoaSelecionadaEmpreiteiro(optionNova);
            setModalPessoaRapida(false);
            return true;
          } catch (e) {
            console.error('Erro ao cadastrar pessoa rápida:', e);
            throw e;
          }
        }}
      />
    </div>
  );
};
