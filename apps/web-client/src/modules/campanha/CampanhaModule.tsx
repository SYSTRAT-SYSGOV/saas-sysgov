import React from 'react';
import ComCampanha from './components/ComCampanha';
import ModuloCampanhaMain from './ModuloCampanhaMain';

export const CampanhaModule: React.FC = () => (
  <ComCampanha>{(contexto) => <ModuloCampanhaMain contexto={contexto} />}</ComCampanha>
);

export default CampanhaModule;
