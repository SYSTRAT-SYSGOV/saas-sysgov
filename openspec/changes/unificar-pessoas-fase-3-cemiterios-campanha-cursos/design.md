# Design

## Decisões

### D1. Eleitores ficam fora do cadastro central
A base de eleitores tem consentimento LGPD específico por link de captação e anonimização após a campanha
(`campanha:anonimizar-eleitores`). Um cadastro civil permanente no MDM conflitaria com os dois. O cadastro de
eleitor não toca em `pessoas`; `CaptacaoTest::test_cadastro_de_eleitor_nao_cria_pessoa_no_cadastro_central`
guarda essa fronteira.

### D2. Um adaptador de conciliação por tabela, sem classe por tabela
Estes módulos já têm `pessoa_id` nas tabelas, então o que falta é conciliar o que ficou de cópia. O
`ConciliacaoPorModelo` (módulo Pessoas) recebe o model e uma closure que diz como ler documento e dado civil; cada
módulo registra os seus no provider. Aliases: `cemiterios-operadores`, `cemiterios-concessionarios`,
`cemiterios-herdeiros`, `cemiterios-falecidos`, `campanha-coordenadores`, `campanha-cabos`, `cursos`.

### D3. A conciliação não altera o registro do módulo
Só liga `pessoa_id`, completa campos vazios da pessoa e registra divergência. Situação vital do falecido,
situação do operador, datas de óbito e certificados já emitidos ficam como estão.

### D4. Pessoa pendente sem nascimento nestes módulos
Participante, coordenador, cabo e operador são adultos: o adaptador passa `exigirNascimento = false`, e a pessoa
pendente é criada sem data de nascimento. Falecido sem nascimento também. Falecido menor sem responsável sai
no relatório como `sem_responsavel` para decisão humana.

### D5. Pessoa jurídica inexistente não é criada
Concessionário ou operador com CNPJ sem pessoa jurídica cadastrada sai como `pessoa_juridica_inexistente`: criar
exige razão social e não é papel da conciliação.

## Fora desta fase
- **Prefeitos e vereadores da Campanha**: não têm documento nem `pessoa_id`; descendem de uma tabela de referência
  (`ref_mandatario_id`). Vincular exige decidir se mandatário é pessoa do município ou dado de referência pública.
  Fica em aberto, com decisão do dono do módulo.
- **Candidatos**: já exigem `pessoa_id` e só guardam o domínio eleitoral; nada a conciliar.
- **Multiprofissional**: depende do arquivamento de `criar-modulo-multiprofissional`.
- **E-mail do participante** alterado no cadastro central: contatos ficam em tabela própria e não emitem
  `PessoaAtualizada`. Fica para a Fase 5, junto com a remoção das colunas.
