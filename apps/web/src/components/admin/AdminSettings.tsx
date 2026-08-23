import React, { useState } from 'react';
import {
  Settings,
  Palette,
  Shield,
  Bell,
  Globe,
  Save,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Layout,
  Lock,
  Mail,
  Sliders,
} from 'lucide-react';
import { useAdminConfig } from '../../contexts/AdminConfigContext';
import { SystemBrandingConfig } from '../../types/admin';

interface AdminSettingsProps {
  onAddToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

const COLOR_PRESETS = [
  { name: 'Esmeralda (Padrão)', value: '#10b981' },
  { name: 'Índigo Executivo', value: '#6366f1' },
  { name: 'Azul Governamental', value: '#0c326f' },
  { name: 'Ciano Tecnológico', value: '#06b6d4' },
  { name: 'Âmbar Dourado', value: '#f59e0b' },
  { name: 'Rose / Carmim', value: '#e11d48' },
];

export const AdminSettings: React.FC<AdminSettingsProps> = ({ onAddToast }) => {
  const { config, updateConfig, resetConfig } = useAdminConfig();

  const [form, setForm] = useState<SystemBrandingConfig>({ ...config });
  const [activeTab, setActiveTab] = useState<'branding' | 'security' | 'notifications'>('branding');

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    enforce2FA: true,
    sessionTimeoutMinutes: 60,
    minPasswordLength: 8,
    maxLoginAttempts: 5,
  });

  // Notifications state
  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    webhookNotifications: true,
    weeklyReportDigest: true,
    loginNewDeviceAlert: true,
  });

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig(form);
    onAddToast({
      type: 'success',
      title: 'Configurações Salvas',
      message: 'A identidade visual e parâmetros do sistema foram atualizados.',
    });
  };

  const handleResetToDefault = () => {
    resetConfig();
    setForm({ ...config });
    onAddToast({
      type: 'info',
      title: 'Restaurado para Padrão',
      message: 'Tokens e configurações restaurados com sucesso.',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-500" />
            Configurações Globais & White-Label
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Personalize a identidade da plataforma, marca, paleta de cores corporativa, regras de segurança e notificações.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md hover:shadow-emerald-600/30"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('branding')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'branding'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Palette className="w-4 h-4" />
          Personalização & White-Label
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'security'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          Segurança & Sessões
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'notifications'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          Notificações & Alertas
        </button>
      </div>

      {/* Tab: Branding & White-Label */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layout className="w-4 h-4 text-emerald-500" />
              Identidade Visual & Textos da Aplicação
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Aplicação / Título Principal
                </label>
                <input
                  type="text"
                  value={form.appName}
                  onChange={(e) => setForm({ ...form, appName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subtítulo / Descritivo
                </label>
                <input
                  type="text"
                  value={form.appSubtitle}
                  onChange={(e) => setForm({ ...form, appSubtitle: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Empresa Proprietária / Mantenedora
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail de Suporte ao Usuário
                </label>
                <input
                  type="email"
                  value={form.supportEmail}
                  onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                URL do Logotipo Customizado (PNG / SVG)
              </label>
              <input
                type="url"
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://suaempresa.com/assets/logo.png"
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Color Presets */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Cor de Destaque Primário (Accent Theme)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm({ ...form, primaryColor: c.value })}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs text-left transition-all ${
                      form.primaryColor === c.value
                        ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/30 font-bold text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: c.value }}
                    />
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showPoweredBy}
                  onChange={(e) => setForm({ ...form, showPoweredBy: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Exibir assinatura "Powered by {form.companyName}" no rodapé do sistema</span>
              </label>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                Pré-Visualização do Branding
              </span>

              <div className="p-4 rounded-xl bg-slate-950 text-white border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: form.primaryColor }}
                  />
                  <span className="text-xs font-bold font-mono">
                    {form.appName || 'Nome do Painel'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {form.appSubtitle || 'Subtítulo do sistema'}
                </p>
                <div className="pt-2 border-t border-slate-800 flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Versão: {form.version}</span>
                  <span>{form.companyName}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400">
              💡 As cores e títulos configurados são aplicados automaticamente em todos os módulos e na sidebar.
            </div>
          </div>
        </div>
      )}

      {/* Tab: Security */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 max-w-2xl">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-500" />
            Políticas de Acesso & Segurança
          </h2>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">
                  Exigir Autenticação em Dois Fatores (2FA)
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Obrigatório para todos os usuários com papel de Administrador e Gestor.
                </span>
              </div>
              <input
                type="checkbox"
                checked={securitySettings.enforce2FA}
                onChange={(e) =>
                  setSecuritySettings({ ...securitySettings, enforce2FA: e.target.checked })
                }
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
            </label>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tempo Limite da Sessão (minutos)
                </label>
                <input
                  type="number"
                  value={securitySettings.sessionTimeoutMinutes}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      sessionTimeoutMinutes: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tamanho Mínimo da Senha
                </label>
                <input
                  type="number"
                  value={securitySettings.minPasswordLength}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      minPasswordLength: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Notifications */}
      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 max-w-2xl">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-500" />
            Canais de Notificação & Alertas
          </h2>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">
                  Alertas Críticos por E-mail
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Envio imediato de incidentes, falhas de API ou bloqueio de rate-limit.
                </span>
              </div>
              <input
                type="checkbox"
                checked={notificationSettings.emailAlerts}
                onChange={(e) =>
                  setNotificationSettings({ ...notificationSettings, emailAlerts: e.target.checked })
                }
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">
                  Resumo Semanal Executivo (Digest)
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Relatório consolidado de MRR, novos usuários e métricas aos domingos.
                </span>
              </div>
              <input
                type="checkbox"
                checked={notificationSettings.weeklyReportDigest}
                onChange={(e) =>
                  setNotificationSettings({
                    ...notificationSettings,
                    weeklyReportDigest: e.target.checked,
                  })
                }
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
