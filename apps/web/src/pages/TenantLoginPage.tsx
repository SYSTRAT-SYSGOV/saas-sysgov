import React, { useState, useEffect } from 'react';
import {
  Building,
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
  Globe,
  Landmark,
  FileText,
  Activity,
  Layers,
  ChevronRight,
  TrendingUp,
  Cpu,
} from 'lucide-react';
import { lookupUserTenant, loginTenantUser } from '../services/api';
import { useAuthContext } from '../contexts/AuthContext';
import { useTenantContext } from '../contexts/TenantContext';

interface TenantLoginPageProps {
  onNavigateToAdminLogin: () => void;
  onLoginSuccess: () => void;
}

export const TenantLoginPage: React.FC<TenantLoginPageProps> = ({
  onNavigateToAdminLogin,
  onLoginSuccess,
}) => {
  const { loginTenantSession } = useAuthContext();
  const { setActiveTenant } = useTenantContext();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-detection state
  const [isSearching, setIsSearching] = useState(false);
  const [detectedData, setDetectedData] = useState<{
    user?: any;
    tenant?: any;
  } | null>(null);

  // Debounced lookup on identifier change
  useEffect(() => {
    const clean = identifier.trim();
    if (clean.length < 3) {
      setDetectedData(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await lookupUserTenant(clean);
        if (res.found && res.tenant) {
          setDetectedData({
            user: res.user,
            tenant: res.tenant,
          });
          setErrorMessage(null);
        } else {
          setDetectedData(null);
        }
      } catch {
        setDetectedData(null);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [identifier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('Por favor, informe seu E-mail institucional ou CPF.');
      return;
    }
    if (!password) {
      setErrorMessage('Por favor, digite sua senha de acesso.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await loginTenantUser(identifier.trim(), password);
      if (response.success && response.user && response.tenant) {
        // Set active tenant and session
        setActiveTenant({
          id: response.tenant.id,
          nomePrefeitura: response.tenant.nomePrefeitura,
          cidade: response.tenant.cidade,
          uf: response.tenant.uf,
          codigoIbge: response.tenant.codigoIbge,
          cnpj: response.tenant.cnpj,
          status: response.tenant.status,
          branding: response.tenant.branding,
        });

        loginTenantSession(response.user, response.token);
        onLoginSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha na autenticação. Verifique seu usuário e senha.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (email: string, pass: string = 'senha123') => {
    setIdentifier(email);
    setPassword(pass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[150px] pointer-events-none" />

      {/* Top Navbar / SaaS Header Promotion */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
            <Building className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-300 bg-clip-text text-transparent">
                Escrita.Online
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                SaaS Fiscal V4.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Inteligência e Governança Fiscal para Prefeituras Municipais
            </p>
          </div>
        </div>

        {/* Action: Switch to Super Admin Login */}
        <button
          onClick={onNavigateToAdminLogin}
          className="flex items-center space-x-2 text-xs font-semibold px-3.5 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600 transition-all cursor-pointer shadow-sm group"
        >
          <Lock className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
          <span>Acesso Provedor SaaS</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </header>

      {/* Main Content Grid: Promotional Hero + Smart Login Box */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16 z-10">
        {/* Left Column: SaaS Product Pitch / Authority Showcase (Propaganda da Empresa) */}
        <div className="flex-1 max-w-xl space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Portal Unificado de Acesso Municipal</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Controle Fiscal, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              LRF & Inteligência
            </span>{' '}
            em Tempo Real
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Acesse os demonstrativos oficiais da sua prefeitura integrados diretamente ao{' '}
            <strong className="text-white">Siconfi (Tesouro Nacional)</strong>,{' '}
            <strong className="text-white">TCE</strong>,{' '}
            <strong className="text-white">Transferegov</strong> e projeções da Reforma Tributária (EC 132/2023).
          </p>

          {/* Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start space-x-3 text-left">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Isolamento Multi-Tenant</h4>
                <p className="text-[11px] text-slate-400">Segurança de dados e conformidade estrita por município.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start space-x-3 text-left">
              <TrendingUp className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Semáforos da LRF</h4>
                <p className="text-[11px] text-slate-400">Alertas preditivos de pessoal (54%), saúde (15%) e educação (25%).</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start space-x-3 text-left">
              <Cpu className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Diagnóstico com IA</h4>
                <p className="text-[11px] text-slate-400">Pareceres técnicos automáticos para Prefeitos e Secretários.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start space-x-3 text-left">
              <Landmark className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Captação Ativa</h4>
                <p className="text-[11px] text-slate-400">Monitoramento de emendas parlamentares e convênios federais.</p>
              </div>
            </div>
          </div>

          {/* Quick Demo Pre-fill helpers */}
          <div className="pt-3 border-t border-slate-800/80 text-left">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 font-mono">
              💡 Acesso Rápido de Demonstração (Clique para preencher):
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('gabinete.prefeito@araucaria.pr.gov.br')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-emerald-950/60 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 font-mono text-[11px] transition-all cursor-pointer"
              >
                🏛️ Araucária (Prefeito)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('prefeito@curitiba.pr.gov.br')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-sky-950/60 border border-slate-800 hover:border-sky-500/50 text-slate-300 hover:text-sky-300 font-mono text-[11px] transition-all cursor-pointer"
              >
                🏛️ Curitiba (Prefeito)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('fazenda.secretario@londrina.pr.gov.br')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-teal-950/60 border border-slate-800 hover:border-teal-500/50 text-slate-300 hover:text-teal-300 font-mono text-[11px] transition-all cursor-pointer"
              >
                🏛️ Londrina (Finanças)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('733.221.801-09')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-purple-950/60 border border-slate-800 hover:border-purple-500/50 text-slate-300 hover:text-purple-300 font-mono text-[11px] transition-all cursor-pointer"
              >
                🏛️ Maringá (via CPF)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Smart Single Login Box */}
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/90 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-400" />
                Login do Servidor
              </h2>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Padrão Gov.br
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Digite seu <strong className="text-slate-200">E-mail institucional</strong> ou <strong className="text-slate-200">CPF</strong>. O sistema identifica automaticamente sua prefeitura.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-700/60 text-rose-200 text-xs flex items-start space-x-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input: E-mail or CPF with Live Detection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>E-mail ou CPF</span>
                {isSearching && (
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                    <Activity className="w-3 h-3 animate-spin" />
                    Identificando município...
                  </span>
                )}
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="ex: prefeito@cidade.pr.gov.br ou 000.000.000-00"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono"
                  required
                />
              </div>
            </div>

            {/* Smart Detection Card (Feedback Visual Imediato) */}
            {detectedData?.tenant && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Prefeitura Identificada:
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-700/50">
                    IBGE {detectedData.tenant.codigoIbge}
                  </span>
                </div>
                <p className="font-semibold text-white text-sm">
                  {detectedData.tenant.nomePrefeitura} ({detectedData.tenant.uf})
                </p>
                {detectedData.user && (
                  <div className="text-[11px] text-emerald-300/90 pt-1 border-t border-emerald-800/40 flex items-center justify-between">
                    <span>Usuário: <strong>{detectedData.user.nome}</strong></span>
                    <span className="font-mono text-[10px] text-slate-300">{detectedData.user.cargo}</span>
                  </div>
                )}
                {detectedData.tenant.branding?.isCustomized && (
                  <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Ambiente com Pacote 100% Personalizado (White-Label)
                  </div>
                )}
              </div>
            )}

            {/* Input: Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Senha de Acesso</span>
                <span className="text-[11px] text-slate-400">Padrão demo: senha123</span>
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Autenticando e conectando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Painel da Prefeitura</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              Sistema protegido por criptografia AES-256 e autenticação JWT.
              <br />
              Todos os acessos são auditados para fins de conformidade pública.
            </p>
          </div>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 sm:px-8 py-5 text-center text-slate-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Building className="w-4 h-4 text-emerald-500" />
          <span className="font-semibold text-slate-400">
            Escrita.Online Sistemas e Soluções Tecnológicas Ltda.
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-400 flex flex-wrap items-center gap-4">
          <span>CNPJ 00.000.000/0001-00</span>
          <span>•</span>
          <span>Suporte: contato@escrita.online</span>
          <span>•</span>
          <span>Versão 4.0.0</span>
        </div>
      </footer>
    </div>
  );
};
