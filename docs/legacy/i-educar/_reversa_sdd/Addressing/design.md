# Addressing (i-Educar legado) — Design

> Estrutura do subsistema de endereçamento, fluxos, dependências, riscos.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Modelos e componentes

| Componente | Papel | Fonte |
|----------|-------|-------|
| `Country` / `State` / `City` / `District` | Hierarquia geográfica com `HasIbgeCode` (`findByIbgeCode`) | 🟢 `app/Models/*.php` |
| `Place` | Endereço físico: cidade, logradouro, número, complemento, bairro, CEP, lat/long | 🟢 `Place.php:13-27` |
| `PersonHasPlace` | Pivot pessoa↔place (`person_id`, `place_id`, `type`), PK única person+type | 🟢 `PersonHasPlace.php:12-21` |
| `{Country,State,City,District}Controller` | API Resource (processos 753/754/755/759) | 🟢 controllers |
| `{...}RestrictOperationRule` | Trava de proteção do catálogo brasileiro | 🟢 `app/Rules/*` |
| `Addressing{Country,State,CityDistrict,CityPlace}Rule` | Integridade cascata na exclusão | 🟢 `app/Rules/Addressing/*` |
| `AddressingCityRequest` | Validação de cidade (nome único no estado, IBGE único) | 🟢 requests |
| `public.addresses` (view) | place + cidade + UF + país + 3 códigos IBGE | 🟢 `addresses.sql` |
| `InteractWithDatabase` / `SelectOptions` | Telas legadas refatoradas para Eloquent | 🟢 trait `iEducar\Legacy` |

### Tabelas

| Tabela | Colunas essenciais | Confiança |
|---|---|---|
| `public.countries` | id, name, ibge_code (soft delete, timestamps) | 🟢 |
| `public.states` | id, country_id, name, abbreviation, ibge_code | 🟢 |
| `public.cities` | id, state_id, name, ibge_code | 🟢 |
| `public.districts` | id, city_id, name, ibge_code | 🟢 |
| `public.places` | id, city_id, address, number, complement, neighborhood, postal_code, latitude, longitude (todas as colunas textuais nullable após 2022) | 🟢 |
| `public.person_has_place` | person_id, place_id, type; **unique(person_id, type)**; índice person_id | 🟢 |
| view `public.addresses` | resolves a FK chain acima | 🟢 |

### Endpoints

| Rota (API) | Processo | Verbo | Proteções |
|---|---|---|---|
| `/api/{country|state|district|city}` | 753/754/755/759 | index/store/show/update/destroy | restrict rules + addressing rules no destroy |

| Tela legada | Processo | Model |
|---|---|---|
| `public_pais_{cad,det,lst}.php` | 753 | `Country` |
| `public_uf_{cad,det,lst,xml}.php` | 754 | `State` |
| `public_municipio_{cad,det,lst,xml}.php` | 755 | `City` |
| `public_distrito_{cad,det,lst,xml}.php` | 759 | `District` |
| `educar_enderecamento_index.php` | 68 | menu "Endereçamento" |
| `educar_pesquisa_municipio_lst.php` | — | popup de pesquisa de município |

---

## Fluxo Principal — CRUD de cidade (API)

1. `GET/POST/PATCH/DELETE /api/city` autenticado, permissão por processo 755. 🟢
2. `rules()`: `CityRestrictOperationRule` em todas as operações — brasileiro bloqueado, exceto `POLI_INSTITUCIONAL`. 🟢
3. `store/update`: `AddressingCityRequest` — `state_id` existe, `name` único por `state_id`, `ibge_code` único global (ignora o id corrente). 🟢
4. `deleteRules()` acrescenta `AddressingCityDistrictRule` e `AddressingCityPlaceRule`. 🟢

---

## Fluxos Alternativos

- **Fluxo via tela legada:** `public_municipio_cad.php` — dropdown país→estado (via `SelectOptions`), checagem de Brasil/nível de acesso no servidor, `create([name, state_id, ibge_code])` pelo trait `InteractWithDatabase`. 🟢
- **Exclusão (tela):** só permitida com det/lst mostrando botão p/ quem tem permissão 755 nível 7; a exclusão ativa soft delete via Eloquent. 🟡
- **Pesquisa de município:** `educar_pesquisa_municipio_lst.php` — popup com nome/UF alimentando selects de cadastro de pessoa. 🟡
- **Matrícula com bloqueio de bairro:** na criação da matrícula, com `instituicao.matricula_apenas_bairro_escola` ativo, compara `neighborhood` da residência do aluno (type 1) com o da escola (`ref_idpes`), case-insensitive (`strcasecmp`); mensagem "O aluno deve morar no mesmo bairro da escola". 🟢
- **Exportação Educacenso:** view `addresses` + `person_has_place.type=1` fornecem residência do aluno e endereço da escola (registros 10/30/70). 🟢

