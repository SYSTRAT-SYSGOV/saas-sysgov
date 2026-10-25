# Mapeamento do Legado — Módulo Addressing

> Gerado pelo Reversa Archaeologist em 2026-10-12

---

## 1. Arquivos Principais e Linhas Chave

| Arquivo Legado | Responsabilidade | Linhas Relevantes |
|---|---|---|
| [`app/Models/Country.php`](file:///d:/SYSTRAT/I-Educar/app/Models/Country.php) | Modelo Eloquent de países (`countries`) | L1-L45 |
| [`app/Models/State.php`](file:///d:/SYSTRAT/I-Educar/app/Models/State.php) | Modelo Eloquent de unidades federativas (`states`) | L1-L79 |
| [`app/Models/City.php`](file:///d:/SYSTRAT/I-Educar/app/Models/City.php) | Modelo Eloquent de municípios com busca fonética (`cities`) | L1-L92 |
| [`app/Models/District.php`](file:///d:/SYSTRAT/I-Educar/app/Models/District.php) | Modelo Eloquent de distritos municipais (`districts`) | L1-L43 |
| [`app/Models/Place.php`](file:///d:/SYSTRAT/I-Educar/app/Models/Place.php) | Modelo Eloquent de logradouros/endereços físicos (`places`) | L1-L44 |
| [`app/Models/PersonHasPlace.php`](file:///d:/SYSTRAT/I-Educar/app/Models/PersonHasPlace.php) | Pivot de vínculo polimórfico entre pessoas e endereços | L1-L41 |
| [`app/Http/Controllers/Api/CityController.php`](file:///d:/SYSTRAT/I-Educar/app/Http/Controllers/Api/CityController.php) | API REST de Cidades com validações de processo 755 e restrições | L1-L64 |
| [`app/Rules/Addressing/AddressingCityPlaceRule.php`](file:///d:/SYSTRAT/I-Educar/app/Rules/Addressing/AddressingCityPlaceRule.php) | Trava de integridade impedindo deleção de cidades com logradouros | L1-L19 |
| [`app/Rules/Addressing/AddressingCityDistrictRule.php`](file:///d:/SYSTRAT/I-Educar/app/Rules/Addressing/AddressingCityDistrictRule.php) | Trava de integridade impedindo deleção de cidades com distritos | L1-L19 |

---

## 2. Pontos Críticos para Reconstrução no SYSGOV

1. **Serviço Central Compartilhado (Core Geographic Service):**
   - No **SYSGOV**, o módulo de Endereçamento e Geografia deve ser um serviço de fundação multi-tenant e multi-módulo (compartilhado entre Educação, Saúde, Assistência Social e IPTU/Fazenda).
   - Não deve pertencer isoladamente ao i-Educar, mas sim à base comum do ecossistema SYSGOV.
2. **Integração com ViaCEP / BrasilAPI / IBGE:**
   - No legado, as cidades dependem de pré-carga SQL ou cadastro manual.
   - No SYSGOV, o preenchimento do endereço por CEP deve ser automático via APIs de geolocalização e padronização dos códigos oficiais do IBGE.
3. **Georreferenciamento Nativo (`latitude`, `longitude`):**
   - Fundamental para o módulo de Transporte Escolar (`Transport`), roteirização de vans e zoneamento de vagas por proximidade de raio residencial.
