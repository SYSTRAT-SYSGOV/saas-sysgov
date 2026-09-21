# Documento de Design Técnico: Expansão do Portal de Auditoria e Controle Interno (CAPD)

## Contexto

O Portal de Auditoria e Controle Interno (`PortalAuditoriaView.tsx`) tem a missão de fiscalizar e garantir a conformidade dos ciclos avaliativos municipais. Embora o backend do SYSGOV já implemente `ParentescoService` (bloqueio de parentesco até 3º grau), `AuditoriaSamplagemService` (amostragem estatística de 10%), `PainelGerencialService` (fila de auditoria para notas extremas) e `Sha256AssinaturaAdapter` (assinaturas com carimbo imutável), o frontend atual carecia de uma interface integrada e analítica.

Para garantir alta manutenibilidade, desacoplamento e cobertura de testes, as regras de cálculo, filtros, geração e verificação de hashes SHA-256 serão isoladas no módulo utilitário `PortalAuditoriaView.utils.ts` com testes no Vitest (`PortalAuditoriaView.utils.test.ts`).

## Objetivos e Não-Objetivos

**Objetivos:**
- Implementar painel de 4 `StatCard` com indicadores consolidados de integridade e fiscalização;
- Expandir a navegação para 4 sub-abas estruturadas:
  1. *Impedimentos & Parentesco* (com filtros, homologação e desativação);
  2. *Fila de Amostragem & Trava Anti-Leniência* (cruzamento com CIT/Diário de Bordo e emissão de pareceres de controle interno);
  3. *Trilha Forense Imutável & Verificador SHA-256* (verificação criptográfica em tempo real e exportação de dossiê);
  4. *Conformidade LGPD & Acessos* (trilha de visualização de prontuários avaliativos).
- Garantir uso exclusivo dos componentes de `@sysgov/ui` e tipografia `JetBrains Mono` (`font-mono tabular-nums`).

**Não-Objetivos:**
- Alterar as tabelas do banco de dados relacional ou quebrar retrocompatibilidade da trilha de eventos;
- Substituir o algoritmo SHA-256 por outro padrão criptográfico.

## Decisões Técnicas

### 1. Isolamento de Funções Puras em `PortalAuditoriaView.utils.ts`
- **Decisão**: Isolar a formatação de dados forenses, cálculo de integridade percentual, geração e validação de hash SHA-256 (simulada/real) e cruzamento de amostragem com o Diário de Bordo em um arquivo auxiliar de funções puras.
- **Justificativa**: Facilita a escrita de testes unitários rápidos e determinísticos com Vitest, mantendo o arquivo de view focado na renderização declarativa e nos estados de tela.

### 2. Uso do Componente `DataTable` com Filtros Multifacetados
- **Decisão**: Utilizar o `DataTable` oficial com suporte a paginação e busca para as 4 trilhas do portal (Impedimentos, Amostragem, Logs Forenses e Acessos LGPD).
- **Justificativa**: Garante desempenho fluido mesmo com centenas de registros, permitindo ao auditor filtrar rapidamente por tipo de evento, status ou matrícula do servidor.

### 3. Tratamento de Modal e Confirmações
- **Decisão**: Substituição de qualquer chamada a diálogos nativos (`alert`, `confirm`) pelos modais `Modal` e `ConfirmDialog` do `@sysgov/ui` / `@/components/ui`.
- **Justificativa**: Regra mandatória do SYSGOV e padronização visual com feedback acessível ao operador.

## Riscos / Trade-offs

| Risco | Mitigação |
|---|---|
| Volume expressivo de logs forenses degradando a renderização | Paginação nativa de 10 a 50 itens por página através do `DataTable` |
| Verificação de hash em lotes grandes bloqueando a thread de UI | Algoritmo assíncrono não-bloqueante para checagem e normalização de strings hexadecimais |
| Dados sensíveis de servidores expostos indevidamente | Mascaramento de CPF nos logs de acesso e controle rigoroso de visibilidade por papel (RBAC `auditoria_capd`) |

## Plano de Migração
- A reestruturação é estritamente aditiva e preserva os contratos das props existentes de `PortalAuditoriaViewProps`;
- Testes unitários garantirão zero regressões na suíte do web-client.
