import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[500px] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-full bg-[#E8F0FE] flex items-center justify-center text-gov-primary">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold font-mono text-gov-text-primary">
        404 — Página Não Encontrada
      </h1>
      <p className="text-sm text-gov-text-secondary max-w-md">
        A rota solicitada não existe ou você não possui permissão de módulo concedida para este município.
      </p>
      <div className="pt-2">
        <Link to="/">
          <Button variant="primary" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Voltar ao Painel Geral
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
