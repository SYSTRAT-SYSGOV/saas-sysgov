# Proposal

## Why

O transporte escolar público precisa comprovar conformidade com o PNATE/FNDE (Lei 10.880/2004), com os arts. 136 a 139 do CTB e com o Registro 60 do Censo Escolar. Hoje a operação depende de planilhas e do legado i-Educar, sem rastreio de contrato, habilitação do condutor e vistoria do veículo.

A SYSTRAT já tem uma implementação funcional dessa regra de negócio: o repositório `SYSTRAT-SYSGOV/sys-transporte` (Carlos), escrito em **Rust (Axum + SQLx) com frontend React**, como sistema **autônomo e single-tenant**, com identidade, auditoria e cadastro de escolas/alunos próprios. Ele não pode entrar no SYSGOV como está: o SYSGOV é Laravel multi-tenant, com cadastro de Pessoas, cadastro escolar, RBAC e auditoria centrais.

Esta change inicia a incorporação **reescrevendo** a regra de negócio do Carlos como módulo `Transporte` do SYSGOV, reaproveitando o que a plataforma já tem. Ela entrega a **Fase 1 de 5**: a fundação do módulo e a gestão de frota (empresas, motoristas, veículos e vistorias).

## Roteiro das fases

| Fase | Change | Entrega |
|------|--------|---------|
| 1 | `transporte-fase-1-fundacao-e-frota` (esta) | Módulo, permissões, empresas, motoristas, veículos, vistoria DETRAN e alertas de vencimento |
| 2 | `transporte-fase-2-rotas-e-itinerarios` | Paradas georreferenciadas, rotas, itinerário ordenado, quilometragem e mapa |
| 3 | `transporte-fase-3-alocacao-de-alunos` | Alocação de alunos a rota e parada, capacidade, acessibilidade e ocupação |
| 4 | `transporte-fase-4-censo-e-painel` | Pré-validação e arquivo do Registro 60 no leiaute oficial do Educacenso, painel de lotação e alertas |
| 5 | `transporte-fase-5-carga-e-demonstracao` | Importação CSV, dados de demonstração e documentação |

Cada fase é uma change independente, com seu PR, e só começa depois da anterior mesclada. As decisões comuns às cinco fases estão no `design.md` desta change.

## What Changes

- **Novo módulo Laravel `Transporte`** (`apps/api/Modules/Transporte`, alias `transporte`, tabelas `transporte_*`), criado com `php artisan make:module`, tenant-aware, com `requires: Admin, Pessoas, Escola`.
- **Empresas** de transporte: pessoa jurídica do Cadastro de Pessoas (CNPJ), do tipo **prestadora** (serviço terceirizado) ou **locadora** (aluga veículos à prefeitura), sempre com contrato e vigência.
- **Motoristas**: pessoa física do Cadastro de Pessoas (CPF e nascimento vêm de lá), com CNH D/E, curso especializado e exame toxicológico, e cálculo de elegibilidade pelo CTB.
- **Veículos** com origem **própria**, **locada** ou **terceirizada**: placa única por tenant, capacidade, tipologia Inep (1 a 11), tipo de rede, uso exclusivo, acessibilidade, motorista padrão e situação com motivo de inativação. Veículo próprio não tem empresa; locado e terceirizado exigem empresa com contrato vigente.
- **Vistorias semestrais do DETRAN** com histórico; a regularidade do veículo é derivada da última vistoria.
- **Alertas de vencimento** (CNH, curso, toxicológico, vistoria, contrato) a vencer em até 30 dias ou vencidos.
- **Frontend** em `apps/web-client/src/modules/transporte` com `@sysgov/ui`: visão geral com alertas, empresas, motoristas e veículos.
- **Permissões RBAC** `transporte.*` (o conjunto completo das cinco fases) e três perfis: Coordenação, Operador e Consulta.
- **SDK** `@sysgov/sdk` com os tipos do módulo.

## Capabilities

### New Capabilities

- `transporte`: módulo de transporte escolar. Esta fase cria os requisitos de isolamento, permissões, empresas, motoristas, veículos, vistorias, alertas e auditoria.

## Impact

- **Backend**: novo módulo (migrations, models, services, policies, controllers, rotas, seeder RBAC, testes). Depende de `Admin`, `Pessoas` e `Escola`.
- **Integração**: `bootstrap/app.php`, `docker-entrypoint.sh` (seeder RBAC) e registry do web-client.
- **Não muda** Escola, Passeio, Pessoas nem Vistoria. O módulo Passeio mantém a frota própria dele (ver `design.md`, D5).
- **Sem migração de dados** do i-Educar nesta fase.
- **Fora do escopo do Rust**: nada do código Rust é portado ou implantado.
