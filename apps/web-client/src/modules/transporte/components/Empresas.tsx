import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ActionsMenu, Badge, Button, Card, CardContent, ConfirmDialog, DataTable, Input, Modal, Select, Switch, Textarea } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { useFormValidationModal } from '@/lib/useFormValidationModal';
import { mensagemDeErro, transporteApi, type Empresa, type Opcoes } from '../api';
import { data } from '../formato';

/** Empresas prestadoras e locadoras: pessoa jurídica do Cadastro de Pessoas, sempre com contrato e vigência. */
export const Empresas: React.FC<{ opcoes: Opcoes; avisar: Toast; aoMudar: () => void }> = ({ opcoes, avisar, aoMudar }) => {
  const carga = useCarga(() => transporteApi.empresas(), []);
  const [editando, setEditando] = useState<Empresa | 'nova' | null>(null);
  const [excluindo, setExcluindo] = useState<Empresa | null>(null);
  const gerenciar = opcoes.permissoes.gerenciar_frota;

  const excluir = async (empresa: Empresa) => {
    try {
      await transporteApi.excluirEmpresa(empresa.id);
      avisar({ type: 'success', title: 'Empresa', message: `${empresa.nome} excluída.` });
      await carga.recarregar();
      aoMudar();
    } catch (e) {
      avisar({ type: 'error', title: 'Empresa', message: mensagemDeErro(e) });
    }
  };

  const ctx = useRef({ gerenciar });
  ctx.current = { gerenciar };
  const colunas = useMemo<ColumnDef<Empresa, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ActionsMenu
            triggerLabel={`Ações de ${row.original.nome}`}
            items={ctx.current.gerenciar ? [
              { key: 'editar', label: 'Editar', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => setEditando(row.original) },
              { key: 'excluir', label: 'Excluir', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setExcluindo(row.original) },
            ] : []}
          />
        </div>
      ),
    },
    {
      id: 'nome',
      header: 'Empresa',
      accessorKey: 'nome',
      cell: ({ row }) => <span className="font-medium">{row.original.nome}{!row.original.ativa && <Badge variant="secondary" className="ml-2">Inativa</Badge>}</span>,
      meta: { exportHeader: 'Empresa', exportValue: (e) => e.nome },
    },
    {
      id: 'cnpj',
      header: 'CNPJ',
      accessorFn: (e) => e.cnpj_mascarado ?? '',
      cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{row.original.cnpj_mascarado ?? '—'}</span>,
      meta: { exportHeader: 'CNPJ', exportValue: (e) => e.cnpj_mascarado ?? '' },
    },
    { id: 'tipo', header: 'Tipo', accessorKey: 'tipo_rotulo', meta: { exportHeader: 'Tipo', exportValue: (e) => e.tipo_rotulo } },
    {
      id: 'contrato',
      header: 'Contrato',
      accessorKey: 'contrato_numero',
      cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{row.original.contrato_numero}</span>,
      meta: { exportHeader: 'Contrato', exportValue: (e) => e.contrato_numero },
    },
    {
      id: 'vigencia',
      header: 'Vigência',
      accessorFn: (e) => e.vigencia_fim,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          <span className="font-mono text-xs tabular-nums">{data(row.original.vigencia_inicio)} a {data(row.original.vigencia_fim)}</span>
          {row.original.contrato_vencido && <Badge variant="destructive" className="ml-2">Contrato vencido</Badge>}
        </span>
      ),
      meta: { exportHeader: 'Vigência', exportValue: (e) => `${data(e.vigencia_inicio)} a ${data(e.vigencia_fim)}` },
    },
  ], []);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {gerenciar && <div className="flex justify-end"><Button onClick={() => setEditando('nova')}><Plus className="mr-1 h-4 w-4" />Nova empresa</Button></div>}
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && (
          <DataTable
            columns={colunas}
            data={carga.dados}
            emptyText="Nenhuma empresa cadastrada."
            exportable
            exportFileName="transporte-empresas"
            exportTitle="Transporte Escolar — Empresas"
          />
        )}
      </CardContent>
      {editando && (
        <EmpresaModal opcoes={opcoes} empresa={editando === 'nova' ? null : editando} aoFechar={() => setEditando(null)}
          aoSalvar={() => { setEditando(null); avisar({ type: 'success', title: 'Empresa', message: 'Empresa salva.' }); void carga.recarregar(); aoMudar(); }} />
      )}
      <ConfirmDialog
        open={excluindo !== null}
        onClose={() => setExcluindo(null)}
        title="Excluir empresa"
        description={`Excluir ${excluindo?.nome ?? ''}? Empresas com veículos cadastrados não podem ser excluídas.`}
        confirmLabel="Excluir"
        requireReason={false}
        onConfirm={() => { const alvo = excluindo; setExcluindo(null); if (alvo) void excluir(alvo); }}
      />
    </Card>
  );
};

