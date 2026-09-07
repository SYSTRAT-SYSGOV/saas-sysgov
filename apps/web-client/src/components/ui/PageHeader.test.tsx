import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';
import { FileText, Download, Plus } from 'lucide-react';

describe('PageHeader', () => {
  it('renders title correctly', () => {
    render(<PageHeader title="Meu Título" />);
    expect(screen.getByText('Meu Título')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Título" subtitle="Subtítulo descritivo" />);
    expect(screen.getByText('Subtítulo descritivo')).toBeInTheDocument();
  });

  it('renders badge when provided', () => {
    render(<PageHeader title="Título" badge="Badge Text" />);
    expect(screen.getByText('Badge Text')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<PageHeader title="Título" icon={<FileText data-testid="icon" />} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    render(
      <PageHeader
        title="Título"
        actions={
          <>
            <button>Action 1</button>
            <button>Action 2</button>
          </>
        }
      />
    );
    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
  });

  it('renders without subtitle when not provided', () => {
    render(<PageHeader title="Apenas Título" />);
    expect(screen.getByText('Apenas Título')).toBeInTheDocument();
  });
});
