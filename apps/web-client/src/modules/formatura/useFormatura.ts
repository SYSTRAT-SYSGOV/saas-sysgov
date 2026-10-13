import { escolaApi, type Turma } from '../escola/api';
import { useCarga } from '../escola/useCarga';
import { formaturaApi, type Configuracao, type Formando } from './api';

export interface DadosFormatura {
  ano: number;
  configuracao: Configuracao | null;
  formandos: Formando[];
  turmasDoAno: Turma[];
}

/** Configuração, formandos e turmas do Cadastro Escolar do ano letivo — um único ponto de carga do módulo. */
export function useFormatura(ano: number) {
  return useCarga<DadosFormatura>(async () => {
    const [configuracao, turmasDoAno] = await Promise.all([formaturaApi.configuracao(ano), escolaApi.turmas({ ano_letivo: ano })]);
    const temTurmas = (configuracao?.turmas_ids ?? []).length > 0;
    const formandos = configuracao && temTurmas ? await formaturaApi.formandos(ano) : [];
    return { ano, configuracao, formandos, turmasDoAno };
  }, [ano]);
}
