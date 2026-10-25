# TabelaArredondamento (i-Educar legado) — Tarefas de Migração

> Sequência para reconstruir as tabelas de arredondamento no alvo. Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Fase 0 — Descoberta

- [ ] Inventariar tabelas e valores por tenant (tipos de nota usados, faixas reais, ações por casa decimal). 🔴
- [ ] Identificar valores com nome fracionário ("0.5", "1.5") em tabelas numéricas de produção — a semântica de casamento com a casa decimal é frágil. 🟡
- [ ] Confirmar uso de `arredondar_nota` e `normalizar_media` em produção. 🔴

## Fase 1 — Modelo de dados

- [ ] Entidades `RoundingTable` (enum de sistema de nota imutável após criação, flag de nota da etapa, flag de normalização) e `RoundingTableValue` (rótulo varchar(5), descricao, faixas, ação, casa decimal exata). 🟢
- [ ] Fechar divergência do inventário: `nome varchar(5)` no valor (rótulo tipo "0.5"); limites `numeric(5,3)`. 🟢
- [ ] FK dura entre valor → tabela e exclusão em cascata (ou bloqueio). 🟢
- [ ] Política de auditoria: legado só tem `updated_at` na tabela; alvo deve auditar exclusão de valores? 🟡

## Fase 2 — Serviço de arredondamento

- [ ] Portar `round()` com paridade: conceitual por faixa (escala 10^3, floor) + normalização opcional da média; numérica por casa decimal com ações (floor/ceil/casa exata). 🟢
- [ ] Decidir sobre o fallback silencioso (fora de todas as faixas → último conceito): manter, alertar ou erro explícito. 🟡
- [ ] Exigir faixas contíguas e sem sobreposição como validação de domínio (não só no controlador). 🟡
- [ ] Semântica da comparação por coerção (`casa decimal == nome`): reescrever com tipos explícitos (string/decimal) e definir o comportamento para nomes fracionários. 🟡
- [ ] Descartar ou reimplementar `predictValue` (sem chamador no legado). 🟡

## Fase 3 — CRUD

- [ ] Tela de tabela + grade de valores (mesma UX); tipo de nota editável só na criação; exclusão da tabela bloqueada enquanto houver regras a referenciar. 🟢 🟡
- [ ] Busca ajax de tabelas por sistema de nota (substituir o XML legado por JSON). 🟡
- [ ] Seeds default: tabela numérica 0..10 (faixas de 0,5) e conceitual E/D/C/B/A. 🟢

## Fase 4 — Consumo e migração de dados

- [ ] Portar `round()` com paridade: conceitual por faixa com normalização opcional da média; numérica por casa decimal com ações (floor/ceil/casa exata); parâmetro 1 = nota de etapa, 2 = média. 🟢
- [ ] Migrar `tabela_arredondamento` e `_valor` preservando ids para recriar FKs de `regra_avaliacao`. 🟢
- [ ] Reconciliar faixas inválidas existentes no banco (gaps, min > max) — reportar e corrigir na migração. 🔴

## Fase 5 — Verificação

- [ ] Testes de paridade: seeds legado (tabela 1 e 2) avaliados nos dois motores com os mesmos valores. 🟡
- [ ] Testes da tela: repetição de mínimos, min > max, gaps. 🟢
- [ ] Teste de integração: Boletim (nota etapa/média) e histórico escolar. 🟢 🟡
- [ ] Teste de migração: contagem das tabelas/valores por tenant e correspondência dos ids regra → tabela. 🟡
