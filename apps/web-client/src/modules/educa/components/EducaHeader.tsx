import React from 'react';
import { Button, Badge } from '@sysgov/ui';
import { GraduationCap, Building2, Calendar, RefreshCw } from 'lucide-react';
import { useEduca } from '../context/EducaContext';

export const EducaHeader: React.FC = () => {
  const {
    escolaAtivaId,
    setEscolaAtivaId,
    escolaAtiva,
    anoLetivoAtivo,
    setAnoLetivoAtivo,
    anoLetivoObj,
    escolas,
    anosLetivos,
    carregando,
    recarregar,
  } = useEduca();

  return (
    <header className="bg-white border-b border-gov-border px-6 py-4 mb-6 rounded-lg shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Identificação e Título */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gov-text-primary tracking-tight">
                SYS-Educa — Gestão Escolar Integrada
              </h1>
              <Badge variant="outline" className="font-mono text-xs text-blue-700 bg-blue-50 border-blue-200">
                MUNICIPAL
              </Badge>
            </div>
            <p className="text-xs text-gov-text-muted mt-0.5">
              Administração de Ensino, Matrículas, Diário Pedagógico e Conformidade Legal
            </p>
          </div>
        </div>

        {/* Seletores de Contexto Global */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Escola */}
          <div className="flex items-center gap-2 bg-gov-page px-3 py-1.5 rounded-md border border-gov-border">
            <Building2 className="w-4 h-4 text-gov-text-muted" />
            <span className="text-xs font-medium text-gov-text-muted">Escola:</span>
            <select
              value={escolaAtivaId || ''}
              onChange={(e) => setEscolaAtivaId(e.target.value || null)}
              className="bg-transparent text-xs font-semibold text-gov-text-primary focus:outline-hidden cursor-pointer"
            >
              {escolas.length === 0 ? (
                <option value="">Nenhuma escola</option>
              ) : (
                escolas.map((esc) => (
                  <option key={esc.id} value={esc.id}>
                    {esc.sigla || esc.nome}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Seletor de Ano Letivo */}
          <div className="flex items-center gap-2 bg-gov-page px-3 py-1.5 rounded-md border border-gov-border">
            <Calendar className="w-4 h-4 text-gov-text-muted" />
            <span className="text-xs font-medium text-gov-text-muted">Ano:</span>
            <select
              value={anoLetivoAtivo}
              onChange={(e) => setAnoLetivoAtivo(Number(e.target.value))}
              className="bg-transparent text-xs font-mono font-semibold text-gov-text-primary focus:outline-hidden cursor-pointer tabular-nums"
            >
              {anosLetivos.length === 0 ? (
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
              ) : (
                anosLetivos.map((ano) => (
                  <option key={ano.id} value={ano.ano}>
                    {ano.ano}
                  </option>
                ))
              )}
            </select>
            {anoLetivoObj && (
              <Badge
                variant="outline"
                className={`text-[10px] uppercase font-mono px-1.5 py-0 ${
                  anoLetivoObj.status === 'active'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-300'
                    : 'text-amber-700 bg-amber-50 border-amber-300'
                }`}
              >
                {anoLetivoObj.status}
              </Badge>
            )}
          </div>

          {/* Botão de Atualizar */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => recarregar()}
            disabled={carregando}
            className="flex items-center gap-1.5 text-xs text-gov-text-secondary h-8 px-2.5"
            title="Sincronizar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Faixa Informativa de Contexto Ativo */}
      {escolaAtiva && (
        <div className="mt-3 pt-3 border-t border-gov-border/60 flex items-center justify-between text-xs text-gov-text-secondary">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gov-text-primary">{escolaAtiva.nome}</span>
            {escolaAtiva.codigo_inep && (
              <span className="text-gov-text-muted">
                INEP: <strong className="font-mono tabular-nums text-gov-text-primary">{escolaAtiva.codigo_inep}</strong>
              </span>
            )}
          </div>
          <div className="text-gov-text-muted">
            Ano Letivo Vigente: <strong className="font-mono tabular-nums text-gov-text-primary">{anoLetivoAtivo}</strong>
          </div>
        </div>
      )}
    </header>
  );
};
