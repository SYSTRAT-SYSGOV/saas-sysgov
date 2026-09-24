import React, { useCallback, useEffect, useState } from 'react';
import { QrCode } from 'lucide-react';
import { Modal } from '@sysgov/ui';
import { ScreenState } from '@/components/ui';
import { sysgovApi, type AulaAgendamento, type QrCheckIn } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';

/** O token vale 60s no servidor; renovar a cada 30s deixa folga para quem está lendo. */
export const INTERVALO_RENOVACAO_MS = 30_000;

interface Props {
  agendamento: AulaAgendamento | null;
  onClose: () => void;
}

/** QR de check-in em tela cheia, para projetar em sala. Renova sozinho enquanto aberto. */
export const QrCheckInModal: React.FC<Props> = ({ agendamento, onClose }) => {
  const [qr, setQr] = useState<QrCheckIn | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const gerar = useCallback(async (id: number) => {
    try {
      setQr(await sysgovApi.cursos.gerarQrCheckIn(id));
      setErro(null);
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível gerar o QR code.'));
    }
  }, []);

  useEffect(() => {
    if (!agendamento) {
      setQr(null);
      return;
    }
    void gerar(agendamento.id);
    const timer = setInterval(() => void gerar(agendamento.id), INTERVALO_RENOVACAO_MS);
    return () => clearInterval(timer);
  }, [agendamento, gerar]);

  return (
    <Modal open={agendamento !== null} onClose={onClose} title={`Check-in — ${agendamento?.aula?.titulo ?? ''}`} icon={<QrCode className="h-5 w-5" />} size="full">
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        {erro && <ScreenState type="error" title="QR indisponível" description={erro} />}
        {!erro && !qr && <ScreenState type="loading" title="Gerando QR code..." />}
        {!erro && qr && (
          <>
            <img src={qr.qr_code} alt="QR code de check-in da aula" className="h-[min(60vh,28rem)] w-[min(60vh,28rem)] rounded-lg border border-border bg-white p-4" />
            <p className="text-lg font-medium text-foreground">Aponte a câmera do celular para registrar sua presença</p>
            <p className="text-sm text-muted-foreground">O código muda a cada 30 segundos. É preciso estar logado no SYSGOV com inscrição confirmada.</p>
          </>
        )}
      </div>
    </Modal>
  );
};

export default QrCheckInModal;
