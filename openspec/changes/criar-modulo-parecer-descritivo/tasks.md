# Tarefas — Módulo Parecer Descritivo (1º ao 5º)

## 1. Backend — estrutura
- [x] 1.1 `php artisan make:module Parecer` (requires Admin, Escola, Pessoas; permissões `parecer.view|professor|gestor|auditoria`; menu)
- [x] 1.2 Migrations: `parecer_turmas`, `parecer_turma_funcoes`, `parecer_habilidades`, `parecer_avaliacoes`, `parecer_observacoes`, `parecer_notas`, `parecer_frequencias`, `parecer_ocorrencias` (tenant_id, escola_id, índices compostos)
- [x] 1.3 Models TenantAware e constantes (MATERIAS, SERIES, CONCEITOS, FUNCOES_TURMA)
- [x] 1.4 Seeder de habilidades (a partir de `habilidades.json`) e RBAC

## 2. Backend — regras
- [x] 2.1 Escopo por função (`ParecerAcesso`): turmas e matérias do usuário; Policies
- [x] 2.2 Turmas: série e funções; Conteúdos: CRUD de habilidades e BNCC opcional (Outbox/Service com timeout)
- [x] 2.3 Avaliar: conceitos e observações
- [x] 2.4 Notas (regras por série + importação por planilha), Frequência e Ocorrências
- [x] 2.5 Parecer/impressão (texto corrido, trechos das habilidades, assinaturas) e Relatórios
- [x] 2.6 Auditoria em todas as mutações e endpoint de consulta

## 3. Backend — testes
- [x] 3.1 Isolamento de tenant
- [x] 3.2 Escopo por função (403) e gestor vê tudo
- [x] 3.3 Regras de nota por série; avaliação única; texto do parecer

## 4. Frontend
- [x] 4.1 Módulo `parecer` no web-client com `@sysgov/ui`; `npm run generate:registry`
- [x] 4.2 Telas: Início, Avaliar, Conteúdos, Notas, Frequência, Ocorrências, Relatórios, Configurações, Auditoria
- [x] 4.3 Impressão com o CSS de impressão portado

## 5. Entrega
- [ ] 5.1 Rodar no Docker local (`sysgov.sh`), phpunit e `npm test`, conferir no navegador
- [ ] 5.2 `openspec validate --strict`; PR no repo do Ricardo
- [x] 5.3 PR em homologação (`cfgfernando/homologa-saas-sysgov`); produção só depois de homologado
- [ ] 5.4 `openspec archive`
