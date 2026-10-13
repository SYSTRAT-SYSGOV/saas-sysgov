import React, { useState } from 'react';
import { Package, Star, Trash2, Upload } from 'lucide-react';
import { AlertCard, Button, Input, Modal, Select, Skeleton } from '@sysgov/ui';
import { erroApi } from '../../escola/api';
import type { Toast } from '../../escola/components/AdminModal';
import { inservivelApi, type Bem, type Opcoes } from '../api';
import { formatarCentavos, paraCentavos, vazioParaNulo } from '../formato';
import { CampoTexto, FotoBem, SelectUnidades } from './Comuns';

const VAZIO = {
  numero_patrimonial: '', plaqueta_antiga: '', descricao: '', categoria_id: '', marca: '', modelo: '', numero_serie: '', situacao_id: '', estado_conservacao_id: '',
  valor_contabil: '', valor_avaliado: '', data_aquisicao: '', data_incorporacao: '', secretaria: null as number | null, setor: null as number | null, observacoes: '',
};
type Form = typeof VAZIO;

function paraForm(b: Bem): Form {
  return {
    numero_patrimonial: b.numero_patrimonial, plaqueta_antiga: b.plaqueta_antiga ?? '', descricao: b.descricao, categoria_id: b.categoria ? String(b.categoria.id) : '',
    marca: b.marca ?? '', modelo: b.modelo ?? '', numero_serie: b.numero_serie ?? '', situacao_id: String(b.situacao.id),
    estado_conservacao_id: b.estado_conservacao ? String(b.estado_conservacao.id) : '',
    valor_contabil: formatarCentavos(b.valor_contabil_cents).replace('R$ ', ''), valor_avaliado: formatarCentavos(b.valor_avaliado_cents).replace('R$ ', ''),
    data_aquisicao: b.data_aquisicao ?? '', data_incorporacao: b.data_incorporacao ?? '', secretaria: b.secretaria?.id ?? null, setor: b.setor?.id ?? null, observacoes: b.observacoes ?? '',
  };
}

