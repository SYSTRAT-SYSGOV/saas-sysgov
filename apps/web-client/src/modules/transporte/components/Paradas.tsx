import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { ActionsMenu, Badge, Button, Card, CardContent, ConfirmDialog, DataTable, Input, Modal, Switch, Textarea } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { useFormValidationModal } from '@/lib/useFormValidationModal';
import { consultarCep } from '../../pessoas/services/cep';
import { mensagemDeErro, transporteApi, type Opcoes, type Parada } from '../api';

const SeletorCoordenadaLeaflet = React.lazy(() => import('./MapaLeaflet').then((m) => ({ default: m.SeletorCoordenadaLeaflet })));

const textoOuNulo = (valor: string): string | null => (valor.trim() === '' ? null : valor.trim());

/** Pontos de parada: endereço (CEP preenche só o endereço) e coordenadas digitadas ou marcadas no mapa. */
export const Paradas: React.FC<{ opcoes: Opcoes; avisar: Toast }> = ({ opcoes, avisar }) => {
  const [busca, setBusca] = useState('');
  const [termo, setTermo] = useState('');
  const carga = useCarga(() => transporteApi.paradas({ q: termo || undefined, per_page: 200 }), [termo]);
  const [editando, setEditando] = useState<Parada | 'nova' | null>(null);
  const [excluindo, setExcluindo] = useState<Parada | null>(null);
  const gerenciar = opcoes.permissoes.gerenciar_rotas;

  const excluir = async (parada: Parada) => {
    try {
      await transporteApi.excluirParada(parada.id);
      avisar({ type: 'success', title: 'Parada', message: `Parada ${parada.nome} excluída.` });
      await carga.recarregar();
    } catch (e) {
      avisar({ type: 'error', title: 'Parada', message: mensagemDeErro(e) });
    }
  };

  const ctx = useRef({ gerenciar });
  ctx.current = { gerenciar };
  const colunas = useMemo<ColumnDef<Parada, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => ctx.current.gerenciar ? (
        <div className="flex justify-center">
          <ActionsMenu
            triggerLabel={`Ações da parada ${row.original.nome}`}
            items={[
              { key: 'editar', label: 'Editar', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => setEditando(row.original) },
              { key: 'excluir', label: 'Excluir', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setExcluindo(row.original) },
            ]}
          />
        </div>
      ) : null,
    },
    { id: 'nome', header: 'Parada', accessorKey: 'nome', meta: { exportHeader: 'Parada', exportValue: (p) => p.nome } },
    {
      id: 'endereco',
      header: 'Endereço',
      accessorFn: (p) => [p.logradouro, p.numero, p.bairro, p.cidade].filter(Boolean).join(', '),
      meta: { exportHeader: 'Endereço', exportValue: (p) => [p.logradouro, p.numero, p.bairro, p.cidade].filter(Boolean).join(', ') },
    },
    { id: 'referencia', header: 'Referência', accessorFn: (p) => p.referencia ?? '', meta: { exportHeader: 'Referência', exportValue: (p) => p.referencia ?? '' } },
    {
      id: 'coordenadas',
      header: 'Coordenadas',
      accessorFn: (p) => (p.tem_coordenadas ? `${p.latitude}, ${p.longitude}` : ''),
      cell: ({ row }) => row.original.tem_coordenadas
        ? <span className="font-mono text-xs tabular-nums">{row.original.latitude}, {row.original.longitude}</span>
        : <Badge variant="secondary">sem coordenada</Badge>,
      meta: { exportHeader: 'Coordenadas', exportValue: (p) => (p.tem_coordenadas ? `${p.latitude}, ${p.longitude}` : '') },
    },
    {
      id: 'situacao',
      header: 'Situação',
      accessorFn: (p) => (p.ativa ? 'Ativa' : 'Inativa'),
      cell: ({ row }) => (row.original.ativa ? <Badge variant="outline">Ativa</Badge> : <Badge variant="secondary">Inativa</Badge>),
      meta: { exportHeader: 'Situação', exportValue: (p) => (p.ativa ? 'Ativa' : 'Inativa') },
    },
  ], []);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); setTermo(busca.trim()); }}>
            <Input label="Buscar parada" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <Button type="submit" variant="outline"><Search className="mr-1 h-4 w-4" />Buscar</Button>
          </form>
          {gerenciar && <Button onClick={() => setEditando('nova')}><Plus className="mr-1 h-4 w-4" />Nova parada</Button>}
        </div>
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && (
          <>
            <DataTable columns={colunas} data={carga.dados.data} emptyText="Nenhuma parada cadastrada." exportable exportFileName="transporte-paradas" exportTitle="Transporte Escolar — Paradas" />
            {carga.dados.total > carga.dados.data.length && (
              <p className="text-xs text-muted-foreground">Mostrando {carga.dados.data.length} de {carga.dados.total} paradas. Refine a busca para encontrar as demais.</p>
            )}
          </>
        )}
      </CardContent>
      {editando && (
        <ParadaModal parada={editando === 'nova' ? null : editando} aoFechar={() => setEditando(null)}
          aoSalvar={() => { setEditando(null); avisar({ type: 'success', title: 'Parada', message: 'Parada salva.' }); void carga.recarregar(); }} />
      )}
      <ConfirmDialog
        open={excluindo !== null}
        onClose={() => setExcluindo(null)}
        title="Excluir parada"
        description={`Excluir a parada ${excluindo?.nome ?? ''}? Parada usada em itinerário não pode ser excluída: inative-a.`}
        confirmLabel="Excluir"
        requireReason={false}
        onConfirm={() => { const alvo = excluindo; setExcluindo(null); if (alvo) void excluir(alvo); }}
      />
    </Card>
  );
};

