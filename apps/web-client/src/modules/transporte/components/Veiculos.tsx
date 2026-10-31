import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ClipboardCheck, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { ActionsMenu, Badge, Button, Card, CardContent, ConfirmDialog, DataTable, Input, Modal, Select, Switch, Textarea } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { useFormValidationModal } from '@/lib/useFormValidationModal';
import { mensagemDeErro, transporteApi, type Opcoes, type Veiculo, type Vistoria } from '../api';
import { data, ROTULO_IRREGULARIDADE, rotuloDe } from '../formato';
import { ImportarCsv } from './ImportarCsv';

const NENHUM = '0';

/** Frota: veículos próprios, locados e terceirizados, com a regularidade derivada da vistoria e do contrato. */
export const Veiculos: React.FC<{ opcoes: Opcoes; avisar: Toast; aoMudar: () => void }> = ({ opcoes, avisar, aoMudar }) => {
  const carga = useCarga(() => transporteApi.veiculos(), []);
  const [editando, setEditando] = useState<Veiculo | 'novo' | null>(null);
  const [vistoriando, setVistoriando] = useState<Veiculo | null>(null);
  const [excluindo, setExcluindo] = useState<Veiculo | null>(null);
  const [importando, setImportando] = useState(false);
  const gerenciar = opcoes.permissoes.gerenciar_frota;

  const excluir = async (veiculo: Veiculo) => {
    try {
      await transporteApi.excluirVeiculo(veiculo.id);
      avisar({ type: 'success', title: 'Veículo', message: `Veículo ${veiculo.placa} excluído.` });
      await carga.recarregar();
      aoMudar();
    } catch (e) {
      avisar({ type: 'error', title: 'Veículo', message: mensagemDeErro(e) });
    }
  };

  const ctx = useRef({ gerenciar });
  ctx.current = { gerenciar };
  const colunas = useMemo<ColumnDef<Veiculo, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ActionsMenu
            triggerLabel={`Ações do veículo ${row.original.placa}`}
            items={[
              { key: 'vistorias', label: 'Vistorias', icon: <ClipboardCheck className="h-3.5 w-3.5" />, onSelect: () => setVistoriando(row.original) },
              ...(ctx.current.gerenciar ? [
                { key: 'editar', label: 'Editar', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => setEditando(row.original) },
                { key: 'excluir', label: 'Excluir', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setExcluindo(row.original) },
              ] : []),
            ]}
          />
        </div>
      ),
    },
    {
      id: 'placa',
      header: 'Placa',
      accessorKey: 'placa',
      cell: ({ row }) => <span className="font-mono font-semibold tabular-nums">{row.original.placa}</span>,
      meta: { exportHeader: 'Placa', exportValue: (v) => v.placa },
    },
    { id: 'descricao', header: 'Descrição', accessorKey: 'descricao', meta: { exportHeader: 'Descrição', exportValue: (v) => v.descricao } },
    { id: 'origem', header: 'Origem', accessorKey: 'origem_rotulo', meta: { exportHeader: 'Origem', exportValue: (v) => v.origem_rotulo } },
    { id: 'empresa', header: 'Empresa', accessorFn: (v) => v.empresa?.nome ?? '—', meta: { exportHeader: 'Empresa', exportValue: (v) => v.empresa?.nome ?? '' } },
    {
      id: 'capacidade',
      header: 'Lugares',
      accessorKey: 'capacidade',
      cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.capacidade}</span>,
      meta: { exportHeader: 'Lugares', exportValue: (v) => String(v.capacidade) },
    },
    { id: 'tipologia', header: 'Tipologia Inep', accessorFn: (v) => v.tipologia_rotulo ?? '', meta: { exportHeader: 'Tipologia Inep', exportValue: (v) => v.tipologia_rotulo ?? '' } },
    {
      id: 'acessivel',
      header: 'Acessível',
      accessorFn: (v) => (v.acessivel ? 'Sim' : 'Não'),
      meta: { exportHeader: 'Acessível', exportValue: (v) => (v.acessivel ? 'Sim' : 'Não') },
    },
    {
      id: 'vistoria',
      header: 'Vistoria até',
      accessorFn: (v) => v.vistoria_validade ?? '',
      cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{data(row.original.vistoria_validade)}</span>,
      meta: { exportHeader: 'Vistoria até', exportValue: (v) => data(v.vistoria_validade) },
    },
    {
      id: 'situacao',
      header: 'Situação',
      accessorFn: (v) => (v.regular ? 'Regular' : 'Irregular'),
      cell: ({ row }) => row.original.regular
        ? <Badge variant="outline">Regular</Badge>
        : (
          <span>
            <Badge variant="destructive">Irregular</Badge>
            <span className="ml-2 text-xs text-muted-foreground">{row.original.motivos_irregularidade.map((m) => rotuloDe(ROTULO_IRREGULARIDADE, m)).join('; ')}</span>
          </span>
        ),
      meta: { exportHeader: 'Situação', exportValue: (v) => (v.regular ? 'Regular' : v.motivos_irregularidade.map((m) => rotuloDe(ROTULO_IRREGULARIDADE, m)).join('; ')) },
    },
  ], []);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {gerenciar && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setImportando(true)}><Upload className="mr-1 h-4 w-4" />Importar CSV</Button>
            <Button onClick={() => setEditando('novo')}><Plus className="mr-1 h-4 w-4" />Novo veículo</Button>
          </div>
        )}
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && (
          <DataTable
            columns={colunas}
            data={carga.dados}
            emptyText="Nenhum veículo cadastrado."
            exportable
            exportFileName="transporte-veiculos"
            exportTitle="Transporte Escolar — Veículos"
          />
        )}
      </CardContent>
      {importando && <ImportarCsv tipo="veiculos" aoFechar={() => setImportando(false)} aoConcluir={() => { void carga.recarregar(); aoMudar(); }} />}
      {editando && (
        <VeiculoModal opcoes={opcoes} veiculo={editando === 'novo' ? null : editando} aoFechar={() => setEditando(null)}
          aoSalvar={() => { setEditando(null); avisar({ type: 'success', title: 'Veículo', message: 'Veículo salvo.' }); void carga.recarregar(); aoMudar(); }} />
      )}
      {vistoriando && (
        <VistoriasModal veiculo={vistoriando} podeRegistrar={gerenciar} aoFechar={() => setVistoriando(null)}
          aoRegistrar={() => { avisar({ type: 'success', title: 'Vistoria', message: 'Vistoria registrada.' }); void carga.recarregar(); aoMudar(); }} />
      )}
      <ConfirmDialog
        open={excluindo !== null}
        onClose={() => setExcluindo(null)}
        title="Excluir veículo"
        description={`Excluir o veículo ${excluindo?.placa ?? ''}? A placa fica livre para um novo cadastro.`}
        confirmLabel="Excluir"
        requireReason={false}
        onConfirm={() => { const alvo = excluindo; setExcluindo(null); if (alvo) void excluir(alvo); }}
      />
    </Card>
  );
};

