import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { Button, Card, Input } from '@sysgov/ui';
import { sysgovApi } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';

/** "Esqueci minha senha" (self-service, já existia na API) — resposta sempre igual, não revela se o e-mail existe. */
export const EsqueciSenhaPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await sysgovApi.forgotPassword(email);
      setEnviado(true);
    } catch (err) {
      setErro(getApiErrorMessage(err, 'Não foi possível enviar o link. Tente novamente.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gov-page px-4">
      <Card className="w-full max-w-md space-y-4 p-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground">Esqueci minha senha</h1>
          <p className="text-sm text-muted-foreground">Informe seu e-mail para receber o link de redefinição.</p>
        </div>

        {enviado ? (
          <div className="flex flex-col items-center gap-2 text-center" data-testid="esqueci-senha-enviado">
            <MailCheck className="h-10 w-10 text-status-success" />
            <p className="font-semibold text-foreground">Se o e-mail informado estiver cadastrado, você vai receber um link de redefinição.</p>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-4" noValidate>
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {erro && (
              <p className="text-sm text-destructive" role="alert">
                {erro}
              </p>
            )}
            <Button type="submit" isLoading={enviando} className="w-full">
              Enviar link
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Voltar para o login
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default EsqueciSenhaPage;
