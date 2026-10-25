# User Stories — Gestão de Matrículas e Enturmação

> Épico: Gestão da Vida Escolar do Aluno, Ingresso, Transferência e Enturmação.
> Sistema: SYS-Educa (Modernização do i-Educar)  
> Padrão: Role-Feature-Reason com Critérios de Aceite Gherkin e Rastreabilidade de Regras.

---

## US-01: Matrícula Inicial de Aluno na Rede Municipal

**Como** Secretário Escolar  
**Quero** registrar a matrícula inicial de um aluno vinculando-o a um curso, série e turno em uma escola  
**Para que** o educando ingresse formalmente na rede pública com documentação regularizada.

### Critérios de Aceite
```gherkin
Cenário: Matrícula com CPF e documentação completa
  Dado que o aluno civil possui cadastro no SYSGOV Core com CPF válido
  E a escola selecionada possui o curso e a série abertos para o ano letivo corrente
  Quando o secretário submeter o formulário de matrícula com status "MATRICULADO"
  Então o sistema deve gerar um número de matrícula único na rede
  E registrar a data de matrícula e criar o vínculo em pmieducar.matricula.

Cenário: Matrícula de aluno menor sem CPF (Exceção Social)
  Dado que o aluno menor de idade não possui CPF emitido
  Quando o secretário informar a justificativa legal segundo catálogo regulamentar
  Então o sistema deve permitir a efetivação da matrícula sem travar o fluxo
  E emitir aviso de pendência documental para o conselho tutelar / assistência.
```

---

## US-02: Enturmação com Controle de Vagas e Capacidade Física

**Como** Diretor Escolar  
**Quero** alocar alunos matriculados em turmas ativas respeitando o limite físico da sala  
**Para que** não ocorra superlotação e as normas do Conselho Municipal de Educação sejam cumpridas.

### Critérios de Aceite
```gherkin
Cenário: Enturmação dentro do teto de capacidade
  Dado que a turma "4º Ano B" possui capacidade máxima para 30 alunos
  E possui atualmente 28 alunos enturmados
  Quando o gestor enturmar 2 novos alunos
  Então a enturmação deve ser confirmada
  E a turma deve passar ao status de "LOTADA" (30/30 vagas).

Cenário: Bloqueio impeditivo de enturmação acima da capacidade
  Dado que a turma já atingiu sua capacidade máxima (30/30)
  Quando o gestor tentar enturmar mais 1 aluno
  Então o sistema deve recusar a operação
  E informar que a capacidade física da turma foi esgotada, sugerindo abertura de nova turma.
```

---

## US-03: Transferência Escolar e Emissão de Guia Oficial

**Como** Secretário Escolar  
**Quero** formalizar a transferência de um aluno de uma escola para outra da rede ou para fora do município  
**Para que** a vaga seja liberada na origem e o histórico de frequência e notas acompanhe o educando.

### Critérios de Aceite
```gherkin
Cenário: Emissão de guia de transferência interna
  Dado que o aluno possui notas lançadas até o 2º bimestre na Escola A
  Quando for solicitada a transferência interna para a Escola B
  Então o status da matrícula na Escola A deve transicionar para "TRANSFERIDO"
  E as notas parciais do boletim devem ser congeladas e anexadas à guia
  E a vaga na turma de origem deve ser liberada imediatamente.
```
