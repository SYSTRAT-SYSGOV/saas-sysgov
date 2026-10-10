import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AlertCard, Button, Modal, Skeleton } from '@sysgov/ui';
import { erroApi } from '../../escola/api';
import type { Toast } from '../../escola/components/AdminModal';
import { portfolioApi, type ImagemTrabalho, type MateriaPortfolio, type Periodo, type Trabalho } from '../api';
import { CardTrabalho } from './CardTrabalho';
import { ImagemAutenticada } from './ImagemAutenticada';
import { TrabalhoFormModal } from './TrabalhoFormModal';

interface Props {
  alunoId: number;
  turmaId: number;
  periodo: Periodo;
  avisar: Toast;
  aoAlterar: () => void;
  /** Tem portfolio.manage ou portfolio.professor (conveniência de tela — a regra é do servidor). */
  podeLancar: boolean;
}

export const LinhaDoTempo: React.FC<Props> = ({ alunoId, turmaId, periodo, avisar, aoAlterar, podeLancar }) => {
  const navigate = useNavigate();
  const [trabalhos, setTrabalhos] = useState<Trabalho[] | null>(null);
  const [materias, setMaterias] = useState<MateriaPortfolio[]>([]);
  const [semVinculos, setSemVinculos] = useState(false);
  const [materiasCarregadas, setMateriasCarregadas] = useState(false);
  const [editando, setEditando] = useState<Trabalho | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [excluindo, setExcluindo] = useState<Trabalho | null>(null);
  const [imagem, setImagem] = useState<{ trabalho: Trabalho; imagem: ImagemTrabalho } | null>(null);

  // Só a resposta do pedido mais recente vale: trocar de aluno ou período não pode mostrar dados do anterior.
  const pedido = useRef(0);
  const carregar = useCallback(async () => {
    const meu = ++pedido.current;
    setTrabalhos(null);
    try {
      const lista = await portfolioApi.trabalhos(alunoId, periodo);
      if (meu === pedido.current) setTrabalhos(lista);
    } catch (e) {
      if (meu !== pedido.current) return;
      setTrabalhos([]);
      avisar({ type: 'error', title: 'Portfólio', message: erroApi(e).mensagem });
    }
  }, [alunoId, periodo, avisar]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => {
    let ativo = true;
    setMateriasCarregadas(false);
    portfolioApi.materias(turmaId)
      .then((r) => { if (ativo) { setMaterias(r.materias); setSemVinculos(r.sem_vinculos); } })
      .catch(() => { if (ativo) { setMaterias([]); setSemVinculos(false); } })
      .finally(() => { if (ativo) setMateriasCarregadas(true); });
    return () => { ativo = false; };
  }, [turmaId]);

  const aposSalvar = () => { setFormAberto(false); setEditando(null); void carregar(); aoAlterar(); };

  const excluir = async () => {
    if (!excluindo) return;
    try {
      await portfolioApi.excluir(excluindo.id);
      avisar({ type: 'success', title: 'Portfólio', message: 'Trabalho excluído.' });
      setExcluindo(null);
      void carregar();
      aoAlterar();
    } catch (e) {
      avisar({ type: 'error', title: 'Portfólio', message: erroApi(e).mensagem });
    }
  };

  const removerFoto = async () => {
    if (!imagem) return;
    try {
      await portfolioApi.excluirImagem(imagem.trabalho.id, imagem.imagem.id);
      setImagem(null);
      void carregar();
    } catch (e) {
      avisar({ type: 'error', title: 'Portfólio', message: erroApi(e).mensagem });
    }
  };

  return (
    <div className="flex flex-col gap-3 pt-3">
      {podeLancar && (
        <div>
          <Button disabled={materias.length === 0} onClick={() => { setEditando(null); setFormAberto(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Novo trabalho
          </Button>
        </div>
      )}
      {podeLancar && materiasCarregadas && materias.length === 0 && (semVinculos ? (
        <AlertCard
          priority="warning"
          title="Turma sem matérias vinculadas"
          description="Esta turma ainda não tem matérias vinculadas no Cadastro Escolar. Vincule as matérias (e os professores) em Cadastro Escolar › Turmas para lançar trabalhos."
          actionLabel="Abrir Cadastro Escolar"
          onAction={() => navigate('/escola')}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Você não é o professor de nenhuma matéria desta turma no Cadastro Escolar.</p>
      ))}
      {trabalhos === null && <Skeleton className="h-32 w-full" />}
      {trabalhos?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum trabalho registrado neste período.</p>}
      {trabalhos?.map((t) => (
        <CardTrabalho key={t.id} trabalho={t} onEditar={() => { setEditando(t); setFormAberto(true); }} onExcluir={() => setExcluindo(t)} onAbrirImagem={(i) => setImagem({ trabalho: t, imagem: i })} />
      ))}

      <TrabalhoFormModal aberto={formAberto} alunoId={alunoId} materias={materias} anoLetivo={periodo.ano} trabalho={editando}
        onFechar={() => { setFormAberto(false); setEditando(null); }} onSalvo={aposSalvar} avisar={avisar} />

      <Modal open={excluindo !== null} onClose={() => setExcluindo(null)} title="Excluir trabalho" size="sm"
        footer={<><Button variant="outline" onClick={() => setExcluindo(null)}>Cancelar</Button><Button variant="destructive" onClick={excluir}>Excluir</Button></>}>
        <p className="text-sm">Excluir “{excluindo?.titulo}”? As fotos também serão apagadas e não poderão ser recuperadas.</p>
      </Modal>

      <Modal open={imagem !== null} onClose={() => setImagem(null)} title="Evidência" size="xl"
        footer={imagem?.trabalho.pode_editar ? <Button variant="destructive" onClick={removerFoto}>Remover foto</Button> : undefined}>
        {imagem && <ImagemAutenticada url={imagem.imagem.url} alt={imagem.imagem.nome} className="max-h-[75vh] w-full object-contain" />}
      </Modal>
    </div>
  );
};
