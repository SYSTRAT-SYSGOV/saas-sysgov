import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@sysgov/ui';
import { Scale, Clock, Sparkles, AlertTriangle, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import type { Jazigo, Concessao, Inumacao, Vistoria } from '../api';
import {
  calcularStatusConcessao,
  calcularStatusExumacao,
  obterAlertasReguloriosJazigo,
} from '../regulamentacao.utils';
import { Mono } from './comum';
import { BadgeAlertaRegulatorio } from './BadgeAlertaRegulatorio';

export interface PainelRegulatorioDrawerProps {
  jazigo: Pick<Jazigo, 'id' | 'codigo' | 'estado' | 'tipo' | 'ocupacao'>;
  concessao?: Concessao | null;
  inumacoes?: Inumacao[];
  vistorias?: Vistoria[];
  onEmitirNotificacao?: (concessao: Concessao) => void;
  onSolicitarExumacao?: (inumacao: Inumacao) => void;
}

export const PainelRegulatorioDrawer: React.FC<PainelRegulatorioDrawerProps> = ({
  jazigo,
  concessao,
  inumacoes = [],
  vistorias = [],
  onEmitirNotificacao,
  onSolicitarExumacao,
}) => {
  const alertas = obterAlertasReguloriosJazigo({
    jazigo,
    concessao,
    inumacoes,
    vistorias,
  });

  const diagConcessao = calcularStatusConcessao(concessao);

  // Inumações com seus diagnósticos sanitários individuais
  const inumacoesComDiagnostico = inumacoes.map((i) => ({
    inumacao: i,
    diag: calcularStatusExumacao(i, 3),
  }));

  const inumacoesElegiveis = inumacoesComDiagnostico.filter((item) => item.diag.elegivel);

  return (
    <Card className="gap-0 py-0 overflow-hidden shadow-2xs border-border">
      <CardHeader className="p-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Scale className="h-3.5 w-3.5 text-primary" /> Inteligência Regulatória & Sanitária
        </CardTitle>
        {alertas.length > 0 ? (
          <Badge variant="outline" className="text-[10px] font-mono tabular-nums text-amber-500 border-amber-500/30">
            {alertas.length} {alertas.length === 1 ? 'alerta ativo' : 'alertas ativos'}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Regular
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-3 space-y-3 text-xs">
        {/* Lista resumida de alertas regulatórios */}
        {alertas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 rounded-md bg-muted/40 border border-border/60">
            {alertas.map((a, idx) => (
              <BadgeAlertaRegulatorio key={`${a.tipo}-${idx}`} alerta={a} />
            ))}
          </div>
        )}

        {/* 1. Diagnóstico da Concessão */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-indigo-400" /> Situação Concessória:
            </span>
            <span className="font-semibold text-foreground">
              {concessao ? (
                concessao.modalidade === 'perpetua' ? (
                  'Perpétua'
                ) : diagConcessao.status === 'vencida' ? (
                  <span className="text-rose-500 font-bold">Vencida</span>
                ) : diagConcessao.status === 'a_vencer' ? (
                  <span className="text-amber-500 font-bold">Vence em Breve</span>
                ) : (
                  <span className="text-emerald-500">Vigente</span>
                )
              ) : (
                'Sem Concessão'
              )}
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {diagConcessao.descricao}
            {concessao?.termino && (
              <>
                {' '}
                · Vencimento:{' '}
                <Mono className="font-semibold text-foreground">{concessao.termino}</Mono>
              </>
            )}
          </p>

          {/* Botão de Notificação de Titular se vencida ou a vencer */}
          {concessao && (diagConcessao.status === 'vencida' || diagConcessao.status === 'a_vencer') && (
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-[11px] gap-1.5 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                onClick={() => onEmitirNotificacao?.(concessao)}
              >
                <UserCheck className="h-3 w-3" /> Emitir Notificação ao Titular ({concessao.numero})
              </Button>
            </div>
          )}
        </div>

        {/* 2. Diagnóstico Sanitário de Inumações e Exumação */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-cyan-500" /> Ciclo Sanitário / Exumações:
            </span>
            <span className="text-[11px] text-muted-foreground">
              Interstício legal:{' '}
              <Mono className="font-semibold text-foreground">3 anos</Mono>
            </span>
          </div>

          {inumacoesComDiagnostico.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">
              Nenhuma inumação ativa no momento (unidade desocupada).
            </p>
          ) : (
            <div className="space-y-1.5">
              {inumacoesComDiagnostico.map(({ inumacao, diag }) => (
                <div
                  key={inumacao.id}
                  className={`p-2 rounded border text-[11px] space-y-1 ${
                    diag.elegivel
                      ? 'bg-cyan-500/10 border-cyan-500/30 dark:bg-cyan-950/20'
                      : 'bg-muted/30 border-border/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground truncate max-w-[180px]">
                      {inumacao.falecido?.nome || `Falecido #${inumacao.deceased_id}`}
                    </span>
                    <Badge
                      variant={diag.elegivel ? 'secondary' : 'outline'}
                      className={`text-[9px] px-1 py-0 ${
                        diag.elegivel
                          ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold'
                          : 'text-muted-foreground font-mono tabular-nums'
                      }`}
                    >
                      {diag.elegivel ? 'Apto p/ Exumação' : `${diag.tempoFormatado} decorridos`}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>
                      Sepultado em:{' '}
                      <Mono className="font-medium text-foreground">{inumacao.sepultado_em}</Mono>
                    </span>
                    <Mono className="font-medium">{diag.tempoFormatado}</Mono>
                  </div>

                  {diag.elegivel && onSolicitarExumacao && (
                    <div className="pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-6 text-[10px] gap-1 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/15"
                        onClick={() => onSolicitarExumacao(inumacao)}
                      >
                        Iniciar Translado ao Ossuário <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
