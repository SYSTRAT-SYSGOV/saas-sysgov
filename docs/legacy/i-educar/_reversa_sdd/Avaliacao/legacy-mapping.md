# Mapeamento do Legado — Módulo Avaliacao (Regras de Avaliação, Notas e Frequência)

> Gerado pelo Reversa Archaeologist em 2026-10-12

---

## 1. Arquivos Principais e Linhas Chave

| Arquivo Legado | Responsabilidade | Linhas Relevantes |
|---|---|---|
| [`ieducar/modules/Avaliacao/Service/Boletim.php`](file:///d:/SYSTRAT/I-Educar/ieducar/modules/Avaliacao/Service/Boletim.php) | Motor central de cálculo de boletim, notas, faltas, médias e promoção | L1-L3542 (`getSituacaoAluno`, `promover`, `getSituacaoNotas`, `getSituacaoFaltas`) |
| [`ieducar/modules/Avaliacao/Service/Boletim/Acessores.php`](file:///d:/SYSTRAT/I-Educar/ieducar/modules/Avaliacao/Service/Boletim/Acessores.php) | Getters e setters das estruturas em memória do boletim | L1-L450 |
| [`ieducar/modules/RegraAvaliacao/Model/Regra.php`](file:///d:/SYSTRAT/I-Educar/ieducar/modules/RegraAvaliacao/Model/Regra.php) | Entidade de configuração de regras avaliativas por nível/curso | L1-L300 |
| [`app/Models/LegacyEvaluationRule.php`](file:///d:/SYSTRAT/I-Educar/app/Models/LegacyEvaluationRule.php) | Modelo Eloquent de regras de avaliação | L1-L120 |
| [`app/Services/StageScoreCalculationService.php`](file:///d:/SYSTRAT/I-Educar/app/Services/StageScoreCalculationService.php) | Cálculo de notas por etapa e recuperação paralela | L1-L50 |
| [`app/Services/PromotionService.php`](file:///d:/SYSTRAT/I-Educar/app/Services/PromotionService.php) | Serviço de promoção/progressão de matrículas | L1-L45 |
| [`app/Services/StudentAbsenceService.php`](file:///d:/SYSTRAT/I-Educar/app/Services/StudentAbsenceService.php) | Lançamento e apuração de faltas por carga horária/dias letivos | L1-L35 |

---

## 2. Pontos Críticos e Dívida Técnica do Legado

1. **God Class `Avaliacao_Service_Boletim` (3.542 linhas):**
   - No legado, a classe mistura acesso direto ao banco, manipulação de cache, regras de negócio de múltiplos regimes (anual, semestral, cíclico), geração de arrays para visualização e atualização de estado no banco.
   - Alto acoplamento e difícil cobertura de testes unitários automatizados.
2. **Duplicidade de Camadas:**
   - Coexistem a camada legada procedural/Zend (`ieducar/modules/Avaliacao/Model/*`) e a camada mais recente Laravel Eloquent (`app/Models/LegacyDisciplineScore.php`, etc.), gerando inconsistência de queries.
3. **Fórmulas em Expressões String:**
   - As fórmulas de média (`formulaMedia`, `formulaRecuperacao`) são interpretadas em tempo de execução via regex/eval, o que traz riscos de desempenho e segurança.

---

## 3. Diretrizes de Reconstrução para o SYSGOV

1. **Motor de Avaliação Funcional e Puro (Evaluation Engine):**
   - Construir o módulo como um pipeline puro em TypeScript/Node.js ou C#/Go:
     - Entrada: `RegraAvaliacao`, `MatrizCurricular`, lista de `NotasLancadas`, lista de `FaltasLancadas`, `TotalHorasAulas`.
     - Saída: `BoletimCalculado` com status por componente, médias arredondadas, dependências e status global imutável.
   - Zero I/O dentro do motor de cálculo, permitindo execução instantânea e 100% testável com testes de propriedade e cenários de borda.
2. **Auditoria Rigorosa de Lançamentos (Audit Trail):**
   - Toda alteração de nota ou falta deve gerar um registro imutável em log de auditoria com:
     - Usuário responsável, timestamp, valor anterior, novo valor e justificativa (ex: "Conselho de Classe", "Revisão de Prova", "Retificação da Secretaria").
3. **Diário Eletrônico Offline-First (PWA):**
   - Lançamento de frequência e notas através de Progressive Web App com armazenamento local (IndexedDB) e sincronização idempotente com o servidor central quando houver conexão.
4. **Sistema de Alerta Precoce (Early Warning System):**
   - Notificações proativas automáticas para coordenadores e famílias via WhatsApp/Push quando um estudante atinge 15% de faltas ou média abaixo da linha de corte antes do fechamento do período letivo.
