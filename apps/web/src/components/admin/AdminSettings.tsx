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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-6 rounded-2xl border border-border  shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            White-Label &amp; Identidade Visual
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Personalize a marca e a paleta de cores do painel. As preferências ficam salvas apenas neste navegador; não
            valem para outros usuários nem outros dispositivos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-muted hover:bg-accent  text-foreground  border border-border  transition-colors shadow-sm"
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
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layout className="w-4 h-4 text-primary" />
              Identidade Visual & Textos da Aplicação
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nome da Aplicação / Título Principal
                </label>
                <input
                  type="text"
                  value={form.appName}
                  onChange={(e) => setForm({ ...form, appName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-muted border border-border  text-foreground  focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Subtítulo / Descritivo
                </label>
                <input
                  type="text"
                  value={form.appSubtitle}
                  onChange={(e) => setForm({ ...form, appSubtitle: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-muted border border-border  text-foreground  focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Empresa Proprietária / Mantenedora
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-muted border border-border  text-foreground  focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  E-mail de Suporte ao Usuário
                </label>
                <input
                  type="email"
                  value={form.supportEmail}
                  onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-muted border border-border  text-foreground  font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                URL do Logotipo Customizado (PNG / SVG)
              </label>
              <input
                type="url"
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://suaempresa.com/assets/logo.png"
                className="w-full px-3 py-2 text-xs rounded-lg bg-muted border border-border  text-foreground  font-mono focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showPoweredBy}
                  onChange={(e) => setForm({ ...form, showPoweredBy: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>Exibir assinatura "Powered by {form.companyName}" no rodapé do sistema</span>
              </label>
            </div>
          </Card>

          {/* Live Preview Card */}
          <Card className="p-6 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-3">
                Pré-Visualização do Branding
              </span>

              <div className="p-4 rounded-xl bg-gov-alternative text-white border border-white/20 space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: form.primaryColor }}
                  />
                  <span className="text-xs font-bold font-mono">
                    {form.appName || 'Nome do Painel'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {form.appSubtitle || 'Subtítulo do sistema'}
                </p>
                <div className="pt-2 border-t border-border flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>Versão: {form.version}</span>
                  <span>{form.companyName}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-muted text-xs text-muted-foreground ">
              💡 As cores e títulos configurados são aplicados automaticamente em todos os módulos e na sidebar.
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};
