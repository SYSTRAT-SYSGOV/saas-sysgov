import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button, Card, Input, buttonVariants } from '@sysgov/ui';
import { ValidationErrorModal } from '@/components/ui';
import { sysgovApi } from '@sysgov/sdk';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';

/** Redefine a senha com o token do e-mail de "esqueci minha senha" (self-service, já existia na API). */
export const RedefinirSenhaPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ApiFieldError[] | null>(null);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErro('Link de redefinição incompleto.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await sysgovApi.resetPassword(token, senha, confirmacao);
      setConcluido(true);
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) setValidationErrors(fieldErrors);
      else setErro(getApiErrorMessage(err, 'Não foi possível redefinir a senha. O link pode ter expirado.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gov-page px-4">
      <Card className="w-full max-w-md space-y-4 p-6">
        <ValidationErrorModal open={validationErrors !== null} onClose={() => setValidationErrors(null)} errors={validationErrors ?? []} />

        {concluido ? (
          <div className="flex flex-col items-center gap-2 text-center" data-testid="redefinicao-concluida">
            <CheckCircle2 className="h-10 w-10 text-status-success" />
            <p className="font-semibold text-foreground">Senha redefinida com sucesso!</p>
            <Link to="/login" className={buttonVariants({ variant: 'primary' })}>
              Entrar
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-xl font-semibold text-foreground">Redefinir senha</h1>
            </div>
            <form onSubmit={enviar} className="space-y-4" noValidate>
              <Input
                label="Nova senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                helperText="Mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo."
              />
              <Input label="Confirme a nova senha" type="password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} required />
              {erro && (
                <p className="text-sm text-destructive" role="alert">
                  {erro}
                </p>
              )}
              <Button type="submit" isLoading={enviando} className="w-full">
                Redefinir senha
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
};

export default RedefinirSenhaPage;
