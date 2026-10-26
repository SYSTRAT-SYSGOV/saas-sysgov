import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Megaphone, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { ActionsMenu, AlertCard, Button, Card, CardContent, DataTable, Input, Modal, Select, Skeleton, Switch, Textarea } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { formatarCentavos, paraCentavos } from '@/lib/formatacao';
import { erroApi } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { useCarga } from '../../escola/useCarga';
import { campanhaApi, type CaboEleitoral, type Coordenador } from '../api';
import { formatarNumero } from '../formato';
import type { PropsAba } from '../ModuloCampanhaMain';
import { SelectMunicipio, colunaAcoes, nomeDoMunicipio, useMunicipiosDaCampanha, vazioParaNulo } from './Comuns';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

const VAZIO = {
  nome: '', cpf: '', codigo_ibge: null as number | null, bairro: '', endereco: '', coordenador_id: null as number | null, votos_estimados: '0', area_atuacao: '',
  disponibilidade: '', veiculo_proprio: false, ajuda_custo: false, valor_ajuda: '0,00', pix: '', banco: '', telefone: '', whatsapp: '', email: '', instagram: '', facebook: '', observacoes: '',
};

/** Cabos eleitorais da campanha (spec: Coordenadores e cabos eleitorais). */
export const CabosCampanha: React.FC<PropsAba> = ({ campanha, permissoes, avisar, alterou, versao }) => {
  const dados = useCarga(async () => {
    const [cabos, coordenadores] = await Promise.all([campanhaApi.cabos(), campanhaApi.coordenadores()]);
    return { cabos, coordenadores };
  }, [campanha.id, versao]);
  const municipios = useMunicipiosDaCampanha(campanha.id);
  const [busca, setBusca] = useState('');
  const { tratarErro } = useFormValidationModal();
  const [municipio, setMunicipio] = useState<number | null>(null);
  const [editando, setEditando] = useState<CaboEleitoral | 'novo' | null>(null);
  const [excluir, setExcluir] = useState<CaboEleitoral | null>(null);

  const visiveis = useMemo(() => (dados.dados?.cabos ?? []).filter((c) => (municipio === null || c.codigo_ibge === municipio) && (!busca.trim() || c.nome.toLowerCase().includes(busca.trim().toLowerCase()))), [dados.dados, municipio, busca]);

  // Colunas estáveis; o estado atual vem por ref (atribuído logo antes do return principal).
  const ctx = useRef({} as { permissoes: PropsAba['permissoes']; municipios: ReturnType<typeof useMunicipiosDaCampanha>['dados']; coordenadores: Coordenador[] | undefined });
  const nomeDoCoordenador = (id: number | null) => ctx.current.coordenadores?.find((c) => c.id === id)?.nome ?? '—';
  const colunas = useMemo<ColumnDef<CaboEleitoral, unknown>[]>(() => [
    colunaAcoes<CaboEleitoral>((c) => `Ações de ${c.nome}`, (c) => (ctx.current.permissoes.equipes ? [
      { key: 'editar', label: 'Editar', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => setEditando(c) },
      { key: 'excluir', label: 'Excluir', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setExcluir(c) },
    ] : [])),
    {
      id: 'nome', header: 'Nome', accessorKey: 'nome',
      cell: ({ row }) => <span className="font-medium">{row.original.nome}{row.original.cpf_mascarado && <p className="font-mono text-xs tabular-nums text-muted-foreground">CPF {row.original.cpf_mascarado}</p>}</span>,
      meta: { exportHeader: 'Nome', exportValue: (c) => c.nome },
    },
    {
      id: 'local', header: 'Município / bairro',
      accessorFn: (c) => `${nomeDoMunicipio(ctx.current.municipios, c.codigo_ibge)}${c.bairro ? ` — ${c.bairro}` : ''}`,
      meta: { exportHeader: 'Município / bairro', exportValue: (c) => `${nomeDoMunicipio(ctx.current.municipios, c.codigo_ibge)}${c.bairro ? ` — ${c.bairro}` : ''}` },
    },
    { id: 'coordenador', header: 'Coordenador', accessorFn: (c) => nomeDoCoordenador(c.coordenador_id), meta: { exportHeader: 'Coordenador', exportValue: (c) => nomeDoCoordenador(c.coordenador_id) } },
    {
      id: 'votos', header: 'Votos est.', accessorKey: 'votos_estimados',
      cell: ({ row }) => <span className="block text-right font-mono tabular-nums">{formatarNumero(row.original.votos_estimados)}</span>,
      meta: { exportHeader: 'Votos estimados', exportValue: (c) => c.votos_estimados },
    },
    {
      id: 'ajuda', header: 'Ajuda de custo', accessorFn: (c) => (c.ajuda_custo ? c.valor_ajuda_centavos : 0),
      cell: ({ row }) => <span className="block text-right font-mono tabular-nums">{row.original.ajuda_custo ? formatarCentavos(row.original.valor_ajuda_centavos) : '—'}</span>,
      meta: { exportHeader: 'Ajuda de custo', exportValue: (c) => (c.ajuda_custo ? formatarCentavos(c.valor_ajuda_centavos) : '') },
    },
    {
      id: 'whatsapp', header: 'WhatsApp', accessorFn: (c) => c.whatsapp ?? '',
      cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{row.original.whatsapp ?? '—'}</span>,
      meta: { exportHeader: 'WhatsApp', exportValue: (c) => c.whatsapp ?? '' },
    },
  ], []);

  if (dados.erro) return <AlertCard priority="danger" title="Não foi possível carregar os cabos eleitorais" description={dados.erro} actionLabel="Tentar novamente" onAction={() => void dados.recarregar()} />;
  if (!dados.dados) return <Skeleton className="h-64 w-full" />;
  const nomeCoordenador = (id: number | null) => dados.dados?.coordenadores.find((c) => c.id === id)?.nome ?? '—';
  ctx.current = { permissoes, municipios: municipios.dados, coordenadores: dados.dados?.coordenadores };

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="grid items-end gap-2 md:grid-cols-[1fr_16rem_auto]">
          <Input label="Buscar" placeholder="Nome do cabo eleitoral" value={busca} onChange={(e) => setBusca(e.target.value)} leftIcon={<Search className="h-4 w-4" />} />
          <SelectMunicipio label="Município" municipios={municipios.dados} value={municipio} onChange={setMunicipio} opcional />
          {permissoes.equipes && <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditando('novo')}>Novo cabo eleitoral</Button>}
        </div>
        {visiveis.length === 0 ? <EmptyState icon={<Megaphone className="h-8 w-8" />} title="Nenhum cabo eleitoral" description={dados.dados.cabos.length === 0 ? 'Cadastre os cabos eleitorais que trabalham nos municípios.' : 'Ajuste os filtros.'} /> : (
          <DataTable
            columns={colunas}
            data={visiveis}
            emptyText="Nenhum cabo eleitoral encontrado."
            exportable
            exportFileName="campanha-cabos-eleitorais"
            exportTitle="Campanha — Cabos eleitorais"
          />
        )}
      </CardContent>
      <CaboModal registro={editando} municipios={municipios.dados} coordenadores={dados.dados.coordenadores} onFechar={() => setEditando(null)} onSalvo={(nome) => { setEditando(null); avisar({ type: 'success', title: 'Cabo eleitoral salvo', message: nome }); alterou(); }} />
      <ConfirmarModal aberto={excluir !== null} titulo="Excluir cabo eleitoral" mensagem={<>Excluir <strong>{excluir?.nome}</strong>?</>} rotuloConfirmar="Excluir" perigo onFechar={() => setExcluir(null)}
        onConfirmar={async () => {
          if (!excluir) return;
          try { await campanhaApi.excluirCabo(excluir.id); alterou(); } catch (e) { if (!tratarErro(e)) avisar({ type: 'error', title: 'Não foi possível excluir', message: erroApi(e).mensagem }); }
        }} />
    </Card>
  );
};

