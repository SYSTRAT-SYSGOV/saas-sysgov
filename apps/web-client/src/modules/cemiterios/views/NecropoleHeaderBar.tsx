import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  ChevronDown,
  ArrowLeftRight,
  ShieldCheck,
  MapPin,
  Check,
  Layers,
  LayoutGrid,
  Pencil,
} from 'lucide-react';
import { Card, Badge, Button } from '@sysgov/ui';
import { useCemiteriosContext } from '../CemiteriosContext';
import type { Parque } from '../api';
import { ModalEditarCemiterio } from './ModalEditarCemiterio';

export interface NecropoleHeaderBarProps {
  className?: string;
}

export const NecropoleHeaderBar: React.FC<NecropoleHeaderBarProps> = ({ className = '' }) => {
  const {
    cemiterioAtivo,
    cemiteriosDisponiveis,
    selecionarCemiterio,
    voltarParaSelecao,
    abrirAdministracaoGeral,
    isGestorMunicipal,
    temMultiplosCemiterios,
  } = useCemiteriosContext();

  const [menuAberto, setMenuAberto] = useState(false);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickFora = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuAberto(false);
      }
    };
    if (menuAberto) {
      document.addEventListener('mousedown', handleClickFora);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickFora);
    };
  }, [menuAberto]);

  if (!cemiterioAtivo) return null;

  const totalJazigos = cemiterioAtivo.jazigos_count ?? 0;
  const totalSetores =
    cemiterioAtivo.setores_count ?? (cemiterioAtivo.setores ? cemiterioAtivo.setores.length : 0);
  const isAtivo = cemiterioAtivo.situacao === 'ativo';

  const outrosCemiterios = cemiteriosDisponiveis.filter((c) => c.id !== cemiterioAtivo.id);

  return (
    <Card className={`border-border bg-card/95 shadow-sm p-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Identificação do Cemitério Ativo */}
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Necrópole em Operação:
              </span>
              <Badge variant="outline" className="font-mono tabular-nums text-xs">
                {cemiterioAtivo.codigo}
              </Badge>
              <Badge variant={isAtivo ? 'default' : 'secondary'} className="capitalize text-xs">
                {isAtivo ? 'Ativo' : cemiterioAtivo.situacao}
              </Badge>
            </div>
            <h1 className="text-lg font-bold text-foreground tracking-tight mt-0.5">
              {cemiterioAtivo.nome}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {cemiterioAtivo.endereco || 'Endereço não informado'}
              <span className="mx-1.5">•</span>
              <span className="font-mono tabular-nums font-medium text-foreground">
                {totalSetores}
              </span>{' '}
              setores
              <span className="mx-1.5">•</span>
              <span className="font-mono tabular-nums font-medium text-foreground">
                {totalJazigos.toLocaleString('pt-BR')}
              </span>{' '}
              jazigos
            </p>
          </div>
        </div>

        {/* Ações e Alternador de Cemitério */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0 relative" ref={menuRef}>
          {isGestorMunicipal && (
            <Button
              variant="outline"
              size="sm"
              onClick={abrirAdministracaoGeral}
              className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 gap-1.5 h-9"
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden md:inline">Administração Geral</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalEditarAberto(true)}
            className="gap-1.5 h-9"
            title="Configurar dados e coordenadas geográficas da necrópole"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden lg:inline">Editar Necrópole</span>
          </Button>

          {temMultiplosCemiterios && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMenuAberto((prev) => !prev)}
                className="gap-1.5 h-9"
                aria-expanded={menuAberto}
                aria-label="Alternar Cemitério"
              >
                <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                <span>Trocar Cemitério</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
              </Button>

              {/* Dropdown Menu */}
              {menuAberto && (
                <div className="absolute right-0 mt-2 w-72 rounded-lg border border-border bg-popover p-1.5 shadow-lg z-50 animate-in fade-in-0 zoom-in-95">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border mb-1">
                    Alternar Necrópole
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {/* Cemitério Atual */}
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted text-xs font-medium text-foreground">
                      <span className="truncate">{cemiterioAtivo.nome}</span>
                      <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1.5" />
                    </div>

                    {/* Outros Cemitérios */}
                    {outrosCemiterios.map((outro) => (
                      <button
                        key={outro.id}
                        type="button"
                        onClick={() => {
                          selecionarCemiterio(outro.id);
                          setMenuAberto(false);
                        }}
                        className="w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-accent text-xs text-foreground transition-colors"
                      >
                        <span className="truncate">{outro.nome}</span>
                        <Badge variant="outline" className="font-mono tabular-nums text-[10px] ml-1.5 shrink-0">
                          {outro.codigo}
                        </Badge>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-border mt-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        voltarParaSelecao();
                        setMenuAberto(false);
                      }}
                      className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      Ver Todos os Cemitérios (Grade)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ModalEditarCemiterio
        aberto={modalEditarAberto}
        onFechar={() => setModalEditarAberto(false)}
        parque={cemiterioAtivo}
      />
    </Card>
  );
};
