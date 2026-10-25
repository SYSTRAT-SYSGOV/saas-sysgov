# Addressing (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Endereçamento/geografia: países, estados, municípios, distritos, logradouros (`places`) e vínculo pessoa↔endereço (`person_has_place`).
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O endereçamento é uma base geográfica comum (não ligada a tenant): `countries`, `states`, `cities`, `districts` e `places` vivem no schema `public` e fornecem códigos IBGE a todos os módulos. Brasil é pré-carregado via seeders CSV (333 países, 27 UFs, 5.564 cidades, 10.838 distritos) e é **somente leitura** para todos os perfis — apenas dados estrangeiros admitem edição/exclusão, com exceção do administrador institucional (`POLI_INSTITUCIONAL`) para municípios. 🟢 `database/migrations/addressing/*`, `database/seeders/*Countries/States/Cities/Districts*, `app/Rules/*RestrictOperationRule.php`

O endereço física de uma pessoa/escola é `places` (carro-chefe com lat/long) ligada por `person_has_place` (pivot `person_id` × `place_id` × `type`, único por `person_id`+`type`, `type = 1` é residência principal). Uma view `public.addresses` expõe places com município/UF/país e códigos IBGE resolvidos. 🟢 `database/migrations/addressing/*person_has_place*`, `database/sqls/views/addresses.sql`

> ⚠️ Contra o bastão: o bastão pede integração ViaCEP/IBGE e georreferenciamento nativo como fatos do legado. No snapshot, **não existe** qualquer chamada ViaCEP/BrasilAPI, e `latitude/longitude` têm colunas mas **nenhum consumidor** (nenhum cálculo de raio/roteirização). São insumos do alvo, não do legado. 🔴

---

## Responsabilidades

- CRUD de países (753), estados (754), municípios (755) e distritos (759) via API REST Laravel `ResourceController` e telas legadas refatoradas (`InteractWithDatabase`). 🟢 `app/Http/Controllers/Api/{Country,State,City,District}Controller.php`, `ieducar/intranet/public_{pais,uf,municipio,distrito}_{cad,det,lst}.php`
- Catálogo pré-carregado do Brasil (CSV) com `ibge_code` e proteção de escrita: Brasil/UF/município/distrito brasileiros não são editados nem removidos (exceto município/perfil institucional). 🟢 `Country/State/City/DistrictRestrictOperationRule.php`, `public_municipio_cad.php:80-98`
- Integridade na exclusão: país com estados, estado com cidades, cidade com distritos ou logradouros → bloqueio com mensagem pt-BR. 🟢 `app/Rules/Addressing/Addressing{Country,State,CityDistrict,CityPlace}Rule.php`
- Resolução de endereço de pessoa/escola por pivot (`type = 1` residência) e exportação Educacenso via view `addresses`. 🟢 `LegacyPerson.php:170-180`, `LegacySchool.php:220-230`, `EducacensoRepository.php:195-198`, `:473-494`
- Regra de matrícula por bairro: se `pmieducar.instituicao.matricula_apenas_bairro_escola`, o aluno só se matricula se o `neighborhood` do endereço dele for igual ao da escola (`strcasecmp`). 🟢 `ieducar/intranet/educar_matricula_cad.php:355-385`
- Busca fonética de municípios (via `translate`/`unaccent` no PostgreSQL). 🟢 `City.php:73-80`, `CityBuilder.php:11-19`

---

## Regras de Negócio

### Proteção do catálogo do Brasil
- `CountryRestrictOperationRule`: nunca excluir/editar `Country::BRASIL = 45`. 🟢
- `StateRestrictOperationRule`: nunca excluir/editar estado com `country_id = 45` (após alteração também lê o valor original em dirty fields). 🟢
- `CityRestrictOperationRule`: município brasileiro bloqueado para todos, **exceto** `POLI_INSTITUCIONAL`. 🟢
- `DistrictRestrictOperationRule`: distrito brasileiro bloqueado (resolve cidade → estado → país). 🟢
- As telas repetem a regra no servidor (`public_municipio_cad.php` checa `nivelAcessoPessoaLogada()`). 🟢

### Deleção com integridade
- País: barrado se `states()->doesntExist() === false`. Estado: barrado se tem cidades. Cidade: barrado se tem **distritos** OU **places**. 🟢
- Mensagens pt-BR específicas por camada. 🟢

### Unicidade e validações
- Cidade: `name` único **dentro do estado**, `state_id` obrigatório, `ibge_code` opcional e único global. 🟢 `AddressingCityRequest.php`
- Views/telas legadas usam o mesmo contrato de validação básico (nome/estado/código). 🟡

### Endereço de pessoa
- Uma pessoa pode ter no máximo **um place por `type`** (unique person_id+type). Educacenso assume `type = 1` residência. 🟢
- `places` aceita `city_id` **nullable** (endereço sem cidade resolvida), `address`/`neighborhood`/`postal_code` foram relaxados para NULL em 2022 (`change_places_remove_address_constraint`). 🟢
- Soft delete (`softDeletes`) em todos. 🟢

### Matrícula por bairro
- Comparação textual case-insensitive entre o `neighborhood` da residência do aluno (via `person_has_place.type=1`) e o da escola (`ref_idpes` da escola). Pontos fracos: string compare (sem normalização de acento), sem place → vazio. 🟢 🟡

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| AD-01 | CRUD de países com bloqueio de exclusão em cascata (estados vinculados). | Must | 🟢 `AddressingCountryRule`. |
| AD-02 | CRUD de estados com bloqueio para UFs brasileiras. | Must | 🟢 `StateRestrictOperationRule` + `AddressingStateRule`. |
| AD-03 | CRUD de municípios com nome único por UF e bloqueio para municípios brasileiros (exceto perfil institucional). | Must | 🟢 `AddressingCityRequest` + `CityRestrictOperationRule`. |
| AD-04 | CRUD de distritos com bloqueio para Brasil e integridade cidade→distrito. | Must | 🟢 `DistrictRestrictOperationRule`. |
| AD-05 | Catálogo pré-carregado com códigos IBGE (Brasil todo). | Must | 🟢 seeders CSV. |
| AD-06 | Deleção de cidade bloqueada com logradouros ou distritos vinculados. | Must | 🟢 `AddressingCityPlace/DistrictRule`. |
| AD-07 | Vínculo pessoa↔place com tipo, um por tipo, residência = type 1. | Must | 🟢 `person_has_place` unique. |
| AD-08 | Resolução de endereço completo (place→cidade→UF→país + IBGE) via view `addresses`. | Must | 🟢 `addresses.sql`. |
| AD-09 | Regra "matrícula apenas do bairro" por instituição. | Should | 🟢 `matricula_apenas_bairro_escola`. |
| AD-10 | Busca fonética de município (acentos ignorados). | Should | 🟢 `translate`/`unaccent` (11. município não exposto). |
| AD-11 | Preenchimento por CEP (ViaCEP/BrasilAPI) e georreferenciamento nativo. | Must (alvo) | 🔴 ausente do legado. |
| AD-12 | CRUD/escrita de `places`/`person_has_place` a partir do sistema. | Must (alvo) | 🔴 sem escritor no snapshot. |

---

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência | Confiança |
|------|-----------|-----------|-----------|
| Portabilidade | `translate(...)` com charset literal e `unaccent()` — extensões PostgreSQL; sem mecanismo portável de fonética. | `City.php:73-80`, `CityBuilder.php:18` | 🔴 |
| Geografia | `latitude/longitude` como `float` (4 bytes! não double) — precisão ~6m, insuficiente para roteirização fina. | `create_places_table` | 🟡 |
| Multi-tenant | Dados no schema `public` (compartilhados por todos os tenants). | migrações | 🟢 |
| Erro | Mensagens pt-BR específicas por regra. | regras | 🟢 |
| Performance | CSV de ~5.5k cidades no seed; índice via FK apenas (`person_has_place` tem index person_id). | migrações | 🟢 |

---

## Critérios de Aceitação

```gherkin
Dado país Brasil (id 45)
Quando tentar excluir ou editar
Então mensagem "Não é permitido..., pois já está previamente cadastrado." 🟢

Dado escola em bairro [B] e aluno residindo no bairro B
Quando instituição configura matricula_apenas_bairro_escola
Então matrícula permitida 🟢

Dado mesmo cenário com bairro diferente (ou sem endereço)
Então matrícula bloqueada com mensagem 🟢

Dado cidade com distritos ou places
Quando DELETE
Então bloqueado com mensagem de integridade 🟢

Dado município estrangeiro
Quando DELETE
Então permitido 🟢

Dado pessoa com person_has_place type=1
Quando exportar Educacenso registro 30/70
Então usa postal_code/municipio (IBGE) via view addresses 🟢
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Catálogo IBGE Brasil somente leitura | Must | Pré-condição de relatórios/Educacenso 🟢 |
| Integridade cascata na exclusão | Must | Confiabilidade 🟢 |
| Vínculo pessoa↔place + address view | Must | Residência de alunos/servidores 🟢 |
| Escrita real de places/person_has_place | Must | 🔴 paridade funcional ausente |
| Geografia nativa (CEP, lat/long exatos) | Must | demanda do SYSGOV (0 do legado) 🔴 |
| Busca fonética | Should | 🟢 (com mecanismo PG) |

---

## Rastreabilidade de Código

| Arquivo | Papel | Cobertura |
|---------|-------|-----------|
| `app/Models/{Country,State,City,District,Place,PersonHasPlace}.php` | Eloquent da geografia | 🟢 |
| `app/Http/Controllers/Api/{Country,State,City,District}Controller.php` | API (753/754/755/759) | 🟢 |
| `app/Rules/*RestrictOperationRule.php` | Proteção do Brasil | 🟢 |
| `app/Rules/Addressing/*Rule.php` | Integridade cascata | 🟢 |
| `app/Http/Requests/Api/Addressing/AddressingCityRequest.php` | Validação | 🟢 |
| `database/migrations/addressing/*` | DDL | 🟢 |
| `database/seeders/{Countries,States,Cities,Districts}TableSeeder.php` + `database/csvs/*.csv` | Pré-carga | 🟢 |
| `database/sqls/views/addresses.sql` | View de endereço | 🟢 |
| `ieducar/intranet/public_{pais,uf,municipio,distrito}_{cad,det,lst,xml}.php` | Telas legadas | 🟢 |
| `ieducar/intranet/educar_matricula_cad.php:355-385` | Regra de bairro | 🟢 |
| `EducacensoRepository.php:195-494` | Consumo Educacenso | 🟢 |
