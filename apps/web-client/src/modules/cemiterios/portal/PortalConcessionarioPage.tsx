import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, Button, Card, Textarea } from '@sysgov/ui';
import { FileDown, LogIn, Loader2, LogOut } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import { applyWhiteLabelTheme } from '@/config/theme';
import {
  erroApi, formatarCentavos, formatarData, portalConcessionarioApi, tokenPortal,
  type Concessao, type Concessionario, type Guia, type IdentidadeMunicipio, type Falecido, portalPublicoApi,
} from '../api';

const SLUG_KEY = 'sysgov_portal_cemiterios_slug';
type Aba = 'concessoes' | 'guias' | 'sepultados' | 'solicitar';

/** Painel do concessionário — login Gov.br, fora do shell autenticado (spec: portal › Painel do concessionário; RF-28). */
export const PortalConcessionarioPage: React.FC = () => {
  const { tenantSlug = '' } = useParams<{ tenantSlug: string }>();
  const api = portalConcessionarioApi(tenantSlug);

  const [identidade, setIdentidade] = useState<IdentidadeMunicipio | null>(null);
  const [titular, setTitular] = useState<(Concessionario & { documento: string }) | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>('concessoes');
  const [concessoes, setConcessoes] = useState<(Concessao & { jazigo: { codigo: string; cemiterio?: { nome: string } } })[]>([]);
  const [guias, setGuias] = useState<Guia[]>([]);
  const [sepultados, setSepultados] = useState<{ id: number; sepultado_em: string; falecido: Falecido; jazigo: { codigo: string } }[]>([]);
  const [solicitacao, setSolicitacao] = useState({ tipo: 'renovacao' as 'renovacao' | 'correcao_dados', concession_id: '', mensagem: '' });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    portalPublicoApi(tenantSlug).identidade().then((d) => {
      setIdentidade(d);
      applyWhiteLabelTheme(d.customPrimaryColor ?? undefined);
    }).catch(() => undefined);
  }, [tenantSlug]);

  useEffect(() => {
    if (!tokenPortal.ler()) {
      setCarregando(false);
      return;
    }
    api.me().then(setTitular).catch(() => tokenPortal.limpar()).finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug]);

  useEffect(() => {
    if (!titular) return;
    if (aba === 'concessoes') api.concessoes().then(setConcessoes).catch((e) => setErro(erroApi(e).mensagem));
    if (aba === 'guias') api.guias().then(setGuias).catch((e) => setErro(erroApi(e).mensagem));
    if (aba === 'sepultados') api.sepultados().then(setSepultados).catch((e) => setErro(erroApi(e).mensagem));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titular, aba]);

  const entrar = async () => {
    sessionStorage.setItem(SLUG_KEY, tenantSlug);
    const { url } = await api.iniciarGovBr();
    window.location.href = url;
  };

  const sair = async () => { await api.sair(); setTitular(null); };

  const enviarSolicitacao = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await api.solicitar({
        tipo: solicitacao.tipo,
        concession_id: solicitacao.concession_id ? Number(solicitacao.concession_id) : undefined,
        mensagem: solicitacao.mensagem,
      });
      setEnviado(true);
      setSolicitacao({ tipo: 'renovacao', concession_id: '', mensagem: '' });
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) {
    return <div className="flex min-h-screen items-center justify-center bg-gov-page"><Loader2 className="h-8 w-8 animate-spin text-gov-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-gov-page">
      <header className="border-b border-gov-border bg-white px-4 py-5 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {identidade?.customLogoUrl && <img src={identidade.customLogoUrl} alt="" className="h-10 w-10 object-contain" />}
            <div>
              <h1 className="text-lg font-bold text-gov-primary sm:text-xl">Portal do Concessionário</h1>
              <p className="text-sm text-gov-text-muted">{identidade?.portalSubtitle || identidade?.nome || ''}</p>
            </div>
          </div>
          {titular && <Button variant="ghost" size="sm" onClick={sair}><LogOut className="h-4 w-4" /> Sair</Button>}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-8">
        {!titular ? (
          <Card className="flex flex-col items-center gap-4 p-8 text-center">
            <p className="text-sm text-gov-text-secondary">Acesse com sua conta Gov.br para consultar concessões, guias e sepultados vinculados ao seu CPF.</p>
            <Button onClick={entrar}><LogIn className="h-4 w-4" /> Entrar com Gov.br</Button>
          </Card>
        ) : (
          <>
            <Card className="p-4"><p className="font-bold text-gov-text-secondary">Olá, {titular.nome}</p></Card>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <Tabs
              items={[
                { key: 'concessoes', label: 'Concessões' }, { key: 'guias', label: 'Guias' },
                { key: 'sepultados', label: 'Sepultados' }, { key: 'solicitar', label: 'Solicitar' },
              ]}
              value={aba}
              onChange={setAba}
            />

            {aba === 'concessoes' && (
              <div className="space-y-2">
                {concessoes.map((c) => (
                  <Card key={c.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-bold text-gov-text-secondary">Concessão {c.numero}</p>
                      <p className="text-xs text-gov-text-muted">{c.jazigo.cemiterio?.nome} — Jazigo {c.jazigo.codigo}</p>
                      <p className="font-mono tabular-nums text-xs text-gov-text-muted">Término: {formatarData(c.termino)}</p>
                    </div>
                    <Badge>{c.situacao}</Badge>
                  </Card>
                ))}
                {concessoes.length === 0 && <p className="text-sm text-gov-text-muted">Nenhuma concessão vinculada.</p>}
              </div>
            )}

            {aba === 'guias' && (
              <div className="space-y-2">
                {guias.map((g) => (
                  <Card key={g.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-bold text-gov-text-secondary">{g.servico} — {g.numero}</p>
                      <p className="font-mono tabular-nums text-xs text-gov-text-muted">Venc.: {formatarData(g.vencimento)} · {formatarCentavos(g.valor_centavos)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={g.situacao === 'paga' ? 'success' : g.vencida ? 'destructive' : 'outline'}>{g.situacao}</Badge>
                      <Button size="sm" variant="outline" onClick={() => api.pdfGuia(g)}><FileDown className="h-4 w-4" /></Button>
                      {g.vencida && g.situacao === 'emitida' && (
                        <Button size="sm" onClick={async () => { await api.segundaVia(g.id); setGuias(await api.guias()); }}>2ª via</Button>
                      )}
                    </div>
                  </Card>
                ))}
                {guias.length === 0 && <p className="text-sm text-gov-text-muted">Nenhuma guia.</p>}
              </div>
            )}

            {aba === 'sepultados' && (
              <div className="space-y-2">
                {sepultados.map((s) => (
                  <Card key={s.id} className="p-4">
                    <p className="font-bold text-gov-text-secondary">{s.falecido.nome}</p>
                    <p className="font-mono tabular-nums text-xs text-gov-text-muted">Jazigo {s.jazigo.codigo} — {formatarData(s.sepultado_em)}</p>
                  </Card>
                ))}
                {sepultados.length === 0 && <p className="text-sm text-gov-text-muted">Nenhum sepultado nos seus jazigos.</p>}
              </div>
            )}

            {aba === 'solicitar' && (
              <Card className="p-4">
                {enviado ? (
                  <p className="text-sm text-green-700">Solicitação enviada. A administração do cemitério irá analisá-la.</p>
                ) : (
                  <form onSubmit={enviarSolicitacao} className="space-y-3">
                    <div className="flex gap-2">
                      <Button type="button" variant={solicitacao.tipo === 'renovacao' ? 'primary' : 'outline'} size="sm" onClick={() => setSolicitacao((s) => ({ ...s, tipo: 'renovacao' }))}>Renovação</Button>
                      <Button type="button" variant={solicitacao.tipo === 'correcao_dados' ? 'primary' : 'outline'} size="sm" onClick={() => setSolicitacao((s) => ({ ...s, tipo: 'correcao_dados' }))}>Correção de dados</Button>
                    </div>
                    {solicitacao.tipo === 'renovacao' && (
                      <select
                        className="w-full rounded-lg border border-gov-border px-3 py-2 text-sm"
                        value={solicitacao.concession_id}
                        onChange={(e) => setSolicitacao((s) => ({ ...s, concession_id: e.target.value }))}
                        required
                      >
                        <option value="">Selecione a concessão…</option>
                        {concessoes.map((c) => <option key={c.id} value={c.id}>{c.numero} — Jazigo {c.jazigo.codigo}</option>)}
                      </select>
                    )}
                    <Textarea aria-label="Mensagem" placeholder="Descreva sua solicitação" required
                      value={solicitacao.mensagem} onChange={(e) => setSolicitacao((s) => ({ ...s, mensagem: e.target.value }))} />
                    <Button type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar solicitação'}</Button>
                  </form>
                )}
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default PortalConcessionarioPage;
