import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { CircleCheck, CircleX, Loader2 } from 'lucide-react';
import { Card } from '@sysgov/ui';
import { sysgovApi } from '@sysgov/sdk';
import { useAuth } from '@/core/auth/useAuth';
import { getApiErrorMessage } from '@/lib/apiErrors';

type Estado = { tipo: 'enviando' } | { tipo: 'ok'; aula: string; jaRegistrada: boolean } | { tipo: 'erro'; mensagem: string };

/**
 * Destino do QR de check-in (/cursos/check-in?t=TOKEN). Fica fora do
 * ProtectedRoute para, sem sessão, mandar ao login e voltar com o token.
 */
export const CheckInPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [params] = useSearchParams();
  const location = useLocation();
  const token = params.get('t') ?? '';
  const [estado, setEstado] = useState<Estado>({ tipo: 'enviando' });
  const enviado = useRef(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !token || enviado.current) return;
    enviado.current = true;
    sysgovApi.cursos
      .checkIn(token)
      .then((r) => setEstado({ tipo: 'ok', aula: r.presenca.agendamento?.aula?.titulo ?? 'aula', jaRegistrada: r.ja_registrada }))
      .catch((e) => setEstado({ tipo: 'erro', mensagem: getApiErrorMessage(e, 'Não foi possível registrar sua presença.') }));
  }, [isAuthenticated, isLoading, token]);

  if (!isLoading && !isAuthenticated) {
    return <Navigate to={`/login?voltar=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gov-page px-4">
      <Card className="w-full max-w-sm space-y-3 p-6 text-center">
        {!token ? (
          <p className="text-sm text-destructive">Link de check-in incompleto. Leia o QR code novamente.</p>
        ) : estado.tipo === 'enviando' ? (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Registrando sua presença...</p>
          </>
        ) : estado.tipo === 'ok' ? (
          <>
            <CircleCheck className="mx-auto h-12 w-12 text-status-success" />
            <p className="text-lg font-semibold text-foreground">{estado.jaRegistrada ? 'Presença já registrada' : 'Presença registrada!'}</p>
            <p className="text-sm text-muted-foreground">{estado.aula}</p>
          </>
        ) : (
          <>
            <CircleX className="mx-auto h-12 w-12 text-destructive" />
            <p className="text-sm text-foreground">{estado.mensagem}</p>
          </>
        )}
        <Link to="/cursos?aba=meus" className="block text-sm text-primary underline-offset-4 hover:underline">
          Ver meus cursos
        </Link>
      </Card>
    </div>
  );
};

export default CheckInPage;
