import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { escolaApi, type MembroEquipe } from '../api';
import { EquipeCargo } from './EquipeCargo';

vi.mock('../api', async (original) => ({
  ...(await original<typeof import('../api')>()),
  escolaApi: { salvarMembroEquipe: vi.fn().mockResolvedValue({}), excluirMembroEquipe: vi.fn().mockResolvedValue(undefined) },
}));

const membro = (id: number, nome: string, cargo: MembroEquipe['cargo']): MembroEquipe => ({ id, nome, cargo, ordem: 0 });

describe('EquipeCargo', () => {
  it('cadastra um nome no cargo e avisa a tela para recarregar', async () => {
    const onAlterado = vi.fn().mockResolvedValue(undefined);
    render(<EquipeCargo titulo="Diretores auxiliares" cargo="diretor_auxiliar" membros={[]} onToast={vi.fn()} onAlterado={onAlterado} />);
    fireEvent.change(screen.getByPlaceholderText('Nome completo'), { target: { value: 'Paulo Auxiliar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() => expect(escolaApi.salvarMembroEquipe).toHaveBeenCalledWith(null, { nome: 'Paulo Auxiliar', cargo: 'diretor_auxiliar' }));
    expect(onAlterado).toHaveBeenCalled();
  });

  it('cargo único não oferece um segundo cadastro', () => {
    render(<EquipeCargo titulo="Diretor" cargo="diretor" unico membros={[membro(1, 'Maria', 'diretor')]} onToast={vi.fn()} onAlterado={vi.fn()} />);
    expect(screen.getByText('Maria')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar' })).not.toBeInTheDocument();
  });
});
