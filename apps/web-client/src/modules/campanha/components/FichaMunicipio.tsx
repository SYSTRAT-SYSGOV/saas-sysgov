import React, { useEffect, useState } from 'react';
import { Landmark, MapPinned, Save } from 'lucide-react';
import { Button, Input, Modal, Select, Skeleton, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@sysgov/ui';
import { erroApi } from '../../escola/api';
import type { Toast } from '../../escola/components/AdminModal';
import { campanhaApi, type CampanhaAtual, type Coordenador, type FichaMunicipio, type Influencia, type RelacaoPrefeito, type Situacao } from '../api';
import { ROTULO_RELACAO, ROTULO_SITUACAO, SITUACOES, VARIANTE_RELACAO, formatarNumero } from '../formato';
import type { Permissoes } from '../ModuloCampanhaMain';

interface Props {
  ibge: number | null;
  campanha: CampanhaAtual;
  permissoes: Permissoes;
  avisar: Toast;
  onFechar: () => void;
  onSalvo: () => void;
}

const Dado: React.FC<{ rotulo: string; valor: React.ReactNode }> = ({ rotulo, valor }) => (
  <div><p className="text-xs text-muted-foreground">{rotulo}</p><p className="font-medium">{valor}</p></div>
);

/** Ficha do município na campanha: dados públicos (só leitura), dados da campanha, prefeito, vereadores e cabos. */
export const FichaMunicipioModal: React.FC<Props> = ({ ibge, campanha, permissoes, avisar, onFechar, onSalvo }) => {
  const [ficha, setFicha] = useState<FichaMunicipio | null>(null);
  const [coordenadores, setCoordenadores] = useState<Coordenador[]>([]);
  const [form, setForm] = useState({ situacao: 'sem_atuacao' as Situacao, meta_votos: '0', votos_anterior: '0', coordenador_id: null as number | null, potencial: '', historico: '', observacoes: '' });
  const [prefeito, setPrefeito] = useState({ relacao: 'sem_informacao' as RelacaoPrefeito, influencia: 'media' as Influencia, whatsapp: '' });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (ibge === null) return;
    let cancelado = false;
    setFicha(null);
    setErro(null);
    Promise.all([campanhaApi.ficha(ibge), campanhaApi.coordenadores()])
      .then(([f, c]) => {
        if (cancelado) return;
        setFicha(f);
        setCoordenadores(c);
        setForm({ situacao: f.situacao, meta_votos: String(f.meta_votos), votos_anterior: String(f.votos_anterior), coordenador_id: f.coordenador?.id ?? null, potencial: f.potencial ?? '', historico: f.historico ?? '', observacoes: f.observacoes ?? '' });
        setPrefeito({ relacao: f.prefeito.relacao, influencia: f.prefeito.influencia ?? 'media', whatsapp: f.prefeito.contato?.whatsapp ?? '' });
      })
      .catch((e) => !cancelado && setErro(erroApi(e).mensagem));
    return () => { cancelado = true; };
  }, [ibge]);

  const salvar = async () => {
    if (ibge === null || !ficha) return;
    setSalvando(true);
    setErro(null);
    try {
      if (permissoes.municipios) {
        await campanhaApi.atualizarMunicipio(ibge, {
          situacao: form.situacao, meta_votos: Number(form.meta_votos) || 0, votos_anterior: Number(form.votos_anterior) || 0,
          coordenador_id: form.coordenador_id, potencial: form.potencial || null, historico: form.historico || null, observacoes: form.observacoes || null,
        });
      }
      const mudouPrefeito = prefeito.relacao !== ficha.prefeito.relacao
        || (prefeito.relacao !== 'sem_informacao' && (prefeito.influencia !== (ficha.prefeito.influencia ?? 'media') || prefeito.whatsapp !== (ficha.prefeito.contato?.whatsapp ?? '')));
      if (permissoes.equipes && mudouPrefeito) {
        if (prefeito.relacao === 'sem_informacao') await campanhaApi.excluirPrefeito(ibge);
        else await campanhaApi.salvarPrefeito(ibge, { relacao: prefeito.relacao, influencia: prefeito.influencia, whatsapp: prefeito.whatsapp || null });
      }
      avisar({ type: 'success', title: 'Município atualizado', message: ficha.nome });
      onSalvo();
      onFechar();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  const pode = permissoes.municipios || permissoes.equipes;
  const p = ficha?.publico;

  return (
    <Modal
      open={ibge !== null}
      onClose={onFechar}
      title={ficha ? `${ficha.nome} — ${campanha.uf}` : 'Município'}
      icon={<MapPinned className="h-5 w-5" />}
      size="2xl"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Fechar</Button>{pode && <Button leftIcon={<Save className="h-4 w-4" />} onClick={() => void salvar()} isLoading={salvando} disabled={!ficha}>Salvar</Button>}</>}
    >
      {!ficha ? (erro ? <p className="text-sm text-destructive" role="alert">{erro}</p> : <Skeleton className="h-80 w-full" />) : (
        <div className="space-y-5">
          <section className="grid gap-3 rounded-md border border-border p-3 text-sm sm:grid-cols-4">
            <Dado rotulo="Código IBGE" valor={<span className="font-mono tabular-nums">{ficha.codigo_ibge}</span>} />
            <Dado rotulo="Região intermediária" valor={ficha.regiao_intermediaria ?? '—'} />
            <Dado rotulo={`População${p?.ano_populacao ? ` (${p.ano_populacao})` : ''}`} valor={<span className="font-mono tabular-nums">{formatarNumero(p?.populacao)}</span>} />
            <Dado rotulo={`Eleitores${p?.ano_eleitorado ? ` (${p.ano_eleitorado})` : ''}`} valor={<span className="font-mono tabular-nums">{formatarNumero(p?.eleitores)}</span>} />
            <Dado rotulo="Zonas eleitorais" valor={<span className="font-mono tabular-nums">{formatarNumero(p?.zonas)}</span>} />
            <Dado rotulo="Seções eleitorais" valor={<span className="font-mono tabular-nums">{formatarNumero(p?.secoes)}</span>} />
            <Dado rotulo="Mesorregião" valor={p?.mesorregiao ?? '—'} />
            <Dado rotulo="Região imediata" valor={ficha.regiao_imediata ?? '—'} />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Campanha no município</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <Select label="Situação" value={form.situacao} onChange={(v) => setForm((f) => ({ ...f, situacao: v as Situacao }))} options={SITUACOES.map((s) => ({ value: s, label: ROTULO_SITUACAO[s] }))} disabled={!permissoes.municipios} />
              <Input label="Meta de votos" type="number" min={0} value={form.meta_votos} onChange={(e) => setForm((f) => ({ ...f, meta_votos: e.target.value }))} disabled={!permissoes.municipios} className="font-mono tabular-nums" />
              <Input label="Votos na eleição anterior" type="number" min={0} value={form.votos_anterior} onChange={(e) => setForm((f) => ({ ...f, votos_anterior: e.target.value }))} disabled={!permissoes.municipios} className="font-mono tabular-nums" />
              <Select label="Coordenador" value={form.coordenador_id ?? 'nenhum'} onChange={(v) => setForm((f) => ({ ...f, coordenador_id: v === 'nenhum' ? null : Number(v) }))} options={[{ value: 'nenhum', label: 'Sem coordenador' }, ...coordenadores.map((c) => ({ value: c.id, label: c.nome }))]} disabled={!permissoes.municipios} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-sm font-medium">Potencial eleitoral<Textarea rows={3} value={form.potencial} onChange={(e) => setForm((f) => ({ ...f, potencial: e.target.value }))} disabled={!permissoes.municipios} maxLength={5000} /></label>
              <label className="space-y-1 text-sm font-medium">Histórico político e eleitoral<Textarea rows={3} value={form.historico} onChange={(e) => setForm((f) => ({ ...f, historico: e.target.value }))} disabled={!permissoes.municipios} maxLength={10000} /></label>
              <label className="space-y-1 text-sm font-medium">Observações<Textarea rows={3} value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} disabled={!permissoes.municipios} maxLength={10000} /></label>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Landmark className="h-4 w-4" />Executivo municipal</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <Dado rotulo="Prefeito" valor={<>{ficha.prefeito.nome ?? '—'}{ficha.prefeito.partido ? ` (${ficha.prefeito.partido})` : ''}</>} />
              <Dado rotulo="Vice" valor={ficha.prefeito.vice ?? '—'} />
              <Select label="Relação com a campanha" value={prefeito.relacao} onChange={(v) => setPrefeito((x) => ({ ...x, relacao: v as RelacaoPrefeito }))} options={(Object.keys(ROTULO_RELACAO) as RelacaoPrefeito[]).map((r) => ({ value: r, label: ROTULO_RELACAO[r] }))} disabled={!permissoes.equipes} />
              <Select label="Influência" value={prefeito.influencia} onChange={(v) => setPrefeito((x) => ({ ...x, influencia: v as Influencia }))} options={[{ value: 'alta', label: 'Alta' }, { value: 'media', label: 'Média' }, { value: 'baixa', label: 'Baixa' }]} disabled={!permissoes.equipes || prefeito.relacao === 'sem_informacao'} />
            </div>
            <Input label="WhatsApp do prefeito / gabinete" value={prefeito.whatsapp} onChange={(e) => setPrefeito((x) => ({ ...x, whatsapp: e.target.value }))} disabled={!permissoes.equipes || prefeito.relacao === 'sem_informacao'} className="font-mono tabular-nums sm:w-72" />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Vereadores (<span className="font-mono tabular-nums">{ficha.vereadores.length}</span>)</h3>
              {ficha.vereadores.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum vereador cadastrado neste município.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Partido</TableHead><TableHead className="text-right">Votos est.</TableHead><TableHead>Aliado</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {ficha.vereadores.map((v) => (
                      <TableRow key={v.id}><TableCell>{v.nome}</TableCell><TableCell>{v.partido ?? '—'}</TableCell><TableCell className="text-right font-mono tabular-nums">{formatarNumero(v.votos_estimados)}</TableCell><TableCell>{v.aliado ? <StatusChip label="Aliado" variant="success" /> : '—'}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Cabos eleitorais (<span className="font-mono tabular-nums">{ficha.cabos_eleitorais.length}</span>)</h3>
              {ficha.cabos_eleitorais.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum cabo eleitoral neste município.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Bairro</TableHead><TableHead className="text-right">Votos est.</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {ficha.cabos_eleitorais.map((c) => (
                      <TableRow key={c.id}><TableCell>{c.nome}</TableCell><TableCell>{c.bairro ?? '—'}</TableCell><TableCell className="text-right font-mono tabular-nums">{formatarNumero(c.votos_estimados)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </section>
          {ficha.prefeito.relacao !== 'sem_informacao' && <p className="text-xs text-muted-foreground">Relação atual: <StatusChip label={ROTULO_RELACAO[ficha.prefeito.relacao]} variant={VARIANTE_RELACAO[ficha.prefeito.relacao]} /></p>}
          {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
        </div>
      )}
    </Modal>
  );
};
