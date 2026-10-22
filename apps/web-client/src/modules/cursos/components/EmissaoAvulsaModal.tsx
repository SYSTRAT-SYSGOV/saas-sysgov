import React, { useEffect, useState } from 'react';
import { Award, Download, FileUp, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Modal, Select } from '@sysgov/ui';
import { Tabs } from '@/components/ui';
import { sysgovApi, type EmpresaCursos, type ModeloCertificado, type PessoaCertificadoAvulso, type ResultadoEmissaoAvulsa } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { ErroFormulario } from './ErroFormulario';

interface Props {
  aberto: boolean;
  cursoId: number;
  onClose: () => void;
}

const MODELO_CSV = '﻿NOME;EMAIL;DOCUMENTO;CONCLUSAO;EMPRESA_CNPJ\nMaria da Silva;maria@exemplo.gov.br;529.982.247-25;20/09/2026;11.222.333/0001-81\nConstrutora Exemplo Ltda;;12.345.678/0001-95;20/09/2026;\n';

const hoje = (): string => new Date().toISOString().slice(0, 10);

/**
 * Emissão avulsa de certificados num curso, sem turma (eventos externos, palestras, empresas).
 * CPF liga a pessoa ao Cadastro de Pessoas; CNPJ emite em nome da empresa. Repetir a mesma
 * pessoa, curso e data devolve o certificado já emitido.
 */
