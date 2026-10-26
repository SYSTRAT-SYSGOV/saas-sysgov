import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Package, Pencil, Plus, RefreshCcw, Search } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, CardHeader, CardTitle, Input, Modal, Select, Skeleton, DataTable } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi } from '../../escola/api';
import { useCarga } from '../../escola/useCarga';
import { inservivelApi, type BemResumo, type FiltrosBens, type Opcoes } from '../api';
import { formatarCentavos, rotuloUnidade, secretarias, setoresDe } from '../formato';
import type { PropsAba } from '../ModuloInservivelMain';
import { ChipSituacao, FotoBem, useOpcoes } from './Comuns';
import { BemDetalheModal } from './BemDetalheModal';
import { BemFormModal } from './BemFormModal';
import { useFormValidationModal } from '@/lib/useFormValidationModal';
import { colunaAcoes } from '@/lib/colunaAcoes';

const FILTROS_VAZIOS = { q: '', situacao_id: '', estado_conservacao_id: '', secretaria_unit_id: '', setor_unit_id: '' };

/** Bens inservíveis (spec: Cadastro de bens). Bem não é excluído: a ação de "excluir" muda a situação. */
export const BensInserviveis: React.FC<PropsAba> = ({ permissoes, avisar, parametro, limparParametro }) => {
  const [versao, setVersao] = useState(0);
  const { opcoes, erro: erroOpcoes } = useOpcoes(versao);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [aplicados, setAplicados] = useState(FILTROS_VAZIOS);
  const [pagina, setPagina] = useState(1);
  const [ver, setVer] = useState<number | null>(null);
  const [editar, setEditar] = useState<number | 'novo' | null>(null);
  const [mudarSituacao, setMudarSituacao] = useState<BemResumo | null>(null);
  const [porPagina, setPorPagina] = useState(15);

  useEffect(() => {
    const bem = parametro('bem');
    if (bem) { setVer(Number(bem)); limparParametro('bem'); }
    if (parametro('novo') && permissoes.bens) { setEditar('novo'); limparParametro('novo'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const consulta: FiltrosBens = {
    page: pagina,
    per_page: porPagina,
    q: aplicados.q || undefined,
    situacao_id: aplicados.situacao_id ? Number(aplicados.situacao_id) : undefined,
    estado_conservacao_id: aplicados.estado_conservacao_id ? Number(aplicados.estado_conservacao_id) : undefined,
    secretaria_unit_id: aplicados.secretaria_unit_id ? Number(aplicados.secretaria_unit_id) : undefined,
    setor_unit_id: aplicados.setor_unit_id ? Number(aplicados.setor_unit_id) : undefined,
  };
  const lista = useCarga(() => inservivelApi.bens(consulta), [JSON.stringify(consulta), versao]);
  const alterou = () => setVersao((v) => v + 1);

  // Colunas estáveis (a foto não recarrega a cada render); a permissão atual vem por ref.
  const ctx = useRef({ permissoes });
  ctx.current = { permissoes };
  const colunas = useMemo<ColumnDef<BemResumo, unknown>[]>(() => [
    colunaAcoes<BemResumo>((b) => `Ações do bem ${b.numero_patrimonial}`, (b) => [
      { key: 'ver', label: 'Visualizar', icon: <Eye className="h-3.5 w-3.5" />, onSelect: () => setVer(b.id) },
      ...(ctx.current.permissoes.bens ? [
        { key: 'editar', label: 'Editar', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => setEditar(b.id) },
        { key: 'situacao', label: 'Mudar situação', icon: <RefreshCcw className="h-3.5 w-3.5" />, onSelect: () => setMudarSituacao(b) },
      ] : []),
    ]),
    {
      id: 'foto', header: 'Foto', enableSorting: false,
      cell: ({ row }) => <FotoBem chave={row.original.foto_principal_id ? `${row.original.id}-${row.original.foto_principal_id}` : null} carregar={() => inservivelApi.foto(row.original.id, row.original.foto_principal_id ?? 0)} alt={`Foto do bem ${row.original.numero_patrimonial}`} className="h-10 w-10" />,
      meta: { exportIgnore: true },
    },
    {
      id: 'patrimonio', header: 'Nº patrimonial', accessorKey: 'numero_patrimonial',
      cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.numero_patrimonial}{row.original.plaqueta_antiga && <p className="text-xs text-muted-foreground">Plaqueta {row.original.plaqueta_antiga}</p>}</span>,
      meta: { exportHeader: 'Nº patrimonial', exportValue: (b) => b.numero_patrimonial },
    },
    {
      id: 'descricao', header: 'Descrição', accessorKey: 'descricao',
      cell: ({ row }) => <div className="max-w-xs"><p className="truncate">{row.original.descricao}</p><p className="text-xs text-muted-foreground">{[row.original.categoria?.nome, row.original.estado_conservacao?.nome].filter(Boolean).join(' · ')}</p></div>,
      meta: { exportHeader: 'Descrição', exportValue: (b) => b.descricao },
    },
    { id: 'setor', header: 'Secretaria / setor', accessorFn: (b) => rotuloUnidade(b.secretaria, b.setor), meta: { exportHeader: 'Secretaria / setor', exportValue: (b) => rotuloUnidade(b.secretaria, b.setor) } },
    {
      id: 'situacao', header: 'Situação', accessorFn: (b) => b.situacao.nome,
      cell: ({ row }) => <ChipSituacao situacao={row.original.situacao} />,
      meta: { exportHeader: 'Situação', exportValue: (b) => b.situacao.nome },
    },
    {
      id: 'valor', header: 'Valor avaliado', accessorKey: 'valor_avaliado_cents',
      cell: ({ row }) => <span className="block text-right font-mono tabular-nums">{formatarCentavos(row.original.valor_avaliado_cents)}</span>,
      meta: { exportHeader: 'Valor avaliado', exportValue: (b) => formatarCentavos(b.valor_avaliado_cents) },
    },
  ], []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" />Bens inservíveis</CardTitle>
          {permissoes.bens && <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditar('novo')}>Adicionar bem</Button>}
        </CardHeader>
        <CardContent className="space-y-3">
          <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-[1fr_10rem_10rem_12rem_12rem_auto] xl:items-end" onSubmit={(e) => { e.preventDefault(); setPagina(1); setAplicados(filtros); }}>
            <Input label="Buscar" placeholder="Nº, plaqueta, descrição, marca, modelo" value={filtros.q} onChange={(e) => setFiltros((f) => ({ ...f, q: e.target.value }))} />
            <Select placeholder="Todas" label="Situação" value={filtros.situacao_id} onChange={(v) => setFiltros((f) => ({ ...f, situacao_id: v }))}
              options={[{ value: '', label: 'Todas' }, ...(opcoes?.situacoes ?? []).map((s) => ({ value: String(s.id), label: s.nome }))]} />
            <Select placeholder="Todos" label="Estado" value={filtros.estado_conservacao_id} onChange={(v) => setFiltros((f) => ({ ...f, estado_conservacao_id: v }))}
              options={[{ value: '', label: 'Todos' }, ...(opcoes?.estados_conservacao ?? []).map((s) => ({ value: String(s.id), label: s.nome }))]} />
            <Select placeholder="Todas" label="Secretaria" value={filtros.secretaria_unit_id} onChange={(v) => setFiltros((f) => ({ ...f, secretaria_unit_id: v, setor_unit_id: '' }))}
              options={[{ value: '', label: 'Todas' }, ...secretarias(opcoes?.unidades ?? []).map((u) => ({ value: String(u.id), label: u.sigla ?? u.nome }))]} />
            <Select placeholder="Todos" label="Setor" value={filtros.setor_unit_id} onChange={(v) => setFiltros((f) => ({ ...f, setor_unit_id: v }))} disabled={!filtros.secretaria_unit_id}
              options={[{ value: '', label: 'Todos' }, ...setoresDe(opcoes?.unidades ?? [], filtros.secretaria_unit_id ? Number(filtros.secretaria_unit_id) : null)]} />
            <div className="flex gap-2">
              <Button type="submit" variant="outline" leftIcon={<Search className="h-4 w-4" />}>Filtrar</Button>
              <Button type="button" variant="ghost" aria-label="Limpar filtros" onClick={() => { setFiltros(FILTROS_VAZIOS); setAplicados(FILTROS_VAZIOS); setPagina(1); }}><RefreshCcw className="h-4 w-4" /></Button>
            </div>
          </form>

          {lista.erro && <AlertCard priority="danger" title="Não foi possível carregar os bens" description={lista.erro} actionLabel="Tentar novamente" onAction={() => void lista.recarregar()} />}
          {erroOpcoes && <AlertCard priority="warning" title="Listas indisponíveis" description={erroOpcoes} />}
          {!lista.dados && !lista.erro && <Skeleton className="h-64 w-full" />}
          {lista.dados && (lista.dados.data.length === 0 ? <EmptyState icon={<Package className="h-8 w-8" />} title="Nenhum bem encontrado" description="Ajuste os filtros ou cadastre um bem." /> : (
            <DataTable
              columns={colunas}
              data={lista.dados.data}
              emptyText="Nenhum bem encontrado."
              pageSizeOptions={[15, 30, 50, 100]}
              paginationState={{
                currentPage: lista.dados.meta.current_page,
                totalPages: lista.dados.meta.last_page,
                onPageChange: setPagina,
                total: lista.dados.meta.total,
                perPage: porPagina,
                onPerPageChange: (n) => { setPorPagina(n); setPagina(1); },
              }}
            />
          ))}
        </CardContent>
      </Card>

      <BemDetalheModal bemId={ver} podeEditar={permissoes.bens} onFechar={() => setVer(null)} onEditar={(id) => { setVer(null); setEditar(id); }} />
      {opcoes && <BemFormModal bem={editar} opcoes={opcoes} avisar={avisar} onFechar={() => setEditar(null)} onSalvo={() => { alterou(); }} />}
      {opcoes && <MudarSituacaoModal bem={mudarSituacao} opcoes={opcoes} onFechar={() => setMudarSituacao(null)}
        onSalvo={(nome) => { setMudarSituacao(null); avisar({ type: 'success', title: 'Situação alterada', message: nome }); alterou(); }} />}
    </div>
  );
};

/** "Excluir" bem: o sistema não exclui — muda a situação (ex.: Baixado). */
const MudarSituacaoModal: React.FC<{ bem: BemResumo | null; opcoes: Opcoes; onFechar: () => void; onSalvo: (nome: string) => void }> = ({ bem, opcoes, onFechar, onSalvo }) => {
  const [situacao, setSituacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const { modal: modalValidacao, tratarErro } = useFormValidationModal();
  const [salvando, setSalvando] = useState(false);
  const permitidas = opcoes.situacoes.filter((s) => s.papel !== 'em_lote' && s.papel !== 'em_transferencia');
  const salvar = async () => {
    if (!bem || !situacao) return;
    setSalvando(true); setErro(null);
    try {
      await inservivelApi.salvarBem(bem.id, { situacao_id: Number(situacao) });
      onSalvo(`${bem.numero_patrimonial}: ${permitidas.find((s) => String(s.id) === situacao)?.nome ?? ''}`);
      setSituacao('');
    } catch (e) { if (!tratarErro(e)) setErro(erroApi(e).mensagem); } finally { setSalvando(false); }
  };
  return (
    <Modal open={bem !== null} onClose={() => { setSituacao(''); setErro(null); onFechar(); }} title="Mudar situação do bem" size="md"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button><Button onClick={() => void salvar()} isLoading={salvando} disabled={!situacao}>Salvar</Button></>}>
      {modalValidacao}
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">Bens não são excluídos do sistema. Para tirar o bem de circulação, altere a situação (por exemplo, para <strong>Baixado</strong>).</p>
        {bem && <p>Bem <span className="font-mono tabular-nums">{bem.numero_patrimonial}</span> — situação atual: <strong>{bem.situacao.nome}</strong></p>}
        <Select label="Nova situação" value={situacao} onChange={setSituacao} options={permitidas.map((s) => ({ value: String(s.id), label: s.nome }))} />
        {erro && <AlertCard priority="danger" title="Não foi possível alterar" description={erro} />}
      </div>
    </Modal>
  );
};
