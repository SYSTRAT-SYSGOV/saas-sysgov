# ADR 001: Adoção de Domain-Driven Design (DDD) e Restrição do Eloquent a Repositórios

- **Status**: Aceito 🟢
- **Data**: 2026-10-24
- **Decisores**: Arquitetura Hi.Events

## Contexto
O sistema Hi.Events possui regras complexas de domínio em relação a bilheteria, alocação de assentos, auditoria de pedidos, múltiplos organizadores e integrações de pagamento. Modelos com Active Record direto (Eloquent nos controllers) causam vazamento de regras, testes acoplados ao banco e efeitos colaterais silenciosos.

## Decisão
1. Adotar a arquitetura em camadas: `Action` → `Handler` → `Domain Service` → `Repository`.
2. O Eloquent ORM fica estritamente confinado dentro da camada de Repositórios (`backend/app/Repositories`).
3. Services e Actions se comunicam através de Data Transfer Objects (DTOs) estendendo `BaseDataObject` (Spatie Laravel Data) e entidades de domínio, nunca instâncias brutas de modelos Eloquent ou arrays soltos.
4. Mutação concorrente ou updates em registros soft-deleted usam `incrementEach()` / `decrementEach()`.

## Alternativas Consideradas
- **Active Record Tradicional do Laravel**: Mais rápido para prototipação, porém inviável para manter consistência financeira e regras rígidas de domínio.
- **Microserviços Independentes**: Complexidade operacional excessiva para instâncias auto-hospedadas (self-hosters).

## Consequências
- **Positivas**: Testes de unidade em `tests/Unit/` rodam em isolamento total sem banco; facilidade em auditar transações e regras críticas.
- **Negativas**: Maior verbosidade para operações de CRUD simples.
