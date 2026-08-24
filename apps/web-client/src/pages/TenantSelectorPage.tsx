import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/useAuth';
import { Building2, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui';

export const TenantSelectorPage: React.FC = () => {
  const { tenants, tenant: currentTenant, switchTenant } = useAuth();
  const navigate = useNavigate();

  const handleSelect = async (tenantId: number) => {
    await switchTenant(tenantId);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gov-page flex items-center justify-center p-4 selection:bg-gov-primary selection:text-white">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gov-primary-light text-gov-primary mb-1">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gov-text-primary">
            Selecione o Município / Órgão
          </h1>
          <p className="text-xs sm:text-sm text-gov-text-secondary">
            Seu usuário possui acesso a múltiplos órgãos vinculados no SYSGOV
          </p>
        </div>

        <div className="space-y-3">
          {tenants.map((t) => (
            <Card
              key={t.id}
              onClick={() => handleSelect(t.id)}
              className={`cursor-pointer transition-all hover:border-gov-primary hover:shadow-md ${
                t.id === currentTenant?.id ? 'border-2 border-gov-primary bg-gov-primary-light/30' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-white border border-gov-border flex items-center justify-center font-bold text-gov-primary font-mono text-sm">
                    {t.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gov-text-primary">
                      {t.name}
                    </h3>
                    <span className="font-mono text-[10px] text-gov-text-muted uppercase">
                      Tipo: {t.type}
                    </span>
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-gov-text-muted group-hover:text-gov-primary" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TenantSelectorPage;
