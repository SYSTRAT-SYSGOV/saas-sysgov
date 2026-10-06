import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, Button, Badge } from '@sysgov/ui';
import { ScreenState } from '@/components/ui/ScreenState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Download, RefreshCw, Wifi, WifiOff, ClipboardList } from 'lucide-react';
import type { PacoteDoDiaItem } from '../api';
import { baixarPacoteDoDia, obterPacoteLocal } from './pacoteDoDia';
import { contarPendentes, processarFila } from './syncEngine';
import { useOnlineStatus } from './useOnlineStatus';
import { CampoExecucaoPage } from './CampoExecucaoPage';

export const CampoHomeView: React.FC = () => {
  const [pacote, setPacote] = useState<PacoteDoDiaItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [baixando, setBaixando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState(0);
  const [ordemSelecionada, setOrdemSelecionada] = useState<PacoteDoDiaItem | null>(null);

  const atualizarPendentes = useCallback(() => {
    contarPendentes().then(setPendentes);
  }, []);

  const carregarPacoteLocal = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setPacote(await obterPacoteLocal());
    } catch {
      setErro('Não foi possível ler o pacote salvo no dispositivo.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarPacoteLocal();
    atualizarPendentes();
  }, [carregarPacoteLocal, atualizarPendentes]);

  const online = useOnlineStatus(atualizarPendentes);

  async function handleBaixarPacote() {
    setBaixando(true);
    setErro(null);
    try {
      setPacote(await baixarPacoteDoDia());
    } catch {
      setErro('Não foi possível baixar o pacote do dia. Verifique a conexão e tente novamente.');
    } finally {
      setBaixando(false);
    }
  }

  async function handleSincronizarAgora() {
    setSincronizando(true);
    try {
      await processarFila();
      atualizarPendentes();
    } finally {
      setSincronizando(false);
    }
  }

  if (ordemSelecionada) {
    return (
      <CampoExecucaoPage
        ordem={ordemSelecionada.ordem}
        formulario={ordemSelecionada.formulario}
        onBack={() => setOrdemSelecionada(null)}
        onEnfileirado={() => {
          setOrdemSelecionada(null);
          atualizarPendentes();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={online ? 'success' : 'neutral'}>
            {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {online ? 'Online' : 'Offline'}
          </Badge>
          {pendentes > 0 && <Badge variant="warning">{pendentes} pendente(s) de sincronização</Badge>}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={handleBaixarPacote} isLoading={baixando} disabled={!online}>
            Baixar pacote do dia
          </Button>
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={handleSincronizarAgora}
            isLoading={sincronizando}
            disabled={!online || pendentes === 0}
          >
            Sincronizar agora
          </Button>
        </div>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      {carregando ? (
        <ScreenState type="loading" />
      ) : pacote.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-10 w-10" />}
          title="Nenhum pacote baixado"
          description="Baixe o pacote do dia para acessar suas ordens de serviço offline."
          actionLabel={online ? 'Baixar pacote do dia' : undefined}
          onAction={online ? handleBaixarPacote : undefined}
        />
      ) : (
        <div className="grid gap-3">
          {pacote.map((item) => (
            <Card key={item.ordem.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium text-foreground">{item.ordem.local?.nome ?? `Local #${item.ordem.local_id}`}</p>
                  <p className="text-sm text-muted-foreground">
                    OS #{item.ordem.id} · {item.ordem.tipo_acao} · {item.ordem.data_prevista}
                  </p>
                </div>
                <Button onClick={() => setOrdemSelecionada(item)}>Executar vistoria</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CampoHomeView;
