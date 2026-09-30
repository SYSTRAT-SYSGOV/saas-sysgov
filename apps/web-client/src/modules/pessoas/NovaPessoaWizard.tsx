import React, { useState } from 'react';
import { Button, Modal } from '@/components/ui';
import { pessoasApi, TIPOS_VINCULO, type TipoVinculo } from './api';
import { CamposFormulario, ErroBox, useAcao, type CampoForm } from './views/comum';

const opcoesVinculo = Object.entries(TIPOS_VINCULO).map(([value, label]) => ({ value, label }));

type Passo = 1 | 2 | 3 | 4;

const TITULOS: Record<Passo, string> = {
  1: 'Identificação civil',
  2: 'Vínculo (opcional)',
  3: 'Documento (opcional)',
  4: 'Endereço e contato (opcional)',
};

const CAMPOS_IDENTIFICACAO: CampoForm[] = [
  { nome: 'nome', rotulo: 'Nome completo', obrigatorio: true },
  { nome: 'cpf', rotulo: 'CPF', obrigatorio: true, mono: true, dica: 'Armazenado cifrado; exibido mascarado.' },
  { nome: 'nome_social', rotulo: 'Nome social' },
  { nome: 'data_nascimento', rotulo: 'Data de nascimento', tipo: 'date' },
  { nome: 'sexo', rotulo: 'Sexo' },
  { nome: 'nome_mae', rotulo: 'Nome da mãe' },
  { nome: 'nome_pai', rotulo: 'Nome do pai' },
  { nome: 'estado_civil', rotulo: 'Estado civil' },
  { nome: 'nacionalidade', rotulo: 'Nacionalidade' },
  { nome: 'naturalidade', rotulo: 'Naturalidade' },
  { nome: 'nis', rotulo: 'NIS', mono: true },
];

const CAMPOS_VINCULO: CampoForm[] = [
  { nome: 'tipo_vinculo', rotulo: 'Tipo de vínculo', tipo: 'select', opcoes: opcoesVinculo },
  { nome: 'matricula', rotulo: 'Matrícula funcional', mono: true },
  { nome: 'inicio', rotulo: 'Início', tipo: 'date' },
];

const CAMPOS_DOCUMENTO: CampoForm[] = [
  { nome: 'tipo', rotulo: 'Tipo', tipo: 'select', opcoes: [{ value: 'rg', label: 'RG' }, { value: 'cnh', label: 'CNH' }, { value: 'titulo_eleitor', label: 'Título de eleitor' }] },
  { nome: 'numero', rotulo: 'Número', mono: true },
  { nome: 'orgao_emissor', rotulo: 'Órgão emissor' },
  { nome: 'uf_emissao', rotulo: 'UF de emissão' },
  { nome: 'data_emissao', rotulo: 'Data de emissão', tipo: 'date' },
];

const CAMPOS_ENDERECO_CONTATO: CampoForm[] = [
  { nome: 'cep', rotulo: 'CEP' }, { nome: 'logradouro', rotulo: 'Logradouro' }, { nome: 'numero', rotulo: 'Número' },
  { nome: 'complemento', rotulo: 'Complemento' }, { nome: 'bairro', rotulo: 'Bairro' }, { nome: 'cidade', rotulo: 'Cidade' }, { nome: 'uf', rotulo: 'UF' },
  { nome: 'contato_tipo', rotulo: 'Tipo de contato', tipo: 'select', opcoes: [{ value: 'celular', label: 'Celular' }, { value: 'email', label: 'E-mail' }, { value: 'telefone', label: 'Telefone' }] },
  { nome: 'contato_valor', rotulo: 'Valor do contato' },
  { nome: 'contato_principal', rotulo: 'Contato principal', tipo: 'switch' },
  { nome: 'autoriza_notificacoes', rotulo: 'Autoriza notificações', tipo: 'switch' },
];