const CaboModal: React.FC<{ registro: CaboEleitoral | 'novo' | null; municipios: Parameters<typeof SelectMunicipio>[0]['municipios']; coordenadores: Coordenador[]; onFechar: () => void; onSalvo: (nome: string) => void }> = ({ registro, municipios, coordenadores, onFechar, onSalvo }) => {
  const [form, setForm] = useState(VAZIO);
  const [atual, setAtual] = useState<CaboEleitoral | 'novo' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const { modal: modalValidacao, validar, invalidar, tratarErro } = useFormValidationModal();
  const [salvando, setSalvando] = useState(false);
  if (registro !== atual) {
    setAtual(registro);
    setForm(registro && registro !== 'novo' ? {
      ...VAZIO, ...Object.fromEntries(Object.entries(registro).map(([k, v]) => [k, v === null ? '' : v])), cpf: '', codigo_ibge: registro.codigo_ibge, coordenador_id: registro.coordenador_id,
      votos_estimados: String(registro.votos_estimados), valor_ajuda: formatarCentavos(registro.valor_ajuda_centavos).replace('R$ ', ''),
    } as typeof VAZIO : VAZIO);
    setErro(null);
  }
  const texto = (campo: keyof typeof VAZIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validar([['Nome', form.nome]])) return;
    if (form.codigo_ibge === null) { invalidar([['validação', 'Escolha o município.']]); return; }
    const valor = form.ajuda_custo ? paraCentavos(form.valor_ajuda || '0') : 0;
    if (valor === null) { invalidar([['validação', 'Informe a ajuda de custo em reais (ex.: 300,00).']]); return; }
    setSalvando(true);
    setErro(null);
    try {
      const salvo = await campanhaApi.salvarCabo(registro && registro !== 'novo' ? registro.id : null, {
        nome: form.nome.trim(), ...(form.cpf.trim() ? { cpf: form.cpf.trim() } : {}), codigo_ibge: form.codigo_ibge, bairro: vazioParaNulo(form.bairro), endereco: vazioParaNulo(form.endereco),
        coordenador_id: form.coordenador_id, votos_estimados: Number(form.votos_estimados) || 0, area_atuacao: vazioParaNulo(form.area_atuacao), disponibilidade: vazioParaNulo(form.disponibilidade),
        veiculo_proprio: form.veiculo_proprio, ajuda_custo: form.ajuda_custo, valor_ajuda_centavos: valor, pix: vazioParaNulo(form.pix), banco: vazioParaNulo(form.banco),
        telefone: vazioParaNulo(form.telefone), whatsapp: vazioParaNulo(form.whatsapp), email: vazioParaNulo(form.email), instagram: vazioParaNulo(form.instagram), facebook: vazioParaNulo(form.facebook), observacoes: vazioParaNulo(form.observacoes),
      });
      onSalvo(salvo.nome);
    } catch (e) {
      if (!tratarErro(e)) setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={registro !== null} onClose={onFechar} title={registro === 'novo' ? 'Novo cabo eleitoral' : 'Editar cabo eleitoral'} icon={<Megaphone className="h-5 w-5" />} size="xl"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button><Button type="submit" form="form-cabo" isLoading={salvando}>Salvar</Button></>}>
      {modalValidacao}
      <form noValidate id="form-cabo" onSubmit={salvar} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <Input label="Nome *" value={form.nome} onChange={texto('nome')} maxLength={200} />
          <Input label={registro !== 'novo' && registro?.cpf_mascarado ? `CPF (atual ${registro.cpf_mascarado})` : 'CPF (opcional)'} value={form.cpf} onChange={texto('cpf')} maxLength={14} className="font-mono tabular-nums" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <SelectMunicipio label="Município *" municipios={municipios} value={form.codigo_ibge} onChange={(v) => setForm((f) => ({ ...f, codigo_ibge: v }))} />
          <Input label="Bairro" value={form.bairro} onChange={texto('bairro')} maxLength={150} />
          <Select label="Coordenador" value={form.coordenador_id ?? 'nenhum'} onChange={(v) => setForm((f) => ({ ...f, coordenador_id: v === 'nenhum' ? null : Number(v) }))} options={[{ value: 'nenhum', label: 'Sem coordenador' }, ...coordenadores.map((c) => ({ value: c.id, label: c.nome }))]} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Endereço" value={form.endereco} onChange={texto('endereco')} maxLength={255} />
          <Input label="Área de atuação" value={form.area_atuacao} onChange={texto('area_atuacao')} maxLength={255} />
          <Input label="Disponibilidade" value={form.disponibilidade} onChange={texto('disponibilidade')} maxLength={255} placeholder="Ex.: fins de semana" />
        </div>
        <div className="grid items-end gap-3 sm:grid-cols-4">
          <Input label="Votos estimados" type="number" min={0} value={form.votos_estimados} onChange={texto('votos_estimados')} className="font-mono tabular-nums" />
          <div className="flex items-center gap-2 pb-2"><Switch checked={form.veiculo_proprio} onCheckedChange={(v) => setForm((f) => ({ ...f, veiculo_proprio: v }))} label="Veículo próprio" /><span className="text-sm">Veículo próprio</span></div>
          <div className="flex items-center gap-2 pb-2"><Switch checked={form.ajuda_custo} onCheckedChange={(v) => setForm((f) => ({ ...f, ajuda_custo: v }))} label="Recebe ajuda de custo" /><span className="text-sm">Ajuda de custo</span></div>
          <Input label="Valor da ajuda (R$)" value={form.valor_ajuda} onChange={texto('valor_ajuda')} disabled={!form.ajuda_custo} inputMode="decimal" className="font-mono tabular-nums" />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="Chave Pix" value={form.pix} onChange={texto('pix')} maxLength={150} />
          <Input label="Banco" value={form.banco} onChange={texto('banco')} maxLength={100} />
          <Input label="Telefone" value={form.telefone} onChange={texto('telefone')} maxLength={20} className="font-mono tabular-nums" />
          <Input label="WhatsApp" value={form.whatsapp} onChange={texto('whatsapp')} maxLength={20} className="font-mono tabular-nums" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="E-mail" type="email" value={form.email} onChange={texto('email')} maxLength={150} />
          <Input label="Instagram" value={form.instagram} onChange={texto('instagram')} maxLength={100} />
          <Input label="Facebook" value={form.facebook} onChange={texto('facebook')} maxLength={100} />
        </div>
        <label className="block space-y-1 text-sm font-medium">Observações<Textarea rows={2} value={form.observacoes} onChange={texto('observacoes')} maxLength={5000} /></label>
        {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
};
