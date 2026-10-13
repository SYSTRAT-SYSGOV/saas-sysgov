import React from 'react';
import ModuloPasseioMain from './ModuloPasseioMain';
import ComEscola from '../escola/components/ComEscola';

export const PasseioModule: React.FC = () => {
  return (
    <ComEscola modulo="passeio">
      <ModuloPasseioMain />
    </ComEscola>
  );
};

export default PasseioModule;
