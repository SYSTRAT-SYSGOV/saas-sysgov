# Addressing (i-Educar legado) — Contratos

> Superfícies observáveis: endpoints HTTP, entidades de dados e integrações adaptadas ao código legado.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Endpoints HTTP

### API REST (ResourceController)
| Recurso | Processo | Operações | Proteções específicas |
|---|---|---|---|
| `/api/country` | 753 | index/store/show/patch/DELETE | `CountryRestrictOperationRule` (Brasil id 45); `AddressingCountryRule` no delete. 🟢 |
| `/api/state` | 754 | idem | `StateRestrictOperationRule` (country = 45); `AddressingStateRule` no delete. 🟢 |
| `/api/district` | 759 | idem | `DistrictRestrictOperationRule` (cidade → estado → país = 45). 🟢 |
| `/api/city` | 755 | idem | `CityRestrictOperationRule` (país = 45, exceto `POLI_INSTITUCIONAL`); no delete: + `AddressingCityDistrictRule` e `AddressingCityPlaceRule`. 🟢 |

`ResourceCountryController@index` existe além do CRUD (`country` view/consulta). 🟢

### Telas legadas (menu "Endereçamento", processo pai 68)
| Tela | Processo | Ações | Campos |
|---|---|---|---|
| `public_pais_{cad,det,lst}` | 753 | create/update/delete via `InteractWithDatabase` | nome, código "INEP" (label errado para IBGE). 🟢 🟡 |
| `public_uf_{cad,det,lst,xml}` | 754 | idem | sigla, nome, `geom` (declarado, sem persistência), país, IBGE. 🟡 |
| `public_municipio_{cad,det,lst,xml}` | 755 | idem | país → estado dropdowns, nome, IBGE; bloqueio de Brasil para não institucional no servidor. 🟢 |
| `public_distrito_{cad,det,lst,xml}` | 759 | idem | cidade, nome, IBGE. 🟢 |
| `educar_pesquisa_municipio_lst` | — | popup de busca | `Session` para devolver a seleção ao formulário chamador. 🟡 |
| `educar_enderecamento_index` | 68 | host do menu | — 🟢 |

---

## Entidades legadas (persistência, schema `public`)

### `countries` / `states` / `cities` / `districts`
| Coluna comum | Notas |
|---|---|
| `id` (increments), `name`, `ibge_code` (nullable int), timestamps, soft deletes | 🟢 |
| `states.abbreviation` (2 letras), `states.country_id`; `cities.state_id`; `districts.city_id` | 🟢 |

### `places`
| Coluna | Tipo/Nota |
|---|---|
| `city_id` | nullable (relaxado em 2022). 🟢 |
| `address`, `number`, `complement` | texto nullable. 🟢 |
| `neighborhood` | texto nullable (era NOT NULL). 🟢 |
| `postal_code` | texto nullable (era NOT NULL). 🟢 |
| `latitude`, `longitude` | `float` (4 bytes). 🟢 |
| timestamps + softDeletes | 🟢 |

### `person_has_place`
| Coluna | Nota |
|---|---|
| `person_id` + `type` | UNIQUE juntos: uma pessoa só tem 1 endereço por tipo. 🟢 |
| `place_id` | FK `places.id`. 🟢 |
| `type = 1` | residência principal (consumido por Educacenso e matrícula). 🟢 |
| `index(person_id)` | 🟢 |

### View `public.addresses`
- Contrato consumed: `id, city_id, state_id, country_id, address, number, complement, neighborhood, postal_code, latitude, longitude, city, state_abbreviation, state, country, city_ibge_code, state_ibge_code, country_ibge_code`. 🟢

---

## Integrações

| Integração | Direção | Contrato | Confiança |
|---|---|---|---|
| EducacensoRepository | leitura | joins `person_has_place` + `addresses` (postal_code, city_ibge_code) | 🟢 |
| educar_matricula_cad | leitura | `neighborhood` da residência do aluno vs da escola (`person_has_place.type=1`) | 🟢 |
| Escola (ref_idpes) | leitura | endereço da escola via `LegacySchool.addresses()` | 🟢 |
| ViaCEP / BrasilAPI / IBGE | saída | **não existe** no snapshot (insumo do alvo) | 🔴 |
| Seeders CSV | carga | `countries.csv` (333), `states.csv` (27 UFs), `cities.csv` (5.564), `districts.csv` (10.838) | 🟢 |
| Atualização manual do CSV | manutenção | `2022_06_29 update_cities.php` corrigiu 12 nomes/códigos IBGE à mão | 🟢 |

## Regras de validação (cidade, como referência do padrão dos demais)
```json
{
  "state_id": "required|integer|exists:states,id",
  "name": "required|max:255|unique:cities,name (por state_id; ignora próprio id)",
  "ibge_code": "nullable|unique:cities,ibge_code (ignora próprio id)"
}
```
🟢 `AddressingCityRequest.php` (demais requests seguem o mesmo padrão). 🟡

## Erros de aplicação

- Bloqueios como mensagens de validação Laravel (via `Rule::message()` pt-BR), sem exceção de serviço dedicada. 🟢
