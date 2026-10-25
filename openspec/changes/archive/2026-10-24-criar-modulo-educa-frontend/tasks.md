# Tasks

## 1. Infraestrutura, Contexto e Roteamento

- [x] 1.1 Criar contexto `EducaContext.tsx` para gerenciar estado global de escola ativa e ano letivo selecionado
- [x] 1.2 Implementar cabeçalho `EducaHeader.tsx` com seletores de contexto, botões de ação e resumo em KPIs com números em `JetBrains Mono`
- [x] 1.3 Implementar `EducaModule.tsx` como App Shell interno utilizando `Tabs` do `@sysgov/ui`, controlando exibição com `useCan`

## 2. Componentes Especializados do Domínio Educacional

- [x] 2.1 Criar `LdbComplianceBadge.tsx` para exibição de conformidade de 200 dias letivos e 800 horas anuais da LDB
- [x] 2.2 Criar `PisoDocenteMeter.tsx` para medidor visual da proporção de 1/3 de hora-atividade da Lei 11.738/2008

## 3. Painéis dos Submódulos (Views)

- [x] 3.1 Implementar `CoreView.tsx` (grade do calendário escolar, ciclo do ano letivo, escolas, turmas e matrizes BNCC)
- [x] 3.2 Implementar `SecretariaView.tsx` (matrícula via `PessoaPicker`, painel de enturmação com controle de vagas e transferências)
- [x] 3.3 Implementar `PedagogicoView.tsx` (diário de classe, lista de chamada diária em lote e grade de avaliações/médias)
- [x] 3.4 Implementar `ServidoresView.tsx` (lotação docente, distribuição de turmas e controle de afastamentos)
- [x] 3.5 Implementar `EducacensoView.tsx` (painel de auditoria de consistência, relatório de pendências e botão de exportação)
- [x] 3.6 Implementar `TransporteView.tsx` (rotas, itinerários, veículos e alunos transportados)
- [x] 3.7 Implementar `ComunicacaoView.tsx` (mural de comunicados, ciência dos pais e cadastro de ocorrências)

## 4. Integração no AppShell e Roteador Principal

- [x] 4.1 Registrar a rota `/educa/*` em `apps/web-client/src/core/router/AppRouter.tsx` protegida por `ProtectedRoute` e `ModuleRouteGuard`
- [x] 4.2 Adicionar definição do módulo no `moduleRegistry` do `apps/web-client`
- [x] 4.3 Exportar componentes principais em `apps/web-client/src/modules/educa/index.ts`

## 5. Validação e Qualidade

- [x] 5.1 Validar a change com `openspec validate criar-modulo-educa-frontend --strict`
- [x] 5.2 Executar build e checagem de tipos do frontend (`npm run build` ou `tsc --noEmit` em `apps/web-client`)
- [x] 5.3 Atualizar grafo de conhecimento com `graphify update .`
