import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vistoriaApi } from '../../api';
import { campoDB } from '../db';
import { enqueueExecucao, processarFila, contarPendentes } from '../syncEngine';

describe('campo/syncEngine', () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('sysgov_auth_token', 'token-de-teste');
    await campoDB.filaSincronizacao.clear();
    vi.restoreAllMocks();
  });

  it('enfileira uma execução e a processa com sucesso, marcando como sincronizado', async () => {
    const spy = vi.spyOn(vistoriaApi, 'sincronizarExecucao').mockResolvedValue({ data: {} } as any);

    const clientUuid = await enqueueExecucao(42, { dados: { observacao: 'Tudo ok' } });
    expect(await contarPendentes()).toBe(1);

    const resultado = await processarFila();

    expect(resultado).toEqual({ enviados: 1, falhas: 0 });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ client_uuid: clientUuid, ordem_servico_id: 42 }),
      clientUuid,
    );

    const item = await campoDB.filaSincronizacao.get(clientUuid);
    expect(item?.status).toBe('sincronizado');
    expect(await contarPendentes()).toBe(0);
  });

  it('mantém o item pendente e incrementa tentativas quando o envio falha', async () => {
    vi.spyOn(vistoriaApi, 'sincronizarExecucao').mockRejectedValue(new Error('Rede indisponível'));

    const clientUuid = await enqueueExecucao(7, { dados: { observacao: 'Falha de rede' } });
    const resultado = await processarFila();

    expect(resultado).toEqual({ enviados: 0, falhas: 1 });

    const item = await campoDB.filaSincronizacao.get(clientUuid);
    expect(item?.status).toBe('pendente');
    expect(item?.tentativas).toBe(1);
    expect(item?.ultimoErro).toContain('Rede indisponível');
  });

  it('não reenvia um item já sincronizado ao reprocessar a fila', async () => {
    const spy = vi.spyOn(vistoriaApi, 'sincronizarExecucao').mockResolvedValue({ data: {} } as any);

    await enqueueExecucao(1, { dados: {} });
    await processarFila();
    expect(spy).toHaveBeenCalledTimes(1);

    const segundoResultado = await processarFila();

    expect(segundoResultado).toEqual({ enviados: 0, falhas: 0 });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('continua processando os demais itens quando um falha', async () => {
    const spy = vi
      .spyOn(vistoriaApi, 'sincronizarExecucao')
      .mockRejectedValueOnce(new Error('Falha no primeiro'))
      .mockResolvedValueOnce({ data: {} } as any);

    await enqueueExecucao(1, { dados: {} });
    await enqueueExecucao(2, { dados: {} });

    const resultado = await processarFila();

    expect(resultado).toEqual({ enviados: 1, falhas: 1 });
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
