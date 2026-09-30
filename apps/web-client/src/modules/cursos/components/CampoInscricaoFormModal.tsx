import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Modal, Select, Switch } from '@sysgov/ui';
import { sysgovApi, type CampoInscricao, type TipoCampoInscricao } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { TIPO_CAMPO_INSCRICAO } from '../utils/formatos';
import { validarOpcoesCampo } from '../utils/validacoes';
import { ErroFormulario } from './ErroFormulario';

interface Props {
  open: boolean;
  cursoId: number;
  campo?: CampoInscricao | null;
  onClose: () => void;
  onSalvo: () => void;
}

const vazio = () => ({ rotulo: '', tipo: 'texto' as TipoCampoInscricao, obrigatorio: false, opcoes: [''] });

/** Campo extra do formulário de inscrição (design D9): tipo, obrigatoriedade e, no tipo seleção, opções. */
export const CampoInscricaoFormModal: React.FC<Props> = ({ open, cursoId, campo, onClose, onSalvo }) => {
  const [form, setForm] = useState(vazio());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setForm(
      campo
        ? { rotulo: campo.rotulo, tipo: campo.tipo, obrigatorio: campo.obrigatorio, opcoes: campo.opcoes && campo.opcoes.length > 0 ? campo.opcoes : [''] }
        : vazio(),
    );
  }, [open, campo]);

  const mudarOpcao = (i: number, valor: string) => setForm((f) => ({ ...f, opcoes: f.opcoes.map((o, j) => (j === i ? valor : o)) }));
  const removerOpcao = (i: number) => setForm((f) => ({ ...f, opcoes: f.opcoes.filter((_, j) => j !== i) }));
  const adicionarOpcao = () => setForm((f) => ({ ...f, opcoes: [...f.opcoes, ''] }));

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.rotulo.trim() === '') {
      setErro('Informe o rótulo do campo.');
      return;
    }
    const problema = validarOpcoesCampo(form.tipo, form.opcoes);
    if (problema) {
      setErro(problema);
      return;
    }
    setSalvando(true);
    setErro(null);
    const dados = {
      rotulo: form.rotulo.trim(),
      tipo: form.tipo,
      obrigatorio: form.obrigatorio,
      opcoes: form.tipo === 'selecao' ? form.opcoes.map((o) => o.trim()).filter((o) => o !== '') : null,
    };
    try {
      if (campo) await sysgovApi.cursos.atualizarCampoInscricao(campo.id, dados);
      else await sysgovApi.cursos.criarCampoInscricao(cursoId, dados);
      onSalvo();
    } catch (err) {
      setErro(getApiErrorMessage(err, 'Não foi possível salvar o campo.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={campo ? 'Editar campo' : 'Novo campo do formulário'} icon={<ClipboardCheck className="h-5 w-5" />} size="lg">
      <form onSubmit={salvar} noValidate className="space-y-4">
        <ErroFormulario mensagem={erro} />
        <Input label="Rótulo" value={form.rotulo} onChange={(e) => setForm((f) => ({ ...f, rotulo: e.target.value }))} required maxLength={150} placeholder="Ex.: Órgão de origem" />
        <Select
          label="Tipo"
          value={form.tipo}
          onChange={(v) => setForm((f) => ({ ...f, tipo: v as TipoCampoInscricao }))}
          options={Object.entries(TIPO_CAMPO_INSCRICAO).map(([value, label]) => ({ value, label }))}
        />
        <div className="flex items-center gap-3">
          <Switch id="campo-obrigatorio" checked={form.obrigatorio} onCheckedChange={(v) => setForm((f) => ({ ...f, obrigatorio: v }))} label="Obrigatório" />
          <label htmlFor="campo-obrigatorio" className="text-sm text-foreground">
            Exigir resposta ao se inscrever
          </label>
        </div>

        {form.tipo === 'selecao' && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Opções</legend>
            {form.opcoes.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input aria-label={`Opção ${i + 1}`} value={o} onChange={(e) => mudarOpcao(i, e.target.value)} maxLength={150} className="flex-1" />
                <Button type="button" size="icon-sm" variant="ghost" aria-label={`Remover opção ${i + 1}`} onClick={() => removerOpcao(i)} disabled={form.opcoes.length <= 1}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={adicionarOpcao}>
              <Plus className="h-4 w-4" /> Adicionar opção
            </Button>
          </fieldset>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={salvando}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CampoInscricaoFormModal;
