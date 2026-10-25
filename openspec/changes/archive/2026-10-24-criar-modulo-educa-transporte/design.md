# Design Técnico: Submódulo Transporte Escolar no SYS-Educa

## Contexto (Context)

Ver [proposal.md](proposal.md) para motivação e problemas resolvidos.
O SYS-Educa já possui implementados e homologados os submódulos de Core Acadêmico, Secretaria, Pedagógico, Servidores e Educacenso.
A gestão do Transporte Escolar complementa a vida do estudante, integrando dados de pessoas e matrículas à operação física de transporte.

Restrições arquiteturais aplicadas:
- Multi-tenancy estrito via `tenant_id` (bigint) e trait `TenantAware`.
- Chaves primárias UUID `CHAR(36)` nas tabelas do módulo.
- Relação obrigatória de condutores e monitores com o MDM `Modules\Pessoas\Models\Pessoa`.
- Redação estritamente em Português do Brasil (pt-BR - AGENTS.md §7).

## Objetivos e Não-Objetivos (Goals / Non-Goals)

**Objetivos:**
- Mapear rotas, turnos e itinerários com paradas ordenadas cronologicamente.
- Controlar a frota escolar com trava de lotação máxima de passageiros sentados.
- Rastrear a regularidade de laudos de vistoria semestral do DETRAN.
- Credenciar condutores e monitores exigindo CNH profissional (D/E) e curso especializado de escolares.
- Alocar nominalmente estudantes com trava atômica de vagas no veículo (`lockForUpdate()`).

**Não-Objetivos:**
- Telemetria veicular por GPS em tempo real (hardware IoT em tempo real).
- Otimização algorítmica de rotas por inteligência artificial (escopo futuro).
- Roteirização de transporte sanitário ou administrativo geral (exclusivo para educação).

## Decisões Arquiteturais e Técnicas (Decisions)

### Decisão 1: Modelo Relacional Normalizado e Rastreável
- **Tabelas do submódulo**:
  1. `educa_transport_routes`: Linhas de transporte com código, nome, turno (matutino, vespertino, noturno, integral), tipo de rota (urbana, rural, mista) e quilometragem diária.
  2. `educa_transport_stops`: Pontos de parada da rota com ordem sequencial, nome, referência e horário estimado de passagem.
  3. `educa_transport_route_schools`: Tabela pivô associando as escolas atendidas pela rota.
  4. `educa_transport_vehicles`: Veículos próprios ou terceirizados com placa, tipologia, ano, capacidade total de assentos e ocupação efetiva atual.
  5. `educa_transport_inspections`: Vistorias semestrais com número de laudo do DETRAN, validade e resultado.
  6. `educa_transport_drivers`: Condutores e monitores com vínculo MDM `pessoa_id`, CNH (número, categoria D/E e validade) e indicador de curso especializado.
  7. `educa_transport_student_allocations`: Alocação nominal de matrícula/aluno na rota e veículo, com ponto de embarque e controle de status.

### Decisão 2: Controle Atômico de Capacidade de Passageiros (`lockForUpdate`)
- **Escolha**: Antes de confirmar a alocação de um novo estudante no veículo, o `TransportAllocationService` executa uma transação com `lockForUpdate()` na linha do veículo em `educa_transport_vehicles`, garantindo que `ocupacao_efetiva < capacidade_passageiros`.
- **Justificativa**: Previne sobrelotação física de estudantes decorrente de requisições concorrentes de secretários ou operadores escolares.

### Decisão 3: Licenciamento via Entitlement e Middleware
- **Escolha**: Registro do submódulo `educa-transporte` no catálogo `Module` com middleware `module-access:educa-transporte` nas rotas `/api/educa/transporte`.
- **Justificativa**: Preserva o modelo de monólito modular com subscrição granular por município.

## Riscos e Mitigações (Risks / Trade-offs)

- **[Risco: Vencimento da vistoria do DETRAN durante o ano letivo]** → *Mitigação*: O sistema emite alerta preventivo de expiração 30 dias antes e impede novas alocações em veículos com vistoria vencida.
- **[Risco: Condutor com CNH vencida ou suspensa]** → *Mitigação*: Validação obrigatória da data de vencimento da CNH com bloqueio automático de escalação.
- **[Risco: Aluno transferido de escola mantendo vaga no transporte antigo]** → *Mitigação*: Evento de transferência ou encerramento de matrícula aciona a rotina de desalocação liberando o assento na rota de origem.
