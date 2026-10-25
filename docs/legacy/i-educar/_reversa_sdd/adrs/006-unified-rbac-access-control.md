# ADR-006: Controle de Acesso Baseado em Papéis com Slugs Granulares e MFA

> **Status:** 🟢 Aprovado / Decisão Arquitetural Consolidada  
> **Data:** 2026-10-12  
> **Autor:** Reversa Detective (`reversa-detective`) & Architect (`reversa-architect`)  
> **Contexto:** Plataforma SYSGOV — Modernização do i-Educar (`SYS-Educa`)

---

## 1. Contexto e Problema

No sistema legado i-Educar:
- O controle de acesso operava com IDs numéricos obscuros (`tipo_usuario = 1, 2, 3...`) e tabelas legadas com menus e níveis de permissão pouco granulares misturados em código legado;
- Não havia suporte a duplo fator de autenticação (MFA / 2FA), crítico para servidores públicos que lidam com dados sensíveis de menores de idade e notas oficiais;
- Faltava distinção clara de escopo de permissão: uma permissão podia ser global na mantenedora ou restrita a uma unidade escolar específica (`school_scope`), gerando situações onde diretores de uma escola conseguiam visualizar turmas de outras escolas da rede municipal;
- A invalidação de cache de permissões e menus era problemática (commit `20d1ad4f4 Adicionada invalidação do cache de menu ao criar, alterar ou excluir itens`).

---

## 2. Decisão Arquitetural

Adotar uma arquitetura de **RBAC (Role-Based Access Control) Hierárquico com Slugs Canônicos no Formato `modulo.entidade.acao`, Escopo por Escola e Suporte Nativo a MFA / OIDC Gov.br**:

1. **Slugs Declarativos de Permissão:**
   - Padronização rigorosa em slugs semânticos (ex.: `enrollment.registration.create`, `evaluation.grade.lock`, `daily_record.attendance.rectify`).
2. **Escopo de Acesso Duplo (Mantenedora vs Escola):**
   - Papéis com escopo de rede (`SUPER_ADMIN`, `SECRETARIA_EDUCACAO`, `COORDENADOR_GERAL`) acessam dados de todas as escolas do respectivo tenant.
   - Papéis de unidade escolar (`DIRETOR_ESCOLAR`, `SECRETARIO_ESCOLAR`, `PROFESSOR`) têm seus acessos automaticamente interceptados pelo middleware de escopo institucional (`school_id`), garantindo que um professor só enxergue suas turmas alocadas.
3. **Autenticação Moderna e MFA Obrigatório:**
   - Suporte a login nativo com senha segura (Argon2id), autenticação multifator TOTP (Google Authenticator) obrigatória para papéis administrativos, e autenticação federada via Gov.br / OIDC para cidadãos (pais e alunos).
4. **Cache de Permissões com Tags e Invalidação Atômica:**
   - Os papéis e permissões do usuário autenticado são armazenados no Redis com chave tagueada por usuário e tenant (`cache_tags: ['tenant:X', 'user:Y']`). Qualquer alteração no perfil do usuário ou na matriz de papéis invalida atômica e instantaneamente o cache correspondente.

---

## 3. Alternativas Consideradas

| Alternativa | Vantagens | Desvantagens / Motivo de Rejeição |
| :--- | :--- | :--- |
| **ACL Simples por Nível Numérico (1 a 5)** | Simples de checar com `if ($user->level >= 3)`. | Totalmente inflexível; impossível criar perfis especializados (ex.: Coordenador do Transporte Escolar, Nutricionista da Merenda, Psicólogo Escolar) sem alterar o código-fonte da aplicação. |
| **ABAC Puro (Attribute-Based Access Control)** | Máxima granularidade em tempo real. | Complexidade excessiva de configuração para prefeituras municipais; alto overhead de avaliação de regras dinâmicas em cada requisição. |
| **RBAC Canônico com Escopo Institucional (Escolhida)** | Equilíbrio perfeito entre robustez, facilidade de gestão por secretários municipais e segurança de alto padrão governamental. | Exige atenção no middleware para combinar permissão funcional (`can('evaluation.grade.edit')`) com escopo de posse (`$user->isAssignedToClass($classId)`). |

---

## 4. Consequências

### Positivas:
- Governança clara e auditável de quem tem acesso a quais dados da rede municipal.
- Facilidade para integração futura com novos portais e microsserviços do ecossistema SYSGOV.
- Eliminação do risco de vazamento de dados entre escolas do mesmo município.

### Negativas / Riscos Mitigados:
- Se o cache do Redis falhar, consultas frequentes de permissão poderiam onerar o banco. *Mitigação:* Fallback para cache local em memória por request (Memoization estática no ciclo de vida do Laravel).