const ParadaModal: React.FC<{ parada: Parada | null; aoFechar: () => void; aoSalvar: () => void }> = ({ parada, aoFechar, aoSalvar }) => {
  const [dados, setDados] = useState({
    nome: parada?.nome ?? '',
    descricao: parada?.descricao ?? '',
    referencia: parada?.referencia ?? '',
    cep: parada?.cep ?? '',
    logradouro: parada?.logradouro ?? '',
    numero: parada?.numero ?? '',
    complemento: parada?.complemento ?? '',
    bairro: parada?.bairro ?? '',
    cidade: parada?.cidade ?? '',
    uf: parada?.uf ?? '',
    latitude: parada?.latitude != null ? String(parada.latitude) : '',
    longitude: parada?.longitude != null ? String(parada.longitude) : '',
    ativa: parada?.ativa ?? true,
  });
  const [mapa, setMapa] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { modal: modalValidacao, invalidar, tratarErro } = useFormValidationModal();
  const campo = <K extends keyof typeof dados>(chave: K, valor: (typeof dados)[K]) => setDados((d) => ({ ...d, [chave]: valor }));

  // O CEP preenche só o endereço; se o serviço falhar, os campos continuam livres (D16).
  const buscarCep = async () => {
    const r = await consultarCep(dados.cep);
    if (r) setDados((d) => ({ ...d, logradouro: r.logradouro || d.logradouro, bairro: r.bairro || d.bairro, cidade: r.localidade || d.cidade, uf: r.uf || d.uf }));
  };

  const numero = (valor: string): number | null => (valor.trim() === '' ? null : Number(valor.replace(',', '.')));
  const lat = numero(dados.latitude);
  const lng = numero(dados.longitude);

  const salvar = async () => {
    setErro(null);
    const faltando: [string, string][] = [];
    if (!dados.nome.trim()) faltando.push(['Nome', 'Informe o nome da parada.']);
    if ((lat === null) !== (lng === null)) faltando.push(['Coordenadas', 'Informe latitude e longitude juntas, ou deixe as duas vazias.']);
    if (lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90)) faltando.push(['Latitude', 'A latitude vai de -90 a 90.']);
    if (lng !== null && (Number.isNaN(lng) || lng < -180 || lng > 180)) faltando.push(['Longitude', 'A longitude vai de -180 a 180.']);
    if (faltando.length > 0) return invalidar(faltando);
    setSalvando(true);
    try {
      await transporteApi.salvarParada(parada?.id ?? null, {
        nome: dados.nome.trim(),
        descricao: textoOuNulo(dados.descricao),
        referencia: textoOuNulo(dados.referencia),
        cep: textoOuNulo(dados.cep),
        logradouro: textoOuNulo(dados.logradouro),
        numero: textoOuNulo(dados.numero),
        complemento: textoOuNulo(dados.complemento),
        bairro: textoOuNulo(dados.bairro),
        cidade: textoOuNulo(dados.cidade),
        uf: textoOuNulo(dados.uf)?.toUpperCase() ?? null,
        latitude: lat,
        longitude: lng,
        ativa: dados.ativa,
      });
      aoSalvar();
    } catch (e) {
      if (!tratarErro(e)) setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open onClose={aoFechar} title={parada ? `Editar parada ${parada.nome}` : 'Nova parada'} size="xl"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void salvar()} isLoading={salvando}>Salvar</Button></>}>
      {modalValidacao}
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Nome *" value={dados.nome} maxLength={150} onChange={(e) => campo('nome', e.target.value)} />
          <Input label="Ponto de referência" value={dados.referencia} maxLength={255} onChange={(e) => campo('referencia', e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="CEP" value={dados.cep} maxLength={9} className="font-mono tabular-nums" onChange={(e) => campo('cep', e.target.value)} onBlur={() => void buscarCep()} />
          <div className="sm:col-span-2"><Input label="Logradouro" value={dados.logradouro} maxLength={200} onChange={(e) => campo('logradouro', e.target.value)} /></div>
          <Input label="Número" value={dados.numero} maxLength={20} onChange={(e) => campo('numero', e.target.value)} />
          <Input label="Complemento" value={dados.complemento} maxLength={100} onChange={(e) => campo('complemento', e.target.value)} />
          <Input label="Bairro" value={dados.bairro} maxLength={100} onChange={(e) => campo('bairro', e.target.value)} />
          <Input label="Cidade" value={dados.cidade} maxLength={100} onChange={(e) => campo('cidade', e.target.value)} />
          <Input label="UF" value={dados.uf} maxLength={2} className="uppercase" onChange={(e) => campo('uf', e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Latitude" inputMode="decimal" value={dados.latitude} className="font-mono tabular-nums" onChange={(e) => campo('latitude', e.target.value)} />
          <Input label="Longitude" inputMode="decimal" value={dados.longitude} className="font-mono tabular-nums" onChange={(e) => campo('longitude', e.target.value)} />
          <div className="self-end"><Button variant="outline" onClick={() => setMapa((m) => !m)}><MapPin className="mr-1 h-4 w-4" />{mapa ? 'Ocultar mapa' : 'Marcar no mapa'}</Button></div>
        </div>
        {mapa && (
          <React.Suspense fallback={<p className="text-sm text-muted-foreground">Carregando o mapa…</p>}>
            <p className="text-xs text-muted-foreground">Clique no mapa para marcar a parada.</p>
            <SeletorCoordenadaLeaflet latitude={lat !== null && !Number.isNaN(lat) ? lat : null} longitude={lng !== null && !Number.isNaN(lng) ? lng : null}
              aoEscolher={(la, lo) => setDados((d) => ({ ...d, latitude: String(la), longitude: String(lo) }))} />
          </React.Suspense>
        )}
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">Descrição</span>
          <Textarea value={dados.descricao} rows={2} maxLength={2000} onChange={(e) => campo('descricao', e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={dados.ativa} onCheckedChange={(v) => campo('ativa', v)} aria-label="Parada ativa" />Parada ativa</label>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};
