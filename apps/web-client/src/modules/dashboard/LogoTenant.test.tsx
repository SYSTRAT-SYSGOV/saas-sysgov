import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LogoTenant } from './LogoTenant';

describe('LogoTenant', () => {
  afterEach(cleanup);

  it('mostra o logo do tenant quando existe', () => {
    render(<LogoTenant src="https://x.test/logo.png" nome="Prefeitura de Araucária" />);
    expect(screen.getByRole('img', { name: 'Logo de Prefeitura de Araucária' })).toHaveAttribute('src', 'https://x.test/logo.png');
    expect(screen.queryByTestId('logo-tenant-inicial')).not.toBeInTheDocument();
  });

  it('sem logo, mostra a inicial do nome do órgão', () => {
    render(<LogoTenant nome="prefeitura de araucária" />);
    expect(screen.getByTestId('logo-tenant-inicial')).toHaveTextContent('P');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('se a imagem falhar ao carregar, cai na inicial', () => {
    render(<LogoTenant src="https://x.test/quebrado.png" nome="Câmara" />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByTestId('logo-tenant-inicial')).toHaveTextContent('C');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('sem nome nem logo, usa uma inicial neutra', () => {
    render(<LogoTenant />);
    expect(screen.getByTestId('logo-tenant-inicial')).toHaveTextContent('S');
  });
});