/** Cadastro e edição do bem, com as fotos (spec: Cadastro de bens). */
export const BemFormModal: React.FC<{ bem: number | 'novo' | null; opcoes: Opcoes; avisar: Toast; onFechar: () => void; onSalvo: () => void }> = ({ bem, opcoes, avisar, onFechar, onSalvo }) => {
  const [form, setForm] = useState<Form>(VAZIO);
  const [registro, setRegistro] = useState<Bem | null>(null);
  const [carregado, setCarregado] = useState<number | 'novo' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (bem !== carregado) {
    setCarregado(bem);
    setErro(null);
    setRegistro(null);
    if (bem === 'novo') {
      const inservivel = opcoes.situacoes.find((s) => s.papel === 'inservivel');
      setForm({ ...VAZIO, situacao_id: inservivel ? String(inservivel.id) : '' });
    } else if (bem !== null) {
      setForm(VAZIO);
      inservivelApi.bem(bem).then((b) => { setRegistro(b); setForm(paraForm(b)); }).catch((e) => setErro(erroApi(e).mensagem));
    }
  }

  const texto = (campo: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const situacoes = opcoes.situacoes.filter((s) => (s.papel !== 'em_lote' && s.papel !== 'em_transferencia') || String(s.id) === form.situacao_id);

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const contabil = form.valor_contabil.trim() === '' ? 0 : paraCentavos(form.valor_contabil);
    const avaliado = form.valor_avaliado.trim() === '' ? 0 : paraCentavos(form.valor_avaliado);
    if (contabil === null || avaliado === null) { setErro('Informe os valores em reais (ex.: 1.500,00).'); return; }
    if (form.secretaria === null) { setErro('Escolha a secretaria do bem.'); return; }
    setSalvando(true); setErro(null);
    try {
      const salvo = await inservivelApi.salvarBem(bem === 'novo' ? null : (bem as number), {
        numero_patrimonial: form.numero_patrimonial.trim(), plaqueta_antiga: vazioParaNulo(form.plaqueta_antiga), descricao: form.descricao.trim(),
        categoria_id: form.categoria_id ? Number(form.categoria_id) : null, marca: vazioParaNulo(form.marca), modelo: vazioParaNulo(form.modelo),
        numero_serie: vazioParaNulo(form.numero_serie), situacao_id: Number(form.situacao_id),
        estado_conservacao_id: form.estado_conservacao_id ? Number(form.estado_conservacao_id) : null,
        valor_contabil_cents: contabil, valor_avaliado_cents: avaliado,
        data_aquisicao: vazioParaNulo(form.data_aquisicao), data_incorporacao: vazioParaNulo(form.data_incorporacao),
        secretaria_unit_id: form.secretaria, setor_unit_id: form.setor, observacoes: vazioParaNulo(form.observacoes),
      });
      avisar({ type: 'success', title: bem === 'novo' ? 'Bem cadastrado' : 'Bem atualizado', message: salvo.numero_patrimonial });
      onSalvo();
      if (bem === 'novo') {
        setCarregado(salvo.id);
        setRegistro(salvo);
        setForm(paraForm(salvo));
      } else {
        onFechar();
      }
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  const recarregarFotos = async () => {
    if (!registro) return;
    const b = await inservivelApi.bem(registro.id);
    setRegistro(b);
    onSalvo();
  };
  const acaoFoto = async (acao: () => Promise<unknown>, sucesso: string) => {
    try { await acao(); await recarregarFotos(); avisar({ type: 'success', title: sucesso, message: registro?.numero_patrimonial ?? '' }); } catch (e) { avisar({ type: 'error', title: 'Não foi possível concluir', message: erroApi(e).mensagem }); }
  };

  const carregando = bem !== null && bem !== 'novo' && registro === null && !erro;

  return (
    <Modal open={bem !== null} onClose={onFechar} title={bem === 'novo' ? 'Adicionar bem' : `Editar bem ${registro?.numero_patrimonial ?? ''}`} icon={<Package className="h-5 w-5" />} size="2xl"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Fechar</Button><Button type="submit" form="form-bem" isLoading={salvando} disabled={carregando}>Salvar</Button></>}>
      {carregando ? <Skeleton className="h-96 w-full" /> : (
        <form id="form-bem" onSubmit={salvar} className="space-y-4">
          {erro && <AlertCard priority="danger" title="Verifique os dados" description={erro} />}
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Nº patrimonial *" value={form.numero_patrimonial} onChange={texto('numero_patrimonial')} required maxLength={50} className="font-mono tabular-nums" />
            <Input label="Plaqueta antiga" value={form.plaqueta_antiga} onChange={texto('plaqueta_antiga')} maxLength={50} className="font-mono tabular-nums" />
            <Select label="Categoria" value={form.categoria_id} onChange={(v) => setForm((f) => ({ ...f, categoria_id: v }))} options={[{ value: '', label: '(sem categoria)' }, ...opcoes.categorias.map((c) => ({ value: String(c.id), label: c.nome }))]} />
          </div>
          <CampoTexto rotulo="Descrição *" value={form.descricao} onChange={texto('descricao')} required rows={2} maxLength={5000} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Marca" value={form.marca} onChange={texto('marca')} maxLength={100} />
            <Input label="Modelo" value={form.modelo} onChange={texto('modelo')} maxLength={100} />
            <Input label="Nº de série" value={form.numero_serie} onChange={texto('numero_serie')} maxLength={100} className="font-mono" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Situação *" value={form.situacao_id} onChange={(v) => setForm((f) => ({ ...f, situacao_id: v }))} options={situacoes.map((s) => ({ value: String(s.id), label: s.nome }))}
              disabled={registro?.situacao.papel === 'em_lote' || registro?.situacao.papel === 'em_transferencia'} />
            <Select label="Estado de conservação" value={form.estado_conservacao_id} onChange={(v) => setForm((f) => ({ ...f, estado_conservacao_id: v }))} options={[{ value: '', label: '(não informado)' }, ...opcoes.estados_conservacao.map((c) => ({ value: String(c.id), label: c.nome }))]} />
          </div>
          <SelectUnidades opcoes={opcoes} secretaria={form.secretaria} setor={form.setor} obrigatoria onChange={(secretaria, setor) => setForm((f) => ({ ...f, secretaria, setor }))} />
          <div className="grid gap-3 sm:grid-cols-4">
            <Input label="Valor contábil (R$)" value={form.valor_contabil} onChange={texto('valor_contabil')} placeholder="0,00" className="font-mono tabular-nums" inputMode="decimal" />
            <Input label="Valor avaliado (R$)" value={form.valor_avaliado} onChange={texto('valor_avaliado')} placeholder="0,00" className="font-mono tabular-nums" inputMode="decimal" />
            <Input label="Data de aquisição" type="date" value={form.data_aquisicao} onChange={texto('data_aquisicao')} className="font-mono" />
            <Input label="Data de incorporação" type="date" value={form.data_incorporacao} onChange={texto('data_incorporacao')} className="font-mono" />
          </div>
          <CampoTexto rotulo="Observações" value={form.observacoes} onChange={texto('observacoes')} rows={2} maxLength={5000} />

          <section className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Fotos</h3>
              {registro && (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted focus-within:ring-2 focus-within:ring-ring">
                  <Upload className="h-4 w-4" />Enviar foto
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void acaoFoto(() => inservivelApi.enviarFoto(registro.id, f), 'Foto enviada'); }} />
                </label>
              )}
            </div>
            {!registro ? <p className="text-sm text-muted-foreground">Salve o bem para enviar fotos.</p> : registro.fotos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma foto enviada (JPEG, PNG ou WebP até 5 MB).</p> : (
              <div className="flex flex-wrap gap-3">
                {registro.fotos.map((f) => (
                  <div key={f.id} className="space-y-1 text-center">
                    <FotoBem chave={`${registro.id}-${f.id}`} carregar={() => inservivelApi.foto(registro.id, f.id)} alt={`Foto ${f.id} do bem ${registro.numero_patrimonial}`} className="h-24 w-24" />
                    <div className="flex justify-center gap-1">
                      <Button type="button" size="icon-sm" variant={f.principal ? 'primary' : 'ghost'} aria-label={f.principal ? 'Foto principal' : 'Definir como principal'} disabled={f.principal}
                        onClick={() => void acaoFoto(() => inservivelApi.fotoPrincipal(registro.id, f.id), 'Foto principal definida')}><Star /></Button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="Remover foto" onClick={() => void acaoFoto(() => inservivelApi.removerFoto(registro.id, f.id), 'Foto removida')}><Trash2 /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </form>
      )}
    </Modal>
  );
};
