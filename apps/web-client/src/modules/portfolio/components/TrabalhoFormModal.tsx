import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, Modal, Select, Textarea } from '@sysgov/ui';
import { erroApi } from '../../escola/api';
import type { Toast } from '../../escola/components/AdminModal';
import { portfolioApi, type MateriaPortfolio, type Trabalho } from '../api';
import { formatarAvaliacao, hojeLocal, lerAvaliacao } from '../formato';
import { reduzirImagem, validarArquivo } from '../reduzirImagem';

interface Props {
  aberto: boolean;
  alunoId: number;
  materias: MateriaPortfolio[];
  anoLetivo: number;
  trabalho: Trabalho | null;
  onFechar: () => void;
  onSalvo: () => void;
  avisar: Toast;
}

const LIMITE = 6;

export const TrabalhoFormModal: React.FC<Props> = ({ aberto, alunoId, materias, anoLetivo, trabalho, onFechar, onSalvo, avisar }) => {
  const [titulo, setTitulo] = useState('');
  const [materiaId, setMateriaId] = useState<number | null>(null);
  const [data, setData] = useState(hojeLocal());
  const [avaliacao, setAvaliacao] = useState('');
  const [descricao, setDescricao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [fotos, setFotos] = useState<File[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const jaTem = trabalho?.imagens.length ?? 0;
  // Trabalho já gravado nesta abertura do modal e fotos já enviadas: se uma foto falhar, "Salvar" de novo
  // atualiza o mesmo trabalho e envia só as que faltam, em vez de criar outro.
  const salvoRef = useRef<Trabalho | null>(null);
  const enviadasRef = useRef(0);

  useEffect(() => {
    if (!aberto) return;
    setTitulo(trabalho?.titulo ?? '');
    setMateriaId(trabalho?.materia.id ?? materias[0]?.id ?? null);
    setData(trabalho?.data ?? (String(new Date().getFullYear()) === String(anoLetivo) ? hojeLocal() : `${anoLetivo}-03-01`));
    setAvaliacao(trabalho ? formatarAvaliacao(trabalho.avaliacao) : '');
    setDescricao(trabalho?.descricao ?? '');
    setObservacoes(trabalho?.observacoes ?? '');
    setFotos([]);
    setErro(null);
    salvoRef.current = null;
    enviadasRef.current = 0;
  }, [aberto, trabalho, materias, anoLetivo]);

  const fechar = () => (salvoRef.current ? onSalvo() : onFechar());

  const escolherFotos = (lista: FileList | null) => {
    const arquivos = Array.from(lista ?? []);
    const invalida = arquivos.map(validarArquivo).find((m) => m !== null);
    if (invalida) { setErro(invalida); return; }
    if (jaTem + arquivos.length > LIMITE) { setErro(`Cada trabalho aceita no máximo ${LIMITE} imagens.`); return; }
    setErro(null);
    setFotos(arquivos);
    enviadasRef.current = 0;
  };

  const salvar = async () => {
    const nota = lerAvaliacao(avaliacao);
    if (!titulo.trim()) { setErro('Informe o título do trabalho.'); return; }
    if (materiaId === null) { setErro('Escolha a matéria.'); return; }
    if (nota === null) { setErro('Informe uma avaliação de 0 a 10 com no máximo uma casa decimal.'); return; }
    setSalvando(true);
    setErro(null);
    try {
      const dados = { titulo: titulo.trim(), materia_id: materiaId, data, avaliacao: nota, descricao: descricao || null, observacoes: observacoes || null };
      const existente = trabalho ?? salvoRef.current;
      const salvo = existente ? await portfolioApi.atualizar(existente.id, dados) : await portfolioApi.criar(alunoId, dados);
      salvoRef.current = salvo;
      for (let i = enviadasRef.current; i < fotos.length; i++) {
        const nome = fotos[i].name.replace(/\.[^.]+$/, '') + '.jpg';
        await portfolioApi.enviarImagem(salvo.id, await reduzirImagem(fotos[i]), nome);
        enviadasRef.current = i + 1;
      }
      avisar({ type: 'success', title: 'Portfólio', message: trabalho ? 'Trabalho atualizado.' : 'Trabalho registrado.' });
      onSalvo();
    } catch (e) {
      const mensagem = erroApi(e).mensagem;
      setErro(salvoRef.current && !trabalho
        ? `${mensagem} O trabalho foi salvo; clique em Salvar para enviar as fotos que faltam.`
        : mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      open={aberto}
      onClose={fechar}
      title={trabalho ? 'Editar trabalho' : 'Novo trabalho'}
      size="lg"
      footer={<>
        <Button variant="outline" onClick={fechar} disabled={salvando}>Cancelar</Button>
        <Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
      </>}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2 text-sm">Título
          <Input aria-label="Título" maxLength={160} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </label>
        <Select label="Matéria" value={materiaId} options={materias.map((m) => ({ value: m.id, label: m.nome }))} onChange={(v) => setMateriaId(Number(v))} />
        <label className="text-sm">Data
          <Input aria-label="Data" type="date" value={data} min={`${anoLetivo}-01-01`} max={`${anoLetivo}-12-31`} onChange={(e) => setData(e.target.value)} />
        </label>
        <label className="text-sm">Avaliação (0 a 10)
          <Input aria-label="Avaliação (0 a 10)" inputMode="decimal" className="font-mono tabular-nums" value={avaliacao} onChange={(e) => setAvaliacao(e.target.value)} placeholder="8,5" />
        </label>
        <label className="text-sm">Fotos (até 6)
          <Input aria-label="Fotos (até 6)" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => escolherFotos(e.target.files)} />
          {jaTem > 0 && <span className="text-xs text-muted-foreground">Este trabalho já tem {jaTem} foto(s).</span>}
        </label>
        <label className="sm:col-span-2 text-sm">Descrição
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
        </label>
        <label className="sm:col-span-2 text-sm">Observações do professor
          <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
        </label>
        {erro && <p role="alert" className="sm:col-span-2 text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};
