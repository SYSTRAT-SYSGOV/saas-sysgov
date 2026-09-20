# Design: Refinamento da Aba Homologação Final e Supressão de Cards Redundantes

## Context

Atualmente, `PortalCadView.tsx` renderiza cards gerais de governança do órgão no topo da página quando `activeTab === 'homologacao'`, pois essa aba recai no bloco de fallback (`else`). Isso duplica informações e polui a interface de trabalho da Comissão. Além disso, a sub-aba de homologação apresentava apenas um card simples com textos estáticos, sem métricas operacionais do ciclo selecionado e sem verificação dinâmica dos portões obrigatórios de validação regimental (RN-C07 a RN-C09).

Ver motivação em `proposal.md` e requisitos em `specs/capd/spec.md`.

## Goals / Non-Goals

**Goals:**
- Ajustar a condicional em `PortalCadView.tsx` para incluir `activeTab === 'homologacao'` na supressão de StatCards gerais do topo do portal.
- Desenvolver 4 StatCards dedicados da homologação com componentes `@sysgov/ui` e tipografia técnica `JetBrains Mono` (`font-mono tabular-nums`).
- Implementar o painel dinâmico de Portões de Validação (Audit Gates), verificando em tempo real: 100% de avaliações concluídas, zero recursos pendentes, atas seladas com hash SHA-256 e regularidade do quórum.
- Apresentar painel do Despacho Outbox (`capd.ciclo_homologado`) e termo de imutabilidade jurídica das notas após homologação.
- Manter o fluxo de confirmação através de `Modal` institucional do `@sysgov/ui`, proibindo o uso de `window.confirm` ou `alert`.

**Non-Goals:**
- Alterar as regras de transação e auditoria do backend (`HomologacaoLoteService.homologarCiclo()`).

## Decisions

### Decisão 1: Supressão Completa dos StatCards Gerais
- **Decisão**: A condicional de supressão no `PortalCadView.tsx` passará a cobrir todas as abas que possuem KPIs internos (`perguntas`, `escalas`, `pesos`, `consolidacao` e `homologacao`).
- **Racional**: Garante que cada aba exiba estritamente os seus próprios indicadores contextuais, sem sobreposição nem redundância.

### Decisão 2: Portões de Homologação (Audit Gates) com Feedback Dinâmico
- **Decisão**: Os 4 portões de validação calcularão o status com base no estado do ciclo selecionado e nos dados de recursos e sessões:
  - Gate 1: Avaliações concluídas (atendido se ciclo estiver em deliberação/encerrado ou homologado).
  - Gate 2: Recursos deliberados (atendido se `recursosPendentes.length === 0`).
  - Gate 3: Atas seladas (atendido se houver sessões seladas com SHA-256).
  - Gate 4: Fé pública e imutabilidade (atendido se quórum for $\ge 3$).
- **Racional**: Proporciona aos membros da CAD e auditores clareza imediata sobre a legitimidade da homologação.

## Risks / Trade-offs

- **[Risco]** Tentativa de homologar ciclo já homologado.
  - *Mitigação*: O botão de ação exibirá "Ciclo Já Homologado" com badge de sucesso e estado desabilitado quando `ciclo.status === 'homologado'`.
