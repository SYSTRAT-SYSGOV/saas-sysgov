import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ActionsMenu, Badge, Button, Card, CardContent, ConfirmDialog, DataTable, Input, Modal, Select, Switch, Textarea } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { useFormValidationModal } from '@/lib/useFormValidationModal';
import { mensagemDeErro, transporteApi, type Motorista, type Opcoes } from '../api';
import { data, ROTULO_INELEGIBILIDADE, rotuloDe } from '../formato';

const SEM_EMPRESA = '0';

/** Motoristas: pessoa física do Cadastro de Pessoas (CPF) com CNH, curso e toxicológico; a elegibilidade vem da API. */
export const Motoristas: React.FC<{ opcoes: Opcoes; avisar: Toast; aoMudar: () => void }> = ({ opcoes, avisar, aoMudar }) => {
  const carga = useCarga(() => transporteApi.motoristas(), []);
  const [editando, setEditando] = useState<Motorista | 'novo' | null>(null);
  const [excluindo, setExcluindo] = useState<Motorista | null>(null);
  const gerenciar = opcoes.permissoes.gerenciar_frota;

  const excluir = async (motorista: Motorista) => {
    try {
      await transporteApi.excluirMotorista(motorista.id);
      avisar({ type: 'success', title: 'Motorista', message: `${motorista.nome} excluído(a).` });
      await carga.recarregar();
      aoMudar();
    } catch (e) {
      avisar({ type: 'error', title: 'Motorista', message: mensagemDeErro(e) });
    }
  };

  const ctx = useRef({ gerenciar });
  ctx.current = { gerenciar };
  const colunas = useMemo<ColumnDef<Motorista, unknown>[]>(() => [
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
      header: 'Motorista',
      accessorKey: 'nome',
      cell: ({ row }) => <span className="font-medium">{row.original.nome}{!row.original.ativo && <Badge variant="secondary" className="ml-2">Inativo</Badge>}</span>,
      meta: { exportHeader: 'Motorista', exportValue: (m) => m.nome },
    },
    {
      id: 'cpf',
      header: 'CPF',
      accessorFn: (m) => m.cpf_mascarado ?? '',
      cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{row.original.cpf_mascarado ?? '—'}</span>,
      meta: { exportHeader: 'CPF', exportValue: (m) => m.cpf_mascarado ?? '' },
    },
    {
      id: 'cnh',
      header: 'CNH',
      accessorKey: 'cnh_numero',
      cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{row.original.cnh_numero} ({row.original.cnh_categoria}) · {data(row.original.cnh_validade)}</span>,
      meta: { exportHeader: 'CNH', exportValue: (m) => `${m.cnh_numero} (${m.cnh_categoria}) ${data(m.cnh_validade)}` },
    },
    {
      id: 'curso',
      header: 'Curso',
      accessorFn: (m) => m.curso_validade ?? '',
      cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{data(row.original.curso_validade)}</span>,
      meta: { exportHeader: 'Curso (validade)', exportValue: (m) => data(m.curso_validade) },
    },
    {
      id: 'toxicologico',
      header: 'Toxicológico',
      accessorFn: (m) => m.toxicologico_validade ?? '',
      cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{data(row.original.toxicologico_validade)}</span>,
      meta: { exportHeader: 'Toxicológico (validade)', exportValue: (m) => data(m.toxicologico_validade) },
    },
    { id: 'empresa', header: 'Empresa', accessorFn: (m) => m.empresa?.nome ?? 'Servidor da prefeitura', meta: { exportHeader: 'Empresa', exportValue: (m) => m.empresa?.nome ?? '' } },
    {
      id: 'elegivel',
      header: 'Elegibilidade',
      accessorFn: (m) => (m.elegivel ? 'Elegível' : 'Inelegível'),
      cell: ({ row }) => row.original.elegivel
        ? <Badge variant="outline">Elegível</Badge>
        : (
          <span title={row.original.motivos_inelegibilidade.map((x) => rotuloDe(ROTULO_INELEGIBILIDADE, x)).join('; ')}>
            <Badge variant="destructive">Inelegível</Badge>
            <span className="ml-2 text-xs text-muted-foreground">{row.original.motivos_inelegibilidade.map((x) => rotuloDe(ROTULO_INELEGIBILIDADE, x)).join('; ')}</span>
          </span>
        ),
      meta: { exportHeader: 'Elegibilidade', exportValue: (m) => (m.elegivel ? 'Elegível' : m.motivos_inelegibilidade.map((x) => rotuloDe(ROTULO_INELEGIBILIDADE, x)).join('; ')) },
    },
  ], []);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {gerenciar && <div className="flex justify-end"><Button onClick={() => setEditando('novo')}><Plus className="mr-1 h-4 w-4" />Novo motorista</Button></div>}
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && (
          <DataTable
            columns={colunas}
            data={carga.dados}
            emptyText="Nenhum motorista cadastrado."
            exportable
            exportFileName="transporte-motoristas"
            exportTitle="Transporte Escolar — Motoristas"
          />
        )}
      </CardContent>
      {editando && (
        <MotoristaModal opcoes={opcoes} motorista={editando === 'novo' ? null : editando} aoFechar={() => setEditando(null)}
          aoSalvar={() => { setEditando(null); avisar({ type: 'success', title: 'Motorista', message: 'Motorista salvo.' }); void carga.recarregar(); aoMudar(); }} />
      )}
      <ConfirmDialog
        open={excluindo !== null}
        onClose={() => setExcluindo(null)}
        title="Excluir motorista"
        description={`Excluir ${excluindo?.nome ?? ''}? A pessoa continua no Cadastro de Pessoas.`}
        confirmLabel="Excluir"
        requireReason={false}
        onConfirm={() => { const alvo = excluindo; setExcluindo(null); if (alvo) void excluir(alvo); }}
      />
    </Card>
  );
};

