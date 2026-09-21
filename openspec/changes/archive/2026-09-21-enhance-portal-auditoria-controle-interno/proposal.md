# Proposta: Melhorias e Expansão do Portal de Auditoria e Controle Interno (CAPD)

## Por Que

O Portal de Auditoria e Controle Interno do CAPD (`PortalAuditoriaView.tsx`) tem como objetivo primordial garantir a probidade, a legalidade e a conformidade regulamentar dos ciclos avaliativos do município perante os órgãos de controle externo (Tribunais de Contas Estaduais/Municipais - TCE/TCM, Ministério Público e Controladoria Geral).

Atualmente, o portal conta com uma interface básica dividida em apenas duas abas simples (uma listagem de impedimentos e um mock estático de 4 linhas na trilha forense), carecendo de:
1. **Painel Executivo de Indicadores (KPIs)**: Inexistência de métricas sintetizadas no topo sobre saúde e conformidade da avaliação de estágio probatório e desempenho estável;
2. **Fila de Amostragem & Trava Anti-Leniência (Auditoria Mandatória)**: O backend já possui suporte à amostragem regulamentar (10% das avaliações) e auditoria de notas extremas (< 4.00 ou >= 9.50) via `AuditoriaSamplagemService.php` e `PainelGerencialService.php`, mas o auditor não possui tela para auditar se notas extremas tiveram o devido respaldo prévio no Diário de Bordo (Técnica do Incidente Crítico - CIT);
3. **Verificador Criptográfico e Trilha Forense Expandida**: O verificador SHA-256 opera em delay estático sem filtros multifacetados por módulo (Avaliações, Devolutivas, Recursos, Diário de Bordo), período e agente, nem exportação de dossiê probatório formal;
4. **Conformidade LGPD & Trilha de Acessos a Dados Sensíveis**: Ausência de monitoramento de consultas a prontuários e notas de desempenho funcionais, salvaguardando a privacidade e transparência do processo administrativo.

Esta proposta visa dotar a Controladoria Interna e os Auditores Municipais de um instrumento completo, analítico e irrefutável para fiscalização contínua do CAPD.

## O Que Muda

- **Painel Executivo de Indicadores de Controle Interno**:
  - Implementação de 4 cartões de indicadores executivos (`StatCard` de `@sysgov/ui`) consolidando:
    - *Impedimentos Ativos & Suspeições* (bloqueios de parentesco até 3º grau em vigor);
    - *Registros na Trilha Forense* (total de eventos com carimbo imutável);
    - *Fila de Amostragem & Notas Extremas* (avaliações em escrutínio obrigatório pelo Controle Interno);
    - *Índice de Integridade Criptográfica (SHA-256)* (taxa de conformidade 100% de assinaturas válidas).
- **Estruturação em 4 Sub-Abas Especializadas**:
  1. **Impedimentos & Parentesco (Art. 31)**: Listagem com `DataTable`, filtros por status (ativo/resolvido), modal de homologação/desativação de impedimento e declaração com seleção dinâmica de servidores e fundamentação fática;
  2. **Fila de Amostragem & Trava Anti-Leniência**: Inspeção de avaliações selecionadas por sorteio amostral regulamentar (10%) ou por notas extremas (Graus 1 e 5), checagem do apontamento de incidentes críticos no Diário de Bordo e emissão de parecer do auditor;
  3. **Trilha Forense Imutável & Verificador SHA-256**: Tabela analítica completa com paginação, filtros por módulo/tipo de ação, pesquisa de IP e agente, verificador de integridade criptográfica com certificação visual e exportação de dossiê forense (CSV/JSON);
  4. **Conformidade LGPD & Acessos a Dados Pessoais**: Histórico de acessos a prontuários avaliativos, monitoramento de exportações e checklist de conformidade legal.
- **Módulo Utilitário Puro & Testes Unitários no Vitest**:
  - Criação de `PortalAuditoriaView.utils.ts` contendo funções de validação de integridade de hash, cálculo de KPIs de auditoria, filtros de amostragem e testes no Vitest (`PortalAuditoriaView.utils.test.ts`).
- **Conformidade com o Design System**:
  - Uso exclusivo de componentes de `@sysgov/ui` e `@/components/ui` (`PageHeader`, `Tabs`, `StatCard`, `DataTable`, `Badge`, `Modal`, `Select`, `Input`), tipografia técnica `JetBrains Mono` (`font-mono tabular-nums`) em números, notas, IPs, datas e hashes SHA-256, sem diálogos nativos (`alert`/`confirm`).

## Capacidades

### Capacidades Modificadas
- `capd`: Expande os requisitos do Portal de Auditoria e Controle Interno para incluir painel de KPIs, fila de amostragem anti-leniência, trilha forense SHA-256 avançada e monitoramento de conformidade LGPD.

## Impacto

- **Frontend (`apps/web-client`)**:
  - Atualização do componente `apps/web-client/src/modules/capd/views/PortalAuditoriaView.tsx`;
  - Criação de `apps/web-client/src/modules/capd/views/PortalAuditoriaView.utils.ts`;
  - Criação de `apps/web-client/src/modules/capd/views/__tests__/PortalAuditoriaView.utils.test.ts`.
- **SDK & Backend**:
  - Alinhamento com os métodos existentes de auditoria (`listarImpedimentosAuditoria`, `declararImpedimentoParentesco`, trilha forense de assinaturas e amostragem regulamentar).
- **Governança & Multi-Tenant**:
  - Rastreabilidade integral das decisões avaliativas com carimbo de tempo UTC-3 e isolamento absoluto por `tenant_id`.
