# Fluxo de Regras de Avaliação, Fórmulas de Média e Progressão (SYS-Educa / SYSGOV)

O diagrama abaixo detalha o ciclo completo de avaliação acadêmica no **SYS-Educa**, abrangendo o lançamento de notas de etapas, apuração de recuperação paralela, cálculo de médias com motor seguro de fórmulas matemáticas (sem `eval`), aplicação da tabela de arredondamento/conversão conceitual, aferição de frequência/faltas, exame de recuperação final e definição da situação final do aluno (Aprovado, Reprovado por Média, Reprovado por Faltas, ou Aprovado com Dependência).

```mermaid
flowchart TD
    classDef startEnd fill:#1e293b,stroke:#0f172a,stroke-width:2px,color:#fff;
    classDef process fill:#0284c7,stroke:#0369a1,stroke-width:1px,color:#fff;
    classDef decision fill:#d97706,stroke:#b45309,stroke-width:1px,color:#fff;
    classDef warning fill:#b91c1c,stroke:#991b1b,stroke-width:1px,color:#fff;
    classDef success fill:#15803d,stroke:#166534,stroke-width:1px,color:#fff;
    classDef mathEngine fill:#4f46e5,stroke:#3730a3,stroke-width:2px,color:#fff;

    Start([Início do Fechamento de Etapa / Ano Letivo]):::startEnd --> CheckRule[Identificar Regra de Avaliação Vinculada à Série/Ano<br/><code>educa_evaluation_rules</code>]:::process

    CheckRule --> NoteTypeDecision{Tipo de Avaliação?<br/><code>note_type</code>}:::decision
    
    %% NOTA CONCEITUAL / PARECER
    NoteTypeDecision -->|Apenas Parecer Descritivo| ParecerFlow[Registrar Pareceres Descritivos<br/>Etapa ou Anual / Geral ou Componente]:::process
    ParecerFlow --> CheckPresenca

    %% LANÇAMENTO DE NOTAS
    NoteTypeDecision -->|Numérica ou Conceitual c/ Valor| LancamentoNotas[Lançamento de Notas das Etapas: E1..En]:::process

    LancamentoNotas --> HasRecParalela{Possui Recuperação Paralela?<br/><code>parallel_remedial_type</code>}:::decision

    %% RECUPERAÇÃO PARALELA
    HasRecParalela -->|Sim: Por Etapa ou Específica| ProcessRecParalela[Apurar Nota da Recuperação Paralela: RSPn]:::process
    ProcessRecParalela --> CalcParalelaDecision{Cálculo Paralela?<br/><code>parallel_remedial_calc_type</code>}:::decision
    
    CalcParalelaDecision -->|1: Substitui Maior| SubRecParalela[En = MAX(En, RSPn)]:::process
    CalcParalelaDecision -->|2: Média Ponderada/Simples| MedRecParalela[En = (En + RSPn) / 2]:::process
    CalcParalelaDecision -->|3: Soma Pontos| SumRecParalela[En = MIN(En + RSPn, MaxEtapa)]:::process

    SubRecParalela --> NextStageCheck
    MedRecParalela --> NextStageCheck
    SumRecParalela --> NextStageCheck
    HasRecParalela -->|Não| NextStageCheck{Todas as Etapas Concluídas?}:::decision

    NextStageCheck -->|Não| AguardaProxima[Aguardar Lançamento da Próxima Etapa]:::process
    NextStageCheck -->|Sim: Fechamento Anual| FormulaFinal[Carregar Fórmula de Média Final<br/><code>educa_formula_averages</code>]:::mathEngine

    %% MOTOR DE FÓRMULAS SEGURO
    FormulaFinal --> SafeEval[Motor AST / ExpressionLanguage<br/>Tokens: Se, Et, E1..En, Pesos, Condicionais<br/>Sem eval() nativo do PHP]:::mathEngine

    SafeEval --> Arredondamento[Aplicar Tabela de Arredondamento / Escala Conceitual<br/><code>educa_rounding_tables</code>]:::process

    Arredondamento --> CheckMediaMinima{Média Final >= Média Mínima?<br/><code>final_average >= min_average</code>}:::decision

    %% APROVADO DIRETO NA MÉDIA
    CheckMediaMinima -->|Sim| CheckPresenca{Verificar Frequência e Presença?}:::decision

    %% RECUPERAÇÃO FINAL / EXAME
    CheckMediaMinima -->|Não| HasExameFinal{Permite Exame Final?<br/><code>final_remedial_formula_id</code>}:::decision
    HasExameFinal -->|Não| ReprovadoMedia[Situação: Reprovado por Nota]:::warning

    HasExameFinal -->|Sim| RealizaExame[Registrar Nota do Exame Final: Rc]:::process
    RealizaExame --> SubstituiMenorNota{Configurado Substituir Menor Nota?<br/><code>replace_lowest_score_with_remedial</code>}:::decision
    
    SubstituiMenorNota -->|Sim| ReplaceMinScore[Substituir Menor En por Rc se Rc > Menor En]:::process
    SubstituiMenorNota -->|Não| CalcFormulaExame[Calcular Fórmula de Recuperação<br/>Ex: (Media + Rc) / 2 ou Fórmula Customizada]:::mathEngine
    
    ReplaceMinScore --> RecalculaMedia[Recalcular Média Final com a Nova Nota]:::mathEngine
    RecalculaMedia --> CheckMediaRecuperacao
    CalcFormulaExame --> CheckMediaRecuperacao{Nova Média >= Média Recuperação?<br/><code>remedial_average >= min_remedial_score</code>}:::decision

    CheckMediaRecuperacao -->|Não| ReprovadoExame[Situação: Reprovado no Exame Final]:::warning
    CheckMediaRecuperacao -->|Sim| CheckPresenca

    %% FREQUÊNCIA E FALTAS
    CheckPresenca --> PresenceTypeDecision{Tipo de Apuração de Presença?<br/><code>presence_type</code>}:::decision
    
    PresenceTypeDecision -->|Desconsiderar Faltas| FinalProgressionCheck
    PresenceTypeDecision -->|Geral Unificada| ApuraGeral[Calcular % Presença Global na Carga Horária Total]:::process
    PresenceTypeDecision -->|Por Componente Curricular| ApuraComponente[Calcular % Presença Individual por Disciplina]:::process

    ApuraGeral --> VerificaPercPresenca{% Presença >= % Mínima?<br/><code>percentage_presence >= min_percentage</code>}:::decision
    ApuraComponente --> VerificaPercPresenca

    VerificaPercPresenca -->|Não| ReprovadoFalta[Situação: Reprovado por Frequência / Faltas]:::warning
    VerificaPercPresenca -->|Sim| FinalProgressionCheck{Tipo de Progressão Escolar?<br/><code>progression_type</code>}:::decision

    %% PROGRESSÃO ESCOLAR
    FinalProgressionCheck -->|1: Continuada| AprovadoContinuada[Situação: Progressão Continuada Garantida]:::success
    FinalProgressionCheck -->|4/5: Manual / Ciclo| ConselhoClasse[Situação: Submetido a Conselho de Classe / Manual]:::process
    ConselhoClasse --> DecisaoConselho{Parecer do Conselho?}:::decision
    DecisaoConselho -->|Promover| AprovadoConselho[Situação: Aprovado pelo Conselho]:::success
    DecisaoConselho -->|Retém| ReprovadoConselho[Situação: Retido pelo Conselho]:::warning

    FinalProgressionCheck -->|2/3: Média/Presença ou Somente Média| CheckReprovacoesComponentes{Possui Disciplinas Reprovadas?}:::decision
    
    CheckReprovacoesComponentes -->|Não: 0 Reprovações| AprovadoGeral[Situação: Aprovado Pleno]:::success
    CheckReprovacoesComponentes -->|Sim: Reprovado em K Disciplinas| CheckDependencia{K <= Limite de Dependências Permitidas?<br/><code>max_dependency_disciplines</code>}:::decision

    CheckDependencia -->|Sim| AprovadoDependencia[Situação: Aprovado com Dependência Curricular<br/>Gera Matrícula de Dependência para o Próximo Ano]:::success
    CheckDependencia -->|Não: Excedeu Limite| ReprovadoDependencia[Situação: Reprovado na Série / Retido]:::warning

    ReprovadoMedia --> CheckDependencia
    ReprovadoExame --> CheckDependencia

    AprovadoGeral --> End([Fim do Processamento]):::startEnd
    AprovadoContinuada --> End
    AprovadoConselho --> End
    AprovadoDependencia --> End
    ReprovadoFalta --> End
    ReprovadoConselho --> End
    ReprovadoDependencia --> End
```
