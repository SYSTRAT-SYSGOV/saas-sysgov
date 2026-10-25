# User Stories — Gestão de Servidores e Docentes

> Épico: Vida Funcional, Lotação Semanal, Habilitação Curricular e Gestão de Afastamentos do Corpo Docente.
> Sistema: SYS-Educa (Modernização do i-Educar)  
> Padrão: Role-Feature-Reason com Critérios de Aceite Gherkin e Rastreabilidade de Regras.

---

## US-07: Alocação Semanal Docente e Cumprimento da Lei do Piso

**Como** Diretor de Recursos Humanos da Secretaria de Educação  
**Quero** alocar as horas semanais de aula de um professor em unidades escolares garantindo 1/3 de hora-atividade  
**Para que** a jornada contratual seja respeitada e o município cumpra a Lei Federal nº 11.738/2008.

### Critérios de Aceite
```gherkin
Cenário: Alocação com respeito aos limites da Lei do Piso
  Dado que o docente possui contrato de 40 horas semanais
  Quando o gestor cadastrar alocação com 26 horas em sala de aula e 14 horas de hora-atividade
  Então a alocação deve ser aceita com sucesso
  E o sistema deve registrar a conformidade do índice de hora-atividade (35% >= 33,3%).

Cenário: Tentativa de alocação violando o teto de sala de aula
  Dado que o docente possui jornada de 40 horas semanais
  Quando o gestor tentar cadastrar 30 horas em sala de aula (75%)
  Então o sistema deve emitir aviso de inconsistência legal
  E impedir o salvamento da alocação até que as horas sejam readequadas.
```

---

## US-08: Concessão de Afastamento e Indicação de Docente Substituto

**Como** Secretário Escolar  
**Quero** cadastrar o afastamento por licença médica de um professor titular e designar um substituto  
**Para que** as turmas não fiquem desatendidas e o professor substituto tenha acesso imediato ao diário.

### Critérios de Aceite
```gherkin
Cenário: Afastamento com substituição temporária
  Dado que o professor titular possui 4 turmas ativas na escola
  Quando o secretário registrar licença médica com intervalo de 30 dias
  E selecionar um professor substituto devidamente habilitado
  Então o sistema deve suspender a titularidade no período
  E conceder permissão temporária de lançamento de notas e faltas ao docente substituto.
```
