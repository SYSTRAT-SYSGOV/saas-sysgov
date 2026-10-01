import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, Link2Off, MailWarning } from 'lucide-react';
import { Card, buttonVariants } from '@sysgov/ui';
import { ScreenState } from '@/components/ui';
import { sysgovApi } from '@sysgov/sdk';
import { getApiErrorMessage, getApiValidationErrors } from '@/lib/apiErrors';

type Estado = 'carregando' | 'sucesso' | 'expirado' | 'usado' | 'invalido';

/** Classifica o texto de erro do backend (design D5/D6: inválido, já usado, vencido). */
function classificarErro(mensagem: string): Estado {
  if (mensagem.includes('vencido')) return 'expirado';
  if (mensagem.includes('já foi usado')) return 'usado';
  return 'invalido';
}

/**
 * Confirma o e-mail do cadastro externo (design D5/D6) — o token na URL já diz sozinho qual
 * usuário e qual órgão, não precisa de mais nada no link.
 */
export const VerificarEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [estado, setEstado] = useState<Estado>('carregando');
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    if (!token) {
      setEstado('invalido');
      setMensagem('Link de verificação incompleto.');
      return;
    }
    sysgovApi.cursos
      .verificarEmail(token)
      .then(() => setEstado('sucesso'))
      .catch((err) => {
        const fieldErrors = getApiValidationErrors(err);
        const texto = fieldErrors?.[0]?.message ?? getApiErrorMessage(err, 'Não foi possível verificar o e-mail.');
        setMensagem(texto);
        setEstado(classificarErro(texto));
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gov-page px-4">
      <Card className="w-full max-w-md space-y-3 p-6 text-center">
        {estado === 'carregando' && <ScreenState type="loading" title="Verificando seu e-mail..." />}

        {estado === 'sucesso' && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-status-success" />
            <p className="font-semibold text-foreground">E-mail verificado com sucesso!</p>
            <p className="text-sm text-muted-foreground">Você já pode entrar com seu e-mail e senha.</p>
            <Link to="/login" className={buttonVariants({ variant: 'primary' })}>
              Entrar
            </Link>
          </>
        )}

        {estado === 'expirado' && (
          <>
            <Clock className="mx-auto h-10 w-10 text-status-warning" />
            <p className="font-semibold text-foreground">Link vencido</p>
            <p className="text-sm text-muted-foreground">{mensagem} Volte à página de cadastro do seu órgão e peça um novo link.</p>
          </>
        )}

        {estado === 'usado' && (
          <>
            <MailWarning className="mx-auto h-10 w-10 text-status-warning" />
            <p className="font-semibold text-foreground">Link já utilizado</p>
            <p className="text-sm text-muted-foreground">{mensagem}</p>
            <Link to="/login" className={buttonVariants({ variant: 'primary' })}>
              Entrar
            </Link>
          </>
        )}

        {estado === 'invalido' && (
          <>
            <Link2Off className="mx-auto h-10 w-10 text-destructive" />
            <p className="font-semibold text-foreground">Link inválido</p>
            <p className="text-sm text-muted-foreground">{mensagem}</p>
          </>
        )}
      </Card>
    </div>
  );
};

export default VerificarEmailPage;
