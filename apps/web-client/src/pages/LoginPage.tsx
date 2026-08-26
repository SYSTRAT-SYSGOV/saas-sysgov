import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/useAuth';
import { useTenant } from '@/core/tenant/useTenant';
import { 
  Building2, 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  Globe, 
  AlertCircle
} from 'lucide-react';
import { Button, Input } from '@/components/ui';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginWithSSO } = useAuth();
  const { isStandardBranding } = useTenant();

  const [email, setEmail] = useState('admin@araucaria.pr.gov.br');
  const [password, setPassword] = useState('Araucaria@123456');
  const [selectedTenantSlug, setSelectedTenantSlug] = useState('araucaria-pr');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await login({
        email,
        password,
        tenantSlug: selectedTenantSlug,
      });
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao autenticar no portal do cliente.');
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
                <option value="araucaria-pr">Prefeitura Municipal de Araucária (PR)</option>
                <option value="camara-araucaria">Câmara Municipal de Araucária (PR)</option>
                <option value="sjp">Prefeitura de São José dos Pinhais (PR)</option>
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
