import { vistoriaApi } from '../api';
import { campoDB, type ItemFilaSincronizacao } from './db';
import { deriveKey, encryptJson, decryptJson } from './crypto';

export interface DadosExecucaoOffline {
  dados?: Record<string, unknown> | null;
  iniciadoEmDispositivo?: string | null;
  concluidoEmDispositivo?: string | null;
}

/** Enfileira uma execução coletada em campo para sincronização posterior. */
export async function enqueueExecucao(ordemServicoId: number, dados: DadosExecucaoOffline): Promise<string> {
  const clientUuid = crypto.randomUUID();
  const chave = await deriveKey();
  const { cipher, iv } = await encryptJson({ ordemServicoId, ...dados }, chave);

  const item: ItemFilaSincronizacao = {
    clientUuid,
    ordemServicoId,
    status: 'pendente',
    payloadCriptografado: cipher,
    iv,
    criadoEm: new Date().toISOString(),
    tentativas: 0,
  };

  await campoDB.filaSincronizacao.put(item);

  return clientUuid;
}

export interface ResultadoProcessamentoFila {
  enviados: number;
  falhas: number;
}

/**
 * Processa a fila de execuções pendentes, enviando cada uma com seu `client_uuid`
 * como `Idempotency-Key`. Uma falha em um item não interrompe o processamento dos
 * demais; o item falho permanece `pendente` (incrementando `tentativas`) para a
 * próxima tentativa.
 */
export async function processarFila(): Promise<ResultadoProcessamentoFila> {
  const pendentes = await campoDB.filaSincronizacao.where('status').equals('pendente').toArray();

  let enviados = 0;
  let falhas = 0;

  if (pendentes.length === 0) {
    return { enviados, falhas };
  }

  const chave = await deriveKey();

  for (const item of pendentes) {
    await campoDB.filaSincronizacao.update(item.clientUuid, { status: 'enviando' });

    try {
      const dados = await decryptJson<DadosExecucaoOffline & { ordemServicoId: number }>(
        { cipher: item.payloadCriptografado, iv: item.iv },
        chave,
      );

      await vistoriaApi.sincronizarExecucao(
        {
          client_uuid: item.clientUuid,
          ordem_servico_id: item.ordemServicoId,
          dados: dados.dados,
          iniciado_em_dispositivo: dados.iniciadoEmDispositivo,
          concluido_em_dispositivo: dados.concluidoEmDispositivo,
        },
        item.clientUuid,
      );

      await campoDB.filaSincronizacao.update(item.clientUuid, { status: 'sincronizado' });
      enviados += 1;
    } catch (erro) {
      await campoDB.filaSincronizacao.update(item.clientUuid, {
        status: 'pendente',
        tentativas: item.tentativas + 1,
        ultimoErro: erro instanceof Error ? erro.message : 'Falha desconhecida ao sincronizar.',
      });
      falhas += 1;
    }
  }

  return { enviados, falhas };
}

export async function contarPendentes(): Promise<number> {
  return campoDB.filaSincronizacao.where('status').equals('pendente').count();
}
