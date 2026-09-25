# Segurança — Usuários e Permissões, Design Técnico

> Gerado pelo Redator em 2026-09-24. Fonte: `permissions.md`, `code-analysis.md`.

## Interface

| Origem (legado, por cemitério) | Destino (schema alvo, global) |
|---|---|
| `PWGRUPOS.PW_GRUPO`, `PW_NOGRUPO` | `usuario_grupo.codigo`, `nome` |
| `PWUSUA.PW_CODIGO`, `PW_GRUPO`, `PW_NOME`, `PW_NIVEL`, `PW_PASS` | `usuario.codigo`, `grupo_codigo`, `nome`, `nivel`, `senha_hash` |
| `PWTABELA.PW_GRUPO`, `PW_DBF`, `PW_PERMIS` | `permissao.grupo_codigo`, `tabela`, `pode_incluir/alterar/excluir/consultar/relatorio` |

## Fluxo Principal
1. `import_grupos_usuarios()` e `import_usuarios()` rodam **uma vez**, fora do loop por cemitério (diferente de `import_quadras`/`import_lotes` etc.)
2. Para cada cemitério (1, depois 2), os respectivos `PWUSUA`/`PWGRUPOS`/`PWTABELA` são lidos e upsertados nas mesmas tabelas globais
3. `senha_hash = SHA256(PW_PASS)`, sem salt
4. `PW_PERMIS` (string de 20 caracteres) é dividida em 5 blocos de 4, cada bloco checado por `'S' in bloco`

## Fluxos Alternativos
- **Colisão de `PW_CODIGO` entre cemitérios:** o upsert (`ON CONFLICT ... DO UPDATE`) do segundo cemitério processado sobrescreve o usuário do primeiro, sem erro nem log — ver SEC-003 em `permissions.md`.
- **`PW_PERMIS` fora do padrão esperado:** decodificação assume 20 caracteres exatos em 5 blocos de 4; qualquer desvio nesse formato produziria permissões incorretas sem alerta.

## Dependências
- Implementado dentro de `import_csv_to_db.py` (mesma unit de código que `importacao-csv`, mas documentado separadamente aqui por ser um domínio de segurança com achados próprios)

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Tabelas de segurança tratadas como globais, sem `cemiterio_id` | Ausência da coluna em `usuario`/`usuario_grupo`/`permissao` | 🔴 — ver ADR 0004 |
| Hash de migração `SHA256` sem salt | Comentário do autor original | 🔴 — ver ADR 0002 |

## Estado Interno
N/A — sem cache ou estado em memória específico deste domínio (diferente de `_refresh_lote_cache` em `importacao-csv`).

## Observabilidade
Nenhuma — sobrescrita silenciosa em caso de colisão não gera log.

## Riscos e Lacunas
- 🔴 SEC-001 a SEC-004 (ver `permissions.md`) — todos aplicáveis a este domínio.
- 🔴 Decisão de identidade entre cemitérios (mesma pessoa ou colisão de numeração) não resolvida — ver `questions.md`.
