import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button, ConfirmDialog, DataTable, StatusChip, Tabs } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import { cemiteriosApi, formatarCentavos, formatarData, type Concessao, type Concessionario, type FiltrosConcessoesAvancados } from '../api';
import { ErroBox, FormModal, Mono, useAcao, useDados } from './comum';
import { useCemiteriosNavigation } from '../CemiteriosContext';
import { ConcessoesFiltros } from './ConcessoesFiltros';
import { DrawerHistoricoConcessao } from './DrawerHistoricoConcessao';
import { PessoaPicker } from '@sysgov/ui';
import { usePessoaPicker } from '@/modules/pessoas/hooks';
import { pessoasApi } from '@/modules/pessoas/api';

const SITUACAO: Record<string, 'success' | 'warning' | 'danger'> = { vigente: 'success', expirada: 'warning', extinta: 'danger' };
const MOTIVO_EXTINCAO_LABEL: Record<string, string> = { renuncia: 'Renúncia voluntária', abandono: 'Abandono (processo administrativo)' };

const FILTROS_INICIAIS: FiltrosConcessoesAvancados = {
  setorId: null,
  modalidade: 'todas',
  situacao: 'todas',
  pendenciaRegularizacao: false,
  financeiro: 'todas',
  venceEm: 'todas',
  busca: '',
};

/** Converte o estado dos filtros avançados nos parâmetros aceitos por `ConcessaoController@index`. */
function paraParametrosApi(filtros: FiltrosConcessoesAvancados, parkId: number | null): Record<string, unknown> {
  const params: Record<string, unknown> = { per_page: 100 };
  if (parkId) params.park_id = parkId;
  if (filtros.setorId) params.setor_id = filtros.setorId;
  if (filtros.modalidade && filtros.modalidade !== 'todas') params.modalidade = filtros.modalidade;
  if (filtros.situacao && filtros.situacao !== 'todas') params.situacao = filtros.situacao;
  if (filtros.pendenciaRegularizacao) params.pendencia_regularizacao = true;
  if (filtros.financeiro && filtros.financeiro !== 'todas') params.financeiro = filtros.financeiro;
  if (filtros.venceEm && filtros.venceEm !== 'todas') {
    const data = new Date();
    data.setDate(data.getDate() + Number(filtros.venceEm));
    params.vence_ate = data.toISOString().slice(0, 10);
  }
  if (filtros.busca.trim()) params.busca = filtros.busca.trim();
  return params;
}

