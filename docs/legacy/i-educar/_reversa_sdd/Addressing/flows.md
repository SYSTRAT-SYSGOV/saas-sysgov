# Addressing (i-Educar legado) — Fluxos

> Cenários observáveis no código. Confiança por etapa.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Fluxo 1 — Consultar/editar município brasileiro (API 755)

```
Usuário → GET/POST/PATCH/DELETE /api/city  🟢
  CityRestrictOperationRule:
    perfil POLI_INSTITUCIONAL → liberado 🟢
    país do estado da cidade = 45 (Brasil) → mensagem "Não é permitido edição de municípios brasileiros..." 🟢
    estrangeiro → liberado 🟢
  store/update: valida state_id existe, nome única por UF, IBGE único 🟢
  Dia delete: + AddressingCityDistrictRule (tem distritos?) e AddressingCityPlaceRule (tem places?) 🟢
```

## Fluxo 2 — Cadastrar município pela tela legada

```
Menu Endereçamento (68) → public_municipio_lst (755) → cad
  dropdown País (getCountries) → Estado (getStates)  🟢
  Novo: checa (Brasil e não institucional) → mensagem e RETORNO false 🟢 public_municipio_cad.php:80-98
  create([name, state_id, ibge_code]) via InteractWithDatabase (Eloquent) 🟢
```

## Fluxo 3 — Excluir país / estado

```
DELETE country 753: CountryRestrictOperationRule (id = 45 (Brasil)) → bloqueta 🟢
  AddressingCountryRule: hasAny(states) → "possui estados vinculados" 🟢
DELETE state 754: StateRestrictOperationRule (country = 45) 🟢
  AddressingStateRule: cities existentes → "possui cidades" 🟢
```

## Fluxo 4 — Matrícula com restrição por bairro

```
educar_matricula_cad:
  lê a coluna matricula_apenas_bairro_escola de pmieducar.instituicao 🟢 :355
  se ativa:
    bairro_escola = neighborhood de addresses view ↔ person_has_place ↔ escola.ref_idpes 🟢
    bairro_aluno  = neighborhood de ... ↔ aluno.ref_idpes 🟢
    strcasecmp(bairro_aluno, bairro_escola) != 0 →
      "O aluno deve morar no mesmo bairro da escola" e a matrícula é abortada 🟢
```
Sem endereço: valor vazio pode aceitar se ambos vazios (fragilidade não tratada). 🟡

## Fluxo 5 — Resolução de endereço para exportação Educacenso

```
EducacensoRepository (registros 10/30/70):
  JOIN person_has_place (type = 1) → addresses view → postal_code, city_ibge_code e mais 🟢 :195-494
```

## Fluxo 6 — Pesquisar município na UI de cadastro

```
educar_pesquisa_municipio_lst: busca por nome (contendo UF/IBGE) + Session para repassar seleção ao form chamador 🟡
```

## Fluxo 7 — Endereço de pessoa (leitura)

```
Pessoa → Person.place() = hasOneThrough Place via person_has_place (ordenado por type) 🟢
Servidor → Employee.place() (mesmo padrão) 🟢
Escola → LegacySchool.addresses() (belongsToMany via person_has_place) 🟢
Individual.place() → hasOne(Place, 'person_id') — coluna inexistente → não retorna nada 🔴 (bug)
```

## Fluxo 8 — Preenchimento por CEP (ausente no legado)

```
Usuário insere CEP no cadastro → ??? não há integração ViaCEP nenhuma no snapshot 🔴
Endereço é criado por... nada no snapshot (sem writer) 🔴
```

---

## Fluxos combinados com outros módulos

| Consumidor | Uso | Referência |
|---|---|---|
| `People` | endereço residencial de pessoa/servidor; nascimento por cidade (`idmun_nascimento`) | 🟢 |
| `School` | endereço da escola (registro 10) | 🟢 |
| `Enrollments` | regra por bairro na matrícula | 🟢 |
| `Educacenso` | residência cód IBGE (registros 30/70 etc.) | 🟢 |
| `Reports` | relatórios com endereço de escola/aluno (via addresses) | 🟡 |
| `Transport` | lat/long hoje sem consumer (demandante histórico) | 🔴 |
