# Proposta: Submódulo Transporte Escolar no SYS-Educa

## Por que (Why)

O transporte escolar é um direito fundamental dos estudantes da educação básica, especialmente nas zonas rurais e áreas periféricas dos municípios brasileiros, sendo requisito obrigatório para a garantia de acesso e permanência na escola pública e para a captação de recursos do PNATE (Programa Nacional de Apoio ao Transporte do Escolar).

Atualmente, o SYS-Educa já conta com a gestão acadêmica, matrículas, servidores e prestação de contas ao Censo Escolar/INEP. No entanto, a gestão física das frotas de transporte escolar (veículos próprios municipais e linhas terceirizadas), a fiscalização de exigências legais de condutores (CNH D/E, curso específico de condutor escolar, certidões) e a vinculação nominal de estudantes aos itinerários e pontos de embarque ainda carecem de um submódulo nativo e integrado aos dados do MDM de `Pessoas` e às matrículas escolares da Secretaria.

A criação deste submódulo provê rastreabilidade completa, controle de lotação dos veículos, segurança operacional e integração direta com o Registro 60 do Educacenso.

## O que muda (What Changes)

- **Gestão de Rotas e Itinerários**: Cadastro de linhas de transporte escolar (nome, código, turno, tipo de rota urbana/rural, quilometragem diária e pontos de parada com ordem e horários estimados de embarque/desembarque).
- **Gestão de Veículos e Vistorias**: Cadastro de frota própria e veículos de empresas terceirizadas, com tipologia (ônibus, micro-ônibus, van, embarcação), capacidade de passageiros sentados, número de registro e rastreamento de laudos de vistoria periódica semestral do DETRAN/órgão de trânsito.
- **Gestão de Motoristas e Monitores**: Cadastro funcional de condutores e monitores de transporte vinculados à base única do MDM (`Pessoa`), com controle de validade de CNH, curso especializado de transporte escolar (Resolução CONTRAN 789/2020) e certidões negativas de antecedentes criminais.
- **Vinculação Nominal de Estudantes**: Associação de estudantes matriculados e com transporte escolar público ativo (`EducaStudentProfile::transporte_escolar_publico`) a itinerários, veículos e pontos de embarque, com controle estrito de capacidade máxima de assentos e prevenção de sobrelotação.
- **Segurança e RBAC**: Permissões granulares sob `educa.transporte.*` e isolamento lógico restrito por `tenant_id`.

## Capacidades (Capabilities)

### Novas Capacidades (New Capabilities)
- `educa-transporte-rotas`: Cadastro e manutenção de rotas, itinerários, turnos, tipo de rota (rural/urbana) e pontos de parada ordenados.
- `educa-transporte-veiculos-motoristas`: Gestão da frota escolar, capacidade de lotação, controle de vistorias semestrais do DETRAN e credenciamento de condutores e monitores com validação de CNH e curso de transporte escolar.
- `educa-transporte-estudantes`: Alocação nominal de estudantes em rotas e veículos com trava contra sobrelotação física de assentos e sincronização de dados para o Censo Escolar.

### Capacidades Modificadas (Modified Capabilities)
Nenhuma especificação prévia teve seus requisitos alterados.

## Impacto (Impact)

- **Módulo Backend (`apps/api/Modules/Educa`)**:
  - Novas migrations para `educa_transport_routes`, `educa_transport_stops`, `educa_transport_vehicles`, `educa_transport_drivers` e `educa_transport_student_allocations`.
  - Novos Models Eloquent com traits `TenantAware`, `HasUuids` e `SoftDeletes`.
  - Novos Services: `TransportRouteService`, `TransportVehicleService`, `TransportDriverService` e `TransportAllocationService`.
  - Novas rotas REST sob `/api/educa/transporte` protegidas por `module-access:educa-transporte` e `educa.transporte.*`.
- **Módulos Core do SYSGOV**:
  - Integração com `Modules/Pessoas` (dados cadastrais de condutores, monitores e estudantes).
  - Integração com `Modules/OrgChart` e `EducaSchool` (escolas atendidas pelas rotas).
  - Integração com `Modules/Access` e `AuditLogger` (auditoria de alocações e vistorias veiculares).
