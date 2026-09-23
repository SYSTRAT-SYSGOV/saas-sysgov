# ADR-003: Prazos e dimensões legais parametrizáveis por município

- **Status**: Aceita
- **Data**: 2026-09-22
- **Mudança relacionada**: `openspec/changes/cemiterio-fundacao`

## Contexto

As regras RN-01 (exumação de adultos, 3 a 5 anos), RN-02 (crianças, 2 anos), RN-07 (distanciamento 0,50 m),
RN-08 (túmulo 3,00 m × 2,10 m), RN-09 (2 obras simultâneas) e RN-10 (edital de 10 a 30 dias) variam conforme a
legislação de cada município. O SYSGOV é multi-tenant e cada tenant é um município.

## Decisão

Manter esses valores em uma tabela de configuração versionada por tenant (`cemetery_settings`), com vigência
e append-only. Os valores do DRS entram apenas como **referência** no seed da habilitação e são editáveis. As
faixas legais de validação ficam na configuração do módulo. Cada operação grava o valor que aplicou, para que
alterações não retroajam.

## Alternativas consideradas

- **Constantes no código**: proibidas pelo requisito; exigiriam deploy a cada mudança de lei municipal.
- **Chave-valor genérica de configuração**: sem tipos nem validação por campo; auditoria mais difícil.
- **Arquivo de configuração por ambiente**: não suporta valores diferentes por tenant.

## Consequências

- (+) Mudança de lei municipal é configuração auditada, não deploy.
- (+) Rastreabilidade: cada exumação/edital guarda o prazo aplicado.
- (−) Toda regra precisa ler os parâmetros vigentes (mitigado com cache Redis por tenant).
