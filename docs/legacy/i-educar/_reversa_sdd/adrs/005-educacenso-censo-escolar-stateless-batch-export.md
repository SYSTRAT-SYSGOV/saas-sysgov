# ADR-005: Pipeline Assíncrono de Validação e Exportação do Educacenso INEP

> **Status:** 🟢 Aprovado / Decisão Arquitetural Consolidada  
> **Data:** 2026-10-12  
> **Autor:** Reversa Detective (`reversa-detective`) & Architect (`reversa-architect`)  
> **Contexto:** Plataforma SYSGOV — Modernização do i-Educar (`SYS-Educa`)

---

## 1. Contexto e Problema

O Censo Escolar da Educação Básica (Educacenso), coordenado pelo INEP/MEC, é o principal instrumento de coleta de informações da educação brasileira e condiciona o repasse de verbas federais (FUNDEB, PNAE para merenda escolar, PNATE para transporte escolar e livro didático).
No i-Educar legado:
- O processo de geração dos arquivos de texto (layout posicional/delimitado por pipe `|` dos registros 00 a 60) era síncrono e causava timeouts HTTP no PHP (especialmente em redes municipais com mais de 5.000 alunos);
- Erros de paginação causavam repetição de alunos entre páginas ou omissão de turmas (commit `3853e4a61 Corrige repetição de alunos entre páginas na consulta da 1ª fase do Educacenso`);
- Falhas na ordenação sem desempate geravam saídas não-determinísticas entre execuções consecutivas (commit `64b0773af`);
- O operador só descobria inconsistências cadastrais após tentar enviar o arquivo no sistema do INEP e receber uma lista de erros crípticos.

---

## 2. Decisão Arquitetural

Criar uma **Esteira Assíncrona de Auditoria Prévia e Exportação em Lote (`CensoPipelineService`) com Filas Redis e Processamento em Chunks**:

1. **Pré-Validação e Diagnóstico em Tempo Real:**
   - Antes de iniciar a exportação física do arquivo, o sistema executa um motor de regras de validação estática (`CensoValidatorRuleSet`) que verifica regras do manual do INEP:
     - Incompatibilidade de faixa etária com a etapa do censo (commit `254d68688`);
     - Ausência de CPF ou justificativa de documento para maiores de idade;
     - Falta de endereço, CEP, escolaridade docente ou código INEP da escola;
     - Matrículas com data posterior à data de referência do censo (última quarta-feira de maio).
   - O diagnóstico exibe à secretaria escolar um dashboard interativo categorizado em **Erros Impeditivos (Bloqueantes)** e **Alertas (Não-bloqueantes)** com links diretos para correção da tela do aluno/turma.
2. **Execução em Segundo Plano via Job Laravel (`ExportEducacensoBatchJob`):**
   - O processamento roda em fila assíncrona desacoplada do ciclo HTTP web.
   - Cursor de banco com paginação determinística com desempate obrigatório (`ORDER BY entity_name ASC, id ASC`).
   - O arquivo TXT final é gerado em streaming, compactado em `.zip` e armazenado com segurança no storage compatível com S3/MinIO.
   - O usuário recebe notificação em tempo real via WebSocket/SSE assim que o lote for concluído com o link de download direto e hash SHA-256 do arquivo gerado.

---

## 3. Alternativas Consideradas

| Alternativa | Vantagens | Desvantagens / Motivo de Rejeição |
| :--- | :--- | :--- |
| **Geração Síncrona via Download Direto no Controller HTTP** | Simples de programar. | Inviável para redes médias e grandes; estouro de memória (`memory_limit`) e tempo limite de execução (`max_execution_time`); travamento do servidor web para outros usuários. |
| **Exportação Direta sem Pré-Validação** | Menos código no sistema. | Péssima experiência do usuário; retrabalho da secretaria escolar que gasta dias no portal do INEP corrigindo centenas de erros manualmente que poderiam ter sido prevenidos no sistema local. |
| **Pipeline Assíncrono com Pré-Validação e Streaming Determinístico (Escolhida)** | Confiabilidade de 100% no arquivo gerado; zero risco de timeout; total visibilidade e transparência para a equipe pedagógica. | Exige infraestrutura de workers assíncronos (Horizon/Redis) e armazenamento de arquivos de exportação. |

---

## 4. Consequências

### Positivas:
- Eliminação definitiva de timeouts durante o período crítico do Censo Escolar.
- Aumento comprovado no repasse do FUNDEB para o município ao garantir que nenhum aluno matriculado seja omitido por erros cadastrais não identificados.
- Rastreabilidade total de quem gerou e quando foi exportado cada arquivo oficial.

### Negativas / Riscos Mitigados:
- O manual do Educacenso sofre revisões anuais pelo INEP. *Mitigação:* Motor de validação com classes de regras versionadas por ano (`Rules2025`, `Rules2026`) permitindo evolução sem quebrar o histórico de anos anteriores.
