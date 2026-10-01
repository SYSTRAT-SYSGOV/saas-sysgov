import React, { useEffect, useState } from 'react';
import { Card, CardContent, Button, Badge } from '@sysgov/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScreenState } from '@/components/ui/ScreenState';
import { EmptyState } from '@/components/ui/EmptyState';
import { requerimentosApi } from '../api';
import type { Notificacao } from '../api';
import { Bell, CheckCircle2, Mail, Globe, RefreshCw } from 'lucide-react';

export const NotificacoesView: React.FC = () => {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await requerimentosApi.getNotificacoes({ per_page: 50 });
      setNotificacoes(res.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const handleMarcarLida = async (id: number) => {
    try {
      await requerimentosApi.marcarLida(id);
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true, lida_em: new Date().toISOString() } : n)),
      );
    } catch { /* ignore */ }
  };

  const handleMarcarTodas = async () => {
    try {
      await requerimentosApi.marcarTodasLidas();
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true, lida_em: new Date().toISOString() })));
    } catch { /* ignore */ }
  };

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  if (loading) return <ScreenState variant="loading" title="Carregando notificações..." />;
  if (error) return <ScreenState variant="error" title="Erro" message={error} onRetry={carregar} />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Bell className="h-6 w-6" />}
        title="Notificações"
        subtitle={naoLidas > 0 ? `${naoLidas} não lida(s)` : 'Todas as notificações foram lidas'}
        actions={
          naoLidas > 0 ? (
            <Button variant="outline" size="sm" onClick={handleMarcarTodas}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Marcar todas como lidas
            </Button>
          ) : undefined
        }
      />

      {notificacoes.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-10 w-10" />}
          title="Nenhuma notificação"
          description="Você será notificado sobre mudanças nas suas proposições."
        />
      ) : (
        <div className="space-y-2">
          {notificacoes.map((n) => (
            <Card key={n.id} className={n.lida ? 'opacity-60' : 'border-l-2 border-l-primary'}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={n.lida ? 'default' : 'info'} className="text-xs">
                        {n.canal === 'email' ? <Mail className="h-3 w-3 mr-1" /> : <Globe className="h-3 w-3 mr-1" />}
                        {n.canal}
                      </Badge>
                      {n.proposicao && (
                        <Badge variant="default" className="text-xs font-mono">{n.proposicao.numero}</Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold mt-1">{n.titulo}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.mensagem}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1 font-mono">
                      {new Date(n.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {!n.lida && (
                    <Button variant="ghost" size="sm" onClick={() => handleMarcarLida(n.id)}>
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};