# Segurança — Usuários e Permissões

> Gerado pelo Redator em 2026-09-24. Fonte: `permissions.md`, `code-analysis.md`, `data-dictionary.md`. Cobre `PWUSUA.DBF`/`PWGRUPOS.DBF`/`PWTABELA.DBF` de cada cemitério e sua migração para `usuario`/`usuario_grupo`/`permissao`.

## Visão Geral
Modelo de segurança RBAC simples por grupo, mantido **independentemente em cada cemitério** no legado, migrado para tabelas **globais** no schema alvo — a origem da maioria dos achados críticos de segurança desta extração.

## Responsabilidades
- No legado: autenticar/autorizar usuários da aplicação Clipper via `PW_NIVEL` (1/2/3) e matriz `PWTABELA`
- No kit de migração: ler `PWUSUA`/`PWGRUPOS`/`PWTABELA` de cada cemitério e popular `usuario`/`usuario_grupo`/`permissao` no schema alvo

## Regras de Negócio
Ver `permissions.md` para o detalhamento completo. Resumo:
- 3 níveis de usuário: `1` Administrador, `2` Operador, `3` Consultor 🟢
- `PW_PERMIS` decodificado em 5 blocos de 4 caracteres — incerteza reconhecida no próprio comentário do código original 🟡
- Senha em texto puro no legado (`PW_PASS`, 6 caracteres) 🔴
- Hash de migração (`SHA256` sem salt) inadequado para produção (ADR 0002) 🔴
- `usuario`/`usuario_grupo` migrados como tabelas **globais**, mas são bases **independentes por cemitério** no legado — risco de colisão/sobrescrita silenciosa (ADR 0004, SEC-003) 🔴

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Migrar usuários preservando nível de acesso | Must | `usuario.nivel` corresponde a `PW_NIVEL` original |
| RF-02 | Migrar grupos e vínculo usuário↔grupo | Must | `usuario_grupo`/`usuario.grupo_codigo` corretos |
| RF-03 | Migrar matriz de permissões por grupo/tabela | Must | `permissao` reflete `PWTABELA` decodificado |
| RF-04 | Aplicar hash de senha adequado para produção | Must (antes de produção) | `bcrypt`/`argon2` em vez de `SHA256` sem salt |
| RF-05 | Resolver colisão de identidade entre cemitérios | Must (antes de produção) | Nenhum usuário de uma unidade sobrescreve o de outra silenciosamente |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Segurança | Senha deve usar hash resistente a força bruta/rainbow table | Comentário do autor original, `import_csv_to_db.py` | 🔴 |
| Integridade | Identidade de usuário deve ser única e não colidir entre unidades | `usuario.codigo CHAR(4) PRIMARY KEY`, sem `cemiterio_id` | 🔴 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado dois usuários com o mesmo código PW_CODIGO em cemitérios diferentes
Quando a importação roda para os dois cemitérios em sequência
Então o segundo sobrescreve silenciosamente o primeiro (comportamento atual, bug — ver SEC-003 em permissions.md)

Dado um usuário com senha de 6 caracteres no legado
Quando a senha é migrada
Então o hash resultante hoje é SHA256 sem salt (inadequado); após RF-04, deve ser bcrypt/argon2
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|----------------|
| Migração de usuários/grupos/permissões | Must | Base do controle de acesso do sistema novo |
| Hash de senha adequado | Must (antes de produção) | Risco de segurança real |
| Resolução de colisão de identidade | Must (antes de produção) | Pode causar perda silenciosa de acesso de um usuário |
| Confirmação do mapeamento de `PW_PERMIS` | Should | Incerteza herdada do próprio autor original |

## Rastreabilidade de Código

| Arquivo | Cobertura |
|---|---|
| `PWUSUA.DBF`/`PWGRUPOS.DBF`/`PWTABELA.DBF` (Central + Independência) | 🟢 |
| `import_csv_to_db.py` — `import_usuarios`, `import_grupos_usuarios`, `import_permissoes` | 🟢 |
