import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sysgov/ui';

function Exemplo() {
  const [aba, setAba] = useState('a');
  return (
    <Tabs value={aba} onValueChange={setAba}>
      <TabsList>
        <TabsTrigger value="a">Primeira</TabsTrigger>
        <TabsTrigger value="b">Segunda</TabsTrigger>
      </TabsList>
      <TabsContent value="a">Conteúdo A</TabsContent>
      <TabsContent value="b">Conteúdo B</TabsContent>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('mostra só o conteúdo da aba ativa e troca ao clicar', () => {
    render(<Exemplo />);
    expect(screen.getByText('Conteúdo A')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo B')).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Segunda' }));
    expect(screen.getByText('Conteúdo B')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Segunda' })).toHaveAttribute('data-state', 'active');
  });
});
