# Tarefas de Implementação: Expansão do Portal de Auditoria e Controle Interno (CAPD)

## 1. Funções Utilitárias, Tipos e Testes Unitários

- [x] 1.1 Criar o arquivo `PortalAuditoriaView.utils.ts` contendo as interfaces de dados (`AuditoriaKpiSummary`, `ItemAmostragemAuditoria`, `LogAcessoLgpd`, `TrilhaForenseItem`), funções de cálculo de KPIs, normalização/validação de hash SHA-256 e filtros de auditoria; verificar via testes unitários.
- [x] 1.2 Criar a suíte de testes unitários `PortalAuditoriaView.utils.test.ts` cobrindo cenários de cálculo de métricas de integridade, validação de hashes, verificação de trava anti-leniência e mascaramento de dados sensíveis; verificar execução com `npm --prefix apps/web-client test`.

## 2. Painel Executivo e Métricas Analíticas

- [x] 2.1 Implementar a esteira superior de indicadores com 4 componentes `StatCard` (`@sysgov/ui`), exibindo contadores de impedimentos ativos, eventos forenses auditados, fila de amostragem/notas extremas e índice de integridade criptográfica em `JetBrains Mono`; verificar renderização fluida sem quebras de layout.
- [x] 2.2 Reestruturar a barra de sub-navegação em 4 sub-abas: "Impedimentos & Parentesco", "Fila de Amostragem & Anti-Leniência", "Trilha Forense & SHA-256" e "Conformidade LGPD & Acessos"; verificar alternância suave entre abas.

## 3. Gestão e Homologação de Impedimentos (Art. 31)

- [x] 3.1 Expandir a tabela `DataTable` de impedimentos adicionando filtros por status (ativo/resolvido) e ações por linha para homologação ou desativação fundamentada; verificar integridade visual dos elementos.
- [x] 3.2 Implementar modal de desativação/resolução de impedimento com justificativa administrativa obrigatória e confirmação via `ConfirmDialog`; verificar ausência de diálogos nativos do navegador.

## 4. Fila de Amostragem Regulatória e Trava Anti-Leniência

- [x] 4.1 Implementar a sub-aba da fila de amostragem exibindo avaliações em escrutínio (amostragem regulamentar de 10% e notas extremas de Grau 1 ou Grau 5) com `DataTable`, notas em `JetBrains Mono` e identificador do avaliador/avaliado; verificar ordenação e paginação.
- [x] 4.2 Implementar modal de inspeção detalhada de avaliação amostrada com visualização dos incidentes críticos (CIT) registrados no Diário de Bordo e emissão de parecer de controle interno (Aprovado / Reavaliação Solicitada / Diligência Aberta); verificar persistência de estado.

## 5. Trilha Forense Expandida, Verificador SHA-256 e Exportação

- [x] 5.1 Aprimorar a tabela `DataTable` da trilha forense adicionando filtros por módulo (Avaliação, Devolutiva, Recursos, CIT, Ciência), tipo de ação, pesquisa de IP e agente; verificar filtragem reativa.
- [x] 5.2 Aprimorar o verificador de integridade SHA-256 com feedback instantâneo de autenticidade documental, exibição de selo digital de conformidade e botão de cópia de hash; verificar validação positiva e negativa.
- [x] 5.3 Implementar botão de exportação de dossiê de auditoria em CSV/JSON para instrução de processos do Tribunal de Contas (TCM/TCE); verificar geração do download.

## 6. Conformidade LGPD e Verificação Final

- [x] 6.1 Implementar a sub-aba de conformidade LGPD com `DataTable` de histórico de acessos a notas e prontuários funcionais com mascaramento de dados e carimbo UTC-3; verificar renderização correta.
- [x] 6.2 Executar a checagem de tipos TypeScript (`npx tsc --noEmit`) e rodar a suíte completa de testes no Vitest (`npm --prefix apps/web-client test`), garantindo zero regressões e aprovação em todos os testes.
