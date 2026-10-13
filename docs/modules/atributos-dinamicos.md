# Atributos Dinâmicos — Serviço Transversal do Núcleo

Este documento descreve o catálogo e o validador central de atributos dinâmicos da plataforma SYSGOV, localizado em `App\Support\AtributosDinamicos`.

## 1. Visão Geral

Conforme a **ADR-011**, os atributos dinâmicos são modelados como uma capacidade transversal de validação sem persistência centralizada. Cada módulo interessado (como o Protocolo) armazena seus próprios atributos em tabela própria (ex.: `protocolo_atributos` com valor em JSON), reutilizando as mesmas regras de validação e tipagem da plataforma.

## 2. Tipos de Atributos Suportados (`TipoAtributo`)

O enum `App\Support\AtributosDinamicos\TipoAtributo` define os 7 tipos canônicos:

| Tipo (`value`) | Descrição | Regra de Validação | Exemplo Válido |
|---|---|---|---|
| `numerico` | Inteiro | Aceita `int` ou string inteira (`^-?\d+$`) | `42`, `"100"` |
| `texto` | Texto curto | String com no máximo 255 caracteres | `"Processo Prioritário"` |
| `lista` | Seleção simples | String escalar não vazia | `"Opção A"` |
| `lista_multipla` | Seleção múltipla | Array não vazio de strings sem duplicatas | `["Urgente", "Sigiloso"]` |
| `data` | Data ISO | String ISO `AAAA-MM-DD` com calendário válido | `"2026-10-13"` |
| `decimal` | Decimal de alta precisão | String decimal com até 6 casas decimais (nunca float) | `"1520.75"` |
| `texto_longo` | Texto longo | String com no máximo 65.535 caracteres | `"Parecer detalhado..."` |

> ⚠️ **Atenção:** Valores do tipo `decimal` **nunca** devem ser manipulados ou recebidos como tipo `float` de ponto flutuante em PHP ou JSON, evitando imprecisões binárias. Sempre utilize strings numéricas. Para valores monetários em moeda corrente, utilize `App\Support\Money`.

## 3. Uso do Validador (`ValidadorAtributo`)

### Validação e Normalização (`validar`)

Lança `InvalidArgumentException` caso o tipo seja inválido ou o valor não atenda às regras do tipo. Retorna o valor normalizado pronto para persistência JSON.

```php
use App\Support\AtributosDinamicos\TipoAtributo;
use App\Support\AtributosDinamicos\ValidadorAtributo;

// Usando o Enum:
$valorNormalizado = ValidadorAtributo::validar(
    TipoAtributo::DECIMAL,
    '1520.75'
); // Retorna '1520.75'

// Usando string do tipo:
$valorNormalizado = ValidadorAtributo::validar(
    'data',
    '2026-10-13'
); // Retorna '2026-10-13'
```

### Checagem Booleana (`ehValido`)

Verifica se o valor é aceito pelo tipo sem disparar exceção:

```php
if (ValidadorAtributo::ehValido(TipoAtributo::DATA, $entradaUsuario)) {
    // Valor aceito
}
```
