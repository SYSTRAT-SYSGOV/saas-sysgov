import React from 'react';

import AdminPainel from './components/AdminPainel';
import ComEscola from './components/ComEscola';
import { Avisos, useAvisos } from './components/Avisos';

/** Cadastro Escolar — tela própria do módulo Escola (base de Pedagógico, Formatura e Passeio). */
export const EscolaModule: React.FC = () => {
  const { avisos, avisar } = useAvisos();

  return (
    <div className="relative">
      <Avisos avisos={avisos} />
      <ComEscola modulo="escola">
        <AdminPainel onToast={avisar} />
      </ComEscola>
    </div>
  );
};

export default EscolaModule;
