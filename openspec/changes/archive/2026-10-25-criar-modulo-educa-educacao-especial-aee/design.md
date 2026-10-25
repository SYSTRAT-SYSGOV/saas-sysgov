# Design: Arquitetura do Submódulo de Educação Especial e AEE

## Context

O SYS-Educa já possui módulos funcionais para gestão escolar básica, turmas, matrículas (`EducaEnrollment`), enturmação, quadro de horários e transporte escolar. A expansão para o Atendimento Educacional Especializado (AEE) exige arquitetura modular aderente ao monólito modular Laravel (`Modules/Educa`) e à interface React 19 / Tailwind CSS v4 (`apps/web-client`), mantendo integridade transacional multi-tenant (`tenant_id`), conformidade LGPD estrita para dados de saúde (laudos médicos com CID) e integração com o Educacenso.

Consulte o documento `proposal.md` para motivações e diretrizes de negócio.

## Goals / Non-Goals

**Goals:**
- Prover prontuário individual do aluno PAEE com controle de sigilo médico LGPD.
- Permitir elaboração colaborativa do Plano Educacional Individualizado (PEI) com versionamento semestral.
- Gerenciar alocação de profissionais de apoio (cuidadores e intérpretes) com travas de sobrecarga.
- Organizar Salas de Recursos Multifuncionais (SRM) com controle de horários no contraturno.
- Garantir alinhamento das deficiências e recursos com a taxonomia oficial do Censo Escolar (Inep).

**Non-Goals:**
- Prescrição clínica ou prontuário eletrônico hospitalar (escopo exclusivo da Secretaria de Saúde).
- Folha de pagamento ou cálculo previdenciário de cuidadores terceirizados (escopo de RH/Contratos).
- Gestão patrimonial física de prédios escolares (escopo do módulo Obras/Patrimônio).

## Decisions

### 1. Modelo de Dados Relacional e Isolamento com `TenantAware`
- **Decisão:** Criar as entidades `EducaAeeStudentProfile`, `EducaAeePei`, `EducaAeePeiGoal`, `EducaAeeResourceRoom`, `EducaAeeEnrollment` e `EducaAeeSupportAllocation` com PKs em UUID `CHAR(36)`, `tenant_id` bigint obrigatório, SoftDeletes e traits `TenantAware` e `HasUuids`.
- **Alternativa Considerada:** Armazenar dados de AEE em colunas JSON livres dentro de `EducaStudentProfile`. Rejeitado para garantir integridade referencial, consultas analíticas e auditoria imutável via `AuditLogger`.

### 2. Sigilo LGPD e Tratamento de Laudos Médicos
- **Decisão:** Laudos médicos e diagnósticos CID-10/11 são tratados como dados pessoais sensíveis (Art. 11 da LGPD). Os anexos são criptografados em storage e visíveis apenas para perfis com permissão expressa `educa.aee.laudos.view` (especialistas de AEE e coordenadores pedagógicos). Na visualização pública ou de outros docentes, exibe-se apenas a indicação de adaptação curricular necessária.
- **Alternativa Considerada:** Deixar visualização irrestrita a todos os professores da escola. Rejeitado por violação de privacidade e confidencialidade médica.

### 3. Matrícula em Dupla Entrada (Escola Regular + Sala de Recursos)
- **Decisão:** O atendimento em SRM no contraturno é modelado através da entidade `EducaAeeEnrollment`, que referencia a matrícula regular ativa (`EducaEnrollment`) e a sala de recursos (`EducaAeeResourceRoom`). Isso atende ao padrão do Fundeb e do Censo Escolar, que remuneram a dupla matrícula do aluno da educação especial sem conflito de horário.
- **Alternativa Considerada:** Criar uma turma regular normal para o AEE. Rejeitado porque a enturmação de AEE tem dinâmica de agrupamento flexível e horários individualizados.

### 4. Controle de Capacidade do Cuidador Escolar
- **Decisão:** A alocação de profissionais de apoio (`EducaAeeSupportAllocation`) possui parâmetro municipal de relação aluno/profissional (ex.: máximo de 3 ou 4 alunos dependentes por cuidador) e validação em tempo de escrita, impedindo sobrecarga que comprometa a integridade física do educando.

## Risks / Trade-offs

- **[Risco: Conflito de Horário Contraturno vs Transporte Escolar]**  
  *Mitigação:* O serviço de AEE valida a grade do aluno e sincroniza a rota do transporte escolar acessível (`Modules/Educa/Services/TransportAllocationService`) para garantir a locomoção de ida e volta no contraturno.

- **[Risco: Vencimento de Laudos Médicos Periciais]**  
  *Mitigação:* Alertas visuais e disparos de notificação na tela para a secretaria escolar 60 dias antes da data de expiração ou revisão do laudo.

## Migration Plan

1. Executar migration para criação das tabelas `educa_aee_*`.
2. Registrar seeder de permissões RBAC `educa.aee.*` no `EducaServiceProvider`.
3. Adicionar endpoints REST autenticados sob `/api/educa/aee/*`.
4. Disponibilizar aba "Educação Especial (AEE)" no `EducaModule.tsx`.
