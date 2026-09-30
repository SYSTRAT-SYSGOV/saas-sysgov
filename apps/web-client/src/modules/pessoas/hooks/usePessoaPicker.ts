import { useCallback, useRef, useState } from 'react';
import { pessoasApi, erroApi, type PessoaCompacta } from '../api';
import type { PessoaPickerOption, NovoCadastroRapidoPessoaInput } from '@sysgov/ui';

export function usePessoaPicker(initialPessoaId?: number | null) {
  const [selectedPessoa, setSelectedPessoa] = useState<PessoaPickerOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, PessoaPickerOption[]>>(new Map());

  // Busca compacta com cache
  const buscarPessoas = useCallback(async (termo: string): Promise<PessoaPickerOption[]> => {
    const termoLimpo = termo.trim();
    if (!termoLimpo) {
      return [];
    }

    if (cacheRef.current.has(termoLimpo)) {
      return cacheRef.current.get(termoLimpo)!;
    }

    setLoading(true);
    setErro(null);
    try {
      const res = await pessoasApi.buscarCompacto(termoLimpo, 10);
      const options: PessoaPickerOption[] = (res.data ?? []).map((p: PessoaCompacta) => ({
        id: p.id,
        nome: p.nome,
        nome_social: p.nome_social,
        cpf_mascarado: p.cpf_mascarado,
        status: p.status,
      }));

      cacheRef.current.set(termoLimpo, options);
      return options;
    } catch (e) {
      const err = erroApi(e);
      setErro(err.mensagem);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega os dados de uma pessoa por ID para inicialização do picker
  const carregarPessoa = useCallback(async (id: number): Promise<PessoaPickerOption | null> => {
    setLoading(true);
    setErro(null);
    try {
      const p = await pessoasApi.obter(id);
      const option: PessoaPickerOption = {
        id: p.id,
        nome: p.nome,
        nome_social: p.nome_social,
        cpf_mascarado: p.cpf_mascarado,
        status: p.status,
      };
      setSelectedPessoa(option);
      return option;
    } catch (e) {
      const err = erroApi(e);
      setErro(err.mensagem);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Criação rápida inline
  const criarPessoaRapido = useCallback(async (dados: NovoCadastroRapidoPessoaInput): Promise<PessoaPickerOption> => {
    setLoading(true);
    setErro(null);
    try {
      const nova = await pessoasApi.criar({
        nome: dados.nome,
        cpf: dados.cpf,
        nome_social: dados.nome_social,
        data_nascimento: dados.data_nascimento,
        sexo: dados.sexo,
      });

      // Se tiver contato informado, adiciona em seguida
      if (dados.contato_tipo && dados.contato_valor) {
        try {
          await pessoasApi.adicionarContato(nova.id, {
            tipo: dados.contato_tipo,
            valor: dados.contato_valor,
            principal: true,
            autoriza_notificacoes: true,
          });
        } catch {
          // Contato é opcional no cadastro rápido, não falha o registro principal
        }
      }

      const option: PessoaPickerOption = {
        id: nova.id,
        nome: nova.nome,
        nome_social: nova.nome_social,
        cpf_mascarado: nova.cpf_mascarado,
        status: nova.status,
      };

      // Invalida cache para que novas buscas encontrem
      cacheRef.current.clear();
      setSelectedPessoa(option);
      return option;
    } catch (e) {
      const err = erroApi(e);
      setErro(err.mensagem);
      throw new Error(err.mensagem);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    selectedPessoa,
    setSelectedPessoa,
    buscarPessoas,
    carregarPessoa,
    criarPessoaRapido,
    loading,
    erro,
  };
}
