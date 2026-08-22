# SYSGOV Design System

## Direção visual
Painel operacional para gestão governamental: navegação escura e densa, superfície clara para leitura, verde esmeralda para ações e estados conformes. Cards usam `rounded-lg`, borda sutil e sombra leve.

## Tokens
- Navegação: `slate-950`, `slate-900`, `slate-800`.
- Primário: `#10b981` / emerald.
- Apoio: indigo, cyan e amber.
- Fiscal: emerald conforme, amber atenção, rose crítico.

## Tipografia
Texto institucional usa DM Sans/Inter. Valores monetários, percentuais, datas, códigos e métricas usam JetBrains Mono. Nunca representar dinheiro com float.

## Componentes
Sidebar com grupos em caixa alta e atalhos; top bar com exercício e contexto; cards compactos de KPI; alertas com semântica explícita; tabelas escaneáveis; botão primário alinhado às ações principais.

## White-label
A interface deve receber `customPrimaryColor`, `customLogoUrl`, `portalTitle`, `portalSubtitle` e `hideProviderSignature` a partir de `tenant.settings`. Defaults são somente fallback visual.
