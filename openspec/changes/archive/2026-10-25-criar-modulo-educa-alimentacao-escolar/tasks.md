# Tasks

## 1. Especificações, Contratos e Cenários BDD

- [x] 1.1 Criar contrato OpenAPI `apps/api/Modules/Educa/openspec/contracts/alimentacao-escolar.openapi.yaml` cobrindo cardápios, itens, restrições e refeições diárias
- [x] 1.2 Criar cenários BDD em Gherkin `apps/api/Modules/Educa/openspec/scenarios/alimentacao-escolar-pnae.feature` cobrindo homologação técnica, cálculo nutricional e alerta de restrições
- [x] 1.3 Validar contrato OpenAPI com linter `@redocly/cli lint` (0 erros, 0 warnings)

## 2. Banco de Dados e Modelos Eloquent (Multi-Tenant & UUID)

- [x] 2.1 Criar migrations para `educa_menus`, `educa_menu_items`, `educa_dietary_restrictions` e `educa_meal_logs` com `tenant_id` bigint, PKs em UUID `CHAR(36)`, SoftDeletes e índices compostos
- [x] 2.2 Criar Models Eloquent `EducaMenu`, `EducaMenuItem`, `EducaDietaryRestriction` e `EducaMealLog` com traits `TenantAware`, `HasUuids` e `SoftDeletes`
- [x] 2.3 Atualizar relações em `Pessoa` e `EducaSchool` para alimentar prontuário de restrições e refeições diárias

## 3. Serviços de Domínio e Motores de Nutrição e Alertas

- [x] 3.1 Implementar `NutritionCalculationService` para apuração de macronutrientes, valor calórico total (kcal) e conformidade com diretrizes do PNAE
- [x] 3.2 Implementar `DietaryRestrictionService` para controle de laudos médicos de restrições alimentares e emissão de alertas na rotina da escola
- [x] 3.3 Implementar `MealLogService` para consolidação diária de refeições servidas, adesão e índices de sobra/resto

## 4. Camada HTTP, FormRequests, RBAC e Rotas REST

- [x] 4.1 Criar FormRequests para validação de cardápios, itens de refeição, laudos de restrição alimentar e registros de refeição
- [x] 4.2 Criar Policies RBAC com permissões `educa.merenda.*` e registrar no `EducaServiceProvider`
- [x] 4.3 Implementar controllers e registrar rotas REST sob `/api/educa/merenda/*`

## 5. Frontend Web-Client: Gestão da Alimentação Escolar

- [x] 5.1 Criar componente `AlimentacaoEscolarView.tsx` no `apps/web-client` exibindo abas de Cardápios da Semana, Prontuário de Alergias e Refeições Servidas
- [x] 5.2 Implementar modal de criação de cardápio com detalhamento de preparações, macronutrientes e homologação por nutricionista (CRN)
- [x] 5.3 Implementar formulário de registro de laudo de restrição alimentar com alertas visuais destacados
- [x] 5.4 Integrar a aba "Alimentação Escolar" ao `EducaModule.tsx` e exportar em `apps/web-client/src/modules/educa`

## 6. Testes Automatizados e Validação

- [x] 6.1 Criar suíte de testes Feature `AlimentacaoEscolarAndPnaeTest.php` cobrindo cenários BDD, cálculo nutricional, bloqueio sem CRN e alertas de alergia
- [x] 6.2 Executar suíte PHPUnit e verificar 100% de aprovação
- [x] 6.3 Validar a change com `openspec validate criar-modulo-educa-alimentacao-escolar --strict`
