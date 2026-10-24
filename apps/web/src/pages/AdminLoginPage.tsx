import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, ChevronLeft, AlertCircle, Terminal } from 'lucide-react';
import { Button, Input } from '@sysgov/ui';
import { useNavigate } from 'react-router-dom';
import { loginAdminMaster, AdminLoginError } from '../services/api';
import { withApiBase } from '../config/env';
import { useAuthContext } from '../contexts/AuthContext';

interface AdminLoginPageProps {
  onNavigateToTenantLogin?: () => void;
  onLoginSuccess?: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onNavigateToTenantLogin = () => {},
  onLoginSuccess,
}) => {
  const { loginAdminSession, isAuthenticated } = useAuthContext();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mfaStep, setMfaStep] = useState<'none' | 'code' | 'setup'>('none');
  const [mfaCode, setMfaCode] = useState('');
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupQr, setSetupQr] = useState<string | null>(null);
  const [pending, setPending] = useState<{ user: any; token: string } | null>(null);

  const finishLogin = (user: any, token: string) => {
    loginAdminSession(user, token);
    if (onLoginSuccess) {
      onLoginSuccess();
    }
    navigate('/admin/dashboard', { replace: true });
  };

  const authHeaders = (token: string) => ({
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  });

  const startMfaSetup = async (token: string) => {
    const res = await fetch(withApiBase('/api/admin/me/mfa/setup'), { method: 'POST', headers: authHeaders(token) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Falha ao iniciar a configuração do MFA.');
    setSetupSecret(data.secret || data.otpauth_url || null);
    setSetupQr(typeof data.qr_code_url === 'string' && data.qr_code_url.startsWith('data:image/') ? data.qr_code_url : null);
  };

  const confirmMfaSetup = async () => {
    if (!pending) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(withApiBase('/api/admin/me/mfa/confirm'), {
        method: 'POST',
        headers: authHeaders(pending.token),
        body: JSON.stringify({ code: mfaCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.errors?.code?.[0] || data.message || 'Código inválido.');
      finishLogin(pending.user, pending.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Código inválido.');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Informe seu e-mail corporativo de administrador.');
      return;
    }
    if (!password) {
      setErrorMessage('Informe sua senha mestra de acesso.');
      return;
    }

    // Passo de configuração do MFA: confirma o código com o token já emitido, sem refazer o
    // login (refazer o login gerava um novo segredo a cada envio e o código nunca batia).
    if (mfaStep === 'setup' && pending) {
      await confirmMfaSetup();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await loginAdminMaster(email.trim(), password, mfaStep === 'code' ? mfaCode.trim() : undefined);
      if (response.success && response.user && response.token) {
        if (response.mfa_setup_required) {
          setPending({ user: response.user, token: response.token });
          setMfaStep('setup');
          setMfaCode('');
          await startMfaSetup(response.token);
        } else {
          finishLogin(response.user, response.token);
        }
      } else {
        setErrorMessage(response.message || 'Credenciais master inválidas.');
      }
    } catch (err: any) {
      if (err instanceof AdminLoginError && err.code === 'MFA_CODE_REQUIRED') {
        setMfaStep('code');
        setMfaCode('');
        setErrorMessage(null);
      } else {
        setErrorMessage(err.message || 'Credenciais master inválidas.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gov-page flex flex-col justify-between text-gov-text-primary selection:bg-gov-primary selection:text-white">
      {/* Barra superior — mesmo padrão do portal do cliente (Design System Gov.br) */}
      <header className="p-4 sm:p-6 flex items-center justify-between gap-3 border-b border-gov-border bg-gov-surface shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-gov-primary flex items-center justify-center font-mono font-bold text-white text-sm shadow-sm">
            SG
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide text-gov-text-primary uppercase block">SYSGOV</span>
            <span className="text-[11px] text-gov-text-muted block">Administração da plataforma • Acesso restrito</span>
          </div>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={onNavigateToTenantLogin} leftIcon={<ChevronLeft className="w-4 h-4" />}>
          <span className="hidden sm:inline">Voltar ao Portal de Prefeituras</span>
          <span className="sm:hidden">Voltar</span>
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-gov-surface border border-gov-border rounded-lg shadow-md p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gov-primary-light text-gov-primary mb-1">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gov-text-primary tracking-tight">Acesso ao Painel Administrativo</h1>
            <p className="text-xs text-gov-text-secondary">
              Área exclusiva da equipe do provedor. Informe suas credenciais de Super Administrador.
            </p>
          </div>

          {errorMessage && (
            <div role="alert" className="p-3 rounded-md bg-status-danger-bg border border-status-danger-border text-status-danger text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mail corporativo"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@empresa.com.br"
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Senha"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
            />

            {mfaStep !== 'none' && (
              <div className="space-y-2">
                {mfaStep === 'setup' && (
                  <div className="text-xs bg-gov-surface border border-gov-border rounded-md p-3 space-y-2">
                    <p className="font-semibold">Configure a verificação em duas etapas (obrigatória)</p>
                    <p>No app autenticador (Google Authenticator, Authy…), escaneie o QR code abaixo e digite o código de 6 dígitos.</p>
                    {setupQr && (
                      <img
                        src={setupQr}
                        alt="QR code para configurar o autenticador"
                        className="mx-auto w-44 h-44 rounded-md bg-card p-1"
                      />
                    )}
                    <details>
                      <summary className="cursor-pointer text-gov-text-secondary">Não consegue escanear? Use a chave manual</summary>
                      <p className="font-mono break-all select-all mt-1">{setupSecret ?? 'Gerando chave…'}</p>
                    </details>
                  </div>
                )}
                <Input
                  label="Código de verificação (6 dígitos)"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  leftIcon={<ShieldCheck className="w-4 h-4" />}
                />
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full"
            >
              {isLoading ? 'Validando…' : 'Entrar no painel'}
            </Button>
          </form>

          <div className="pt-3 border-t border-gov-border text-[11px] text-gov-text-secondary flex items-start gap-2">
            <Terminal className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gov-primary" />
            <span>Ambiente auditado: IP registrado, sessão com expiração automática e verificação em duas etapas.</span>
          </div>
        </div>
      </main>

      <footer className="p-4 text-center text-xs text-gov-text-muted border-t border-gov-border bg-gov-surface">
        <span className="font-semibold text-gov-text-secondary">Padrão Digital de Governo • UIKIT GOVBR V3</span>
        <span className="block text-[10px] font-mono mt-0.5">SYSGOV Admin • Console de Operações</span>
      </footer>
    </div>
  );
};
