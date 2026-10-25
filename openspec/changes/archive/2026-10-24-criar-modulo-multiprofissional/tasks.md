# Tarefas — Módulo Multiprofissional

## 1. Backend — estrutura
- [x] 1.1 Módulo `Multiprofissional` (module.json com requires Admin, Pessoas e Escola; permissões; menu)
- [x] 1.2 Migrations `multi_*` com `tenant_id` e índices compostos
- [x] 1.3 Models TenantAware
- [x] 1.4 Seeder RBAC (perfis Coordenação, Profissional, Consulta) no entrypoint
- [x] 1.5 Registro no `bootstrap/app.php`

## 2. Backend — regras
- [x] 2.1 Cadastros (cargos, condições, tipos) com desativação quando em uso e itens padrão
- [x] 2.2 Profissionais via Cadastro de Pessoas (CPF) e usuário opcional
- [x] 2.3 Equipes (profissionais e escolas)
- [x] 2.4 Acompanhados (condições, referências, laudos em disco privado)
- [x] 2.5 Atendimentos (n:n, sigilo, edição pelo autor ou gestor, soft delete)
- [x] 2.6 Policy, auditoria e controller de auditoria

## 3. Backend — testes
- [x] 3.1 Isolamento de tenant
- [x] 3.2 Cadastros e profissionais (CPF, duplicidade)
- [x] 3.3 Dados sensíveis e laudos
- [x] 3.4 Atendimentos e sigilo

## 4. Frontend
- [x] 4.1 `api.ts` e `MultiprofissionalModule.tsx` com abas
- [x] 4.2 Atendimentos (lista, filtro, formulário)
- [x] 4.3 Acompanhados (ficha com condições, referências, laudos e histórico)
- [x] 4.4 Equipes, profissionais, cadastros e auditoria
- [x] 4.5 Registry e testes vitest

## 5. Entrega
- [x] 5.1 phpunit, phpstan, typecheck e vitest verdes
- [x] 5.2 Conferência no navegador
- [x] 5.3 PR no sys_ricardo e no repositório do time