const MotoristaModal: React.FC<{ opcoes: Opcoes; motorista: Motorista | null; aoFechar: () => void; aoSalvar: () => void }> = ({ opcoes, motorista, aoFechar, aoSalvar }) => {
  const [dados, setDados] = useState({
    cpf: '', nome: '', data_nascimento: '',
    empresa_id: String(motorista?.empresa?.id ?? SEM_EMPRESA),
    cnh_numero: motorista?.cnh_numero ?? '',
    cnh_categoria: motorista?.cnh_categoria ?? 'D',
    cnh_primeira_habilitacao: motorista?.cnh_primeira_habilitacao ?? '',
    cnh_validade: motorista?.cnh_validade ?? '',
    curso_certificado: motorista?.curso_certificado ?? '',
    curso_validade: motorista?.curso_validade ?? '',
    toxicologico_data: motorista?.toxicologico_data ?? '',
    toxicologico_validade: motorista?.toxicologico_validade ?? '',
    ativo: motorista?.ativo ?? true,
    observacoes: motorista?.observacoes ?? '',
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { modal: modalValidacao, invalidar, tratarErro } = useFormValidationModal();
  const campo = <K extends keyof typeof dados>(chave: K, valor: (typeof dados)[K]) => setDados((d) => ({ ...d, [chave]: valor }));
  const opcional = (valor: string) => (valor === '' ? null : valor);

  const salvar = async () => {
    setErro(null);
    const faltando: [string, string][] = [];
    if (!motorista && !dados.cpf.trim()) faltando.push(['CPF', 'Informe o CPF.']);
    if (!motorista && !dados.nome.trim()) faltando.push(['Nome', 'Informe o nome completo.']);
    if (!dados.cnh_numero.trim()) faltando.push(['CNH', 'Informe o número da CNH.']);
    if (!dados.cnh_validade) faltando.push(['Validade da CNH', 'Informe a validade da CNH.']);
    if (faltando.length > 0) return invalidar(faltando);
    setSalvando(true);
    try {
      await transporteApi.salvarMotorista(motorista?.id ?? null, {
        ...(motorista ? {} : { cpf: dados.cpf, nome: dados.nome.trim(), data_nascimento: opcional(dados.data_nascimento) }),
        empresa_id: dados.empresa_id === SEM_EMPRESA ? null : Number(dados.empresa_id),
        cnh_numero: dados.cnh_numero.trim(),
        cnh_categoria: dados.cnh_categoria,
        cnh_primeira_habilitacao: opcional(dados.cnh_primeira_habilitacao),
        cnh_validade: dados.cnh_validade,
        curso_certificado: opcional(dados.curso_certificado.trim()),
        curso_validade: opcional(dados.curso_validade),
        toxicologico_data: opcional(dados.toxicologico_data),
        toxicologico_validade: opcional(dados.toxicologico_validade),
        ativo: dados.ativo,
        observacoes: opcional(dados.observacoes.trim()),
      });
      aoSalvar();
    } catch (e) {
      if (!tratarErro(e)) setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open onClose={aoFechar} title={motorista ? `Editar ${motorista.nome}` : 'Novo motorista'} size="xl"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void salvar()} isLoading={salvando}>Salvar</Button></>}>
      {modalValidacao}
      <div className="space-y-4">
        {motorista ? (
          <p className="text-sm">CPF <span className="font-mono tabular-nums">{motorista.cpf_mascarado}</span> — nome, CPF e nascimento vêm do Cadastro de Pessoas.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="CPF *" value={dados.cpf} inputMode="numeric" maxLength={14} className="font-mono tabular-nums" onChange={(e) => campo('cpf', e.target.value)} />
            <Input label="Nome completo *" value={dados.nome} maxLength={200} onChange={(e) => campo('nome', e.target.value)} />
            <Input label="Data de nascimento" type="date" value={dados.data_nascimento} className="font-mono tabular-nums" onChange={(e) => campo('data_nascimento', e.target.value)} />
            <p className="text-xs text-muted-foreground sm:col-span-3">Se o CPF já estiver no Cadastro de Pessoas, o motorista é ligado a essa pessoa. A regra de mais de 21 anos usa o nascimento do cadastro.</p>
          </div>
        )}
        <Select label="Empresa" value={dados.empresa_id} onChange={(v) => campo('empresa_id', v)}
          options={[{ value: SEM_EMPRESA, label: 'Sem empresa (servidor da prefeitura)' }, ...opcoes.empresas.map((e) => ({ value: String(e.id), label: e.nome }))]} />
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="CNH *" value={dados.cnh_numero} maxLength={30} className="font-mono tabular-nums" onChange={(e) => campo('cnh_numero', e.target.value)} />
          <Select label="Categoria *" value={dados.cnh_categoria} onChange={(v) => campo('cnh_categoria', v)} options={opcoes.categorias_cnh.map((c) => ({ value: c, label: c }))} />
          <Input label="1ª habilitação" type="date" value={dados.cnh_primeira_habilitacao} className="font-mono tabular-nums" onChange={(e) => campo('cnh_primeira_habilitacao', e.target.value)} />
          <Input label="Validade da CNH *" type="date" value={dados.cnh_validade} className="font-mono tabular-nums" onChange={(e) => campo('cnh_validade', e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Curso especializado (certificado)" value={dados.curso_certificado} maxLength={100} className="font-mono tabular-nums" onChange={(e) => campo('curso_certificado', e.target.value)} />
          <Input label="Validade do curso" type="date" value={dados.curso_validade} className="font-mono tabular-nums" onChange={(e) => campo('curso_validade', e.target.value)} />
          <span />
          <Input label="Exame toxicológico (data)" type="date" value={dados.toxicologico_data} className="font-mono tabular-nums" onChange={(e) => campo('toxicologico_data', e.target.value)} />
          <Input label="Validade do toxicológico" type="date" value={dados.toxicologico_validade} className="font-mono tabular-nums" onChange={(e) => campo('toxicologico_validade', e.target.value)} />
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">Observações</span>
          <Textarea value={dados.observacoes} rows={2} maxLength={2000} onChange={(e) => campo('observacoes', e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={dados.ativo} onCheckedChange={(v) => campo('ativo', v)} aria-label="Motorista ativo" />Motorista ativo</label>
        <p className="text-xs text-muted-foreground">Só é possível ativar um motorista elegível. Se algum documento estiver vencido, cadastre-o como inativo.</p>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};
