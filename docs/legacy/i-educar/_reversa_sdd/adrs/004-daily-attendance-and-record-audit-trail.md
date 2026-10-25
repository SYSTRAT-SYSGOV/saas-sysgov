# ADR-004: Trilha de Auditoria e Imutabilidade do Diário de Classe

> **Status:** 🟢 Aprovado / Decisão Arquitetural Consolidada  
> **Data:** 2026-10-12  
> **Autor:** Reversa Detective (`reversa-detective`) & Architect (`reversa-architect`)  
> **Contexto:** Plataforma SYSGOV — Modernização do i-Educar (`SYS-Educa`)

---

## 1. Contexto e Problema

O Diário de Classe (frequência de alunos e registro de conteúdos ministrados) é um documento de valor jurídico e fé pública. No sistema legado i-Educar:
- Alterações de presença/falta podiam ser feitas a qualquer momento sem rastreabilidade de quem alterou e por qual motivo;
- O cálculo de frequência apresentava inconsistências entre faltas por hora-aula (disciplinares) e faltas por dia integral (faltas globalizadas, comuns no Ensino Fundamental I), chegando a gerar erros de gravação de faltas com ponto flutuante no histórico escolar (commits `b1113ce03` e `6a7683b90`);
- Secretarias de educação e conselhos tutelares sofriam com contestações de faltas e fraudes em abonos sem respaldo documental.

---

## 2. Decisão Arquitetural

Implementar o padrão de **Registro Diário Auditado com Imutabilidade por Período (`DailyRecordService`) e Suporte Nativo a Faltas Justificadas com Anexos**:

1. **Separação de Granularidade:**
   - **Registro da Aula (`daily_records`):** Data, turma, componente curricular, número de aulas ministradas (horas-aula), conteúdos previstos vs ministrados e habilidades da BNCC trabalhadas.
   - **Frequência dos Alunos (`daily_attendance`):** Vínculo da aula com a matrícula do aluno, registrando `status` (`PRESENT`, `ABSENT`, `JUSTIFIED_ABSENCE`) e quantidade de faltas no dia/aula.
2. **Ciclo de Vida do Diário (State Machine):**
   - O diário opera nos estados `DRAFT` (rascunho do professor), `SUBMITTED` (lançado), `LOCKED` (congelado ao término do prazo regulamentar do bimestre) e `AMENDED` (retificado sob auditoria).
3. **Imutabilidade e Trilha de Auditoria (`daily_record_audit_logs`):**
   - Uma vez decorrido o prazo limite (`dias_tolerancia_retroativa`), o diário é congelado.
   - Qualquer alteração posterior exige justificativa formal digitada e autorização superior, gerando log imutável contendo quem realizou a mudança, timestamp UTC, IP do requisitante e diff dos dados em JSON.
4. **Tratamento Preciso de Faltas Decimais/Fracionárias:**
   - O armazenamento de faltas e cargas horárias utiliza tipo numérico exato `DECIMAL(5,2)` tanto nas frequências diárias quanto nos resumos de histórico escolar, eliminando definitivamente arredondamentos indesejados de ponto flutuante.

---

## 3. Alternativas Consideradas

| Alternativa | Vantagens | Desvantagens / Motivo de Rejeição |
| :--- | :--- | :--- |
| **Edição Livre Permanente sem Bloqueio de Data** | Maior comodidade para professores que acumulam lançamentos de bimestres anteriores. | Insegurança jurídica severa; reprovação do Tribunal de Contas (TCE) e Ministério Público; facilidade de alteração fraudulenta de notas/faltas após o conselho de classe. |
| **Cálculo de Frequência em Tempo Real via Query Cruzada no Banco** | Sem necessidade de tabelas de resumo. | Performance catastrófica ao emitir boletins de uma rede inteira com 50.000 alunos multiplicados por 200 dias letivos e 10 disciplinas (milhões de registros varridos por query). |
| **Arquitetura de Diário com Bloqueio Temporal e Resumo Materializado Auditado (Escolhida)** | Performance de consulta instantânea em relatórios/boletins, conformidade legal absoluta, fé pública do diário digital. | Exige rotina de recálculo/sincronização assíncrona quando ocorre retificação autorizada de faltas passadas. |

---

## 4. Consequências

### Positivas:
- O Diário Eletrônico ganha validade jurídica plena para substituição definitiva do diário em papel impresso.
- Diretores e coordenadores conseguem monitorar a evasão escolar e infrequência em tempo real com alertas automatizados para o Conselho Tutelar (busca ativa escolar).
- Eliminação de bugs de divisão por zero e arredondamento em faltas globalizadas.

### Negativas / Riscos Mitigados:
- Reclamações iniciais de professores esquecidos de prazos. *Mitigação:* Sistema de notificações preventivas (Push / Dashboard) avisando 5 e 2 dias antes do fechamento do prazo de lançamento.
