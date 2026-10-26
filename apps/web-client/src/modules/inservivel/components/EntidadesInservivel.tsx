import React, { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Building2, Eye, Plus, Search } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, CardHeader, CardTitle, Input, Modal, Select, Skeleton, StatusChip, DataTable } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi } from '../../escola/api';
import { useCarga } from '../../escola/useCarga';
import { inservivelApi, type DadosEntidade, type EntidadeResumo, type StatusEntidade } from '../api';
import { formatarCnpj, formatarData, ROTULO_STATUS_ENTIDADE, VARIANTE_STATUS_ENTIDADE } from '../formato';
import type { PropsAba } from '../ModuloInservivelMain';
import { CamposEntidadeForm, FORM_ENTIDADE_VAZIO, paraDadosEntidade, type FormEntidade } from './CamposEntidadeForm';
import { EntidadeFicha } from './EntidadeFicha';
import { useFormValidationModal } from '@/lib/useFormValidationModal';
import { colunaAcoes } from '@/lib/colunaAcoes';

/** Gestão das entidades sem fins lucrativos (spec: Entidades sem fins lucrativos). */
export const EntidadesInservivel: React.FC<PropsAba> = ({ avisar, parametro, limparParametro }) => {
  const [busca, setBusca] = useState('');
  const [aplicada, setAplicada] = useState('');
  const [status, setStatus] = useState('');
  const [pagina, setPagina] = useState(1);
  const [versao, setVersao] = useState(0);
  const [ficha, setFicha] = useState<number | null>(null);
  const [cadastrar, setCadastrar] = useState(false);
  const [porPagina, setPorPagina] = useState(15);
  const lista = useCarga(() => inservivelApi.entidades({ q: aplicada || undefined, status: (status || undefined) as StatusEntidade | undefined, page: pagina, per_page: porPagina }), [aplicada, status, pagina, porPagina, versao]);

  useEffect(() => {
    const id = parametro('entidade');
    if (id) { setFicha(Number(id)); limparParametro('entidade'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Colunas estáveis: a única ação (abrir a ficha) usa o setter de estado.
  const colunas = useMemo<ColumnDef<EntidadeResumo, unknown>[]>(() => [
    colunaAcoes<EntidadeResumo>((e) => `Ações de ${e.razao_social}`, (e) => [{ key: 'ficha', label: 'Abrir ficha', icon: <Eye className="h-3.5 w-3.5" />, onSelect: () => setFicha(e.id) }]),
    {
      id: 'entidade', header: 'Entidade', accessorKey: 'razao_social',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.razao_social}</p><p className="text-xs text-muted-foreground">{row.original.nome_fantasia}</p>
          {row.original.bloqueada_por_documento && <p className="flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3.5 w-3.5" />Documento vencido</p>}
        </div>
      ),
      meta: { exportHeader: 'Entidade', exportValue: (e) => e.razao_social },
    },
    {
      id: 'cnpj', header: 'CNPJ', accessorKey: 'cnpj',
      cell: ({ row }) => <span className="font-mono tabular-nums">{formatarCnpj(row.original.cnpj)}</span>,
      meta: { exportHeader: 'CNPJ', exportValue: (e) => formatarCnpj(e.cnpj) },
    },
    { id: 'representante', header: 'Representante', accessorKey: 'representante_legal', meta: { exportHeader: 'Representante', exportValue: (e) => e.representante_legal } },
    { id: 'cidade', header: 'Cidade', accessorFn: (e) => `${e.cidade}/${e.uf}`, meta: { exportHeader: 'Cidade', exportValue: (e) => `${e.cidade}/${e.uf}` } },
    {
      id: 'status', header: 'Status', accessorKey: 'status_rotulo',
      cell: ({ row }) => <StatusChip label={row.original.status_rotulo} variant={VARIANTE_STATUS_ENTIDADE[row.original.status]} />,
      meta: { exportHeader: 'Status', exportValue: (e) => e.status_rotulo },
    },
    {
      id: 'lotes', header: 'Lotes', accessorKey: 'lotes_ganhos',
      cell: ({ row }) => <span className="block text-right font-mono tabular-nums">{row.original.lotes_ganhos}</span>,
      meta: { exportHeader: 'Lotes', exportValue: (e) => e.lotes_ganhos },
    },
    {
      id: 'cadastro', header: 'Cadastro', accessorKey: 'created_at',
      cell: ({ row }) => <span className="font-mono tabular-nums">{formatarData(row.original.created_at)}</span>,
      meta: { exportHeader: 'Cadastro', exportValue: (e) => formatarData(e.created_at) },
    },
  ], []);

  if (ficha !== null) return <EntidadeFicha entidadeId={ficha} avisar={avisar} onVoltar={() => { setFicha(null); setVersao((v) => v + 1); }} />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Entidades sem fins lucrativos</CardTitle>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCadastrar(true)}>Cadastrar entidade</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <form className="grid gap-3 md:grid-cols-[1fr_14rem_auto] md:items-end" onSubmit={(e) => { e.preventDefault(); setPagina(1); setAplicada(busca); }}>
          <Input label="Buscar" placeholder="Razão social, nome fantasia, CNPJ ou representante" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <Select placeholder="Todos" label="Status" value={status} onChange={(v) => { setStatus(v); setPagina(1); }}
            options={[{ value: '', label: 'Todos' }, ...(Object.keys(ROTULO_STATUS_ENTIDADE) as StatusEntidade[]).map((s) => ({ value: s, label: ROTULO_STATUS_ENTIDADE[s] }))]} />
          <Button type="submit" variant="outline" leftIcon={<Search className="h-4 w-4" />}>Filtrar</Button>
        </form>
        {lista.erro && <AlertCard priority="danger" title="Não foi possível carregar as entidades" description={lista.erro} actionLabel="Tentar novamente" onAction={() => void lista.recarregar()} />}
        {!lista.dados && !lista.erro && <Skeleton className="h-64 w-full" />}
        {lista.dados && (lista.dados.data.length === 0 ? <EmptyState icon={<Building2 className="h-8 w-8" />} title="Nenhuma entidade" description="As entidades se cadastram pela página pública (link em Configurações) ou são cadastradas aqui." /> : (
          <DataTable
            columns={colunas}
            data={lista.dados.data}
            emptyText="Nenhuma entidade."
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
      <CadastrarEntidadeModal aberto={cadastrar} onFechar={() => setCadastrar(false)}
        onCadastrada={(id, nome) => { setCadastrar(false); avisar({ type: 'success', title: 'Entidade cadastrada', message: nome }); setFicha(id); }} />
    </Card>
  );
};

const CadastrarEntidadeModal: React.FC<{ aberto: boolean; onFechar: () => void; onCadastrada: (id: number, nome: string) => void }> = ({ aberto, onFechar, onCadastrada }) => {
  const [form, setForm] = useState<FormEntidade>(FORM_ENTIDADE_VAZIO);
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const { modal: modalValidacao, tratarErro } = useFormValidationModal();
  const [salvando, setSalvando] = useState(false);
  const fechar = () => { setForm(FORM_ENTIDADE_VAZIO); setSenha(''); setErro(null); onFechar(); };
  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSalvando(true); setErro(null);
    try {
      const e = await inservivelApi.cadastrarEntidade({ ...(paraDadosEntidade(form) as unknown as DadosEntidade), senha });
      setForm(FORM_ENTIDADE_VAZIO); setSenha('');
      onCadastrada(e.id, e.razao_social);
    } catch (e) { if (!tratarErro(e)) setErro(erroApi(e).mensagem); } finally { setSalvando(false); }
  };
  return (
    <Modal open={aberto} onClose={fechar} title="Cadastrar entidade" icon={<Building2 className="h-5 w-5" />} size="2xl"
      footer={<><Button variant="outline" onClick={fechar} disabled={salvando}>Cancelar</Button><Button type="submit" form="form-entidade" isLoading={salvando}>Cadastrar</Button></>}>
      {modalValidacao}
      <form noValidate id="form-entidade" onSubmit={salvar} className="space-y-4">
        {erro && <AlertCard priority="danger" title="Não foi possível cadastrar" description={erro} />}
        <p className="text-sm text-muted-foreground">A entidade ganha uma conta de acesso ao portal com o e-mail informado e a senha inicial abaixo. Os documentos podem ser enviados depois pelo portal.</p>
        <CamposEntidadeForm form={form} onChange={setForm} />
        <Input label="Senha inicial da conta *" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={8} />
      </form>
    </Modal>
  );
};
