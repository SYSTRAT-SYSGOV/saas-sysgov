# Tasks

## 1. Especificações, Contratos e Cenários BDD

- [x] 1.1 Criar contrato OpenAPI `apps/api/Modules/Educa/openspec/contracts/conselho-classe.openapi.yaml` cobrindo cronogramas, fichas de pré-conselho, atas e deliberações
- [x] 1.2 Criar cenários BDD em Gherkin `apps/api/Modules/Educa/openspec/scenarios/conselho-classe-atas.feature` cobrindo validação de prazos de pré-conselho e imutabilidade de ata finalizada
- [x] 1.3 Validar contrato OpenAPI com linter `@redocly/cli lint` (0 erros, 0 warnings)

## 2. Banco de Dados e Modelos Eloquent (Multi-Tenant & UUID)

- [x] 2.1 Criar migration para `educa_conselho_cronogramas`, `educa_conselho_pre_conselhos`, `educa_conselho_pre_conselho_alunos`, `educa_conselho_atas`, `educa_conselho_deliberacoes_alunos` e `educa_conselho_membros` com `tenant_id` bigint, PKs em UUID `CHAR(36)`, SoftDeletes e índices compostos
- [x] 2.2 Criar Models Eloquent (`EducaConselhoCronograma`, `EducaConselhoPreConselho`, `EducaConselhoPreConselhoAluno`, `EducaConselhoAta`, `EducaConselhoDeliberacaoAluno`, `EducaConselhoMembro`) com traits `TenantAware`, `HasUuids` e `SoftDeletes`
- [x] 2.3 Atualizar relações em `EducaSchoolClass`, `EducaSchool` e `EducaEnrollment` para navegação de conselho e pré-conselho

## 3. Serviços de Domínio e Regras de Negócio

- [x] 3.1 Implementar `ConselhoCronogramaService` para gestão de períodos avaliativos e validação de janelas de submissão do pré-conselho
- [x] 3.2 Implementar `PreConselhoService` para registro de fichas diagnósticas por componente curricular e mapeamento individualizado de estudantes com intervenção pedagógica
- [x] 3.3 Implementar `ConselhoAtaService` para gestão de reuniões colegiadas, deliberações de progressão/retenção com parecer descritivo e trava de imutabilidade de ata finalizada

## 4. Camada HTTP, FormRequests, RBAC e Rotas REST

- [x] 4.1 Criar FormRequests para validação de cronogramas, fichas de pré-conselho, atas e deliberações individuais
- [x] 4.2 Criar Policy RBAC `ConselhoClassePolicy` e registrar permissões `educa.conselho.*` no `EducaServiceProvider`
- [x] 4.3 Implementar controllers (`ConselhoCronogramaController`, `PreConselhoController`, `ConselhoAtaController`) e registrar rotas sob `/api/educa/conselho/*` com parâmetros seguros `{cronogramaId}`, `{preConselhoId}` e `{ataId}`

## 5. Frontend Web-Client: Conselho de Classe & Pré-Conselho

- [x] 5.1 Criar componente `ConselhoClasseView.tsx` no `apps/web-client` com abas para Cronogramas, Pré-Conselho por Disciplina e Atas Deliberativas Colegiadas
- [x] 5.2 Implementar modais com componentes `@sysgov/ui` para preenchimento de ficha diagnóstica, convocação de reunião e homologação de ata deliberativa com tipografia em `JetBrains Mono`
- [x] 5.3 Integrar a aba "Conselho de Classe" ao `EducaModule.tsx` e exportar em `apps/web-client/src/modules/educa`
- [x] 5.4 Validar tipagem TypeScript com `npx tsc --noEmit` em `apps/web-client` (0 erros)

## 6. Testes Automatizados e Validação

- [x] 6.1 Criar suíte de testes Feature `ConselhoClasseAndAtasTest.php` cobrindo submissão de pré-conselho, deliberações na ata, trava de edição em ata finalizada e isolamento multi-tenant estrito
- [x] 6.2 Executar suíte PHPUnit e verificar 100% de aprovação
- [x] 6.3 Validar a change com `openspec validate criar-modulo-educa-conselho-classe --strict`