/** Wizard de cadastro de pessoa em 4 passos — só o passo 1 é obrigatório, os demais são puláveis. */
export const NovaPessoaWizard: React.FC<{
  onFechar: () => void;
  onConcluido: () => Promise<void>;
}> = ({ onFechar, onConcluido }) => {
  const [passo, setPasso] = useState<Passo>(1);
  const [pessoaId, setPessoaId] = useState<number | null>(null);
  const [valores, setValores] = useState<Record<string, unknown>>({ autoriza_notificacoes: true });
  const { erro, enviando, executar, setErro } = useAcao();

  const definir = (nome: string, valor: unknown) => setValores((v) => ({ ...v, [nome]: valor }));

  const irPara = (p: Passo) => {
    setErro(null);
    setValores({ autoriza_notificacoes: true });
    setPasso(p);
  };

  const concluir = () => {
    onFechar();
    void onConcluido();
  };

  /** Submete os dados do passo atual (2-4) se algo foi preenchido; no-op se vazio. Retorna false só em caso de erro. */
  const submeterPassoAtual = async (): Promise<boolean> => {
    if (!pessoaId) return true;

    if (passo === 2 && valores.tipo_vinculo) {
      const ok = await executar(() => pessoasApi.adicionarVinculo(pessoaId, valores as { tipo_vinculo: TipoVinculo; matricula?: string; inicio?: string }));
      if (!ok) return false;
    }

    if (passo === 3 && valores.tipo && valores.numero) {
      const ok = await executar(() => pessoasApi.adicionarDocumento(pessoaId, valores as { tipo: 'rg' | 'cnh' | 'titulo_eleitor'; numero: string }));
      if (!ok) return false;
    }

    if (passo === 4) {
      const temEndereco = valores.cep || valores.logradouro || valores.bairro || valores.cidade || valores.uf;
      if (temEndereco) {
        const ok = await executar(() => pessoasApi.adicionarEndereco(pessoaId, valores));
        if (!ok) return false;
      }

      if (valores.contato_tipo && valores.contato_valor) {
        const ok = await executar(() => pessoasApi.adicionarContato(pessoaId, {
          tipo: valores.contato_tipo as 'celular' | 'email' | 'telefone',
          valor: String(valores.contato_valor),
          principal: Boolean(valores.contato_principal),
          autoriza_notificacoes: Boolean(valores.autoriza_notificacoes),
        }));
        if (!ok) return false;
      }
    }

    return true;
  };

  const criarPessoa = async () => {
    const pessoa = await executar(() => pessoasApi.criar(valores));
    if (!pessoa) return;
    setPessoaId(pessoa.id);
    irPara(2);
  };

  const avancar = async () => {
    const ok = await submeterPassoAtual();
    if (!ok) return;
    if (passo === 4) { concluir(); return; }
    irPara((passo + 1) as Passo);
  };

  const pular = () => {
    if (passo === 4) { concluir(); return; }
    irPara((passo + 1) as Passo);
  };

  const concluirAgora = async () => {
    const ok = await submeterPassoAtual();
    if (!ok) return;
    concluir();
  };

  const campos = passo === 1 ? CAMPOS_IDENTIFICACAO : passo === 2 ? CAMPOS_VINCULO : passo === 3 ? CAMPOS_DOCUMENTO : CAMPOS_ENDERECO_CONTATO;

  return (
    <Modal
      open
      onClose={onFechar}
      title={`Nova pessoa — Passo ${passo} de 4: ${TITULOS[passo]}`}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex gap-2">
            {passo > 2 && <Button variant="outline" type="button" onClick={() => irPara((passo - 1) as Passo)}>Voltar</Button>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={onFechar}>Cancelar</Button>
            {passo > 1 && <Button variant="outline" type="button" disabled={enviando} onClick={pular}>Pular</Button>}
            {passo > 1 && passo < 4 && <Button variant="outline" type="button" disabled={enviando} onClick={() => void concluirAgora()}>Concluir agora</Button>}
            <Button type="button" disabled={enviando} onClick={() => void (passo === 1 ? criarPessoa() : avancar())}>
              {enviando ? 'Enviando…' : passo === 4 ? 'Concluir' : 'Avançar'}
            </Button>
          </div>
        </div>
      }
    >
      <CamposFormulario campos={campos} valores={valores} onChange={definir} erro={erro} />
      <div className="mt-3"><ErroBox erro={erro} /></div>
    </Modal>
  );
};

export default NovaPessoaWizard;
