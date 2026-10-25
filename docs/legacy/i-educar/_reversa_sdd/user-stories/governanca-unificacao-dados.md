# User Stories — Governança e Unificação de Cadastros

> Épico: Deduplicação de Pessoas, Alunos e Servidores com Snapshot, Trilha Forense e Suporte a Reversão.
> Sistema: SYS-Educa (Modernização do i-Educar)  
> Padrão: Role-Feature-Reason com Critérios de Aceite Gherkin e Rastreabilidade de Regras.

---

## US-11: Fusão de Cadastros Duplicados com Comparação Lado a Lado

**Como** Auditor Cadastral da Secretaria de Educação  
**Quero** comparar dois cadastros suspeitos de duplicidade e unificá-los em uma única identidade  
**Para que** o histórico de notas, frequências e matrículas seja consolidado sem perda de dados.

### Critérios de Aceite
```gherkin
Cenário: Fusão com snapshot automático prévio
  Dado que o operador selecionou o Aluno A (mestre) e o Aluno B (duplicado)
  Quando confirmar a unificação mediante justificativa formal obrigatória
  Então o sistema deve capturar o snapshot JSON de todos os registros de B em log_unificacao_old_data
  E repontuar as matrículas e históricos de B para A deslocando os sequenciais
  E desativar o Aluno B com status "UNIFIED".
```

---

## US-12: Desfazimento de Unificação Indevida (Rollback Transacional)

**Como** Gestor de Conformidade  
**Quero** desfazer uma unificação cadastral realizada erroneamente  
**Para que** os históricos e matrículas retornem integralmente aos seus registros de origem.

### Critérios de Aceite
```gherkin
Cenário: Reversão com restauração completa
  Dado que a unificação está com status ativo
  E o usuário possui alçada hierárquica compatível
  Quando acionar a operação de reversão ("Desfazer")
  Então o sistema deve ler os snapshots JSON e restaurar as chaves de matrículas e notas originais
  E reativar o cadastro que havia sido inativado
  E marcar o registro de unificação como inativo com carimbo do usuário executor.
```
