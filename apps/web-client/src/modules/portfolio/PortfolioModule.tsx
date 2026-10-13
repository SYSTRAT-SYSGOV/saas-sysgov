import React from 'react';
import ComEscola from '../escola/components/ComEscola';
import ModuloPortfolioMain from './ModuloPortfolioMain';

export const PortfolioModule: React.FC = () => (
  <ComEscola modulo="portfolio">
    <ModuloPortfolioMain />
  </ComEscola>
);

export default PortfolioModule;
