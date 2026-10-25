# ADR-002: Motor Desacoplado de Regras de Avaliação e Fórmulas de Média

> **Status:** 🟢 Aprovado / Decisão Arquitetural Consolidada  
> **Data:** 2026-10-12  
> **Autor:** Reversa Detective (`reversa-detective`) & Architect (`reversa-architect`)  
> **Contexto:** Plataforma SYSGOV — Modernização do i-Educar (`SYS-Educa`)

---

## 1. Contexto e Problema

No Brasil, cada rede municipal ou estadual de ensino possui autonomia para definir seu regimento escolar de avaliação pedagógica (LDB art. 12 e 24). Algumas redes utilizam:
- Notas numéricas de 0 a 10 com médias bimestrais aritméticas e média de aprovação 6.0;
- Médias ponderadas com pesos crescentes (ex.: pesos 1, 2, 3 e 4 nos bimestres);
- Conceitos alfanuméricos (ex.: A = Excelente, B = Bom, C = Regular, D/E = Insuficiente);
- Avaliação descritiva / pareceres pedagógicos qualitativos (obrigatório na Educação Infantil e frequente nos Anos Iniciais do Fundamental);
- Diversas regras de recuperação (recuperação paralela substituindo nota menor, recuperação final, conselho de classe deliberativo).

No i-Educar legado, essas lógicas estavam dispersas entre procedures PL/pgSQL antigas (`modules.frequencia_da_matricula`), triggers de banco, classes legadas PHP misturadas com código procedural em `intranet/`, e rotinas inconsistentes de arredondamento com float nativo.

---

## 2. Decisão Arquitetural

Criar um **Motor de Regras de Avaliação Orientado a Objetos e Desacoplado (`EvaluationEngineService`)** no Laravel 13, suportado por uma modelagem de domínio rica:

1. **Configuração Parametrizada Declarativa:**
   - As regras não são hardcoded em código. Cada regra vincula-se a uma Fórmula de Média (`media_formulas`) e a uma Tabela de Arredondamento (`rounding_tables`).
2. **Gramática e Parser Seguro de Fórmulas Matemáticas:**
   - As fórmulas de média utilizam variáveis canônicas declaradas (`E1, E2, E3, E4, RC1, RF`) avaliadas por um parser matemático seguro em memória (sem uso de `eval()` do PHP), garantindo que divisões por zero ou valores nulos sejam tratados com regras formais (`6893d4084 Corrigida divisão por zero`).
3. **Tabela de Arredondamento Determinística:**
   - O arredondamento de notas e médias é processado por busca exata em faixas cadastradas no banco (`rounding_rules`), eliminando divergências de arredondamento de ponto flutuante do PHP ou do banco.
4. **Isolamento de Estado:**
   - As notas lançadas geram registros detalhados por etapa (`student_grades`) e o cálculo de fechamento gera um snapshot consolidado em `enrollment_discipline_summaries` contendo a situação final do aluno na disciplina (`CURSANDO`, `APROVADO`, `REPROVADO_POR_MEDIA`, `REPROVADO_POR_FALTA`, `DISPENSADO`).

---

## 3. Alternativas Consideradas

| Alternativa | Vantagens | Desvantagens / Motivo de Rejeição |
| :--- | :--- | :--- |
| **Cálculo de Média via Triggers / Procedures no Banco de Dados** | Execução direta no banco; consistência se acessado por múltiplos clientes legados. | Acoplamento ao SGBD; difícil de testar e versionar; incompatibilidade com práticas de CI/CD modernas; risco de lentidão e locks em transações concorrentes de fechamento em lote. |
| **Regras Hardcoded no Controller/Service (Padrão Único 0-10)** | Menor complexidade de código inicial. | Inviável para o mercado brasileiro de software público educacional: cada município rejeitaria o sistema por não atender ao seu regimento próprio. |
| **Engine Declarativo com Parser Seguro em PHP/Laravel (Escolhida)** | Flexibilidade total para 100% dos municípios clientes; testabilidade unitária de 100% das fórmulas; facilidade de auditoria e recálculo retroativo. | Exige validação estrita da sintaxe de fórmulas criadas pelos operadores municipais (mitigado por testes sintáticos na UI antes de salvar). |

---

## 4. Consequências

### Positivas:
- O município tem autonomia total para cadastrar e alterar suas fórmulas e critérios sem intervenção de engenharia de software.
- Testes automatizados podem simular milhares de cenários de notas e confirmar o resultado esperado com precisão milimétrica.
- Transparência total para pais e alunos no boletim escolar.

### Negativas / Riscos Mitigados:
- O recálculo de notas em massa no encerramento de período letivo pode ser intensivo em CPU. *Mitigação:* Processamento assíncrono em fila Redis (`ProcessTermClosingBatchJob`) com chunking por turma.
