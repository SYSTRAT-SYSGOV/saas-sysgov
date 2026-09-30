import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import { IntegracoesPanel } from './IntegracoesPanel';
import { PromoverPessoaModal } from './PromoverPessoaModal';
import { pessoasApi, type Pessoa } from './api';
import { PessoasListView, PessoaDetailView } from './views';

/** Módulo de Cadastro de Pessoas Físicas (servidores e munícipes) — Master Data (MDM) do SYSGOV. */
export const PessoasModule: React.FC = () => {
  const { can } = useCan();
  const [visao, setVisao] = useState<'pessoas' | 'integracoes'>('pessoas');
  const [pessoaDetalhe, setPessoaDetalhe] = useState<Pessoa | null>(null);
  const [pessoaPromovendo, setPessoaPromovendo] = useState<Pessoa | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);

  const podeGerenciar = can('cadastros.pessoas.update');
  const podeImportar = can('cadastros.pessoas.import');
  const podePromover = can('cadastros.pessoas.promote');
  const podeExcluir = can('cadastros.pessoas.delete');
  const podeGerenciarIntegracoes = can('cadastros.pessoas.integracoes.manage');

  const abrirDetalhe = async (pessoa: Pessoa) => {
    const detalhe = await pessoasApi.obter(pessoa.id);
    setPessoaDetalhe(detalhe);
  };

  const recarregarDetalhe = async () => {
    if (pessoaDetalhe) {
      const atualizada = await pessoasApi.obter(pessoaDetalhe.id);
      setPessoaDetalhe(atualizada);
    }
    setChaveRecarga((c) => c + 1);
  };

  const excluirPessoa = async () => {
    if (!pessoaDetalhe) return;
    await pessoasApi.excluir(pessoaDetalhe.id);
    setPessoaDetalhe(null);
    setChaveRecarga((c) => c + 1);
  };

  const salvarEdicaoCivil = async (dados: Record<string, unknown>) => {
    if (!pessoaDetalhe) return;
    return await pessoasApi.atualizar(pessoaDetalhe.id, dados);
  };

  if (visao === 'integracoes' && podeGerenciarIntegracoes) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setVisao('pessoas')}>
            ← Voltar ao cadastro
          </Button>
        </div>
        <IntegracoesPanel />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PessoasListView
        key={chaveRecarga}
        podeGerenciar={podeGerenciar}
        podeImportar={podeImportar}
        podePromover={podePromover}
        podeGerenciarIntegracoes={podeGerenciarIntegracoes}
        onAbrirDetalhe={(p) => void abrirDetalhe(p)}
        onPromover={(p) => setPessoaPromovendo(p)}
        onIrParaIntegracoes={() => setVisao('integracoes')}
      />

      {pessoaDetalhe && (
        <PessoaDetailView
          pessoa={pessoaDetalhe}
          podeGerenciar={podeGerenciar}
          podePromover={podePromover}
          podeExcluir={podeExcluir}
          onFechar={() => setPessoaDetalhe(null)}
          onAtualizado={recarregarDetalhe}
          onExcluido={excluirPessoa}
          onPromover={() => setPessoaPromovendo(pessoaDetalhe)}
          onSalvarEdicaoCivil={salvarEdicaoCivil}
        />
      )}

      <PromoverPessoaModal
        pessoa={pessoaPromovendo}
        onFechar={() => setPessoaPromovendo(null)}
        onPromovido={async () => {
          setPessoaPromovendo(null);
          await recarregarDetalhe();
        }}
      />
    </div>
  );
};

export default PessoasModule;
