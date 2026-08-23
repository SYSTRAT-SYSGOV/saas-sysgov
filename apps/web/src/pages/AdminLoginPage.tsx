import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Server,
  Key,
  ChevronLeft,
  AlertCircle,
  Activity,
  Layers,
  Database,
  Building2,
  Terminal,
} from 'lucide-react';
import { loginAdminMaster } from '../services/api';
import { useAuthContext } from '../contexts/AuthContext';

interface AdminLoginPageProps {
  onNavigateToTenantLogin?: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onNavigateToTenantLogin = () => {},
  onLoginSuccess,
}) => {
  const { loginAdminSession } = useAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await loginAdminMaster(email.trim(), password);
      if (response.success && response.user) {
        loginAdminSession(response.user, response.token);
        onLoginSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Credenciais master inválidas.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFillMaster = () => {
    setEmail('admin@sgfiscal.com.br');
    setPassword('admin123');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden selection:bg-amber-500 selection:text-slate-950">
      {/* Glow backgrounds */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[600px] h-[600px] rounded-full bg-rose-600/10 blur-[160px] pointer-events-none" />

      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/30">
            <ShieldAlert className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                SaaS Master Backoffice
              </span>
              <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ACESSO RESTRITO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Gestão Global de Prefeituras, Faturamento e White-Label
            </p>
          </div>
        </div>

        {/* Back to tenant login button */}
        <button
          onClick={onNavigateToTenantLogin}
          className="flex items-center space-x-2 text-xs font-semibold px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Voltar ao Portal de Prefeituras</span>
        </button>
      </header>

      {/* Main Login Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row items-center justify-center gap-8 z-10">
        {/* Left Side: Security Notice */}
        <div className="flex-1 space-y-4 max-w-md">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Key className="w-3.5 h-3.5" />
            <span>Área Exclusiva da Empresa Mantenedora</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Painel Administrativo do Provedor SaaS
          </h2>

          <p className="text-sm text-slate-400 leading-relaxed">
            Este módulo é restrito à diretoria e equipe técnica do provedor do software. Aqui você gerencia:
          </p>

          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-center space-x-2.5">
              <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Cadastro e onboarding automático de prefeituras (IBGE).</span>
            </li>
            <li className="flex items-center space-x-2.5">
              <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Personalização 100% White-Label (Logos, Cores e Subdomínio).</span>
            </li>
            <li className="flex items-center space-x-2.5">
              <Database className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Configuração de Taxas de Implantação e Mensalidades extras.</span>
            </li>
            <li className="flex items-center space-x-2.5">
              <Server className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Monitoramento em tempo real de filas de sincronização Siconfi/TCE.</span>
            </li>
          </ul>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
              <Terminal className="w-3.5 h-3.5" />
              <span>Ambiente Auditado</span>
            </div>
            <span>IP Registrado • Criptografia HS256 / AES-256 • Sessão com Expiração Automática</span>
          </div>
        </div>

        {/* Right Side: Admin Form */}
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              Autenticação Master
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Informe suas credenciais corporativas de Super Administrador.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-700/70 text-rose-200 text-xs flex items-start space-x-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                E-mail Corporativo Master
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@sgfiscal.com.br"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Senha Mestra</span>
                <span className="text-[11px] text-slate-400 font-mono">Demo: admin123</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 mt-1"
            >
              {isLoading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Validando Chave Master...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Backoffice Master</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Quick pre-fill button */}
            <div className="pt-3 text-center border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleQuickFillMaster}
                className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2 font-mono cursor-pointer"
              >
                Preencher credenciais Master (Demonstração)
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-4 sm:px-8 py-4 text-center text-slate-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="font-mono">Escrita.Online SaaS Core Platform • Console de Operações</span>
        <span className="font-mono text-[11px] text-slate-400">Segurança de Nível Bancário / Governamental</span>
      </footer>
    </div>
  );
};
