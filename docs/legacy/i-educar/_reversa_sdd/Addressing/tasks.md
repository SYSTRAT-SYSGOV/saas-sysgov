# Addressing (i-Educar legado) — Tarefas de Migração

> Sequência de trabalho para reconstruir o módulo no alvo.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Fase 0 — Descoberta

- [ ] Inventariar linhas de `countries/states/cities/districts/places/person_has_place` por tenant (volume real). 🔴
- [ ] Levantar origem dos dados de `places` (nenhum escritor no snapshot): importação externa, telas anteriores ou deploy antigo. 🔴
- [ ] Confirmar se algum integrador cria `places.type` = 1 residência para alunos/servidores/escolas. 🔴

## Fase 1 — Modelo de dados

- [ ] Modelar hierarquia `Country → State → City → District` com código IBGE e soft delete. 🟢
- [ ] Modelar `Place` (logradouro, número, complemento, bairro, CEP, city opcional, lat/long em double precision). 🟢 🟡
- [ ] Modelar `PersonAddress` (pessoa ↔ lugar com `type`, único pessoa+tipo, residência = 1). 🟢
- [ ] Definir política de exclusão e unicidades ao replicar o catálogo brasileiro pré-carregado no alvo. 🟡
- [ ] Criar view equivalente a `addresses` (place até país com IBGE resolvido). 🟢

## Fase 2 — Catálogo brasileiro

- [ ] Pré-carga de países, UFs, municípios e distritos com IBGE (Wh mantener seeders) ou via API oficial com checksum. 🔴 🟡
- [ ] Regras: Brasil read-only; UF/município/distrito brasileiros read-only; município editável pelo perfil institucional (alvo: reavaliar se o perfil deve existir). 🟢 🟡
- [ ] Códigos IBGE como campo único e consultar formato oficial (7 dígitos). 🟢 🟡

## Fase 3 — CRUD e proteções

- [ ] Endpoints equivalentes (país, estado, município, distrito) com validações e integridade cascata. 🟢
- [ ] Validar nome único por UF; IBGE único global. 🟢
- [ ] Busca fonética única e portável (ex.: unaccent + ILIKE, sem dependência de charset ou extensão específica do PostgreSQL onde possível). 🟡
- [ ] Regras de exclusão: país→estados, estado→cidades, cidade→distritos e lugares. 🟢

## Fase 4 — Endereço de pessoa

- [ ] Implementar CRUD real de lugares e vínculo pessoa↔lugar (falta no legado). 🔴
- [ ] Integrar ao cadastro de aluno/servidor/escola. 🟡
- [ ] Corrigir a relação quebrada do legado (`Individual.place()` aponta para coluna inexistente `person_id` em `places`). 🔴
- [ ] Tratar endereço sem cidade (city_id nulo) e campos vazios (relaxamento 2022). 🟢

## Fase 5 — Integrações

- [ ] Preenchimento por CEP (ViaCEP/BrasilAPI) com fallback manual, cache e validação de município/IBGE consistentes. 🔴 (demanda alvo)
- [ ] Exportar endereço para Educacenso através de consulta equivalente à view `addresses`. 🟢
- [ ] Revisar regra "matrícula apenas do bairro": manter lógica textual ou migrar por bairro normalizado/CFC/IBGE. 🟡
- [ ] Transporte escolar: lat/long como insumo de roteirização (sem semeadura no legado). 🔴

## Fase 6 — Verificação

- [ ] Testes: bloqueios de catálogo brasileiro, exclusão em cascata, validações de unicidade, regra de bairro. 🟢
- [ ] Teste de paridade com a view `addresses` para os consumers (Educacenso/matricula). 🟢
- [ ] Teste de precisão geográfica (double, margem por raio). 🟡
