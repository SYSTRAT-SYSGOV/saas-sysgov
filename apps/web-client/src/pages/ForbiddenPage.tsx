import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="max-w-md p-8 text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-8 w-8" />
        </span>
        <h1 className="mb-2 text-2xl font-bold text-foreground">Acesso Negado</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Você não tem permissão para acessar este recurso. Se você acredita que isso é um erro, entre em contato com o administrador do sistema.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Voltar
          </Button>
          <Button variant="primary" onClick={() => navigate('/')}>
            Painel Geral
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ForbiddenPage;