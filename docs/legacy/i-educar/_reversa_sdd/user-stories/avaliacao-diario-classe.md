# User Stories — Avaliação e Diário de Classe

> Épico: Diário de Classe Eletrônico, Registro de Presença, Lançamento de Notas e Fechamento de Etapas.
> Sistema: SYS-Educa (Modernização do i-Educar)  
> Padrão: Role-Feature-Reason com Critérios de Aceite Gherkin e Rastreabilidade de Regras.

---

## US-04: Lançamento Diário de Frequência por Componente Curricular

**Como** Professor Titular  
**Quero** registrar a presença e faltas dos alunos da minha turma na aula do dia  
**Para que** a apuração de assiduidade escolar esteja atualizada e alunos infrequentes sejam identificados rapidamente.

### Critérios de Aceite
```gherkin
Cenário: Lançamento padrão de frequência diária
  Dado que o professor está logado e acessa a turma 5º Ano A na disciplina Matemática
  E a data selecionada corresponde a um dia letivo previsto no calendário
  Quando o professor assinalar 2 faltas e marcar os demais como presentes e salvar
  Então os registros devem ser persistidos em modules.falta_aluno
  E a trilha de auditoria deve registrar o professor, data e horário do lançamento.

Cenário: Notificação de busca ativa por excesso de faltas consecutivas
  Dado que um aluno atinge 5 faltas consecutivas injustificadas
  Quando o professor salvar o diário da aula
  Então o sistema deve emitir automaticamente um evento de alerta de busca ativa
  E notificar a coordenação pedagógica da escola via sino in-app e e-mail.
```

---

## US-05: Lançamento e Validação de Notas com Tabela de Arredondamento

**Como** Professor  
**Quero** lançar as notas dos alunos nas etapas bimestrais/trimestrais com aplicação de regras de arredondamento  
**Para que** as médias sejam calculadas de forma uniforme conforme a resolução do município.

### Critérios de Aceite
```gherkin
Cenário: Cálculo de nota com arredondamento padrão
  Dado que a série adota regra de avaliação numérica de 0 a 10 com tabela de arredondamento de 0.25
  Quando o professor lançar as notas das avaliações resultando na média 6.37
  Então o motor de arredondamento deve converter a nota automaticamente para 6.50
  E persistir o valor exato arredondado no boletim escolar do aluno.
```

---

## US-06: Fechamento de Ano Letivo e Promoção de Alunos

**Como** Coordenador Pedagógico  
**Quero** executar o processo de fechamento do ano letivo com aplicação da fórmula de recuperação e progressão  
**Para que** a situação final de cada estudante (Aprovado, Reprovado, Em Recuperação) seja calculada sem erros.

### Critérios de Aceite
```gherkin
Cenário: Aprovação direta por média e frequência
  Dado que a regra de progressão exige média mínima 6.0 e frequência mínima de 75%
  Quando o aluno obtém média final 7.5 e frequência global de 88%
  Então o fechamento deve registrar a situação final da matrícula como "APROVADO"
  E gerar o registro correspondente no histórico escolar do aluno.
```
