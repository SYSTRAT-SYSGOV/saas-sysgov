import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@sysgov/ui';
import { erroApi } from '../../escola/api';
import type { Toast } from '../../escola/components/AdminModal';
import { portfolioApi, type AlunoPortfolio, type Periodo } from '../api';
import { formatarAvaliacao, rotuloPeriodo } from '../formato';

interface Props { aluno: AlunoPortfolio; turma: string; periodo: Periodo; avisar: Toast }

function nomeArquivo(aluno: AlunoPortfolio, p: Periodo): string {
  const slug = aluno.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `Portfolio_${slug}_${p.ano}${p.trimestre ? `_T${p.trimestre}` : ''}.pdf`;
}

export const CabecalhoAluno: React.FC<Props> = ({ aluno, turma, periodo, avisar }) => {
  const [gerando, setGerando] = useState(false);

  const exportar = async () => {
    setGerando(true);
    try {
      const blob = await portfolioApi.relatorio(aluno.id, periodo);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo(aluno, periodo);
      link.click();
      // Revogar na hora cancela o download em alguns navegadores (Firefox/Safari).
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      avisar({ type: 'error', title: 'Relatório', message: erroApi(e).mensagem });
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold break-words">{aluno.nome}</h2>
        <p className="text-sm text-muted-foreground">
          Turma {turma} · {rotuloPeriodo(periodo)} ·{' '}
          <span className="font-mono tabular-nums">{aluno.total_trabalhos}</span> trabalhos · média{' '}
          <span className="font-mono tabular-nums font-semibold">{formatarAvaliacao(aluno.media)}</span>
        </p>
      </div>
      <Button onClick={exportar} disabled={gerando} variant="outline" className="shrink-0">
        <Download className="h-4 w-4 mr-2" />
        {gerando ? 'Gerando…' : 'Exportar PDF'}
      </Button>
    </div>
  );
};
