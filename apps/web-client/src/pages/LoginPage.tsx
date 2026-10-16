import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/core/auth/useAuth';
import { useTenant } from '@/core/tenant/useTenant';
import { apiClient } from '@/core/api/client';
import {
  Building2,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Globe,
  AlertCircle,
} from 'lucide-react';
import { Button, Input } from '@/components/ui';

interface LoginTenant {
  id: number;
  name: string;
  slug: string;
  type: string;
}

// Fallback quando o backend está indisponível (modo demonstração).
const FALLBACK_TENANTS: LoginTenant[] = [
  { id: 131, name: 'MUNICIPIO DE ARAUCARIA', slug: 'araucaria-pr', type: 'prefeitura' },
  { id: 1, name: 'SYSTRAT (Sistema)', slug: 'systrat', type: 'interno' },
];

/**
 * Destino depois do login (?voltar=/caminho). Só aceita caminho relativo do
 * próprio app — "//outro-site" ou URL absoluta viraria redirecionamento aberto.
 */
export function destinoPosLogin(voltar: string | null): string {
  return voltar && voltar.startsWith('/') && !voltar.startsWith('//') && !voltar.startsWith('/\\') ? voltar : '/';
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithSSO } = useAuth();
  const { isStandardBranding } = useTenant();

  const [tenants, setTenants] = useState<LoginTenant[]>(FALLBACK_TENANTS);
  const [email, setEmail] = useState('admin@araucaria.pr.gov.br');
  const [password, setPassword] = useState('');
  const [selectedTenantSlug, setSelectedTenantSlug] = useState('araucaria-pr');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // MFA: 'code' = pede o código TOTP; 'setup' = usuário sem MFA em papel obrigatório (mostra QR).
  const [mfaStep, setMfaStep] = useState<'none' | 'code' | 'setup'>('none');
  const [mfaCode, setMfaCode] = useState('');
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [setupQr, setSetupQr] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<{ data: LoginTenant[] }>('/auth/tenants', { timeout: 4000 })
      .then((res) => {
        if (cancelled || !Array.isArray(res.data.data) || res.data.data.length === 0) return;
        setTenants(res.data.data);
        setSelectedTenantSlug((current) => {
          if (res.data.data.some((t) => t.slug === current)) return current;
          return res.data.data[0].slug;
        });
      })
      .catch(() => {
        // Backend indisponível: mantém o fallback de demonstração.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startMfaSetup = async (token: string) => {
    const res = await apiClient.post<{ secret?: string; qr_code_url?: string | null }>('/auth/mfa-setup/start', {
      setup_token: token,
    });
    setSetupToken(token);
    setSetupSecret(res.data.secret ?? null);
    const qr = res.data.qr_code_url;
    setSetupQr(typeof qr === 'string' && qr.startsWith('data:image/') ? qr : null);
    setMfaCode('');
    setMfaStep('setup');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (mfaStep === 'setup' && setupToken) {
        // Confirma o código com o token de configuração e refaz o login com o mesmo código.
        await apiClient.post('/auth/mfa-setup/confirm', { setup_token: setupToken, code: mfaCode.trim() });
      }
      await login({
        email,
        password,
        tenantSlug: selectedTenantSlug,
        ...(mfaStep !== 'none' ? { mfa_code: mfaCode.trim() } : {}),
      });
      navigate(destinoPosLogin(searchParams.get('voltar')));
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.error_code === 'MFA_REQUIRED' && typeof data.mfa_setup_token === 'string') {
        try {
          await startMfaSetup(data.mfa_setup_token);
        } catch (setupErr: any) {
          setErrorMsg(setupErr?.response?.data?.message || 'Falha ao iniciar a configuração do MFA.');
        }
      } else if (data?.error_code === 'MFA_CODE_REQUIRED') {
        setMfaStep('code');
        setMfaCode('');
      } else if (data?.error_code === 'MFA_SETUP_EXPIRED') {
        setMfaStep('none');
        setSetupToken(null);
        setMfaCode('');
        setErrorMsg(data.message);
      } else {
        const backendMessage = data?.errors
          ? Object.values(data.errors).flat().join(' ')
          : data?.message;
        setErrorMsg(backendMessage || err?.message || 'Falha ao autenticar no portal do cliente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gov-page flex flex-col justify-between text-gov-text-primary selection:bg-gov-primary selection:text-white">
      {/* Top Header Bar DS Gov.br */}
      <header className="p-4 sm:p-6 flex items-center justify-between border-b border-gov-border bg-gov-surface shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-gov-primary flex items-center justify-center font-mono font-bold text-white text-sm shadow-sm">
            SG
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide text-gov-text-primary uppercase block">
              SYSGOV
            </span>
            <span className="text-[11px] text-gov-text-muted block">
              Padrão Digital de Governo • UIKIT GOVBR V3
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-gov-text-secondary font-mono">
          <ShieldCheck className="w-4 h-4 text-status-success" />
          <span>Acesso Seguro • Padrão eMAG / WCAG 2.1 AA</span>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-gov-surface border border-gov-border rounded-lg shadow-md p-6 sm:p-8 space-y-6">
          {/* Tenant Identity Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gov-primary-light text-gov-primary mb-1">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gov-text-primary tracking-tight">
              Acesso ao Portal do Cliente
            </h1>
            <p className="text-xs text-gov-text-secondary">
              Informe suas credenciais institucionais para acessar o município
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-md bg-status-danger-bg border border-status-danger-border text-status-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tenant Selection */}
            <div className="space-y-1.5">
              <label
                htmlFor="tenant-select"
                className="block font-mono text-[10px] font-bold uppercase tracking-wider text-gov-text-secondary"
              >
                Município / Órgão Vinculado
              </label>
<select
                id="tenant-select"
                value={selectedTenantSlug}
                onChange={(e) => setSelectedTenantSlug(e.target.value)}
                className="w-full px-3 py-2 bg-gov-surface border border-gov-border rounded-md text-xs text-gov-text-primary focus:outline-none focus:border-gov-primary focus:ring-2 focus:ring-gov-primary/20 transition"
              >
                {tenants.length === 0 ? (
                  <option value="">Nenhum município disponível</option>
                ) : (
                  tenants.map((t) => (
                    <option key={t.id} value={t.slug}>
                      {t.name} ({t.type})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Email Field */}
            <Input
              label="E-mail Institucional"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operador@municipio.gov.br"
              leftIcon={<Mail className="w-4 h-4" />}
            />

            {/* Password Field */}
            <Input
              label="Senha de Acesso"
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
                    <p>Escaneie o QR code com um app autenticador (Google Authenticator, Authy…) e digite o código de 6 dígitos.</p>
                    {setupQr && (
                      <img
                        src={setupQr}
                        alt="QR code para configurar o autenticador"
                        className="mx-auto w-44 h-44 rounded-md bg-white p-1"
                      />
                    )}
                    <details>
                      <summary className="cursor-pointer text-gov-text-secondary">Não consegue escanear? Use a chave manual</summary>
                      <p className="font-mono break-all select-all mt-1">{setupSecret ?? ''}</p>
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

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full"
            >
              Entrar no Portal
            </Button>
          </form>

          {/* SSO Alternative */}
          <div className="space-y-3 pt-3 border-t border-gov-border">
            <div className="text-center">
              <span className="font-mono text-[10px] uppercase font-bold text-gov-text-muted tracking-wider">
                Ou acesse via autenticação federada
              </span>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={loginWithSSO}
              leftIcon={<Globe className="w-4 h-4" />}
              className="w-full"
            >
              Entrar com Gov.br / SSO Integrado
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="p-4 text-center text-xs text-gov-text-muted border-t border-gov-border bg-gov-surface">
        {isStandardBranding && (
          <div>
            <span className="font-semibold text-gov-text-secondary">Padrão Digital de Governo • UIKIT GOVBR V3</span>
            <span className="block text-[10px] text-gov-text-muted font-mono mt-0.5">
              SYSGOV Web-Client Multi-Tenant
            </span>
          </div>
        )}
      </footer>
    </div>
  );
};

export default LoginPage;
