import React, { useState } from 'react';
import { Box, Camera, CheckCircle2, ImageIcon, Package, Pencil, Plus, Trash2, Truck } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, CardHeader, CardTitle, Input, Modal, Select, Skeleton, StatusChip, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { formatarCentavos, paraCentavos } from '@/lib/formatacao';
import { erroApi } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { useCarga } from '../../escola/useCarga';
import { campanhaApi, type CaboEleitoral, type Coordenador, type Material, type MunicipioLinha, type Remessa } from '../api';
import { abrirArquivo, formatarData, formatarNumero } from '../formato';
import type { PropsAba } from '../ModuloCampanhaMain';
import { SelectMunicipio, nomeDoMunicipio, useMunicipiosDaCampanha, vazioParaNulo } from './Comuns';

export const TIPOS_MATERIAL: Record<string, string> = {
  santinho: 'Santinho', folder: 'Folder', adesivo: 'Adesivo', bandeira: 'Bandeira', praguinha: 'Praguinha', cartaz: 'Cartaz', banner: 'Banner',
  faixa: 'Faixa', cavalete: 'Cavalete', perfurado: 'Perfurado', jornal: 'Jornal', revista: 'Revista', envelope: 'Envelope', camiseta: 'Camiseta',
  bone: 'Boné', caneta: 'Caneta', brinde: 'Brinde', outro: 'Outro',
};
const UNIDADES = ['unidades', 'milheiros', 'centos', 'pacotes', 'caixas', 'fardos', 'resmas', 'kits'];

/** Valor unitário derivado do total do lote (só para exibir — o contábil é o total). */
export function valorUnitario(totalCentavos: number, quantidade: number): string {
  if (quantidade <= 0 || totalCentavos <= 0) return '—';
  const milesimos = Math.round((totalCentavos * 10) / quantidade);
  return `R$ ${Math.floor(milesimos / 1000)},${String(milesimos % 1000).padStart(3, '0')}`;
}

