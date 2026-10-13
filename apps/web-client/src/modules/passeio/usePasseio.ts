import { escolaApi, type Turma } from '../escola/api';
import { useCarga } from '../escola/useCarga';
import { passeioApi, type Indicadores, type Inscricao, type MapaAssentos, type Passeio, type Veiculo } from './api';

export interface DadosPasseioAtivo {
  passeio: Passeio;
  inscricoes: Inscricao[];
  veiculos: Veiculo[];
  mapas: MapaAssentos[];
  indicadores: Indicadores;
  /** Turmas do Cadastro Escolar do ano letivo do passeio. */
  turmas: Turma[];
}

/** Lista de passeios da escola, indicadores gerais e o nome da escola (cabeçalho das impressões). */
export function usePasseios() {
  return useCarga(async () => {
    const [passeios, indicadores, escolas] = await Promise.all([passeioApi.passeios(), passeioApi.indicadores(), escolaApi.minhasEscolas('passeio')]);
    return { passeios, indicadores, escolas };
  }, []);
}

/** Tudo do passeio ativo — um único ponto de carga das abas que dependem dele. */
export function usePasseioAtivo(passeio: Passeio | null) {
  const id = passeio?.id ?? null;
  return useCarga<DadosPasseioAtivo | null>(async () => {
    if (passeio === null) return null;
    const ano = Number(passeio.data_passeio.slice(0, 4));
    const [inscricoes, veiculos, indicadores, turmas] = await Promise.all([
      passeioApi.inscricoes(passeio.id),
      passeioApi.veiculos(passeio.id),
      passeioApi.indicadores(passeio.id),
      escolaApi.turmas({ ano_letivo: ano }),
    ]);
    const mapas = await Promise.all(veiculos.map((v) => passeioApi.assentos(v.id)));
    return { passeio, inscricoes, veiculos, mapas, indicadores, turmas };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, passeio?.data_passeio]);
}
