import React, { useState } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  CheckCircle2,
  Layout,
} from 'lucide-react';
import { useAdminConfig } from '../../contexts/AdminConfigContext';
import { SystemBrandingConfig } from '../../types/admin';
import { ADMIN_THEMES } from '../../config/adminThemes';
import { Card } from '@sysgov/ui';

interface AdminSettingsProps {
  onAddToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ onAddToast }) => {
  const { config, updateConfig, resetConfig } = useAdminConfig();

  const [form, setForm] = useState<SystemBrandingConfig>({ ...config });

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig(form);
    onAddToast({
      type: 'success',
      title: 'Configurações Salvas',
      message: 'A identidade visual foi salva neste navegador.',
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
            White-Label &amp; Identidade Visual
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Personalize a marca e a paleta de cores do painel. As preferências ficam salvas apenas neste navegador; não
            valem para outros usuários nem outros dispositivos.
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-primary-foreground transition-all shadow-md"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>

      {/* Tab: Branding & White-Label */}
      {(
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layout className="w-4 h-4 text-primary" />
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
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
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
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
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
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
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
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-primary focus:outline-none"
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
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Theme Presets (Accent Theme) */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Tema do Admin (Accent Theme)
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
                Escolha a cor de destaque do painel e o contraste do menu lateral em relação ao restante da
                tela (primeira bolinha). Cada tema funciona tanto no modo claro quanto no escuro — o
                alternador de tema (ícone de sol/lua no cabeçalho) continua controlando claro/escuro do
                conteúdo, independentemente do tema escolhido aqui.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ADMIN_THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm({ ...form, themeId: t.id, primaryColor: t.swatchLight })}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-xs text-left transition-all ${
                      form.themeId === t.id
                        ? 'border-primary bg-primary/5 font-bold text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span className="flex shrink-0 -space-x-1.5 mt-0.5">
                      <span
                        className="w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"
                        style={{ backgroundColor: t.sidebarSwatch }}
                        title={t.sidebarSurface === 'dark' ? 'Menu lateral sempre escuro' : 'Menu lateral sempre claro'}
                      />
                      <span
                        className="w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"
                        style={{ backgroundColor: t.swatchLight }}
                        title="Destaque no modo claro"
                      />
                      <span
                        className="w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"
                        style={{ backgroundColor: t.swatchDark }}
                        title="Destaque no modo escuro"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate">{t.name}</span>
                      <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                        {t.description}
                      </span>
                    </span>
                    {form.themeId === t.id && (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 ml-auto" />
                    )}
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
                  className="rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span>Exibir assinatura "Powered by {form.companyName}" no rodapé do sistema</span>
              </label>
            </div>
          </Card>

          {/* Live Preview Card */}
          <Card className="p-6 flex flex-col justify-between">
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
          </Card>
        </div>
      )}

    </div>
  );
};
