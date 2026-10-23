import React, { useRef, useState } from 'react';
import { Eraser } from 'lucide-react';
import { Button, Modal, Select } from '@sysgov/ui';
import { useCarga } from '../../escola/useCarga';
import { ataApi, mensagemDeErro } from '../api';
import { QuadroAssinatura, type QuadroAssinaturaRef } from './QuadroAssinatura';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

/** Assinatura digital desenhada. A seleção lista só quem ainda NÃO assinou (padrão de ata) — vem da API. */
export const AssinarModal: React.FC<{ ataId: number; aoFechar: () => void; aoAssinar: (nome: string) => Promise<void> }> = ({ ataId, aoFechar, aoAssinar }) => {
  const pendentes = useCarga(() => ataApi.pendentes(ataId), [ataId]);
  const [quem, setQuem] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const { modal: modalValidacao, invalidar } = useFormValidationModal();
  const [salvando, setSalvando] = useState(false);
  const quadro = useRef<QuadroAssinaturaRef>(null);
  const lista = pendentes.dados ?? [];

  const aplicar = async () => {
    setErro(null);
    if (!quem) return invalidar([['validação', 'Selecione quem está assinando.']]);
    if (!quadro.current || quadro.current.vazio()) return invalidar([['validação', 'Faça a assinatura no quadro.']]);
    setSalvando(true);
    try {
      await ataApi.assinar(ataId, Number(quem), quadro.current.imagem());
      const nome = lista.find((p) => String(p.id) === quem)?.nome ?? '';
      setQuem('');
      quadro.current.limpar();
      await pendentes.recarregar();
      await aoAssinar(nome);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open onClose={aoFechar} title="Assinatura digital" size="lg"
      footer={<><Button variant="outline" onClick={aoFechar}>Fechar</Button><Button onClick={() => void aplicar()} isLoading={salvando} disabled={lista.length === 0}>Aplicar assinatura</Button></>}>
      {modalValidacao}
      {pendentes.dados && lista.length === 0 ? (
        <p className="text-sm">Todas as assinaturas já foram colhidas.</p>
      ) : (
        <div className="space-y-3">
          <Select label="Quem está assinando" value={quem} onChange={setQuem} placeholder="Selecione…" loading={pendentes.carregando}
            options={lista.map((p) => ({ value: p.id, label: p.cargo ? `${p.nome} — ${p.cargo}` : p.nome }))} />
          <p className="text-xs text-muted-foreground">Assine no quadro abaixo (mouse, caneta ou dedo):</p>
          <QuadroAssinatura ref={quadro} />
          <Button variant="ghost" size="sm" onClick={() => quadro.current?.limpar()}><Eraser className="mr-1 h-4 w-4" />Limpar</Button>
          {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        </div>
      )}
    </Modal>
  );
};
