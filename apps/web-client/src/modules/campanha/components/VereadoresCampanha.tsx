import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, Input, Modal, Select, Skeleton, StatusChip, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { useCarga } from '../../escola/useCarga';
import { campanhaApi, type Vereador, type VereadorEleito } from '../api';
import { formatarNumero } from '../formato';
import type { PropsAba } from '../ModuloCampanhaMain';
import { SelectMunicipio, nomeDoMunicipio, useMunicipiosDaCampanha, vazioParaNulo } from './Comuns';

const VAZIO = {
  codigo_ibge: null as number | null, ref_mandatario_id: null as number | null, nome: '', partido: '', numero: '', mandato: '', telefone: '', whatsapp: '', email: '',
  instagram: '', facebook: '', aliado: false, votos_estimados: '0', dobradinha: '', apoio_presidente: '', apoio_governador: '', apoio_senador: '', apoio_dep_federal: '', apoio_dep_estadual: '', observacoes: '',
};

/** Vereadores por município, com sugestão dos eleitos do TSE (spec: Prefeitos e vereadores). */
export const VereadoresCampanha: React.FC<PropsAba> = ({ campanha, permissoes, avisar, alterou, versao }) => {
  const lista = useCarga(() => campanhaApi.vereadores(), [campanha.id, versao]);
  const municipios = useMunicipiosDaCampanha(campanha.id);
  const [municipio, setMunicipio] = useState<number | null>(null);
  const [soAliados, setSoAliados] = useState(false);
  const [editando, setEditando] = useState<Vereador | 'novo' | null>(null);
  const [excluir, setExcluir] = useState<Vereador | null>(null);
  const visiveis = useMemo(() => (lista.dados ?? []).filter((v) => (municipio === null || v.codigo_ibge === municipio) && (!soAliados || v.aliado)), [lista.dados, municipio, soAliados]);

  if (lista.erro) return <AlertCard priority="danger" title="Não foi possível carregar os vereadores" description={lista.erro} actionLabel="Tentar novamente" onAction={() => void lista.recarregar()} />;
  if (!lista.dados) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="grid items-end gap-2 md:grid-cols-[16rem_auto_1fr]">
          <SelectMunicipio label="Município" municipios={municipios.dados} value={municipio} onChange={setMunicipio} opcional />
          <div className="flex items-center gap-2 pb-2"><Switch checked={soAliados} onCheckedChange={setSoAliados} label="Somente aliados" /><span className="text-sm">Somente aliados</span></div>
          {permissoes.equipes && <div className="text-right"><Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditando('novo')}>Novo vereador</Button></div>}
        </div>
        {visiveis.length === 0 ? <EmptyState icon={<Users className="h-8 w-8" />} title="Nenhum vereador" description={lista.dados.length === 0 ? 'Cadastre os vereadores dos municípios (os eleitos aparecem como sugestão).' : 'Ajuste os filtros.'} /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Município</TableHead><TableHead>Partido / Nº</TableHead><TableHead className="text-right">Votos est.</TableHead><TableHead>Dobradinha</TableHead><TableHead>Aliado</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {visiveis.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.nome}{v.ref_mandatario_id && <p className="text-xs text-muted-foreground">eleito (TSE)</p>}</TableCell>
                  <TableCell className="text-sm">{nomeDoMunicipio(municipios.dados, v.codigo_ibge)}</TableCell>
                  <TableCell className="text-sm">{v.partido ?? '—'}{v.numero ? <span className="font-mono tabular-nums"> · {v.numero}</span> : null}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatarNumero(v.votos_estimados)}</TableCell>
                  <TableCell className="text-sm">{v.dobradinha ?? '—'}</TableCell>
                  <TableCell>{v.aliado ? <StatusChip label="Aliado" variant="success" /> : <StatusChip label="Não" variant="neutral" />}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {permissoes.equipes && (<>
                      <Button size="icon-sm" variant="ghost" aria-label={`Editar ${v.nome}`} onClick={() => setEditando(v)}><Pencil /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${v.nome}`} onClick={() => setExcluir(v)}><Trash2 /></Button>
                    </>)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <VereadorModal registro={editando} municipios={municipios.dados} onFechar={() => setEditando(null)} onSalvo={(nome) => { setEditando(null); avisar({ type: 'success', title: 'Vereador salvo', message: nome }); alterou(); }} />
      <ConfirmarModal aberto={excluir !== null} titulo="Excluir vereador" mensagem={<>Excluir <strong>{excluir?.nome}</strong>?</>} rotuloConfirmar="Excluir" perigo onFechar={() => setExcluir(null)}
        onConfirmar={async () => {
          if (!excluir) return;
          try { await campanhaApi.excluirVereador(excluir.id); alterou(); } catch (e) { avisar({ type: 'error', title: 'Não foi possível excluir', message: erroApi(e).mensagem }); }
        }} />
    </Card>
  );
};

const VereadorModal: React.FC<{ registro: Vereador | 'novo' | null; municipios: Parameters<typeof SelectMunicipio>[0]['municipios']; onFechar: () => void; onSalvo: (nome: string) => void }> = ({ registro, municipios, onFechar, onSalvo }) => {
  const [form, setForm] = useState(VAZIO);
  const [atual, setAtual] = useState<Vereador | 'novo' | null>(null);
  const [eleitos, setEleitos] = useState<VereadorEleito[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  if (registro !== atual) {
    setAtual(registro);
    setForm(registro && registro !== 'novo'
      ? { ...VAZIO, ...Object.fromEntries(Object.entries(registro).map(([k, v]) => [k, v === null ? '' : v])), codigo_ibge: registro.codigo_ibge, ref_mandatario_id: registro.ref_mandatario_id, votos_estimados: String(registro.votos_estimados) } as typeof VAZIO
      : VAZIO);
    setErro(null);
  }

  // Eleitos do município escolhido (base pública) para pré-preencher.
  useEffect(() => {
    setEleitos([]);
    if (form.codigo_ibge === null || registro === null) return;
    let cancelado = false;
    campanhaApi.ficha(form.codigo_ibge).then((f) => !cancelado && setEleitos(f.vereadores_eleitos)).catch(() => undefined);
    return () => { cancelado = true; };
  }, [form.codigo_ibge, registro]);

  const texto = (campo: keyof typeof VAZIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const escolherEleito = (id: number | null) => {
    const eleito = eleitos.find((e) => e.id === id);
    setForm((f) => ({ ...f, ref_mandatario_id: id, ...(eleito ? { nome: eleito.nome_urna ?? eleito.nome, partido: eleito.partido ?? '', numero: eleito.numero ?? '', mandato: `Eleito em ${eleito.ano_eleicao}` } : {}) }));
  };

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (form.codigo_ibge === null) { setErro('Escolha o município.'); return; }
    setSalvando(true);
    setErro(null);
    try {
      const salvo = await campanhaApi.salvarVereador(registro && registro !== 'novo' ? registro.id : null, {
        codigo_ibge: form.codigo_ibge, ref_mandatario_id: form.ref_mandatario_id, nome: form.nome.trim() || undefined, partido: vazioParaNulo(form.partido), numero: vazioParaNulo(form.numero),
        mandato: vazioParaNulo(form.mandato), telefone: vazioParaNulo(form.telefone), whatsapp: vazioParaNulo(form.whatsapp), email: vazioParaNulo(form.email), instagram: vazioParaNulo(form.instagram),
        facebook: vazioParaNulo(form.facebook), aliado: form.aliado, votos_estimados: Number(form.votos_estimados) || 0, dobradinha: vazioParaNulo(form.dobradinha),
        apoio_presidente: vazioParaNulo(form.apoio_presidente), apoio_governador: vazioParaNulo(form.apoio_governador), apoio_senador: vazioParaNulo(form.apoio_senador),
        apoio_dep_federal: vazioParaNulo(form.apoio_dep_federal), apoio_dep_estadual: vazioParaNulo(form.apoio_dep_estadual), observacoes: vazioParaNulo(form.observacoes),
      });
      onSalvo(salvo.nome);
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={registro !== null} onClose={onFechar} title={registro === 'novo' ? 'Novo vereador' : 'Editar vereador'} icon={<Users className="h-5 w-5" />} size="xl"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button><Button type="submit" form="form-vereador" isLoading={salvando}>Salvar</Button></>}>
      <form id="form-vereador" onSubmit={salvar} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectMunicipio label="Município *" municipios={municipios} value={form.codigo_ibge} onChange={(v) => setForm((f) => ({ ...f, codigo_ibge: v, ref_mandatario_id: null }))} />
          <Select label="Vereador eleito (TSE)" value={form.ref_mandatario_id ?? 'nenhum'} disabled={eleitos.length === 0} onChange={(v) => escolherEleito(v === 'nenhum' ? null : Number(v))}
            options={[{ value: 'nenhum', label: eleitos.length ? 'Não é eleito / digitar' : 'Escolha o município' }, ...eleitos.map((e) => ({ value: e.id, label: `${e.nome_urna ?? e.nome} (${e.partido ?? '—'})` }))]} />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="Nome *" value={form.nome} onChange={texto('nome')} maxLength={200} />
          <Input label="Partido" value={form.partido} onChange={texto('partido')} maxLength={30} />
          <Input label="Número" value={form.numero} onChange={texto('numero')} maxLength={10} className="font-mono tabular-nums" />
          <Input label="Mandato" value={form.mandato} onChange={texto('mandato')} maxLength={100} />
        </div>
        <div className="grid items-end gap-3 sm:grid-cols-4">
          <div className="flex items-center gap-2 pb-2"><Switch checked={form.aliado} onCheckedChange={(v) => setForm((f) => ({ ...f, aliado: v }))} label="Aliado da campanha" /><span className="text-sm">Aliado da campanha</span></div>
          <Input label="Votos estimados" type="number" min={0} value={form.votos_estimados} onChange={texto('votos_estimados')} className="font-mono tabular-nums" />
          <Input label="Dobradinha" value={form.dobradinha} onChange={texto('dobradinha')} maxLength={255} />
          <Input label="WhatsApp" value={form.whatsapp} onChange={texto('whatsapp')} maxLength={20} className="font-mono tabular-nums" />
        </div>
        <p className="text-sm font-semibold">Apoios declarados</p>
        <div className="grid gap-3 sm:grid-cols-5">
          <Input label="Presidente" value={form.apoio_presidente} onChange={texto('apoio_presidente')} maxLength={200} />
          <Input label="Governador" value={form.apoio_governador} onChange={texto('apoio_governador')} maxLength={200} />
          <Input label="Senador" value={form.apoio_senador} onChange={texto('apoio_senador')} maxLength={200} />
          <Input label="Dep. federal" value={form.apoio_dep_federal} onChange={texto('apoio_dep_federal')} maxLength={200} />
          <Input label="Dep. estadual" value={form.apoio_dep_estadual} onChange={texto('apoio_dep_estadual')} maxLength={200} />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="Telefone" value={form.telefone} onChange={texto('telefone')} maxLength={20} className="font-mono tabular-nums" />
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
