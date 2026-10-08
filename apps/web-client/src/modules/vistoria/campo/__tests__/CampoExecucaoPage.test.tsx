import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as syncEngine from '../syncEngine';
import { CampoExecucaoPage } from '../CampoExecucaoPage';
import type { OrdemServico, ModeloFormulario } from '../../api';

const ordemMock: OrdemServico = {
  id: 1,
  tenant_id: 1,
  local_id: 10,
  org_unit_id: 20,
  fiscal_id: 30,
  tipo_acao: 'vistoria_rotina',
  criticidade: 'alta',
  status: 'agendada',
  resultado: null,
  data_prevista: '2026-11-01',
  roteiro_deslocamento: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  local: { id: 10, nome: 'Fazenda Teste' },
};

const formularioMock: ModeloFormulario = {
  id: 1,
  tenant_id: 1,
  tipo_fiscalizacao: 'agroindustria',
  nome: 'Checklist Agroindústria',
  descricao: null,
  ativo: true,
  perguntas_ativas: [
    { id: 1, tenant_id: 1, modelo_id: 1, enunciado: 'Possui alvará vigente?', tipo: 'multipla_escolha', opcoes: ['Sim', 'Não'], obrigatoria: true, ordem: 1, ativo: true },
    { id: 2, tenant_id: 1, modelo_id: 1, enunciado: 'Observações gerais', tipo: 'texto_livre', opcoes: null, obrigatoria: false, ordem: 2, ativo: true },
  ],
};

describe('CampoExecucaoPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('sysgov_auth_token', 'token-de-teste');
    vi.restoreAllMocks();
    // jsdom não implementa scrollIntoView, usado pelo Radix Select ao abrir o dropdown.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renderiza o checklist dinâmico do formulário', () => {
    render(<CampoExecucaoPage ordem={ordemMock} formulario={formularioMock} onBack={vi.fn()} onEnfileirado={vi.fn()} />);

    expect(screen.getByText(/Possui alvará vigente\?/)).toBeInTheDocument();
    expect(screen.getByText(/Observações gerais/)).toBeInTheDocument();
  });

  it('bloqueia a conclusão quando falta responder pergunta obrigatória', async () => {
    const spy = vi.spyOn(syncEngine, 'enqueueExecucao');

    render(<CampoExecucaoPage ordem={ordemMock} formulario={formularioMock} onBack={vi.fn()} onEnfileirado={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /concluir e enfileirar/i }));

    expect(await screen.findByText(/Responda as perguntas obrigatórias/i)).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it('enfileira a execução com as respostas quando todas as obrigatórias são respondidas', async () => {
    const onEnfileirado = vi.fn();
    render(<CampoExecucaoPage ordem={ordemMock} formulario={formularioMock} onBack={vi.fn()} onEnfileirado={onEnfileirado} />);

    const select = screen.getByRole('combobox');
    fireEvent.click(select);
    fireEvent.click(await screen.findByText('Sim'));

    // registrarResposta() é assíncrono (aguarda a geolocalização) — espera o
    // valor realmente refletir no estado do componente antes de concluir.
    await waitFor(() => expect(select).toHaveTextContent('Sim'));

    fireEvent.click(screen.getByRole('button', { name: /concluir e enfileirar/i }));

    await waitFor(() => expect(onEnfileirado).toHaveBeenCalled());
  });

  it('usa o formulário mínimo (observação livre) quando não há checklist aplicável', () => {
    render(<CampoExecucaoPage ordem={ordemMock} formulario={null} onBack={vi.fn()} onEnfileirado={vi.fn()} />);

    expect(screen.getByPlaceholderText(/Descreva o que foi observado/i)).toBeInTheDocument();
  });
});
