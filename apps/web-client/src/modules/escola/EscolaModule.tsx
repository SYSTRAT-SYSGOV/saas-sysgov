import React from 'react';

import { useAuth } from '@/core/auth/AuthProvider';
import AdminPainel from './components/AdminPainel';
import ComEscola from './components/ComEscola';
import EscolasAdmin from './components/EscolasAdmin';
import { Avisos, useAvisos } from './components/Avisos';

/** Cadastro Escolar — tela própria do módulo Escola (base de Pedagógico, Formatura e Passeio). */
export const EscolaModule: React.FC = () => {
  const { avisos, avisar } = useAvisos();
  const { permissions } = useAuth();
  const gerenciaEscolas = permissions.includes('*') || permissions.includes('escola.escolas.manage');

  return (
    <div className="relative">
      <Avisos avisos={avisos} />
      <ComEscola
        modulo="escola"
        // Sem nenhuma escola, o painel (onde fica a aba Escolas) não abriria: quem gerencia escolas
        // precisa conseguir cadastrar a primeira.
        semEscolas={
          gerenciaEscolas
            ? (recarregar) => (
                <div className="mx-auto max-w-4xl space-y-4 p-6">
                  <p className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                    Nenhuma escola cadastrada ainda. Cadastre a primeira escola para liberar os demais cadastros do módulo.
                  </p>
                  <EscolasAdmin onToast={avisar} onAlterado={recarregar} />
                </div>
              )
            : undefined
        }
      >
        <AdminPainel onToast={avisar} />
      </ComEscola>
    </div>
  );
};

export default EscolaModule;
