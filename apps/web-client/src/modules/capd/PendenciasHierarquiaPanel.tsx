import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, Button, Badge, Input, Select, Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@sysgov/ui';
import { Field, EmptyState, StatusChip } from '@/components/ui';
import { AlertTriangle, RefreshCw, UserCheck } from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiPendenciaHierarquia } from '@sysgov/sdk';

const api = new SysgovApi();

const TIPO_LABEL: Record<string, string> = {
  sem_superior: 'Sem superior resolvido',
  afastamento_sem_substituto: 'Afastamento sem substituto',
  topo_sem_config: 'Topo da hierarquia sem configuração',
};

export const PendenciasHierarquiaPanel: React.FC = () => {
  const [pendencias, setPendencias] = useState<ApiPendenciaHierarquia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('aberta');
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [pendenciaSelecionada, setPendenciaSelecionada] = useState<ApiPendenciaHierarquia | null>(null);
  const [avaliadorId, setAvaliadorId] = useState<string>('');
  const [resolvendo, setResolvendo] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.capd.listPendenciasHierarquia({ status: filtroStatus || undefined, per_page: 50 });
      setPendencias(res.data);
    } finally {
      setLoading(false);
    }
  }, [filtroStatus]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirResolucao = (pendencia: ApiPendenciaHierarquia) => {
    setPendenciaSelecionada(pendencia);
    setAvaliadorId('');
    setErro(null);
    setModalAberto(true);
  };

  const resolver = async () => {
    if (!pendenciaSelecionada || !avaliadorId) return;
    setResolvendo(true);
    setErro(null);
    try {
      await api.capd.resolverPendenciaHierarquia(pendenciaSelecionada.id, Number(avaliadorId));
      setModalAberto(false);
      await carregar();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível resolver a pendência.');
    } finally {
      setResolvendo(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Pendências de Hierarquia (DRH)</h3>
          <p className="text-xs text-muted-foreground">
            Casos em que a resolução automática do avaliador não foi possível — designe manualmente quem avalia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filtroStatus}
            onChange={setFiltroStatus}
            options={[
              { value: 'aberta', label: 'Abertas' },
              { value: 'resolvida', label: 'Resolvidas' },
              { value: '', label: 'Todas' },
            ]}
          />
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Servidor</TableHead>
                <TableHead>Ciclo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendencias.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12">
                    <EmptyState
                      icon={<AlertTriangle className="h-8 w-8 text-muted-foreground" />}
                      title="Nenhuma pendência encontrada"
                      description="Pendências aparecem aqui quando o sistema não consegue resolver o avaliador automaticamente."
                    />
                  </TableCell>
                </TableRow>
              )}
              {pendencias.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.servidor?.nome_completo ?? `#${p.servidor_id}`}</div>
                    {p.servidor?.matricula && (
                      <div className="font-mono text-xs text-muted-foreground">{p.servidor.matricula}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{p.ciclo ? `${p.ciclo.nome} (${p.ciclo.ano_referencia})` : '—'}</TableCell>
                  <TableCell className="text-xs">{TIPO_LABEL[p.tipo_pendencia] ?? p.tipo_pendencia}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={p.motivo}>{p.motivo}</TableCell>
                  <TableCell>
                    <StatusChip label={p.status === 'aberta' ? 'Aberta' : 'Resolvida'} variant={p.status === 'aberta' ? 'warning' : 'success'} />
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status === 'aberta' && (
                      <Button variant="outline" size="sm" onClick={() => abrirResolucao(p)}>
                        <UserCheck className="h-4 w-4 mr-1.5" />
                        Resolver
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {modalAberto && pendenciaSelecionada && (
        <Modal
          open={modalAberto}
          onClose={() => setModalAberto(false)}
          title="Designar Avaliador Manualmente"
          size="sm"
        >
          <div className="space-y-4">
            {erro && <div className="text-sm text-destructive">{erro}</div>}

            <div className="text-sm">
              <span className="text-muted-foreground">Servidor: </span>
              <span className="font-medium">{pendenciaSelecionada.servidor?.nome_completo ?? `#${pendenciaSelecionada.servidor_id}`}</span>
            </div>
            <div className="text-xs text-muted-foreground">{pendenciaSelecionada.motivo}</div>

            <Field label="ID do usuário avaliador designado">
              <Input
                type="number"
                value={avaliadorId}
                onChange={(e) => setAvaliadorId(e.target.value)}
                placeholder="Ex.: 42"
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button onClick={resolver} disabled={resolvendo || !avaliadorId}>
                {resolvendo ? 'Resolvendo...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
