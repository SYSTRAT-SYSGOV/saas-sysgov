import { useCallback, useEffect, useRef, useState } from 'react';
import { portfolioApi, type AlunoPortfolio, type Periodo, type TurmaPortfolio } from './api';

export function usePortfolio() {
  const [periodo, setPeriodo] = useState<Periodo>({ ano: new Date().getFullYear(), trimestre: null });
  const [turmas, setTurmas] = useState<TurmaPortfolio[]>([]);
  const [turmaId, setTurmaId] = useState<number | null>(null);
  const [alunos, setAlunos] = useState<AlunoPortfolio[]>([]);
  const [carregandoAlunos, setCarregandoAlunos] = useState(false);
  const [alunoId, setAlunoId] = useState<number | null>(null);

  useEffect(() => {
    let ativo = true;
    portfolioApi.turmas(periodo.ano).then((lista) => {
      if (!ativo) return;
      setTurmas(lista);
      setTurmaId((atual) => (lista.some((t) => t.id === atual) ? atual : lista[0]?.id ?? null));
    }).catch(() => { if (ativo) { setTurmas([]); setTurmaId(null); } });
    return () => { ativo = false; };
  }, [periodo.ano]);

  // Só a resposta do pedido mais recente vale (trocar de ano refaz a busca com a turma antiga e depois a nova).
  const pedido = useRef(0);
  const recarregarAlunos = useCallback(async () => {
    const meu = ++pedido.current;
    if (turmaId === null) { setAlunos([]); return; }
    setCarregandoAlunos(true);
    try {
      const lista = await portfolioApi.alunos(turmaId, periodo);
      if (meu === pedido.current) setAlunos(lista);
    } catch {
      if (meu === pedido.current) setAlunos([]);
    } finally {
      if (meu === pedido.current) setCarregandoAlunos(false);
    }
  }, [turmaId, periodo]);

  useEffect(() => { void recarregarAlunos(); }, [recarregarAlunos]);
  useEffect(() => { setAlunoId(null); }, [turmaId]);

  return { periodo, setPeriodo, turmas, turmaId, setTurmaId, alunos, carregandoAlunos, alunoId, setAlunoId, recarregarAlunos };
}
