import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, Card, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { ScreenState, StatusChip } from '@/components/ui';
import { sysgovApi, type Envio, type SituacaoEnvio } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { ErroFormulario } from './ErroFormulario';
import { SITUACAO_ENVIO, formatarDataHora, formatarTipoEnvio } from '../utils/formatos';

const POR_PAGINA = 25;

const FILTROS_SITUACAO: { value: SituacaoEnvio | 'todas'; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'pendente', label: SITUACAO_ENVIO.pendente.label },
  { value: 'enviado', label: SITUACAO_ENVIO.enviado.label },
  { value: 'falhou', label: SITUACAO_ENVIO.falhou.label },
  { value: 'ignorado', label: SITUACAO_ENVIO.ignorado.label },
];

/** Aba "Envios de e-mail" da GestaoCursosPage (tarefa 6.6, design D2): lista os envios do Outbox do ponto de vista do órgão, com reenvio do que falhou. */
export const EnviosTab: React.FC = () => {
  const [situacao, setSituacao] = useState<SituacaoEnvio | 'todas'>('todas');
  const [pagina, setPagina] = useState(1);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [reenviandoId, setReenviandoId] = useState<number | null>(null);
  const [erroReenvio, setErroReenvio] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const r = await sysgovApi.cursos.listarEnvios({ ...(situacao !== 'todas' ? { situacao } : {}), pagina, por_pagina: POR_PAGINA });
      setEnvios(r.data);
      setTotalPaginas(r.last_page);
      setTotal(r.total);
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar os envios.'));
    } finally {
      setCarregando(false);
    }
  }, [situacao, pagina]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtrar = (v: SituacaoEnvio | 'todas') => {
    setSituacao(v);
    setPagina(1);
  };

  const reenviar = async (envio: Envio) => {
    setReenviandoId(envio.id);
    setErroReenvio(null);
    try {
      await sysgovApi.cursos.reenviarEnvio(envio.id);
      await carregar();
    } catch (e) {
      setErroReenvio(getApiErrorMessage(e, 'Não foi possível reenviar.'));
    } finally {
      setReenviandoId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Select label="Situação" value={situacao} onChange={(v) => filtrar(v as SituacaoEnvio | 'todas')} options={FILTROS_SITUACAO} />
      </Card>

      <ErroFormulario mensagem={erroReenvio} />

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-foreground">
          Envios <span className="font-mono tabular-nums text-muted-foreground">({total})</span>
        </h2>

        {carregando ? (
          <ScreenState type="loading" title="Carregando envios..." />
        ) : erro ? (
          <ScreenState type="error" title="Erro ao carregar" description={erro} actionLabel="Tentar novamente" onAction={carregar} />
        ) : envios.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum envio encontrado para o filtro selecionado.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Tentativas</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Enviado em</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {envios.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{formatarTipoEnvio(e.tipo)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.destinatario ?? '—'}</TableCell>
                    <TableCell>
                      <StatusChip label={SITUACAO_ENVIO[e.situacao].label} variant={SITUACAO_ENVIO[e.situacao].variant} />
                      {e.situacao === 'falhou' && e.erro && <p className="mt-1 text-xs text-status-danger">{e.erro}</p>}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">{e.tentativas}</TableCell>
                    <TableCell className="font-mono tabular-nums">{formatarDataHora(e.criado_em)}</TableCell>
                    <TableCell className="font-mono tabular-nums">{e.enviado_em ? formatarDataHora(e.enviado_em) : '—'}</TableCell>
                    <TableCell>
                      {e.situacao === 'falhou' && (
                        <Button size="sm" variant="outline" isLoading={reenviandoId === e.id} onClick={() => void reenviar(e)}>
                          <RefreshCw className="h-3.5 w-3.5" /> Reenviar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button size="sm" variant="outline" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                  Anterior
                </Button>
                <span className="font-mono text-sm tabular-nums text-muted-foreground">
                  Página {pagina} de {totalPaginas}
                </span>
                <Button size="sm" variant="outline" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default EnviosTab;