/** Materiais com estoque e remessas por município (spec: Materiais de campanha e estoque; Logística de distribuição). */
export const MateriaisCampanha: React.FC<PropsAba> = ({ campanha, permissoes, avisar, alterou, versao }) => {
  const dados = useCarga(async () => {
    const [materiais, remessas, coordenadores, cabos] = await Promise.all([campanhaApi.materiais(), campanhaApi.remessas(), campanhaApi.coordenadores(), campanhaApi.cabos()]);
    return { materiais, remessas, coordenadores, cabos };
  }, [campanha.id, versao]);
  const municipios = useMunicipiosDaCampanha(campanha.id);
  const [material, setMaterial] = useState<Material | 'novo' | null>(null);
  const [remessa, setRemessa] = useState<Remessa | 'nova' | null>(null);
  const [excluir, setExcluir] = useState<{ tipo: 'material'; registro: Material } | { tipo: 'remessa'; registro: Remessa } | null>(null);
  const gerir = permissoes.materiais;

  if (dados.erro) return <AlertCard priority="danger" title="Não foi possível carregar os materiais" description={dados.erro} actionLabel="Tentar novamente" onAction={() => void dados.recarregar()} />;
  if (!dados.dados) return <Skeleton className="h-64 w-full" />;
  const { materiais, remessas, coordenadores, cabos } = dados.dados;

  const abrir = async (carregar: () => Promise<Blob>) => {
    try { abrirArquivo(await carregar()); } catch (e) { avisar({ type: 'error', title: 'Não foi possível abrir o arquivo', message: erroApi(e).mensagem }); }
  };
  const enviarArquivo = async (enviar: (f: File) => Promise<unknown>, arquivo: File | undefined, titulo: string) => {
    if (!arquivo) return;
    try { await enviar(arquivo); avisar({ type: 'success', title: titulo, message: arquivo.name }); alterou(); } catch (e) { avisar({ type: 'error', title: 'Não foi possível enviar o arquivo', message: erroApi(e).mensagem }); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Box className="h-5 w-5 text-primary" />Estoque de materiais</CardTitle>
          {gerir && <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setMaterial('novo')}>Cadastrar material</Button>}
        </CardHeader>
        <CardContent>
          {materiais.length === 0 ? <EmptyState icon={<Package className="h-8 w-8" />} title="Nenhum material" description="Cadastre o que foi produzido (santinhos, adesivos, bandeiras…)." /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Material</TableHead><TableHead className="text-right">Valor do lote</TableHead><TableHead className="text-right">Unitário</TableHead><TableHead className="text-right">Produzido</TableHead><TableHead className="w-64">Estoque</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {materiais.map((m) => {
                  const pct = m.quantidade_produzida > 0 ? Math.round((m.estoque / m.quantidade_produzida) * 100) : 0;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.nome}<p className="text-xs text-muted-foreground">{TIPOS_MATERIAL[m.tipo] ?? m.tipo}{m.fornecedor ? ` · ${m.fornecedor}` : ''}</p></TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatarCentavos(m.valor_total_centavos)}</TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">{valorUnitario(m.valor_total_centavos, m.quantidade_produzida)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatarNumero(m.quantidade_produzida)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Estoque de ${m.nome}`}>
                            <div className={`h-full ${pct < 20 ? 'bg-destructive' : pct < 50 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="whitespace-nowrap font-mono text-sm tabular-nums">{formatarNumero(m.estoque)} {m.unidade}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {gerir && m.tem_imagem && <Button size="icon-sm" variant="ghost" aria-label={`Ver imagem de ${m.nome}`} onClick={() => void abrir(() => campanhaApi.imagemMaterial(m.id))}><ImageIcon /></Button>}
                        {gerir && (<>
                          <label className="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 hover:bg-muted" aria-label={`Enviar imagem de ${m.nome}`} title="Enviar imagem">
                            <Camera className="h-4 w-4" />
                            <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => void enviarArquivo((f) => campanhaApi.enviarImagemMaterial(m.id, f), e.target.files?.[0], 'Imagem enviada')} />
                          </label>
                          <Button size="icon-sm" variant="ghost" aria-label={`Editar ${m.nome}`} onClick={() => setMaterial(m)}><Pencil /></Button>
                          <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${m.nome}`} onClick={() => setExcluir({ tipo: 'material', registro: m })}><Trash2 /></Button>
                        </>)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" />Remessas</CardTitle>
          {gerir && <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} disabled={materiais.length === 0} onClick={() => setRemessa('nova')}>Registrar remessa</Button>}
        </CardHeader>
        <CardContent>
          {remessas.length === 0 ? <EmptyState icon={<Truck className="h-8 w-8" />} title="Nenhuma remessa" description="Registre o envio de material para os municípios." /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Destino</TableHead><TableHead>Material</TableHead><TableHead className="text-right">Quantidade</TableHead><TableHead>Envio</TableHead><TableHead>Transporte</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {remessas.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{nomeDoMunicipio(municipios.dados, r.codigo_ibge)}</TableCell>
                    <TableCell className="text-sm">{r.material?.nome ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatarNumero(r.quantidade)}</TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">{formatarData(r.enviada_em)}</TableCell>
                    <TableCell className="text-sm">{[r.transportadora, r.motorista, r.veiculo].filter(Boolean).join(' · ') || '—'}</TableCell>
                    <TableCell>{r.entregue ? <StatusChip variant="success" label={`Entregue ${formatarData(r.entregue_em)}`} /> : <StatusChip variant="warning" label={r.previsao_entrega ? `Previsto ${formatarData(r.previsao_entrega)}` : 'Em trânsito'} />}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {gerir && r.tem_foto && <Button size="icon-sm" variant="ghost" aria-label={`Ver foto da entrega em ${nomeDoMunicipio(municipios.dados, r.codigo_ibge)}`} onClick={() => void abrir(() => campanhaApi.fotoRemessa(r.id))}><ImageIcon /></Button>}
                      {gerir && (<>
                        <Button size="icon-sm" variant="ghost" aria-label={r.entregue ? 'Editar remessa' : 'Confirmar entrega'} onClick={() => setRemessa(r)}>{r.entregue ? <Pencil /> : <CheckCircle2 />}</Button>
                        <Button size="icon-sm" variant="ghost" aria-label="Excluir remessa" onClick={() => setExcluir({ tipo: 'remessa', registro: r })}><Trash2 /></Button>
                      </>)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MaterialModal registro={material} podeLancarDespesa={permissoes.financeiroGerir} onFechar={() => setMaterial(null)} onSalvo={(m) => { setMaterial(null); avisar({ type: 'success', title: 'Material salvo', message: m.nome }); alterou(); }} />
      <RemessaModal registro={remessa} materiais={materiais} municipios={municipios.dados} coordenadores={coordenadores} cabos={cabos} avisar={avisar}
        onFechar={() => setRemessa(null)} onSalva={() => { setRemessa(null); avisar({ type: 'success', title: 'Remessa salva', message: 'Estoque atualizado.' }); alterou(); }} />
      <ConfirmarModal aberto={excluir !== null} titulo={excluir?.tipo === 'material' ? 'Excluir material' : 'Excluir remessa'} perigo rotuloConfirmar="Excluir"
        mensagem={excluir?.tipo === 'material' ? <>Excluir <strong>{excluir.registro.nome}</strong>?</> : <>Excluir a remessa? A quantidade volta ao estoque.</>}
        onFechar={() => setExcluir(null)}
        onConfirmar={async () => {
          if (!excluir) return;
          try {
            if (excluir.tipo === 'material') await campanhaApi.excluirMaterial(excluir.registro.id);
            else await campanhaApi.excluirRemessa(excluir.registro.id);
            alterou();
          } catch (e) { avisar({ type: 'error', title: 'Não foi possível excluir', message: erroApi(e).mensagem }); }
        }} />
    </div>
  );
};

const VAZIO_MATERIAL = { tipo: 'santinho', nome: '', fornecedor: '', unidade: 'unidades', quantidade: '', valor: '', peso: '', volume: '', observacoes: '', lancar: false };

const MaterialModal: React.FC<{ registro: Material | 'novo' | null; podeLancarDespesa: boolean; onFechar: () => void; onSalvo: (m: Material) => void }> = ({ registro, podeLancarDespesa, onFechar, onSalvo }) => {
  const [form, setForm] = useState(VAZIO_MATERIAL);
  const [atual, setAtual] = useState<Material | 'novo' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  if (registro !== atual) {
    setAtual(registro);
    setForm(registro && registro !== 'novo' ? {
      tipo: registro.tipo, nome: registro.nome, fornecedor: registro.fornecedor ?? '', unidade: registro.unidade, quantidade: String(registro.quantidade_produzida),
      valor: formatarCentavos(registro.valor_total_centavos).replace('R$ ', ''), peso: registro.peso_kg?.toString() ?? '', volume: registro.volume_m3?.toString() ?? '', observacoes: registro.observacoes ?? '', lancar: false,
    } : VAZIO_MATERIAL);
    setErro(null);
  }
  const texto = (campo: keyof typeof VAZIO_MATERIAL) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const valor = form.valor.trim() === '' ? 0 : paraCentavos(form.valor);
    if (valor === null) { setErro('Informe o valor do lote em reais (ex.: 1.500,00).'); return; }
    setSalvando(true);
    setErro(null);
    try {
      const salvo = await campanhaApi.salvarMaterial(registro && registro !== 'novo' ? registro.id : null, {
        tipo: form.tipo, nome: form.nome.trim(), fornecedor: vazioParaNulo(form.fornecedor), unidade: form.unidade, quantidade_produzida: Number(form.quantidade) || 0,
        valor_total_centavos: valor, peso_kg: form.peso ? Number(form.peso.replace(',', '.')) : null, volume_m3: form.volume ? Number(form.volume.replace(',', '.')) : null,
        observacoes: vazioParaNulo(form.observacoes), ...(registro === 'novo' && form.lancar ? { lancar_despesa: true } : {}),
      });
      onSalvo(salvo);
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={registro !== null} onClose={onFechar} title={registro === 'novo' ? 'Cadastrar material' : 'Editar material'} icon={<Package className="h-5 w-5" />} size="lg"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button><Button type="submit" form="form-material" isLoading={salvando}>Salvar</Button></>}>
      <form id="form-material" onSubmit={salvar} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
          <Select label="Tipo *" value={form.tipo} onChange={(v) => setForm((f) => ({ ...f, tipo: String(v) }))} options={Object.entries(TIPOS_MATERIAL).map(([value, label]) => ({ value, label }))} />
          <Input label="Nome / identificação *" value={form.nome} onChange={texto('nome')} required maxLength={200} placeholder="Ex.: Santinho 7x10 frente e verso" />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="Fornecedor / gráfica" value={form.fornecedor} onChange={texto('fornecedor')} maxLength={200} className="sm:col-span-2" />
          <Input label="Quantidade *" type="number" min={0} value={form.quantidade} onChange={texto('quantidade')} required className="font-mono tabular-nums" />
          <Select label="Unidade" value={form.unidade} onChange={(v) => setForm((f) => ({ ...f, unidade: String(v) }))} options={UNIDADES.map((u) => ({ value: u, label: u }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Valor total do lote (R$)" value={form.valor} onChange={texto('valor')} inputMode="decimal" placeholder="0,00" className="font-mono tabular-nums" />
          <Input label="Peso unitário (kg)" value={form.peso} onChange={texto('peso')} inputMode="decimal" className="font-mono tabular-nums" />
          <Input label="Volume unitário (m³)" value={form.volume} onChange={texto('volume')} inputMode="decimal" className="font-mono tabular-nums" />
        </div>
        <p className="text-xs text-muted-foreground">Valor unitário: <span className="font-mono tabular-nums">{valorUnitario(paraCentavos(form.valor || '0') ?? 0, Number(form.quantidade) || 0)}</span></p>
        <label className="block space-y-1 text-sm font-medium">Observações<Textarea rows={2} value={form.observacoes} onChange={texto('observacoes')} maxLength={5000} /></label>
        {registro === 'novo' && podeLancarDespesa && (
          <div className="flex items-center gap-2"><Switch checked={form.lancar} onCheckedChange={(v) => setForm((f) => ({ ...f, lancar: v }))} label="Lançar a despesa no financeiro" /><span className="text-sm">Lançar a despesa no financeiro (Publicidade e gráfica)</span></div>
        )}
        {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
};

const RemessaModal: React.FC<{
  registro: Remessa | 'nova' | null; materiais: Material[]; municipios: MunicipioLinha[] | null; coordenadores: Coordenador[]; cabos: CaboEleitoral[];
  avisar: PropsAba['avisar']; onFechar: () => void; onSalva: () => void;
}> = ({ registro, materiais, municipios, coordenadores, cabos, avisar, onFechar, onSalva }) => {
  const hoje = new Date().toISOString().slice(0, 10);
  const vazio = { material_id: null as number | null, codigo_ibge: null as number | null, coordenador_id: null as number | null, cabo_id: null as number | null, quantidade: '', enviada_em: hoje, transportadora: '', motorista: '', veiculo: '', previsao_entrega: '', entregue_em: '', recebido_por: '', observacoes: '' };
  const [form, setForm] = useState(vazio);
  const [foto, setFoto] = useState<File | null>(null);
  const [atual, setAtual] = useState<Remessa | 'nova' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  if (registro !== atual) {
    setAtual(registro);
    setForm(registro && registro !== 'nova' ? {
      material_id: registro.material_id, codigo_ibge: registro.codigo_ibge, coordenador_id: registro.coordenador_id, cabo_id: registro.cabo_id, quantidade: String(registro.quantidade),
      enviada_em: registro.enviada_em, transportadora: registro.transportadora ?? '', motorista: registro.motorista ?? '', veiculo: registro.veiculo ?? '',
      previsao_entrega: registro.previsao_entrega ?? '', entregue_em: registro.entregue_em ?? (registro.entregue ? '' : hoje), recebido_por: registro.recebido_por ?? '', observacoes: registro.observacoes ?? '',
    } : vazio);
    setFoto(null);
    setErro(null);
  }
  const texto = (campo: keyof typeof vazio) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const escolhido = materiais.find((m) => m.id === form.material_id);

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (form.material_id === null || form.codigo_ibge === null) { setErro('Escolha o material e o município de destino.'); return; }
    setSalvando(true);
    setErro(null);
    try {
      const salva = await campanhaApi.salvarRemessa(registro && registro !== 'nova' ? registro.id : null, {
        material_id: form.material_id, codigo_ibge: form.codigo_ibge, coordenador_id: form.coordenador_id, cabo_id: form.cabo_id, quantidade: Number(form.quantidade) || 0,
        enviada_em: form.enviada_em, transportadora: vazioParaNulo(form.transportadora), motorista: vazioParaNulo(form.motorista), veiculo: vazioParaNulo(form.veiculo),
        previsao_entrega: form.previsao_entrega || null, entregue_em: form.entregue_em || null, recebido_por: vazioParaNulo(form.recebido_por), observacoes: vazioParaNulo(form.observacoes),
      });
      if (foto) {
        try { await campanhaApi.enviarFotoRemessa(salva.id, foto); } catch (e) { avisar({ type: 'error', title: 'Remessa salva, mas a foto não foi enviada', message: erroApi(e).mensagem }); }
      }
      onSalva();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={registro !== null} onClose={onFechar} title={registro === 'nova' ? 'Registrar remessa' : 'Remessa e entrega'} icon={<Truck className="h-5 w-5" />} size="lg"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button><Button type="submit" form="form-remessa" isLoading={salvando}>Salvar</Button></>}>
      <form id="form-remessa" onSubmit={salvar} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Material *" value={form.material_id} placeholder="Escolha" onChange={(v) => setForm((f) => ({ ...f, material_id: Number(v) }))}
            options={materiais.map((m) => ({ value: m.id, label: `${m.nome} (estoque ${formatarNumero(m.estoque)})` }))} />
          <SelectMunicipio label="Município de destino *" municipios={municipios} value={form.codigo_ibge} onChange={(v) => setForm((f) => ({ ...f, codigo_ibge: v }))} />
          <Select label="Coordenador" value={form.coordenador_id ?? 'nenhum'} onChange={(v) => setForm((f) => ({ ...f, coordenador_id: v === 'nenhum' ? null : Number(v) }))} options={[{ value: 'nenhum', label: 'Nenhum' }, ...coordenadores.map((c) => ({ value: c.id, label: c.nome }))]} />
          <Select label="Cabo eleitoral" value={form.cabo_id ?? 'nenhum'} onChange={(v) => setForm((f) => ({ ...f, cabo_id: v === 'nenhum' ? null : Number(v) }))} options={[{ value: 'nenhum', label: 'Nenhum' }, ...cabos.map((c) => ({ value: c.id, label: c.nome }))]} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={`Quantidade *${escolhido ? ` (${escolhido.unidade})` : ''}`} type="number" min={1} value={form.quantidade} onChange={texto('quantidade')} required className="font-mono tabular-nums" />
          <Input label="Data de envio *" type="date" value={form.enviada_em} onChange={texto('enviada_em')} required />
          <Input label="Previsão de entrega" type="date" value={form.previsao_entrega} onChange={texto('previsao_entrega')} />
          <Input label="Transportadora / responsável" value={form.transportadora} onChange={texto('transportadora')} maxLength={200} />
          <Input label="Motorista" value={form.motorista} onChange={texto('motorista')} maxLength={200} />
          <Input label="Veículo e placa" value={form.veiculo} onChange={texto('veiculo')} maxLength={100} />
        </div>
        {registro !== 'nova' && (
          <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-3 sm:grid-cols-3">
            <Input label="Entregue em" type="date" value={form.entregue_em} onChange={texto('entregue_em')} />
            <Input label="Quem recebeu" value={form.recebido_por} onChange={texto('recebido_por')} maxLength={200} />
            <label className="block space-y-1 text-sm font-medium">Foto da entrega
              <input type="file" accept="image/*,application/pdf" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} className="block w-full text-xs" />
            </label>
          </div>
        )}
        <label className="block space-y-1 text-sm font-medium">Anotações logísticas<Textarea rows={2} value={form.observacoes} onChange={texto('observacoes')} maxLength={5000} /></label>
        {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
};
