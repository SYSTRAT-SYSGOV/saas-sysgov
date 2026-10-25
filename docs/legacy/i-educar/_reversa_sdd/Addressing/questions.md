# Addressing (i-Educar legado) — Perguntas

> 20 perguntas para o dono do produto / migração. Sem respostas neste documento.

---

1. Os endereços em `places`/`person_has_place` no banco atual foram criados por qual processo, se o snapshot não tem nenhum escritor (importação, deploy anterior, API externa)? 🔴
2. O módulo deve ser serviço de fundação comum SYSGOV (Educação/Saúde/Assistência/Fazenda) — como o bastão pede — ou seguir restrito às escolas? 🟡
3. A pré-carga via seeders CSV (5.564 cidades, 10.838 distritos) espelha a versão do IBGE de qual ano? Qual a política de refresh anual? 🟡
4. Municípios brasileiros devem continuar read-only no alvo, inclusive para o perfil institucional (única exceção do legado)? 🟡
5. O perfil `POLI_INSTITUCIONAL` existe no alvo (não caiu no escopo do usuário)? 🟡
6. Quem pode editar `type`/qualquer outro campo de `person_has_place`, dado que não há CRUD? (central por tenant ou administração?) 🔴
7. A view `addresses` deve ser preservada como contrato (base para relatórios/Educacenso) ou substituída por consulta direta/service? 🟡
8. Se a view for substituída, os consumidores do Educacenso precisam do mesmo contrato (`postal_code`/`city_ibge_code`)? 🟡
9. Preenchimento por CEP: ViaCEP, BrasilAPI ou outro provedor? Fallback manual é aceitação? 🔴
10. Quando o nome/rua/bairro encontrado pelo CEP divergem do IBGE, o sistema aceita a resposta ou normaliza? 🟡
11. `latitude/ longitude`: qual precisão mínima exigida (double) e há consumers reais (transporte/vaga por raio)? 🟡
12. O endereço pode ter `city_id` nulo (relaxamento 2022) no alvo, ou cidade é obrigatória? 🟡
13. Residência = `type` 1: existem outros tipos (`type` 2..9) usados por módulos ainda não mapeados (ex.: transportar/rota)? 🔴
14. Regra "matrícula apenas do bairro": correção de usado na instituição? Deve migrar via bairro normalizado (tabela de bairros) em lugar de string compare? 🟡
15. A exceção de aluno estuda somente bairro da escola: há relatório de erros/contagem por instituição que valida economicamente essa restrição? 🔴
16. O caso (coluna `geom` na UF) exige geometria espacial real no alvo (PostGIS) ou ficam lat/long simples? 🔴
17. `ibge_code` de cidade no legado tem os 7 dígitos do padrão atual do IBGE? Há códigos antigos de 6 dígitos nos dados? 🟡
18. A exclusão de lugares referenciados (ex.: aluno matriculado mudou de cidade): egresso suportado ou hard-delete proibido e apenas soft? 🟡
19. Menus legados de endereçamento (753/754/755/759) devem migrar como menu comum admin ou integrar a UI central de "geografia"? 🟡
20. Busca fonética: `unaccent` vs `translate` — dualismo no legado; o alvo escolhe um só? 🟡

---

**Acumulado: 407 perguntas em 21 units.**
