import React, { useEffect, useState } from 'react';
import { LocateFixed, RefreshCw, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button, Modal } from '@/components/ui';

interface ModalGpsCampoProps {
  aberto: boolean;
  onFechar: () => void;
  jazigoSelecionado?: { id: number; codigo: string } | null;
  onAplicarCoordenadas: (lat: number, lng: number) => Promise<void>;
  onCentralizarMapa: (lat: number, lng: number) => void;
}

export const ModalGpsCampo: React.FC<ModalGpsCampoProps> = ({
  aberto,
  onFechar,
  jazigoSelecionado,
  onAplicarCoordenadas,
  onCentralizarMapa,
}) => {
  const [obtendo, setObtendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [posicao, setPosicao] = useState<{
    lat: number;
    lng: number;
    precisao: number; // metros
    horario: string;
  } | null>(null);

  const capturarPosicao = () => {
    if (!navigator.geolocation) {
      setErro('Geolocalização não é suportada pelo seu navegador/dispositivo.');
      return;
    }

    setObtendo(true);
    setErro(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosicao({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precisao: Math.round(pos.coords.accuracy * 10) / 10,
          horario: new Date(pos.timestamp).toLocaleTimeString('pt-BR'),
        });
        setObtendo(false);
      },
      (err) => {
        setObtendo(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setErro('Permissão de acesso ao GPS foi negada pelo usuário.');
            break;
          case err.POSITION_UNAVAILABLE:
            setErro('Informação de GPS indisponível no momento.');
            break;
          case err.TIMEOUT:
            setErro('Tempo limite esgotado para obter coordenadas GPS.');
            break;
          default:
            setErro('Falha desconhecida ao ler GPS.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    if (aberto) {
      capturarPosicao();
    } else {
      setPosicao(null);
      setErro(null);
    }
  }, [aberto]);

  const aplicar = async () => {
    if (!posicao) return;
    try {
      setSalvando(true);
      await onAplicarCoordenadas(posicao.lat, posicao.lng);
      onCentralizarMapa(posicao.lat, posicao.lng);
      onFechar();
    } catch {
      setErro('Erro ao vincular coordenadas ao jazigo.');
    } finally {
      setSalvando(false);
    }
  };

  const statusPrecisao = () => {
    if (!posicao) return null;
    if (posicao.precisao <= 5) {
      return {
        texto: 'Excelente precisão (adequado para cadastro direto)',
        cor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        icone: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      };
    }
    if (posicao.precisao <= 15) {
      return {
        texto: 'Precisão moderada (verifique visualmente no mapa)',
        cor: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        icone: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      };
    }
    return {
      texto: 'Baixa precisão (aguarde estabilização do sinal GPS)',
      cor: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      icone: <ShieldAlert className="h-4 w-4 text-rose-500" />,
    };
  };

  const status = statusPrecisao();

  return (
    <Modal
      open={aberto}
      onOpenChange={(open) => !open && onFechar()}
      title="Georreferenciamento de Campo (GPS)"
    >
      <div className="space-y-4 p-4 text-foreground sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LocateFixed className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Georreferenciamento de Campo (GPS)</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={capturarPosicao}
            disabled={obtendo}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${obtendo ? 'animate-spin' : ''}`} />
            Recapturar
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Obtenha coordenadas WGS84 em tempo real utilizando o GPS de alta precisão do seu dispositivo móvel no campo.
        </p>

        {erro && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            {erro}
          </div>
        )}

        {posicao ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Latitude / Longitude:</span>
                <span className="font-mono text-xs text-muted-foreground">{posicao.horario}</span>
              </div>
              <div className="font-mono text-base font-bold text-foreground">
                {posicao.lat.toFixed(7)}, {posicao.lng.toFixed(7)}
              </div>
            </div>

            {status && (
              <div className={`flex items-center gap-2 rounded-md border p-2.5 text-xs font-medium ${status.cor}`}>
                {status.icone}
                <span>
                  Precisão estimada: <strong>±{posicao.precisao}m</strong> — {status.texto}
                </span>
              </div>
            )}

            {jazigoSelecionado ? (
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
                Jazigo selecionado para vínculo: <strong className="font-mono text-primary font-semibold">{jazigoSelecionado.codigo}</strong>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                💡 Dica: Selecione um jazigo no mapa ou no inventário para salvar estas coordenadas diretamente nele.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mb-2" />
            Buscando satélites e calibrando coordenadas...
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          {posicao && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onCentralizarMapa(posicao.lat, posicao.lng);
                onFechar();
              }}
            >
              Ver no Mapa
            </Button>
          )}

          {jazigoSelecionado && posicao && (
            <Button
              variant="default"
              size="sm"
              onClick={aplicar}
              disabled={salvando}
              className="gap-1.5"
            >
              {salvando ? 'Salvando...' : `Vincular ao Jazigo ${jazigoSelecionado.codigo}`}
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={onFechar}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
