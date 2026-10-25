# FormulaMedia (i-Educar legado) — Perguntas abertas

> Perguntas para o usuário/alvo. Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Negócio

1. Além das duas fórmulas seed, quantas fórmulas existem em produção por tenant e quais sintaxes usam (ternário, comparações, RSP*)? 🔴
2. Quais instituições (se alguma) usam `substitui_menor_nota_rc = 1`? 🔴
3. As fórmulas de produção podem ser alteradas livremente no alvo ou devem ser imutáveis (versão por regra)? 🟡

## Motor e semântica

4. O alvo deve manter o vocabulário exatamente igual (incluindo alias `x` e comparações `>` `<`) ou pode restringir? 🟡
5. Faltam tokens de subtração no legado — existe fórmula de produção dependendo de literal negativo? O alvo adiciona o operador `-`? 🟡
6. Zero-fill de tokens faltantes (calcular com 0) deve ser paridade no alvo ou virar erro explícito? 🟡
7. Divisão por zero: erro de fórmula tratado (mensagem) ou bloqueio diferido ao cadastro? 🟡
8. O resultado misto ("nota necessária" como string `"10+"`) deve ser preservado na API do alvo ou trocar por objeto estruturado? 🟡

## Segurança

9. Confirmado: o legado executa fórmulas via `eval()`; o alvo deve usar parser próprio/ExpressionLanguage — há restrição de sandbox exigida (sem funções, sem constantes)? 🟡
10. Fórmulas gravadas por edição direta no banco (fora da validação) devem ser detectadas e flagradas na migração? 🔴

## Dados

11. O DDL real é `varchar(50)`/`varchar(200)`; o alvo deve ampliar? 🟢 🟡
12. A PK composta id+instituicao do mapper é artefato de código — o banco tem PK real? Deve ser id PK puro no alvo? 🟡
13. Fórmulas órfãs (instituicao_id inexistente) e regras apontando para fórmulas excluídas: há registro no banco de produção? 🔴

## Exclusão e auditoria

14. A exclusão física de fórmulas (telas, sem auditoria) causou perda histórico relevante? Alvo deve auditar exclusões? 🟡
15. Uma fórmula em uso por regras pode ser excluída hoje (sem FK) — alvo deve impedir exclusão em uso? 🟡

## Migração

16. As recuperações específicas (RSPn/RSPSn/RSPMn) e o redirecionamento de `Se` pelas regras de recuperação são semânticas do consumidor (Boletim): seguem na unit `Avaliacao` ou do motor no alvo? 🟡
17. Valores de incremento (0,1 ou 1 conforme `qtdCasasDecimais`) da nota necessária: paridade obrigatória (brute force) ou cálculo algébrico no alvo (se decível)? 🟡
18. Sobreposição de `formula_media_id` e `formula_recuperacao_id` com a mesma fórmula (tipo errado) existe em produção? 🔴
19. `tipo_formula` fora de {1, 2} no banco de produção — tratar na migração com default? 🔴
20. Há instâncias externas (diário/laravel) montando fórmulas em código (hardcoded) além do módulo? 🔴

---

*Cumulativo: 467 perguntas em 24 units.*
