# User Stories — Regulação e Censo Escolar (Educacenso INEP)

> Épico: Exportação Estatística Federal, Validação em Lote dos Registros 00 a 99 do Censo Escolar.
> Sistema: SYS-Educa (Modernização do i-Educar)  
> Padrão: Role-Feature-Reason com Critérios de Aceite Gherkin e Rastreabilidade de Regras.

---

## US-09: Auditoria e Validação Prévia de Dados para o Educacenso

**Como** Coordenador do Censo Escolar Municipal  
**Quero** executar uma rotina de validação prévia de consistência em todas as escolas da rede  
**Para que** pendências de preenchimento (ex.: código INEP ausente, CPF faltante, deficiências sem laudo) sejam corrigidas antes do envio ao MEC.

### Critérios de Aceite
```gherkin
Cenário: Detecção de inconsistências em lote
  Dado que existem 15 alunos matriculados sem data de nascimento ou filiação completa
  Quando o coordenador disparar o relatório de inconsistências do Censo
  Então o sistema deve listar nominalmente os alunos com link direto para correção
  E classificar a inconsistência como impeditiva para geração do arquivo.

Cenário: Validação de 100% dos dados da unidade
  Dado que todos os alunos, turmas e professores da escola possuem dados completos
  Quando o sistema rodar a validação do Censo
  Então a escola deve receber o selo de "Apto para Exportação".
```

---

## US-10: Geração em Lote do Arquivo de Exportação do Educacenso

**Como** Coordenador do Censo Escolar Municipal  
**Quero** exportar o arquivo texto no layout posicional padronizado do INEP  
**Para que** os dados da rede municipal sejam importados sem erros no portal oficial do Educacenso.

### Critérios de Aceite
```gherkin
Cenário: Geração do arquivo com totalizadores e hash de integridade
  Dado que a rede municipal validou os dados de todas as suas unidades
  Quando o operador solicitar a exportação anual do Censo
  Então o sistema deve processar os registros 00 (cabeçalho), 10 (escola), 20 (turma), 30 (docente), 40 (vínculo docente), 50 (gestor), 60 (aluno) e 99 (totalizador)
  E gerar o arquivo para download com assinatura digital e registro em log de auditoria.
```