const numeroOuNulo = (valor: string): number | null => (valor.trim() === '' ? null : Number(valor));
const textoOuNulo = (valor: string): string | null => (valor.trim() === '' ? null : valor.trim());

const VeiculoModal: React.FC<{ opcoes: Opcoes; veiculo: Veiculo | null; aoFechar: () => void; aoSalvar: () => void }> = ({ opcoes, veiculo, aoFechar, aoSalvar }) => {
  const [dados, setDados] = useState({
    origem: veiculo?.origem ?? 'propria',
    empresa_id: String(veiculo?.empresa?.id ?? NENHUM),
    motorista_padrao_id: String(veiculo?.motorista_padrao?.id ?? NENHUM),
    descricao: veiculo?.descricao ?? '',
    placa: veiculo?.placa ?? '',
    renavam: veiculo?.renavam ?? '',
    chassi: veiculo?.chassi ?? '',
    marca_modelo: veiculo?.marca_modelo ?? '',
    ano_fabricacao: veiculo?.ano_fabricacao != null ? String(veiculo.ano_fabricacao) : '',
    ano_modelo: veiculo?.ano_modelo != null ? String(veiculo.ano_modelo) : '',
    data_licenca: veiculo?.data_licenca ?? '',
    capacidade: veiculo ? String(veiculo.capacidade) : '',
    tipo_rede: veiculo?.tipo_rede ?? opcoes.tipos_rede[0]?.valor ?? 'rural',
    tipologia_inep: String(veiculo?.tipologia_inep ?? 3),
    uso_exclusivo: veiculo?.uso_exclusivo ?? true,
    acessivel: veiculo?.acessivel ?? false,
    ativo: veiculo?.ativo ?? true,
    motivo_inativacao: veiculo?.motivo_inativacao ?? '',
    observacoes: veiculo?.observacoes ?? '',
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { modal: modalValidacao, invalidar, tratarErro } = useFormValidationModal();
  const campo = <K extends keyof typeof dados>(chave: K, valor: (typeof dados)[K]) => setDados((d) => ({ ...d, [chave]: valor }));

  const origem = opcoes.origens.find((o) => o.valor === dados.origem);
  const empresasDaOrigem = opcoes.empresas.filter((e) => origem?.tipo_empresa === e.tipo);

  const trocarOrigem = (valor: string) => setDados((d) => ({ ...d, origem: valor, empresa_id: NENHUM }));

  const salvar = async () => {
    setErro(null);
    const faltando: [string, string][] = [];
    if (!dados.descricao.trim()) faltando.push(['Descrição', 'Informe a descrição do veículo.']);
    if (!dados.placa.trim()) faltando.push(['Placa', 'Informe a placa.']);
    if (!dados.capacidade || Number(dados.capacidade) < 1) faltando.push(['Lugares', 'Informe a capacidade (maior que zero).']);
    if (origem?.tipo_empresa && dados.empresa_id === NENHUM) faltando.push(['Empresa', `Veículo ${origem.rotulo.toLowerCase()} exige uma empresa.`]);
    if (!dados.ativo && !dados.motivo_inativacao.trim()) faltando.push(['Motivo da inativação', 'Informe o motivo da inativação.']);
    if (faltando.length > 0) return invalidar(faltando);
    setSalvando(true);
    try {
      await transporteApi.salvarVeiculo(veiculo?.id ?? null, {
        origem: dados.origem,
        empresa_id: dados.empresa_id === NENHUM ? null : Number(dados.empresa_id),
        motorista_padrao_id: dados.motorista_padrao_id === NENHUM ? null : Number(dados.motorista_padrao_id),
        descricao: dados.descricao.trim(),
        placa: dados.placa.trim(),
        renavam: textoOuNulo(dados.renavam),
        chassi: textoOuNulo(dados.chassi),
        marca_modelo: textoOuNulo(dados.marca_modelo),
        ano_fabricacao: numeroOuNulo(dados.ano_fabricacao),
        ano_modelo: numeroOuNulo(dados.ano_modelo),
        data_licenca: dados.data_licenca === '' ? null : dados.data_licenca,
        capacidade: Number(dados.capacidade),
        tipo_rede: dados.tipo_rede,
        tipologia_inep: Number(dados.tipologia_inep),
        uso_exclusivo: dados.uso_exclusivo,
        acessivel: dados.acessivel,
        ativo: dados.ativo,
        motivo_inativacao: dados.ativo ? null : textoOuNulo(dados.motivo_inativacao),
        observacoes: textoOuNulo(dados.observacoes),
      });
      aoSalvar();
    } catch (e) {
      if (!tratarErro(e)) setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open onClose={aoFechar} title={veiculo ? `Editar veículo ${veiculo.placa}` : 'Novo veículo'} size="xl"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void salvar()} isLoading={salvando}>Salvar</Button></>}>
      {modalValidacao}
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Origem *" value={dados.origem} onChange={trocarOrigem} options={opcoes.origens.map((o) => ({ value: o.valor, label: o.rotulo }))} />
          {origem?.tipo_empresa ? (
            <Select label="Empresa *" value={dados.empresa_id} onChange={(v) => campo('empresa_id', v)} placeholder="Selecione…"
              emptyText={`Cadastre uma empresa do tipo ${origem.tipo_empresa}.`}
              options={empresasDaOrigem.map((e) => ({ value: String(e.id), label: e.nome }))} />
          ) : (
            <p className="self-end pb-2 text-xs text-muted-foreground">Veículo próprio da prefeitura: sem empresa e sem contrato.</p>
          )}
          <Select label="Motorista padrão" value={dados.motorista_padrao_id} onChange={(v) => campo('motorista_padrao_id', v)}
            options={[{ value: NENHUM, label: 'Nenhum' }, ...opcoes.motoristas.map((m) => ({ value: String(m.id), label: m.nome }))]} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Descrição *" value={dados.descricao} maxLength={255} onChange={(e) => campo('descricao', e.target.value)} />
          <Input label="Placa *" value={dados.placa} maxLength={10} className="font-mono uppercase tabular-nums" onChange={(e) => campo('placa', e.target.value)} />
          <Input label="Lugares *" type="number" min={1} value={dados.capacidade} className="font-mono tabular-nums" onChange={(e) => campo('capacidade', e.target.value)} />
          <Input label="RENAVAM" value={dados.renavam} maxLength={30} className="font-mono tabular-nums" onChange={(e) => campo('renavam', e.target.value)} />
          <Input label="Chassi" value={dados.chassi} maxLength={30} className="font-mono uppercase tabular-nums" onChange={(e) => campo('chassi', e.target.value)} />
          <Input label="Marca / modelo" value={dados.marca_modelo} maxLength={150} onChange={(e) => campo('marca_modelo', e.target.value)} />
          <Input label="Ano de fabricação" type="number" value={dados.ano_fabricacao} className="font-mono tabular-nums" onChange={(e) => campo('ano_fabricacao', e.target.value)} />
          <Input label="Ano do modelo" type="number" value={dados.ano_modelo} className="font-mono tabular-nums" onChange={(e) => campo('ano_modelo', e.target.value)} />
          <Input label="Data da licença" type="date" value={dados.data_licenca} className="font-mono tabular-nums" onChange={(e) => campo('data_licenca', e.target.value)} />
          <Select label="Tipo de rede *" value={dados.tipo_rede} onChange={(v) => campo('tipo_rede', v)} options={opcoes.tipos_rede.map((t) => ({ value: t.valor, label: t.rotulo }))} />
          <Select label="Tipologia Inep *" value={dados.tipologia_inep} onChange={(v) => campo('tipologia_inep', v)} options={opcoes.tipologias.map((t) => ({ value: String(t.valor), label: `${t.valor} — ${t.rotulo}` }))} />
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm"><Switch checked={dados.uso_exclusivo} onCheckedChange={(v) => campo('uso_exclusivo', v)} aria-label="Uso exclusivo escolar" />Uso exclusivo escolar</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={dados.acessivel} onCheckedChange={(v) => campo('acessivel', v)} aria-label="Veículo acessível" />Acessível (adaptado a pessoas com deficiência)</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={dados.ativo} onCheckedChange={(v) => campo('ativo', v)} aria-label="Veículo ativo" />Veículo ativo</label>
        </div>
        {!dados.ativo && <Input label="Motivo da inativação *" value={dados.motivo_inativacao} maxLength={1000} onChange={(e) => campo('motivo_inativacao', e.target.value)} />}
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">Observações</span>
          <Textarea value={dados.observacoes} rows={2} maxLength={2000} onChange={(e) => campo('observacoes', e.target.value)} />
        </label>
        <p className="text-xs text-muted-foreground">A regularidade vem do histórico de vistorias (menu Vistorias) e, nos veículos locados e terceirizados, do contrato da empresa.</p>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};

const VistoriasModal: React.FC<{ veiculo: Veiculo; podeRegistrar: boolean; aoFechar: () => void; aoRegistrar: () => void }> = ({ veiculo, podeRegistrar, aoFechar, aoRegistrar }) => {
  const carga = useCarga(() => transporteApi.vistorias(veiculo.id), [veiculo.id]);
  const [form, setForm] = useState({ data_vistoria: '', certificado: '', validade: '', observacoes: '' });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { modal: modalValidacao, invalidar, tratarErro } = useFormValidationModal();

  const colunas = useMemo<ColumnDef<Vistoria, unknown>[]>(() => [
    { id: 'data', header: 'Data', accessorKey: 'data_vistoria', cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{data(row.original.data_vistoria)}</span> },
    { id: 'certificado', header: 'Certificado', accessorKey: 'certificado', cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{row.original.certificado}</span> },
    { id: 'validade', header: 'Validade', accessorKey: 'validade', cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{data(row.original.validade)}</span> },
    { id: 'vigente', header: 'Situação', accessorFn: (v) => (v.vigente ? 'Vigente' : 'Vencida'), cell: ({ row }) => (row.original.vigente ? <Badge variant="outline">Vigente</Badge> : <Badge variant="secondary">Vencida</Badge>) },
  ], []);

  const registrar = async () => {
    setErro(null);
    const faltando: [string, string][] = [];
    if (!form.data_vistoria) faltando.push(['Data', 'Informe a data da vistoria.']);
    if (!form.certificado.trim()) faltando.push(['Certificado', 'Informe o número do certificado.']);
    if (!form.validade) faltando.push(['Validade', 'Informe a validade.']);
    if (faltando.length > 0) return invalidar(faltando);
    setSalvando(true);
    try {
      await transporteApi.registrarVistoria(veiculo.id, { data_vistoria: form.data_vistoria, certificado: form.certificado.trim(), validade: form.validade, observacoes: textoOuNulo(form.observacoes) });
      setForm({ data_vistoria: '', certificado: '', validade: '', observacoes: '' });
      await carga.recarregar();
      aoRegistrar();
    } catch (e) {
      if (!tratarErro(e)) setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open onClose={aoFechar} title={`Vistorias do veículo ${veiculo.placa}`} size="lg" footer={<Button variant="outline" onClick={aoFechar}>Fechar</Button>}>
      {modalValidacao}
      <div className="space-y-4">
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && <DataTable columns={colunas} data={carga.dados} emptyText="Nenhuma vistoria registrada." />}
        {podeRegistrar && (
          <div className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-semibold">Registrar vistoria semestral</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label="Data da vistoria *" type="date" value={form.data_vistoria} className="font-mono tabular-nums" onChange={(e) => setForm((f) => ({ ...f, data_vistoria: e.target.value }))} />
              <Input label="Certificado *" value={form.certificado} maxLength={100} className="font-mono tabular-nums" onChange={(e) => setForm((f) => ({ ...f, certificado: e.target.value }))} />
              <Input label="Validade *" type="date" value={form.validade} className="font-mono tabular-nums" onChange={(e) => setForm((f) => ({ ...f, validade: e.target.value }))} />
            </div>
            {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
            <div className="flex justify-end"><Button onClick={() => void registrar()} isLoading={salvando}>Registrar vistoria</Button></div>
          </div>
        )}
      </div>
    </Modal>
  );
};