const EmpresaModal: React.FC<{ opcoes: Opcoes; empresa: Empresa | null; aoFechar: () => void; aoSalvar: () => void }> = ({ opcoes, empresa, aoFechar, aoSalvar }) => {
  const [dados, setDados] = useState({
    cnpj: '', razao_social: '', nome_fantasia: '',
    tipo: empresa?.tipo ?? opcoes.tipos_empresa[0]?.valor ?? 'prestadora',
    contrato_numero: empresa?.contrato_numero ?? '',
    vigencia_inicio: empresa?.vigencia_inicio ?? '',
    vigencia_fim: empresa?.vigencia_fim ?? '',
    ativa: empresa?.ativa ?? true,
    observacoes: empresa?.observacoes ?? '',
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { modal: modalValidacao, invalidar, tratarErro } = useFormValidationModal();
  const campo = <K extends keyof typeof dados>(chave: K, valor: (typeof dados)[K]) => setDados((d) => ({ ...d, [chave]: valor }));

  const salvar = async () => {
    setErro(null);
    const faltando: [string, string][] = [];
    if (!empresa && !dados.cnpj.trim()) faltando.push(['CNPJ', 'Informe o CNPJ.']);
    if (!empresa && !dados.razao_social.trim()) faltando.push(['Razão social', 'Informe a razão social.']);
    if (!dados.contrato_numero.trim()) faltando.push(['Contrato', 'Informe o número do contrato.']);
    if (!dados.vigencia_inicio || !dados.vigencia_fim) faltando.push(['Vigência', 'Informe o início e o fim da vigência.']);
    if (faltando.length > 0) return invalidar(faltando);
    setSalvando(true);
    try {
      await transporteApi.salvarEmpresa(empresa?.id ?? null, {
        ...(empresa ? {} : { cnpj: dados.cnpj, razao_social: dados.razao_social.trim(), nome_fantasia: dados.nome_fantasia.trim() || null }),
        tipo: dados.tipo,
        contrato_numero: dados.contrato_numero.trim(),
        vigencia_inicio: dados.vigencia_inicio,
        vigencia_fim: dados.vigencia_fim,
        ativa: dados.ativa,
        observacoes: dados.observacoes.trim() || null,
      });
      aoSalvar();
    } catch (e) {
      if (!tratarErro(e)) setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open onClose={aoFechar} title={empresa ? `Editar ${empresa.nome}` : 'Nova empresa'} size="lg"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void salvar()} isLoading={salvando}>Salvar</Button></>}>
      {modalValidacao}
      <div className="space-y-4">
        {empresa ? (
          <p className="text-sm">CNPJ <span className="font-mono tabular-nums">{empresa.cnpj_mascarado}</span> — razão social e CNPJ vêm do Cadastro de Pessoas.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="CNPJ *" value={dados.cnpj} inputMode="numeric" maxLength={18} className="font-mono tabular-nums" onChange={(e) => campo('cnpj', e.target.value)} />
            <Input label="Razão social *" value={dados.razao_social} maxLength={200} onChange={(e) => campo('razao_social', e.target.value)} />
            <Input label="Nome fantasia" value={dados.nome_fantasia} maxLength={200} onChange={(e) => campo('nome_fantasia', e.target.value)} />
            <p className="self-end text-xs text-muted-foreground">Se o CNPJ já estiver no Cadastro de Pessoas, a empresa é ligada a essa pessoa jurídica.</p>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Tipo *" value={dados.tipo} onChange={(v) => campo('tipo', v)} options={opcoes.tipos_empresa.map((t) => ({ value: t.valor, label: t.rotulo }))} />
          <Input label="Número do contrato *" value={dados.contrato_numero} maxLength={100} className="font-mono tabular-nums" onChange={(e) => campo('contrato_numero', e.target.value)} />
          <Input label="Início da vigência *" type="date" value={dados.vigencia_inicio} className="font-mono tabular-nums" onChange={(e) => campo('vigencia_inicio', e.target.value)} />
          <Input label="Fim da vigência *" type="date" value={dados.vigencia_fim} className="font-mono tabular-nums" onChange={(e) => campo('vigencia_fim', e.target.value)} />
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">Observações</span>
          <Textarea value={dados.observacoes} rows={2} maxLength={2000} onChange={(e) => campo('observacoes', e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={dados.ativa} onCheckedChange={(v) => campo('ativa', v)} aria-label="Empresa ativa" />Empresa ativa</label>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};
