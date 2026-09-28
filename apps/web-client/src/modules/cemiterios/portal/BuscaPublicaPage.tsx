import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, Button, Card, Input, Modal } from '@sysgov/ui';
import { Loader2, MapPin, Search } from 'lucide-react';
import { applyWhiteLabelTheme } from '@/config/theme';
import { erroApi, portalPublicoApi, type IdentidadeMunicipio, type MapaPublico, type ResultadoPublico } from '../api';

/**
 * Busca pública de sepultamentos, sem login (spec: portal › Busca pública, Ver no Mapa; RF-25, RF-26).
 * Fora do shell autenticado — white-label do município, nunca CPF/causa da morte/estado do jazigo.
 */
export const BuscaPublicaPage: React.FC = () => {
  const { tenantSlug = '' } = useParams<{ tenantSlug: string }>();
  const api = portalPublicoApi(tenantSlug);

  const [identidade, setIdentidade] = useState<IdentidadeMunicipio | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState({ atual: 1, ultima: 1, total: 0 });
  const [resultados, setResultados] = useState<ResultadoPublico[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mapa, setMapa] = useState<{ carregando: boolean; dados: MapaPublico | null }>({ carregando: false, dados: null });

  useEffect(() => {
    api.identidade().then((d) => {
      setIdentidade(d);
      applyWhiteLabelTheme(d.customPrimaryColor ?? undefined);
    }).catch(() => setNaoEncontrado(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug]);

  const buscar = async (ev: React.FormEvent, ir = 1) => {
    ev.preventDefault();
    if (q.trim().length < 3) {
      setErro('Digite ao menos 3 caracteres.');
      return;
    }
    setBuscando(true);
    setErro(null);
    try {
      const resp = await api.buscar(q.trim(), ir);
      setResultados(resp.data);
      setPagina({ atual: resp.meta.pagina, ultima: resp.meta.ultima_pagina, total: resp.meta.total });
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setBuscando(false);
    }
  };

  const verNoMapa = async (r: ResultadoPublico) => {
    if (!r.jazigo) return;
    setMapa({ carregando: true, dados: null });
    try {
      const dados = await api.mapa(r.jazigo, r.cemiterio_codigo ?? undefined);
      setMapa({ carregando: false, dados });
    } catch (e) {
      setErro(erroApi(e).mensagem);
      setMapa({ carregando: false, dados: null });
    }
  };

  if (naoEncontrado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gov-page p-6">
        <Card className="max-w-md p-6 text-center">
          <p className="font-bold text-gov-text-secondary">Portal não disponível para este município.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gov-page">
      <header className="border-b border-gov-border bg-white px-4 py-5 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          {identidade?.customLogoUrl && <img src={identidade.customLogoUrl} alt="" className="h-10 w-10 object-contain" />}
          <div>
            <h1 className="text-lg font-bold text-gov-primary sm:text-xl">{identidade?.portalTitle || 'Portal dos Cemitérios Municipais'}</h1>
            <p className="text-sm text-gov-text-muted">{identidade?.portalSubtitle || identidade?.nome || ''}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-8">
        <Card className="p-4 sm:p-6">
          <form onSubmit={(e) => buscar(e, 1)} className="flex flex-col gap-3 sm:flex-row">
            <Input
              aria-label="Nome do falecido"
              placeholder="Nome do falecido (mínimo 3 letras)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={buscando}>
              {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar
            </Button>
          </form>
          {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
        </Card>

        {resultados.length > 0 && (
          <div className="space-y-2">
            {resultados.map((r, i) => (
              <Card key={i} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-gov-text-secondary">{r.nome}</p>
                  <p className="font-mono tabular-nums text-xs text-gov-text-muted">Falecimento: {r.falecimento?.split('-').reverse().join('/')}</p>
                  {r.cemiterio && <p className="text-xs text-gov-text-muted">{r.cemiterio}{r.setor ? ` — Quadra ${r.setor}` : ''}{r.jazigo ? ` — Jazigo ${r.jazigo}` : ''}</p>}
                </div>
                {r.jazigo && (
                  <Button variant="outline" size="sm" onClick={() => verNoMapa(r)}>
                    <MapPin className="h-4 w-4" /> Ver no mapa
                  </Button>
                )}
              </Card>
            ))}
            {pagina.ultima > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" disabled={pagina.atual <= 1} onClick={(e) => buscar(e, pagina.atual - 1)}>Anterior</Button>
                <span className="font-mono text-xs tabular-nums text-gov-text-muted">{pagina.atual} / {pagina.ultima} ({pagina.total})</span>
                <Button variant="outline" size="sm" disabled={pagina.atual >= pagina.ultima} onClick={(e) => buscar(e, pagina.atual + 1)}>Próxima</Button>
              </div>
            )}
          </div>
        )}

        {!identidade?.hideProviderSignature && (
          <p className="pt-4 text-center text-xs text-gov-text-muted">Portal SYSGOV — SYSTRAT</p>
        )}
      </main>

      <Modal open={mapa.dados !== null || mapa.carregando} onClose={() => setMapa({ carregando: false, dados: null })} title="Localização no cemitério" size="md">
        {mapa.carregando && <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-gov-primary" /></div>}
        {mapa.dados && (
          <div className="space-y-3">
            <div>
              <Badge>{mapa.dados.jazigo.setor ? `Quadra ${mapa.dados.jazigo.setor}` : ''} Jazigo {mapa.dados.jazigo.codigo}</Badge>
            </div>
            <p className="text-sm text-gov-text-secondary">{mapa.dados.cemiterio.nome}</p>
            {mapa.dados.cemiterio.endereco && <p className="text-sm text-gov-text-muted">{mapa.dados.cemiterio.endereco}</p>}
            {mapa.dados.como_chegar && (
              <Button asChild>
                <a href={mapa.dados.como_chegar} target="_blank" rel="noreferrer">Como chegar</a>
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BuscaPublicaPage;
