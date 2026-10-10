import React, { useMemo, useState } from 'react';
import { Megaphone, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, Input, Modal, Select, Skeleton, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { formatarCentavos, paraCentavos } from '@/lib/formatacao';
import { erroApi } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { useCarga } from '../../escola/useCarga';
import { campanhaApi, type CaboEleitoral, type Coordenador } from '../api';
import { formatarNumero } from '../formato';
import type { PropsAba } from '../ModuloCampanhaMain';
import { SelectMunicipio, nomeDoMunicipio, useMunicipiosDaCampanha, vazioParaNulo } from './Comuns';

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
  const [municipio, setMunicipio] = useState<number | null>(null);
  const [editando, setEditando] = useState<CaboEleitoral | 'novo' | null>(null);
  const [excluir, setExcluir] = useState<CaboEleitoral | null>(null);

  const visiveis = useMemo(() => (dados.dados?.cabos ?? []).filter((c) => (municipio === null || c.codigo_ibge === municipio) && (!busca.trim() || c.nome.toLowerCase().includes(busca.trim().toLowerCase()))), [dados.dados, municipio, busca]);

  if (dados.erro) return <AlertCard priority="danger" title="Não foi possível carregar os cabos eleitorais" description={dados.erro} actionLabel="Tentar novamente" onAction={() => void dados.recarregar()} />;
  if (!dados.dados) return <Skeleton className="h-64 w-full" />;
  const nomeCoordenador = (id: number | null) => dados.dados?.coordenadores.find((c) => c.id === id)?.nome ?? '—';

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="grid items-end gap-2 md:grid-cols-[1fr_16rem_auto]">
          <Input label="Buscar" placeholder="Nome do cabo eleitoral" value={busca} onChange={(e) => setBusca(e.target.value)} leftIcon={<Search className="h-4 w-4" />} />
          <SelectMunicipio label="Município" municipios={municipios.dados} value={municipio} onChange={setMunicipio} opcional />
          {permissoes.equipes && <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditando('novo')}>Novo cabo eleitoral</Button>}
        </div>
        {visiveis.length === 0 ? <EmptyState icon={<Megaphone className="h-8 w-8" />} title="Nenhum cabo eleitoral" description={dados.dados.cabos.length === 0 ? 'Cadastre os cabos eleitorais que trabalham nos municípios.' : 'Ajuste os filtros.'} /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Município / bairro</TableHead><TableHead>Coordenador</TableHead><TableHead className="text-right">Votos est.</TableHead><TableHead className="text-right">Ajuda de custo</TableHead><TableHead>WhatsApp</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {visiveis.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}{c.cpf_mascarado && <p className="font-mono text-xs tabular-nums text-muted-foreground">CPF {c.cpf_mascarado}</p>}</TableCell>
                  <TableCell className="text-sm">{nomeDoMunicipio(municipios.dados, c.codigo_ibge)}{c.bairro ? ` — ${c.bairro}` : ''}</TableCell>
                  <TableCell className="text-sm">{nomeCoordenador(c.coordenador_id)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatarNumero(c.votos_estimados)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{c.ajuda_custo ? formatarCentavos(c.valor_ajuda_centavos) : '—'}</TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">{c.whatsapp ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {permissoes.equipes && (<>
                      <Button size="icon-sm" variant="ghost" aria-label={`Editar ${c.nome}`} onClick={() => setEditando(c)}><Pencil /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${c.nome}`} onClick={() => setExcluir(c)}><Trash2 /></Button>
                    </>)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CaboModal registro={editando} municipios={municipios.dados} coordenadores={dados.dados.coordenadores} onFechar={() => setEditando(null)} onSalvo={(nome) => { setEditando(null); avisar({ type: 'success', title: 'Cabo eleitoral salvo', message: nome }); alterou(); }} />
      <ConfirmarModal aberto={excluir !== null} titulo="Excluir cabo eleitoral" mensagem={<>Excluir <strong>{excluir?.nome}</strong>?</>} rotuloConfirmar="Excluir" perigo onFechar={() => setExcluir(null)}
        onConfirmar={async () => {
          if (!excluir) return;
          try { await campanhaApi.excluirCabo(excluir.id); alterou(); } catch (e) { avisar({ type: 'error', title: 'Não foi possível excluir', message: erroApi(e).mensagem }); }
        }} />
    </Card>
  );
};

const CaboModal: React.FC<{ registro: CaboEleitoral | 'novo' | null; municipios: Parameters<typeof SelectMunicipio>[0]['municipios']; coordenadores: Coordenador[]; onFechar: () => void; onSalvo: (nome: string) => void }> = ({ registro, municipios, coordenadores, onFechar, onSalvo }) => {
  const [form, setForm] = useState(VAZIO);
  const [atual, setAtual] = useState<CaboEleitoral | 'novo' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
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
    if (form.codigo_ibge === null) { setErro('Escolha o município.'); return; }
    const valor = form.ajuda_custo ? paraCentavos(form.valor_ajuda || '0') : 0;
    if (valor === null) { setErro('Informe a ajuda de custo em reais (ex.: 300,00).'); return; }
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
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={registro !== null} onClose={onFechar} title={registro === 'novo' ? 'Novo cabo eleitoral' : 'Editar cabo eleitoral'} icon={<Megaphone className="h-5 w-5" />} size="xl"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button><Button type="submit" form="form-cabo" isLoading={salvando}>Salvar</Button></>}>
      <form id="form-cabo" onSubmit={salvar} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <Input label="Nome *" value={form.nome} onChange={texto('nome')} required maxLength={200} />
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
