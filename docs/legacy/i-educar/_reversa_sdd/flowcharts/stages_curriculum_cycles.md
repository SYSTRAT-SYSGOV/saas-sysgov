# Fluxo Arquitetural: Etapas de Ensino, Cursos, Séries, Ciclos e Matriz de Progressão (SYSGOV - Stages)

Este documento modela a taxonomia educacional do **SYSGOV (SYS-Educa)**, superando o acoplamento procedural do legado do i-Educar (`pmieducar.curso`, `pmieducar.serie`, `pmieducar.sequencia_serie`, `pmieducar.modulo`).

---

## 1. Hierarquia da Estrutura Curricular e Escolar

```mermaid
graph TD
    classDef levelNode fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff
    classDef courseNode fill:#0f172a,stroke:#10b981,stroke-width:2px,color:#fff
    classDef gradeNode fill:#1e1b4b,stroke:#8b5cf6,stroke-width:2px,color:#fff
    classDef cycleNode fill:#312e81,stroke:#ec4899,stroke-width:2px,color:#fff
    classDef schoolNode fill:#1c1917,stroke:#f59e0b,stroke-width:2px,color:#fff

    subgraph Niveis_Ensino["🏛️ Níveis e Modalidades Nacionais (MEC / Censo)"]
        L1["Educação Infantil"]:::levelNode
        L2["Ensino Fundamental (9 Anos)"]:::levelNode
        L3["Ensino Médio"]:::levelNode
        L4["Educação de Jovens e Adultos (EJA)"]:::levelNode
    end

    subgraph Cursos["📚 Cursos da Rede Municipal"]
        C1["EFI - Ensino Fundamental Anos Iniciais (1º ao 5º Ano)"]:::courseNode
        C2["EFF - Ensino Fundamental Anos Finais (6º ao 9º Ano)"]:::courseNode
        C3["EJA Fundamental I (Fase I e II)"]:::courseNode
    end

    L2 --> C1
    L2 --> C2
    L4 --> C3

    subgraph Series_Ciclos["🎓 Séries / Anos Escolares / Ciclos"]
        G1["1º Ano (Ciclo Alfabetização - 6 anos)"]:::gradeNode
        G2["2º Ano (Ciclo Alfabetização - 7 anos)"]:::gradeNode
        G3["3º Ano (8 anos)"]:::gradeNode
        G4["4º Ano (9 anos)"]:::gradeNode
        G5["5º Ano (10 anos - Concluinte de Ciclo)"]:::gradeNode
    end

    C1 --> G1
    C1 --> G2
    C1 --> G3
    C1 --> G4
    C1 --> G5

    subgraph Oferta_Escolar["🏫 Habilitação e Oferta na Unidade Escolar"]
        S1["E.M. Professora Maria Silva"]:::schoolNode
        SO1["Oferta de Curso: C1"]:::schoolNode
        SO2["Séries Autorizadas: G1, G2, G3, G4, G5"]:::schoolNode
    end

    S1 --> SO1 --> SO2
```

---

## 2. Motor de Matriz de Progressão Continuada e Transição (`educa_grade_sequences`)

```mermaid
stateDiagram-v2
    [*] --> Matriculado: Início do Ano Letivo

    state Matriculado {
        AvaliacaoPeriodica: Apuração de Rendimento e Frequência
    }

    state "Conselho de Classe / Fechamento Final" as FechamentoFinal

    Matriculado --> FechamentoFinal: Término das Etapas do Ano

    state FechamentoFinal {
        checkRegra: Consulta Matriz de Progressão
    }

    state "Aprovado / Progressão Regular" as Aprovado
    state "Retido / Reprovado" as Retido
    state "Progressão Continuada (Ciclo)" as CicloContinuado
    state "Aceleração de Aprendizagem" as Aceleracao

    FechamentoFinal --> Aprovado: Média >= 6.0 e Freq >= 75%
    FechamentoFinal --> CicloContinuado: Não Atingiu Objetivos (1º -> 2º Ano / Bloco Alfabetização)
    FechamentoFinal --> Retido: Reprovação no 3º/5º/9º Ano ou Frequência < 75%
    FechamentoFinal --> Aceleracao: Aluno em Distorção Idade-Série Avaliado

    Aprovado --> Destino1: Ingressa no 2º Ano (Próxima Série Regular)
    CicloContinuado --> Destino1: Ingressa no 2º Ano com Plano de Apoio Pedagógico
    Retido --> Origem: Rematriculado no 1º Ano (Mesma Série)
    Aceleracao --> Destino2: Salto para 3º ou 4º Ano (Fluxo Corrigido)

    state Destino1 {
        [*] --> EnturmacaoProximoAno
    }
```
