# Ideation, Transport Module Modernization

> Selo 🟡 PLANEJADO em todos os itens, sujeito a validação.

## Brief original
Este documento descreve o problema de transporte escolar no i-Educar, seu valor para os usuários e as premissas que norteiam a engenharia reversa e modernização do módulo.

## Problema
🟡 O módulo de Transporte Escolar do i-Educar precisa ser reverse-engineered e modernizado para garantir conformidade com as regulamentações federais (PNATE/FNDE, CTB), melhorar a eficiência operacional em áreas rurais e garantir integração com o ecossistema SYSGOV (SYS-Educa).

## Valor entregue
🟡 Garantir que estudantes tenham acesso confiável e seguro ao ambiente escolar, dentro dos requisitos legais, com rotas otimizadas e gestão de frota eficiente.

## Alternativas existentes
🟡 1. Manutenção do módulo legado sem alterações - mantém compatibilidade, mas não resolve problemas de integração e escalabilidade.
🟡 2. Reescrita completa do módulo do zero - garante modernidade, mas exige alto esforço e risco de perda de conhecimento do domínio.
🟡 3. Integração via API com sistema externo - pode aliviar a carga, mas não resolve problemas de dados internos e exige manutenção dupla.

## Público-alvo (bruto)
🟡 Estudantes (especialmente em áreas rurais), escolas que dependem de transporte escolar, empresas de transporte que prestam serviços ao governo, e órgãos de educação e trânsito que fiscalizam o cumprimento das leis.

## Métricas de sucesso
🟡 100% de conformidade com as exigências do PNATE/FNDE e CTB em 12 meses
🟡 ≤1% de ausência de estudantes devido a problemas de transporte
🟡 Redução de 15% no tempo médio de deslocamento das rotas escolares
🟡 Zero discrepâncias nos dados do Censo Escolar

## Premissas a validar
🟡 1. Os dados legados do módulo de transporte podem ser migrados para o novo esquema sem perda crítica de informação.
🟡 2. As partes interessadas (escolas, transportadoras, órgãos reguladores) adotarão o novo sistema com mínima resistência.
🟡 3. As exigências regulatórias permanecerão estáveis durante o período de implementação e validação.

## Notas
🟡 Sessão de ideação baseada no contexto do módulo de Transporte Escolar descrito em legacy-mapping.md e no brief inicial sintetizado.

---
Gerado por reversa-ideator em 2026-10-20T13:15:42Z
Fonte: newproject-brief.md
Sessão de ideação reaproveitada: N/A (nova sessão)