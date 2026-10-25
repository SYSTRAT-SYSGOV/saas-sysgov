# Proposta: Submódulo de Conselho de Classe & Pré-Conselho (SYS-Educa)

## Por que (Why)

O Conselho de Classe e os processos preparatórios de Pré-Conselho constituem o órgão colegiado máximo de deliberação pedagógica das unidades escolares municipais, conforme estabelecido na Lei de Diretrizes e Bases da Educação Nacional (LDB - Lei nº 9.394/1996) e nos regimentos municipais de ensino. 

Atualmente, o acompanhamento do rendimento e comportamento dos estudantes ao longo dos períodos letivos é frequentemente fragmentado em planilhas ou fichas de papel avulsas, dificultando a tomada de decisões preventivas no pré-conselho e gerando atrasos na formalização das atas deliberativas finais de aprovação, recuperação paralela/final e retenção. 

A implementação deste submódulo integrado ao SYS-Educa confere rastreabilidade legal, segurança jurídica e conformidade multi-tenant às decisões colegiadas, permitindo diagnósticos disciplinares estruturados e geração de atas oficiais digitais com trilha de auditoria completa.

## O Que Muda (What Changes)

- **Cronograma de Reuniões de Conselho**: Gestão de cronogramas periódicos (bimestrais, trimestrais ou semestrais) vinculados ao ano letivo ativo e à unidade escolar (`EducaSchool`).
- **Ficha Diagnóstica de Pré-Conselho**: Instrumento preenchido pelo docente da disciplina antes da reunião colegiada, contemplando diagnóstico da turma, objetivos atingidos, metodologias utilizadas e identificação individualizada de alunos com necessidade de intervenção pedagógica (baixo rendimento, faltas reiteradas ou questões socioemocionais).
- **Atas Deliberativas Colegiadas**: Formalização das reuniões de conselho com registro de membros presentes (Direção, Coordenação Pedagógica, Docentes e Secretaria), deliberações oficiais de progressão plena, progressão com dependência/plano de estudos, encaminhamento para recuperação intensiva ou retenção fundamentada.
- **Pareceres Descritivos e Encaminhamentos**: Registro estruturado de pareceres descritivos individuais e ações de recuperação preventiva para os estudantes sinalizados.
- **Ciclo de Vida da Ata**: Fluxo de aprovação estrito (`rascunho` -> `em_revisao` -> `finalizada` -> `homologada`), impedindo alterações após a homologação final.
- **Trilha de Auditoria e Segurança**: Registro de todas as mutações e deliberações colegiadas via `AuditLogger::record('educa', ...)` e controle de permissões por perfil (`educa.conselho.*`).
- **Interface Web-Client**: Visualização e preenchimento de diagnósticos, gestão de atas e pareceres no `apps/web-client` com componentes `@sysgov/ui` e dados em `JetBrains Mono`.

## Capacidades (Capabilities)

### Novas Capacidades (New Capabilities)

- `educa-conselho-pre-conselho`: Fichas diagnósticas e avaliativas preenchidas pelos docentes por turma/componente curricular, mapeamento de dificuldades pedagógicas, estratégias de intervenção e identificação de estudantes em risco de retenção.
- `educa-conselho-atas-deliberativas`: Gestão de cronograma, pautas de reuniões, atas deliberativas colegiadas, registro de votos/decisões de progressão ou retenção e pareceres finais com ciclo de homologação oficial.

### Capacidades Modificadas (Modified Capabilities)

Nenhuma capacidade existente terá seus requisitos fundamentais alterados.

## Impacto (Impact)

- **Backend (`apps/api/Modules/Educa`)**:
  - Novas tabelas multi-tenant: `educa_conselho_cronogramas`, `educa_conselho_pre_conselhos`, `educa_conselho_pre_conselho_alunos`, `educa_conselho_atas`, `educa_conselho_deliberacoes_alunos` e `educa_conselho_membros`.
  - Novos models Eloquent com traits `TenantAware`, `HasUuids` e `SoftDeletes`.
  - Novos serviços de domínio: `ConselhoCronogramaService`, `PreConselhoService` e `ConselhoAtaService`.
  - Novos FormRequests, rotas REST sob `/api/educa/conselho/*` e Policy RBAC (`ConselhoClassePolicy`).
  - Integração aos Pilares Fundacionais (`TenantContext`, `OrgChart`, `Modules/Pessoas` e `AuditLogger`).
- **Frontend (`apps/web-client`)**:
  - Nova visualização `ConselhoClasseView.tsx` integrada ao `EducaModule.tsx` sob o Design System `@sysgov/ui`.
- **Testes & Validação**:
  - Suíte de testes Feature PHPUnit cobrindo cronogramas, preenchimento de diagnósticos, trava de edição em atas finalizadas e isolamento multi-tenant estrito.
