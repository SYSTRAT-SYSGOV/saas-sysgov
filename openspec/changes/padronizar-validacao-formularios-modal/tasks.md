# Tasks

## 1. Base compartilhada
- [x] 1.1 Criar `useFormValidationModal` em `apps/web-client/src/lib/` (validar obrigatórios, tratar 422, render da modal) com testes unitários dos três cenários da spec.
- [ ] 1.2 Migrar os formulários do Licita para o hook sem mudar comportamento e verificar que os testes existentes do módulo passam.
- [x] 1.3 Documentar o padrão em `docs/web-client.md` (nova seção) com o exemplo de uso.

## 2. Migração por módulo (um PR por módulo; telas sem a modal hoje)
- [x] 2.1 Vistoria e Requerimentos: completar `EncaminharProposicaoModal`.
- [x] 2.2 Acessos (6): MenuManager, CargosManagement, DefaultPasswordModal, NewUserWizard, RolesManagement, UserEditModal; e `users/UsersModule`.
- [x] 2.3 Ata (4): EditorAta, NovaAtaModal, SecretariasAta, TiposAta.
- [x] 2.4 Campanha (13).
- [x] 2.5 CAPD (6).
- [x] 2.6 Cemitérios (8).
- [x] 2.7 Cursos (16).
- [x] 2.8 Escola (8), Pedagógico (3), Formatura (2), Passeio (2), Portfólio (1).
- [x] 2.9 Inservível (9).
- [x] 2.10 Meio Ambiente (6).
- [x] 2.11 Multiprofissional (5).
- [x] 2.12 Pessoas (2) e OrgChart (1).
- [x] 2.13 Em cada PR: `noValidate`, remover `required` nativo, ajustar testes que esperavam alerta inline e conferir que o endpoint devolve 422 pt-BR.

## 3. Fechamento
- [ ] 3.1 Rodar nova auditoria (telas com gravação sem `ValidationErrorModal` = 0, exceto exceções documentadas) e arquivar a change com `openspec archive`.