/** Concessionários (CPF mascarado) e concessões temporárias/perpétuas (RF-11..RF-14). */
export const ConcessoesView: React.FC = () => {
  const { can } = useCan();
  const { cemiterioAtivoId, cemiterioAtivo } = useCemiteriosNavigation();
  const { buscarPessoas, criarPessoaRapido } = usePessoaPicker();
  const gerencia = can('cemiterios.concessoes.manage');
  const [aba, setAba] = useState<'concessoes' | 'titulares'>('concessoes');
  const [modal, setModal] = useState<'concessao' | 'titular' | null>(null);
  const [renovar, setRenovar] = useState<Concessao | null>(null);
  const [renunciar, setRenunciar] = useState<Concessao | null>(null);
  const [historico, setHistorico] = useState<Concessao | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosConcessoesAvancados>(FILTROS_INICIAIS);

  const setoresDisponiveis = cemiterioAtivo?.setores ?? [];

  const concessoes = useDados(
    () => cemiteriosApi.concessoes(paraParametrosApi(filtros, cemiterioAtivoId)),
    [cemiterioAtivoId, filtros]
  );
  const titulares = useDados(
    () => (gerencia && (aba === 'titulares' || modal === 'concessao') ? cemiteriosApi.titulares({ per_page: 50 }) : Promise.resolve(null)),
    [gerencia, aba, modal]
  );
  const { erro, executar } = useAcao();

  const colunasConcessoes = useMemo<ColumnDef<Concessao, unknown>[]>(() => [
    {
      id: 'numero', header: 'Número', accessorKey: 'numero', cell: ({ row }) => <Mono className="font-bold">{row.original.numero}</Mono>,
      meta: { exportHeader: 'Número', exportValue: (r) => r.numero, sortValue: (r) => r.numero },
    },
    {
      id: 'processo',
      header: 'Proc. Adm.',
      accessorKey: 'processo_administrativo',
      cell: ({ row }) => row.original.processo_administrativo ? <Mono className="text-xs">{row.original.processo_administrativo}</Mono> : <span className="text-muted-foreground">—</span>,
      meta: { exportHeader: 'Processo Administrativo', exportValue: (r) => r.processo_administrativo ?? '', sortValue: (r) => r.processo_administrativo ?? '' },
    },
    {
      id: 'jazigo', header: 'Jazigo', accessorFn: (r) => r.jazigo?.codigo ?? '', cell: ({ row }) => <Mono>{row.original.jazigo?.codigo}</Mono>,
      meta: { exportHeader: 'Jazigo', exportValue: (r) => r.jazigo?.codigo ?? '' },
    },
    {
      id: 'setor', header: 'Setor', cell: ({ row }) => <Mono className="text-xs">{row.original.jazigo?.setor?.codigo ?? '—'}</Mono>,
      meta: { exportHeader: 'Setor/Quadra', exportValue: (r) => r.jazigo?.setor?.codigo ?? '', sortValue: (r) => r.jazigo?.setor?.codigo ?? '' },
    },
    {
      id: 'titular',
      header: 'Concessionário',
      accessorFn: (r) => r.concessionario?.nome ?? '',
      cell: ({ row }) => (
        <div>
          <span className="font-medium text-foreground">{row.original.concessionario?.nome ?? '—'}</span>
          {row.original.concessionario?.titular_falecido && (
            <span className="ml-2 inline-flex items-center rounded bg-amber-100 dark:bg-amber-950/50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              ⚠️ Titular Falecido
            </span>
          )}
        </div>
      ),
      meta: { exportHeader: 'Concessionário', exportValue: (r) => r.concessionario?.nome ?? '' },
    },
    {
      id: 'modalidade', header: 'Modalidade', accessorKey: 'modalidade',
      meta: { exportHeader: 'Modalidade', exportValue: (r) => r.modalidade, sortValue: (r) => r.modalidade },
    },
    {
      id: 'termino', header: 'Término', cell: ({ row }) => <Mono>{row.original.termino ? formatarData(row.original.termino) : 'Perpétua'}</Mono>,
      meta: { exportHeader: 'Término', exportValue: (r) => r.termino ?? 'Perpétua', sortValue: (r) => r.termino ?? '' },
    },
    {
      id: 'financeiro',
      header: 'Situação Financeira',
      cell: ({ row }) => row.original.inadimplente
        ? <StatusChip label="Inadimplente" variant="danger" />
        : (row.original.guias_count ?? 0) > 0
          ? <StatusChip label="Adimplente" variant="success" />
          : <span className="text-xs text-muted-foreground">Sem guias</span>,
      meta: {
        exportHeader: 'Situação Financeira',
        exportValue: (r) => (r.inadimplente ? 'Inadimplente' : (r.guias_count ?? 0) > 0 ? 'Adimplente' : 'Sem guias'),
        sortValue: (r) => (r.inadimplente ? 2 : (r.guias_count ?? 0) > 0 ? 0 : 1),
      },
    },
    {
      id: 'situacao', header: 'Situação', cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap gap-1">
            <StatusChip label={row.original.situacao} variant={SITUACAO[row.original.situacao] ?? 'neutral'} />
            {row.original.pendencia_regularizacao && <StatusChip label="regularizar" variant="danger" />}
          </div>
          {row.original.situacao === 'extinta' && row.original.motivo_extincao && (
            <span className="text-[10px] text-muted-foreground" title={row.original.extinta_em ? `Extinta em ${formatarData(row.original.extinta_em)}` : undefined}>
              {MOTIVO_EXTINCAO_LABEL[row.original.motivo_extincao] ?? row.original.motivo_extincao}
            </span>
          )}
        </div>
      ),
      meta: { exportHeader: 'Situação', exportValue: (r) => r.situacao, sortValue: (r) => r.situacao },
    },
    {
      id: 'acoes', header: '', cell: ({ row }) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button size="xs" variant="ghost" onClick={() => setHistorico(row.original)}>Histórico</Button>
          {gerencia && row.original.modalidade === 'temporaria' && row.original.situacao === 'vigente' && (
            <Button size="xs" variant="outline" onClick={() => setRenovar(row.original)}>Renovar</Button>
          )}
          {gerencia && row.original.situacao === 'vigente' && (
            <Button size="xs" variant="outline" onClick={() => setRenunciar(row.original)}>Renunciar</Button>
          )}
        </div>
      ),
    },
  ], [gerencia]);

  const colunasTitulares = useMemo<ColumnDef<Concessionario, unknown>[]>(() => [
    {
      id: 'nome',
      header: 'Nome',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{row.original.nome}</span>
          {row.original.pessoa_id && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gov-primary/10 text-gov-primary font-medium">
              Cadastro Central
            </span>
          )}
        </div>
      ),
    },
    { id: 'doc', header: 'CPF/CNPJ', accessorKey: 'documento_mascarado', cell: ({ row }) => <Mono>{row.original.documento_mascarado}</Mono> },
    {
      id: 'situacao_titular',
      header: 'Sucessão / Status',
      cell: ({ row }) => row.original.titular_falecido ? (
        <span className="inline-flex items-center rounded bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
          Falecido {row.original.data_falecimento_titular ? `(${formatarData(row.original.data_falecimento_titular)})` : ''}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">Vivo / Regular</span>
      ),
    },
    { id: 'base', header: 'Base legal (LGPD)', accessorKey: 'base_legal' },
  ], []);

  const confirmarRenovacao = async () => {
    const alvo = renovar;
    setRenovar(null);
    if (!alvo) return;
    const r = await executar(() => cemiteriosApi.renovar(alvo.id));
    if (r) {
      setAviso(`Concessão ${r.concessao.numero} renovada até ${formatarData(r.concessao.termino)}. Guia ${r.guia.numero} de ${formatarCentavos(r.guia.valor_centavos)} emitida.`);
      await concessoes.recarregar();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs items={[{ key: 'concessoes', label: 'Concessões' }, ...(gerencia ? [{ key: 'titulares' as const, label: 'Concessionários' }] : [])]} value={aba} onChange={setAba} />
        {gerencia && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setModal('titular')}>Novo concessionário</Button>
            <Button onClick={() => setModal('concessao')}>Nova concessão</Button>
          </div>
        )}
      </div>
      {aviso && <p className="rounded-md border border-border bg-accent/50 p-3 text-sm" role="status">{aviso}</p>}
      <ErroBox erro={erro ?? concessoes.erro ?? titulares.erro} />

      {aba === 'concessoes' && (
        <ConcessoesFiltros
          filtros={filtros}
          onFiltrosChange={(novos) => setFiltros((f) => ({ ...f, ...novos }))}
          onLimparFiltros={() => setFiltros(FILTROS_INICIAIS)}
          setoresDisponiveis={setoresDisponiveis}
          totalRegistros={concessoes.dados?.total ?? 0}
          carregando={concessoes.carregando}
        />
      )}

      {aba === 'concessoes'
        ? (
          <DataTable
            columns={colunasConcessoes}
            data={concessoes.dados?.data ?? []}
            loading={concessoes.carregando}
            searchable={false}
            exportable
            exportFileName="concessoes"
            exportTitle="Concessões"
            pageSizeSelector
            pageSizeOptions={[10, 25, 50, 100]}
            resizableColumns
            emptyText="Nenhuma concessão encontrada para os filtros selecionados."
          />
        )
        : <DataTable columns={colunasTitulares} data={titulares.dados?.data ?? []} loading={titulares.carregando} searchable emptyText="Nenhum concessionário." />}

      <FormModal aberto={modal === 'titular'} titulo="Novo concessionário" onFechar={() => setModal(null)} iniciais={{ base_legal: 'execucao_contrato' }}
        campos={[
          {
            nome: 'pessoa_id',
            rotulo: 'Vincular Pessoa Física (Cadastro Central)',
            tipo: 'custom',
            dica: 'Opcional. Preencha para vincular e importar os dados cadastrais do munícipe.',
            renderCustom: (valor, onChange, setValores) => (
              <PessoaPicker
                value={valor ? Number(valor) : null}
                onChange={async (id, pessoaOption) => {
                  onChange(id);
                  if (id && setValores) {
                    if (pessoaOption) {
                      setValores((prev) => ({
                        ...prev,
                        nome: pessoaOption.nome || prev.nome,
                        documento: pessoaOption.cpf_mascarado || prev.documento,
                      }));
                    }
                    try {
                      const detalhes = await pessoasApi.obter(id);
                      if (detalhes) {
                        const primEndereco = detalhes.enderecos?.[0];
                        const endFormatado = primEndereco
                          ? `${primEndereco.logradouro || ''}, ${primEndereco.numero || 's/n'}${primEndereco.bairro ? ` - ${primEndereco.bairro}` : ''}${primEndereco.cidade ? ` - ${primEndereco.cidade}/${primEndereco.uf}` : ''}`
                          : '';

                        const emailContato = detalhes.contatos?.find((c) => c.tipo === 'email')?.valor;
                        const telContato = detalhes.contatos?.find((c) => c.tipo === 'celular' || c.tipo === 'telefone')?.valor;

                        setValores((prev) => ({
                          ...prev,
                          nome: detalhes.nome || prev.nome,
                          documento: detalhes.cpf_mascarado || prev.documento,
                          email: emailContato || prev.email,
                          telefone: telContato || prev.telefone,
                          endereco: endFormatado || prev.endereco,
                        }));
                      }
                    } catch (e) {
                      console.warn('Não foi possível obter detalhes adicionais da pessoa:', e);
                    }
                  }
                }}
                onSearch={buscarPessoas}
                onCreatePessoa={criarPessoaRapido}
                placeholder="Buscar munícipe por nome ou CPF no cadastro geral..."
              />
            ),
          },
          { nome: 'nome', rotulo: 'Nome / razão social', obrigatorio: true },
          { nome: 'documento', rotulo: 'CPF ou CNPJ', obrigatorio: true, dica: 'Armazenado cifrado; exibido mascarado.' },
          { nome: 'email', rotulo: 'E-mail' }, { nome: 'telefone', rotulo: 'Telefone' }, { nome: 'endereco', rotulo: 'Endereço' },
          { nome: 'base_legal', rotulo: 'Base legal', tipo: 'select', opcoes: [
            { value: 'execucao_contrato', label: 'Execução de contrato' }, { value: 'obrigacao_legal', label: 'Obrigação legal' }, { value: 'consentimento', label: 'Consentimento' },
          ] },
        ]}
        onEnviar={async (v) => { await cemiteriosApi.criarTitular(v as Partial<Concessionario> & { documento: string }); await titulares.recarregar(); }} />
      <FormModal aberto={modal === 'concessao'} titulo="Nova concessão" onFechar={() => setModal(null)} iniciais={{ modalidade: 'temporaria' }}
        campos={[
          { nome: 'plot_id', rotulo: 'ID do jazigo (Disponível)', tipo: 'number', obrigatorio: true },
          { nome: 'holder_id', rotulo: 'Concessionário', tipo: 'select', obrigatorio: true,
            opcoes: (titulares.dados?.data ?? []).map((t) => ({ value: String(t.id), label: `${t.nome} — ${t.documento_mascarado}` })) },
          { nome: 'modalidade', rotulo: 'Modalidade', tipo: 'select', obrigatorio: true, opcoes: [{ value: 'temporaria', label: 'Temporária' }, { value: 'perpetua', label: 'Perpétua' }] },
          { nome: 'processo_administrativo', rotulo: 'Processo Administrativo', dica: 'Ex.: Proc. 1024/2026' },
          { nome: 'inicio', rotulo: 'Início', tipo: 'date' },
        ]}
        onEnviar={async (v) => {
          // A versão lida do jazigo segue na requisição: concessão simultânea recebe 409 (RNF-06).
          const jazigo = await cemiteriosApi.jazigo(Number(v.plot_id));
          await cemiteriosApi.conceder({
            plot_id: jazigo.id,
            holder_id: Number(v.holder_id),
            modalidade: String(v.modalidade),
            processo_administrativo: (v.processo_administrativo as string) || undefined,
            inicio: (v.inicio as string) || undefined,
            lock_version: jazigo.lock_version,
          });
          await concessoes.recarregar();
        }} />
      <ConfirmDialog open={renovar !== null} onClose={() => setRenovar(null)} onConfirm={() => void confirmarRenovacao()}
        title={`Renovar concessão ${renovar?.numero ?? ''}`} description="A renovação estende o término pelo prazo vigente e emite a guia pelo preço atual." confirmLabel="Renovar" />

      <FormModal
        aberto={renunciar !== null}
        titulo={`Renunciar concessão ${renunciar?.numero ?? ''}`}
        description="A renúncia extingue a concessão vigente por devolução voluntária do concessionário e libera o jazigo para nova concessão."
        campos={[
          { nome: 'motivo', rotulo: 'Motivo / justificativa', tipo: 'textarea', obrigatorio: true, dica: 'Registrado na auditoria da concessão.' },
          { nome: 'processo_administrativo', rotulo: 'Processo administrativo de baixa (opcional)' },
        ]}
        rotuloEnviar="Confirmar renúncia"
        onFechar={() => setRenunciar(null)}
        onEnviar={async (v) => {
          if (!renunciar) return;
          await cemiteriosApi.renunciarConcessao(renunciar.id, {
            motivo: String(v.motivo ?? ''),
            processo_administrativo: (v.processo_administrativo as string) || undefined,
          });
          await concessoes.recarregar();
        }}
      />

      <DrawerHistoricoConcessao concessao={historico} onFechar={() => setHistorico(null)} />
    </div>
  );
};
