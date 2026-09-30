import React from 'react';
import { accessApi } from '@/modules/access/AccessApi';
import { pessoasApi, type Pessoa } from './api';
import { FormModal, useDados } from './views/comum';

/** Promoção de uma pessoa a usuário do SYSGOV — compartilhado entre o detalhe da pessoa e a ação rápida da listagem. */
export const PromoverPessoaModal: React.FC<{
  pessoa: Pessoa | null;
  onFechar: () => void;
  onPromovido: () => Promise<void>;
}> = ({ pessoa, onFechar, onPromovido }) => {
  const papeis = useDados(() => accessApi.tenantRoles(), []);
  const opcoesPapel = (papeis.dados ?? []).map((r) => ({ value: String(r.id), label: r.name }));

  return (
    <FormModal aberto={pessoa !== null} titulo="Promover a usuário do SYSGOV" rotuloEnviar="Promover" onFechar={onFechar}
      campos={[
        { nome: 'email', rotulo: 'E-mail de acesso', obrigatorio: true, dica: 'Senha definida no primeiro acesso.' },
        { nome: 'role_id', rotulo: 'Papel (role)', tipo: 'select', obrigatorio: true, opcoes: opcoesPapel },
      ]}
      onEnviar={async (v) => {
        if (!pessoa) return;
        await pessoasApi.promover(pessoa.id, { email: String(v.email), role_id: Number(v.role_id) });
        await onPromovido();
      }} />
  );
};

export default PromoverPessoaModal;