---

## Dependências

| Dependência | Uso | Fonte |
|-------------|-----|-------|
| `People` (`Person`, `LegacyPerson`, `Individual`, `Employee`) | `place()` relations para endereço residencial (pessoa/servidor/pessoa física) | 🟢 |
| `School` | `LegacySchool.addresses()` (belongsToMany por `person_has_place`; escola usa seu ref_idpes como "pessoa") | 🟢 |
| `Enrollments` | regra do bairro na matrícula | 🟢 |
| `Educacenso` | view `addresses` para registros de endereço | 🟢 |
| `Transport` | demandante histórico de lat/long (sem consumer no snapshot) | 🔴 |
| `Usuario` | níveis de acesso (`POLI_INSTITUCIONAL`), processos 753/754/755/759 | 🟢 |
| Base comum externa | `cities` pré-carregadas de CSV — sem provedor externo (não chama ViaCEP) | 🔴 |

---

## Decisões de design identificadas

| Decisão | Evidência | Confiança |
|---------|-----------|-----------|
| Catálogo do Brasil pré-carregado e read-only — o sistema assume que só restam dados estrangeiros cadastráveis. | rules + CSV seeder | 🟢 |
| Menus legados mantidos (`public_*`) mas reescritos sobre Eloquent novos (migração progressiva de telas). | `InteractWithDatabase` | 🟢 |
| Endereçamento da pessoa via pivot (`person_has_place`) e não via FK direta em pessoa — n+m tipos de endereço por pessoa. | DDL + relations | 🟢 |
| View `addresses` como contrato para consumers (Educacenso/matricula) — desacopla nome de tabelas. | `addresses.sql` | 🟢 |
| Hierarquia física em sucesso: cidade→pais duplicado no texto?" no flow" | 🟢 |
| Sem campos de geometria reais (col `geom` declarada no controller de UF, não persistida pelo modelo). | `public_uf_cad.php` | 🟡 |

---

## Estado interno

- Nenhum cache próprio; consultas diretas. As mensagens de exceção são apresentadas na tela; **não há log técnico dedicado** no módulo. 🟢
- Soft deletes em todos os modelos — nada sobrescreve histórico. 🟢

---

## Observabilidade

Baixa: sem log/auditoria do CRUD geográfico (o `updated_by` de pessoa cobre outros módulos). Mensagens de erro apenas ao usuário final. 🟢/🟡

---

## Riscos e lacunas

| Risco | Descrição | Evidência | Confiança |
|-------|-----------|-----------|-----------|
| Sem escritor de endereços | `places` e `person_has_place` não têm CRUD no snapshot (nem tela nem API); consumers só leem. Paridade funcional exige um módulo próprio na reconstrução. | grep em app + ieducar | 🔴 |
| `Individual.place()` quebrado | usa `hasOne(Place, 'person_id')` mas `places` não tem `person_id` — relação sempre vazia; o correto existente é `Person.place()` (hasOneThrough). Provável bug real legado. | `Individual.php:147-156` vs `Place.php:13-27` | 🔴 |
| `CityBuilder.whereName` inconsistente | usa `unaccent()` (extensão) com comentário copiado errado ("nome do curso"). | `CityBuilder.php:11-19` | 🟡 |
| `City.queryFindByName` código morto | só definido, nunca chamado; usa `translate` com charset literal e escape manual de quotes (potencial fragilidade). Duplo mecanismo de fonética (`translate` X `unaccent`) sem padronização. | `City.php:73-80` | 🟡 |
| Mensagem errada (distrito) | `AddressingCityDistrictRule` fala "bairros" bloqueando pelo distritos. | rule | 🟡 |
| Bairro por string compare | `strcasecmp` sem normalização de acento/CEP; endereço ausente ⇒ "bairro vazio" pode casar igual. | educar_matricula_cad | 🟡 |
| `latitude/longitude` float | 4 bytes perde precisão (recomendação alvo: double/limites decimais). | DDL | 🟡 |
| Sem fonte externa | nenhuma ViaCEP/IBGE — CEP/códigos dependem dos humans no CSV (12 fixes 2022 em update_cities.php mostram manutenção manual). | migration 2022 | 🟡 |
