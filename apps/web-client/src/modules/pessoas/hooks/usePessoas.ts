import { useCallback, useEffect, useState } from 'react';
import { pessoasApi, erroApi, type ErroApi, type Paginado, type Pessoa, type TipoVinculo } from '../api';

export interface UsePessoasFiltros {
  busca: string;
  tipoVinculo: TipoVinculo | null;
  status: 'ativo' | 'inativo' | null;
  pagina: number;
  porPagina: number;
}

export function usePessoas(iniciais?: Partial<UsePessoasFiltros>) {
  const [busca, setBusca] = useState(iniciais?.busca ?? '');
  const [tipoVinculo, setTipoVinculo] = useState<TipoVinculo | null>(iniciais?.tipoVinculo ?? null);
  const [status, setStatus] = useState<'ativo' | 'inativo' | null>(iniciais?.status ?? null);
  const [pagina, setPagina] = useState(iniciais?.pagina ?? 1);
  const [porPagina, setPorPagina] = useState(iniciais?.porPagina ?? 50);

  const [resultado, setResultado] = useState<Paginado<Pessoa> | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [exportando, setExportando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await pessoasApi.listar({
        q: busca.trim() || undefined,
        tipo_vinculo: tipoVinculo || undefined,
        status: status || undefined,
        page: pagina,
        per_page: porPagina,
      });
      setResultado(dados);
    } catch (e) {
      setErro(erroApi(e));
    } finally {
      setCarregando(false);
    }
  }, [busca, tipoVinculo, status, pagina, porPagina]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const exportarCsv = useCallback(async () => {
    setExportando(true);
    setErro(null);
    try {
      await pessoasApi.exportarCsv();
    } catch (e) {
      setErro(erroApi(e));
    } finally {
      setExportando(false);
    }
  }, []);

  const importarPorCpf = useCallback(async (cpf: string) => {
    setErro(null);
    try {
      const res = await pessoasApi.importar(cpf);
      return res;
    } catch (e) {
      const err = erroApi(e);
      setErro(err);
      throw err;
    }
  }, []);

  const excluirPessoa = useCallback(async (id: number) => {
    setErro(null);
    try {
      await pessoasApi.excluir(id);
      await carregar();
      return true;
    } catch (e) {
      const err = erroApi(e);
      setErro(err);
      throw err;
    }
  }, [carregar]);

  return {
    resultado,
    carregando,
    erro,
    exportando,
    filtros: {
      busca,
      setBusca,
      tipoVinculo,
      setTipoVinculo,
      status,
      setStatus,
      pagina,
      setPagina,
      porPagina,
      setPorPagina,
    },
    recarregar: carregar,
    exportarCsv,
    importarPorCpf,
    excluirPessoa,
  };
}
