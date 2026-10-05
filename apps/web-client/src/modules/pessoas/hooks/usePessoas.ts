import { useCallback, useEffect, useState } from 'react';
import { pessoasApi, erroApi, type ErroApi, type Paginado, type Pessoa, type TipoVinculo, type TipoPessoa } from '../api';

export interface UsePessoasFiltros {
  busca: string;
  tipo: TipoPessoa | null;
  tipoVinculo: TipoVinculo | null;
  status: 'ativo' | 'inativo' | null;
  falecido: boolean | null;
  sexo: string | null;
  dataNascimentoDe: string;
  dataNascimentoAte: string;
  pagina: number;
  porPagina: number;
}

export function usePessoas(iniciais?: Partial<UsePessoasFiltros>) {
  const [busca, setBusca] = useState(iniciais?.busca ?? '');
  const [termoDebounce, setTermoDebounce] = useState(iniciais?.busca ?? '');
  const [tipo, setTipo] = useState<TipoPessoa | null>(iniciais?.tipo ?? null);
  const [tipoVinculo, setTipoVinculo] = useState<TipoVinculo | null>(iniciais?.tipoVinculo ?? null);
  const [status, setStatus] = useState<'ativo' | 'inativo' | null>(iniciais?.status ?? null);
  const [falecido, setFalecido] = useState<boolean | null>(iniciais?.falecido ?? null);
  const [sexo, setSexo] = useState<string | null>(iniciais?.sexo ?? null);
  const [dataNascimentoDe, setDataNascimentoDe] = useState(iniciais?.dataNascimentoDe ?? '');
  const [dataNascimentoAte, setDataNascimentoAte] = useState(iniciais?.dataNascimentoAte ?? '');
  const [pagina, setPagina] = useState(iniciais?.pagina ?? 1);
  const [porPagina, setPorPagina] = useState(iniciais?.porPagina ?? 20);

  const [resultado, setResultado] = useState<Paginado<Pessoa> | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setTermoDebounce(busca);
    }, 300);
    return () => clearTimeout(handler);
  }, [busca]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await pessoasApi.listar({
        q: termoDebounce.trim() || undefined,
        tipo: tipo || undefined,
        tipo_vinculo: tipoVinculo || undefined,
        status: status || undefined,
        falecido: falecido === null ? undefined : falecido,
        sexo: sexo || undefined,
        data_nascimento_de: dataNascimentoDe || undefined,
        data_nascimento_ate: dataNascimentoAte || undefined,
        page: pagina,
        per_page: porPagina,
      });
      setResultado(dados);
    } catch (e) {
      setErro(erroApi(e));
    } finally {
      setCarregando(false);
    }
  }, [termoDebounce, tipo, tipoVinculo, status, falecido, sexo, dataNascimentoDe, dataNascimentoAte, pagina, porPagina]);

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
    pessoas: resultado?.data ?? [],
    carregando,
    loading: carregando,
    erro,
    error: erro?.mensagem ?? null,
    exportando,
    page: pagina,
    lastPage: resultado?.last_page ?? 1,
    totalPages: resultado?.last_page ?? 1,
    total: resultado?.total ?? 0,
    goToPage: (p: number) => setPagina(p),
    setBusca,
    filtros: {
      busca,
      setBusca,
      tipo,
      setTipo,
      tipoVinculo,
      setTipoVinculo,
      status,
      setStatus,
      falecido,
      setFalecido,
      sexo,
      setSexo,
      dataNascimentoDe,
      setDataNascimentoDe,
      dataNascimentoAte,
      setDataNascimentoAte,
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
