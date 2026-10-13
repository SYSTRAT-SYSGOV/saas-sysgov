import React from 'react';
import ModuloFormaturaMain from './ModuloFormaturaMain';
import ComEscola from '../escola/components/ComEscola';

export const FormaturaModule: React.FC = () => {
  return (
    <ComEscola modulo="formatura">
      <ModuloFormaturaMain />
    </ComEscola>
  );
};

export default FormaturaModule;
