# ADR-0001 — Monólito Modular

- **Status:** Aceito (implementado)
- **Data:** 22/08/2026
- **Decisores:** Arquitetura de Software SYSTRAT

## Contexto

A equipe de engenharia é enxuta (4 desenvolvedores full stack) e precisa de alta
velocidade de entrega de valor com baixo atrito operacional. A adoção prematura de
microserviços introduziria custos desproporcionais de infraestrutura, latência de
rede, transações distribuídas (Saga Pattern) e orquestração de deploys independentes
para um produto em consolidação de mercado.

## Decisão

Adotar a arquitetura de **Monólito Modular** gerenciada pelo pacote
`nwidart/laravel-modules`. Todo o código reside em uma única base Laravel
(`apps/api`), estruturado em módulos independentes sob `Modules/`
(Contracts, Finance, Procurement, OrgChart, Client, Admin).

- A comunicação intermódulos é restrita à injeção de dependências de Services
  públicos e disparo de Eventos de Domínio.
- É **proibido** o acoplamento via queries diretas a tabelas de outros módulos.
- Cada módulo novo segue o Contrato de Módulo (DoD) — ver docs do repositório.

## Consequências

- ✅ Deploy transacional atômico simplificado.
- ✅ Consistência ACID nativa para operações orçamentárias críticas.
- ✅ Capacidade de extrair módulos para microserviços no futuro, se justificado.
- ⚠️ Exige rigor absoluto no code review para impedir vazamento de dependências
  e quebra de fronteiras modulares.

## Alternativas consideradas

- **Microserviços descentralizados** — rejeitado pelo alto custo de observabilidade
  e sobrecarga de infraestrutura.
- **Monólito tradicional não-modular** — rejeitado pelo risco de código espaguete
  e acoplamento desordenado.