export const EmissaoAvulsaModal: React.FC<Props> = ({ aberto, cursoId, onClose }) => {
  const [aba, setAba] = useState<'lista' | 'csv'>('lista');
  const [pessoas, setPessoas] = useState<PessoaCertificadoAvulso[]>([{ nome: '', email: '', documento: '' }]);
  const [conclusao, setConclusao] = useState(hoje());
  const [modelos, setModelos] = useState<ModeloCertificado[]>([]);
  const [modeloId, setModeloId] = useState<number | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaCursos[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ResultadoEmissaoAvulsa | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setResultado(null);
    setErro(null);
    sysgovApi.cursos.listarModelos().then((r) => setModelos(r.modelos)).catch(() => setModelos([]));
    sysgovApi.cursos.listarEmpresas().then((r) => setEmpresas(r.empresas.filter((e) => e.ativa))).catch(() => setEmpresas([]));
  }, [aberto]);

  const alterar = (i: number, campo: keyof PessoaCertificadoAvulso, valor: string) =>
    setPessoas((lista) => lista.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));

  const baixarModelo = () => {
    const url = URL.createObjectURL(new Blob([MODELO_CSV], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo-certificados-avulsos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const emitir = async () => {
    setEnviando(true);
    setErro(null);
    try {
      const extra = { modelo_id: modeloId, concluido_em: conclusao || null };
      setResultado(aba === 'lista'
        ? await sysgovApi.cursos.emitirCertificadosAvulsos(cursoId, { pessoas: pessoas.filter((p) => p.nome.trim()), ...extra })
        : await sysgovApi.cursos.importarCertificadosAvulsos(cursoId, arquivo as File, extra));
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível emitir os certificados.'));
    } finally {
      setEnviando(false);
    }
  };

  const podeEmitir = aba === 'lista' ? pessoas.some((p) => p.nome.trim()) : arquivo !== null;

  return (
    <Modal open={aberto} onClose={onClose} title="Emitir certificados avulsos" icon={<Award className="h-5 w-5" />} size="2xl">
      <div className="space-y-4">
        <ErroFormulario mensagem={erro} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Modelo"
            value={modeloId}
            placeholder="Do curso (ou o padrão do órgão)"
            onChange={(v) => setModeloId(v ? Number(v) : null)}
            options={modelos.map((m) => ({ value: m.id, label: m.nome }))}
          />
          <Input label="Data de conclusão (quando a linha não informar)" type="date" value={conclusao} max={hoje()} onChange={(e) => setConclusao(e.target.value)} />
        </div>

        <Tabs items={[{ key: 'lista', label: 'Digitar' }, { key: 'csv', label: 'Planilha CSV' }]} value={aba} onChange={(v) => setAba(v as 'lista' | 'csv')} />

        {aba === 'lista' ? (
          <div className="space-y-2">
            {pessoas.map((p, i) => (
              <div key={i} className="grid items-end gap-2 sm:grid-cols-[2fr_1.5fr_1.2fr_1.5fr_auto]">
                <Input label={i === 0 ? 'Nome ou razão social' : undefined} value={p.nome} onChange={(e) => alterar(i, 'nome', e.target.value)} maxLength={200} />
                <Input label={i === 0 ? 'E-mail (opcional)' : undefined} type="email" value={p.email ?? ''} onChange={(e) => alterar(i, 'email', e.target.value)} />
                <Input label={i === 0 ? 'CPF ou CNPJ (opcional)' : undefined} value={p.documento ?? ''} onChange={(e) => alterar(i, 'documento', e.target.value)} className="font-mono tabular-nums" />
                <Select
                  label={i === 0 ? 'Empresa (opcional)' : undefined}
                  value={p.empresa_id ?? null}
                  placeholder="Autônomo"
                  onChange={(v) => setPessoas((lista) => lista.map((x, j) => (j === i ? { ...x, empresa_id: v ? Number(v) : null } : x)))}
                  options={empresas.map((e) => ({ value: e.id, label: e.nome_fantasia || e.razao_social }))}
                />
                <Button size="icon-sm" variant="ghost" aria-label={`Remover linha ${i + 1}`} disabled={pessoas.length === 1} onClick={() => setPessoas((l) => l.filter((_, j) => j !== i))}><Trash2 /></Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setPessoas((l) => [...l, { nome: '', email: '', documento: '' }])}><Plus className="h-4 w-4" /> Pessoa</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Colunas <code>NOME</code> (obrigatória), <code>EMAIL</code>, <code>DOCUMENTO</code> (CPF ou CNPJ) e <code>CONCLUSAO</code> (dd/mm/aaaa) e <code>EMPRESA_CNPJ</code> (CNPJ de uma empresa da aba Empresas); separador <code>;</code> ou <code>,</code>; até 1.000 linhas.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" variant="outline" onClick={baixarModelo}><Download className="h-4 w-4" /> Baixar modelo</Button>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <FileUp className="h-4 w-4 text-primary" /> {arquivo ? arquivo.name : 'Escolher arquivo .csv'}
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">Com CPF, a pessoa é ligada ao Cadastro de Pessoas do município. A mesma pessoa, curso e data não geram certificado duplicado.</p>

        {resultado && (
          <div className="space-y-2 rounded-md border border-border p-3 text-sm">
            <p><b className="font-mono tabular-nums">{resultado.emitidos.length}</b> emitido(s) · <b className="font-mono tabular-nums">{resultado.existentes.length}</b> já existente(s) · <b className="font-mono tabular-nums">{resultado.recusadas.length}</b> recusada(s)</p>
            {[...resultado.emitidos, ...resultado.existentes].length > 0 && (
              <ul className="max-h-32 overflow-y-auto text-xs">
                {[...resultado.emitidos, ...resultado.existentes].map((c) => (
                  <li key={c.certificado_id}>{c.nome} — <span className="font-mono">{c.codigo}</span></li>
                ))}
              </ul>
            )}
            {resultado.recusadas.length > 0 && (
              <ul className="max-h-32 overflow-y-auto text-xs text-destructive">
                {resultado.recusadas.map((r) => <li key={r.linha}>Linha {r.linha}: {r.motivo}</li>)}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={() => void emitir()} disabled={!podeEmitir} isLoading={enviando}><Award className="h-4 w-4" /> Emitir</Button>
        </div>
      </div>
    </Modal>
  );
};

export default EmissaoAvulsaModal;
