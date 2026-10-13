import { vistoriaApi, type PacoteDoDiaItem } from '../api';
import { campoDB } from './db';
import { deriveKey, encryptJson, decryptJson } from './crypto';

/**
 * Baixa o pacote do dia (ordens do fiscal + histórico dos locais) e grava
 * criptografado no IndexedDB, para acesso offline no dispositivo.
 */
export async function baixarPacoteDoDia(): Promise<PacoteDoDiaItem[]> {
  const { data } = await vistoriaApi.obterPacoteDoDia();
  const chave = await deriveKey();
  const baixadoEm = new Date().toISOString();

  await campoDB.pacoteDoDia.clear();

  for (const item of data.ordens) {
    const { cipher, iv } = await encryptJson(item, chave);
    await campoDB.pacoteDoDia.put({
      ordemServicoId: item.ordem.id,
      payloadCriptografado: cipher,
      iv,
      baixadoEm,
    });
  }

  return data.ordens;
}

/** Lê e descriptografa o pacote já baixado — funciona totalmente offline. */
export async function obterPacoteLocal(): Promise<PacoteDoDiaItem[]> {
  const itens = await campoDB.pacoteDoDia.toArray();
  if (itens.length === 0) {
    return [];
  }

  const chave = await deriveKey();

  return Promise.all(
    itens.map((item) => decryptJson<PacoteDoDiaItem>({ cipher: item.payloadCriptografado, iv: item.iv }, chave)),
  );
}
