# Documento de Design Técnico: Integrações RH & Embed no Portal do RH (CAPD)

## Contexto

A aba de integrações de RH em `PortalRhView.tsx` (`activeTab === 'integracao'`) é atualmente um bloco estático de aviso. No entanto, o ecossistema de backend do SYSGOV já conta com os controllers `RhIntegrationController.php` e `CapdEmbedController.php`, com persistência em `capd_rh_integracoes` e `capd_rh_sync_logs`. No frontend, já existe a rota de embutimento `CapdEmbedPage.tsx`.

A abordagem técnica consiste em desacoplar essa complexidade em um componente independente, modular e testável (`IntegracoesEmbedPanel.tsx`), acompanhado de um módulo de funções utilitárias puras (`IntegracoesEmbedPanel.utils.ts`) para cálculos de métricas, mascaramento de chaves e geração de snippets HTML com 100% de cobertura de testes unitários no Vitest.

## Objetivos e Não-Objetivos

**Objetivos:**
- Criar a interface completa de gerenciamento para os 5 drivers de conectores (Betha, IPM, Senior, TOTVS e REST Genérico);
- Disponibilizar tabela analítica de auditoria (`DataTable`) para histórico de sincronizações com detalhe de carga e status;
- Desenvolver assistente visual de emissão de tokens embed para iframe com sandbox interativo;
- Manter aderência estrita a `@sysgov/ui` e às regras de tipografia técnica (`JetBrains Mono` em tokens, chaves e contadores).

**Não-Objetivos:**
- Alterar o protocolo de autenticação JWT/HMAC dos endpoints existentes no backend;
- Reimplementar a página consumidora de embed (`CapdEmbedPage.tsx`), que já funciona autonomamente;
- Adicionar novos drivers ERP no backend além dos 5 já suportados.

## Decisões Técnicas

### 1. Componente Modular Dedicado vs. Expansão do Monólito `PortalRhView.tsx`
- **Decisão**: Criar `IntegracoesEmbedPanel.tsx` no mesmo diretório de módulos do CAPD e importá-lo no `PortalRhView.tsx`.
- **Justificativa**: `PortalRhView.tsx` já possui mais de 4.000 linhas de código. Adicionar dezenas de estados e tabelas aumentaria o acoplamento e degradaria a manutenibilidade.
- **Alternativas consideradas**:
  - *Escrever inline no PortalRhView*: Rejeitado para evitar sobrecarga de renderização e facilitar testes isolados.

### 2. Funções Utilitárias Puras e Tipos em Arquivo Separado (`IntegracoesEmbedPanel.utils.ts`)
- **Decisão**: Isolar a formatação de snippets `<iframe>`, mascaramento de chaves API (ex: `sk_live_...4f8a`), cálculo de taxas de sucesso e validações em `IntegracoesEmbedPanel.utils.ts`.
- **Justificativa**: Permite testes unitários rápidos e determinísticos com Vitest sem necessidade de mockar o DOM ou chamadas de rede.

### 3. Integração com SDK do SYSGOV (`api.capd`)
- **Decisão**: Reutilizar as chamadas de API do cliente existentes (`listIntegracoesRh`, `createIntegracaoRh`, `getIntegracoesLogs`, `generateEmbedToken`, etc.) com fallback mock gracioso para ambientes de desenvolvimento offline ou demonstração local.
- **Justificativa**: Garante que o painel funcione tanto com a API conectada em produção quanto em modo estande de testes local.

### 4. Diálogos e Modais de Confirmação com `@sysgov/ui`
- **Decisão**: Usar os componentes `Modal` e botões com variantes do `@sysgov/ui` para a regeneração de chaves e visualização de payloads JSON.
- **Justificativa**: Em conformidade com a regra de ouro do SYSGOV: proibição absoluta de `window.confirm()` ou `alert()` nativos.

## Riscos / Trade-offs

| Risco | Mitigação |
|---|---|
| Exposição acidental de chaves de API na interface | Chaves são exibidas mascaradas por padrão, com botão de revelar temporário e ação de cópia segura com limpeza automática de buffer |
| Grande volume de logs de sincronização degradando o DOM | Utilização do componente `DataTable` com paginação nativa (10 por página) e ordenação por data descendente |
| Iframe embutido no simulador gerando erros de CORS/X-Frame-Options | Uso do atributo `sandbox="allow-scripts allow-forms allow-same-origin"` e fallback para URL direta |

## Plano de Migração
- O componente substitui a marcação provisória no ponto exato `activeTab === 'integracao'`, mantendo compatibilidade total com as demais 9 abas do Portal do RH;
- Não há migração de banco de dados nem quebra de contratos legados.
