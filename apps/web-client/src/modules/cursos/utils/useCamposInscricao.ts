import { useCallback, useEffect, useState } from 'react';
import { sysgovApi, type CampoInscricao, type RespostaInscricaoInput } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { validarRespostas } from './validacoes';

/**
 * Campos extras do formulário de inscrição (design D9) de um curso, carregados sob demanda
 * (só quando `open`) e só os `ativo` — campo desativado não é pedido em inscrições novas, mesma
 * regra do backend (`RespostaInscricaoService::gravar`).
 */
export function useCamposInscricao(cursoId: number | null, open: boolean) {
  const [campos, setCampos] = useState<CampoInscricao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [valores, setValores] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!open || cursoId === null) return;
    setCarregando(true);
    setErroCarga(null);
    setValores({});
    sysgovApi.cursos
      .listarCamposInscricao(cursoId)
      .then((lista) => setCampos(lista.filter((c) => c.ativo)))
      .catch((e) => setErroCarga(getApiErrorMessage(e, 'Não foi possível carregar o formulário de inscrição.')))
      .finally(() => setCarregando(false));
  }, [cursoId, open]);

  const setValor = useCallback((campoId: number, valor: string) => setValores((v) => ({ ...v, [campoId]: valor })), []);

  const validar = useCallback(() => validarRespostas(campos, valores), [campos, valores]);

  /** Caixa de marcação sempre vai ("sim"/"nao"); os demais só quando respondidos (design D9: vazio = não respondido). */
  const respostas = useCallback(
    (): RespostaInscricaoInput[] =>
      campos
        .map((c) => ({ campo_id: c.id, valor: c.tipo === 'caixa_marcacao' ? (valores[c.id] ?? 'nao') : (valores[c.id] ?? '') }))
        .filter((r) => r.valor !== ''),
    [campos, valores],
  );

  return { campos, carregando, erroCarga, valores, setValor, validar, respostas };
}
