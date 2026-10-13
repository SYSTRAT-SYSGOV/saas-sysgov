import React, { useRef, useState } from 'react';
import { Switch } from '@sysgov/ui';
import { formatarCentavos } from '@/lib/formatacao';
import { erroApi, formaturaApi, type Formando } from '../api';
import type { PropsAba } from '../ModuloFormaturaMain';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { FichaFormando } from './FichaFormando';

/**
 * Interruptor "Participa" comum a Formandos e Relação de Alunos: trava enquanto grava, confirma a retirada,
 * abre a ficha ao entrar na formatura e mantém a ficha aberta sincronizada com a lista recarregada.
 */
export function useParticipacao(props: PropsAba): {
  interruptor: (f: Formando) => React.ReactNode;
  abrirFicha: (f: Formando) => void;
  modais: React.ReactNode;
} {
  const { ano, dados, recarregar, avisar, permissoes } = props;
  const [ficha, setFicha] = useState<Formando | null>(null);
  const [retirar, setRetirar] = useState<Formando | null>(null);
  const [gravando, setGravando] = useState<ReadonlySet<number>>(new Set());
  const emAndamento = useRef(new Set<number>());

  const definir = async (f: Formando, participa: boolean) => {
    if (emAndamento.current.has(f.aluno_id)) return;
    emAndamento.current.add(f.aluno_id);
    setGravando(new Set(emAndamento.current));
    try {
      await formaturaApi.salvarParticipacao(f.aluno_id, ano, { participa });
      await recarregar();
      // Ao entrar na formatura, a ficha abre para convidados, telefone e observações.
      if (participa) setFicha(f);
    } catch (e) {
      avisar({ type: 'error', title: 'Não foi possível alterar', message: erroApi(e).mensagem });
    } finally {
      emAndamento.current.delete(f.aluno_id);
      setGravando(new Set(emAndamento.current));
    }
  };

  const fichaAtual = ficha ? dados.formandos.find((f) => f.aluno_id === ficha.aluno_id) ?? ficha : null;

  const interruptor = (f: Formando) => (
    <Switch
      checked={f.participa}
      // Transferido só pode ser retirado, nunca marcado.
      disabled={!permissoes.editarFormandos || gravando.has(f.aluno_id) || (f.situacao_aluno === 'transferido' && !f.participa)}
      label={`${f.nome} participa`}
      onCheckedChange={(v) => (v ? void definir(f, true) : setRetirar(f))}
    />
  );

  const modais = (
    <>
      {fichaAtual && <FichaFormando key={fichaAtual.aluno_id} formando={fichaAtual} aberto props={props} onFechar={() => setFicha(null)} />}
      <ConfirmarModal
        aberto={retirar !== null}
        titulo="Retirar da formatura"
        perigo
        rotuloConfirmar="Retirar"
        mensagem={retirar && (
          <>
            <strong>{retirar.nome}</strong> deixa de participar da formatura de {ano}.
            {retirar.total_pago_centavos > 0 && (
              <> Os pagamentos já feitos (<strong className="font-mono">{formatarCentavos(retirar.total_pago_centavos)}</strong>) continuam registrados, mas deixam de contar no recebido.</>
            )} O aluno continua no Cadastro Escolar.
          </>
        )}
        onFechar={() => setRetirar(null)}
        onConfirmar={async () => { if (retirar) await definir(retirar, false); }}
      />
    </>
  );

  return { interruptor, abrirFicha: setFicha, modais };
}
