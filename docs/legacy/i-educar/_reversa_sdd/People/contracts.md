# People (i-Educar legado), Contratos

> Contratos externos observados no legado para a unit de cadastro de pessoas. Serve de entrada para o `openapi/` do modelo novo.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contrato de tela (legado intranet)

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| GET | `/intranet/educar_pessoas_index.php` | — | Página de índice de pessoas | 🟢 `ieducar/intranet/educar_pessoas_index.php` |
| GET | `/intranet/educar_unifica_pessoa.php` | `pessoas` em JSON | Tela de unificação com a pessoa duplicada selecionada | Exige o processo 9998878 com nível 7 🟢 `ieducar/intranet/educar_unifica_pessoa.php:31-58` |
| GET | `/unificacao-pessoa` | `name`, `cpf` | Log de unificações de pessoa, paginado em 20 | 🟢 `app/Http/Controllers/PersonLogUnificationController.php:13-34` |
| GET | `/unificacao-pessoa/{unification}` | — | Detalhe da unificação | 🟢 `PersonLogUnificationController.php:36-46` |
| GET | `/unificacao-aluno` | `ref_cod_escola`, `name` | Log de unificações de aluno, paginado em 20 | 🟢 `app/Http/Controllers/StudentLogUnificationController.php:14-37` |
| GET | `/unificacao-aluno/{unification}` | — | Detalhe da unificação de aluno | 🟢 `StudentLogUnificationController.php:39-51` |
| POST | `/unificacao-aluno/{unification}/undo` | — | Redirecionamento com sucesso ou erro | 🟢 `StudentLogUnificationController.php:53-65` |

---

## 2. Contrato de consulta da pessoa (legado AJAX)

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| GET | `/module/Api/Pessoa?pessoa` | `id` ou `cpf` | Objeto da pessoa com os detalhes | Exige `id` ou `cpf`; sem ambos, a resposta traz a mensagem de exigência 🟢 `ieducar/modules/Api/Views/PessoaController.php:19-31` |
| GET | `/module/Api/Pessoa?pessoa-search` | `tipo`, `valor` | Lista de até 15 pessoas | 🟢 `PessoaController.php:801-802` |
| GET | `/module/Api/Pessoa?pessoa-parent` | `id` | Dados do responsável | 🟢 `PessoaController.php:813-814` |
| GET | `/module/Api/Pessoa?reativarPessoa` | `id` | Pessoa reativada | 🟢 `PessoaController.php:815-816` |
| GET | `/module/Api/Pessoa?dadosUnificacaoPessoa` | `pessoas_ids` | Dados comparativos das pessoas candidatas | 🟢 `PessoaController.php:817-818` |
| GET | `/module/Api/Pessoa?info-servidor` | `servidor_id` | Código INEP e deficiências do servidor | 🟢 `PessoaController.php:807-808` |
| GET | `/module/Api/Pessoa?exist-servidor` | `servidor_id` | Existência, identificador, instituição e nome | 🟢 `PessoaController.php:809-810` |

### Atributos devolvidos na consulta da pessoa

| Campo | Formato | Observação |
|-------|---------|------------|
| `id` | inteiro | Identificador da pessoa 🟢 `PessoaController.php:63` |
| `nome` | texto | Nome de registro, convertido para UTF-8 🟢 `PessoaController.php:64` e `:72` |
| `cpf` | texto | CPF sem formatação 🟢 `PessoaController.php:98` |
| `data_nascimento` | data | Convertida para o formato brasileiro 🟢 `PessoaController.php:300` |
| `pai_id`, `mae_id`, `responsavel_id` | inteiro | Identificadores da filiação 🟢 `PessoaController.php:99` |
| `nome_pai`, `nome_mae`, `nome_responsavel` | texto | Resolvidos por coalescência com o cadastro do aluno 🟢 `PessoaController.php:102-106` |
| `nome_social` | texto | Nome social da pessoa física 🟢 `PessoaController.php:101` |
| `sexo` | `M` ou `F` | Sexo da pessoa física 🟢 `PessoaController.php:100` |
| `estadocivil` | inteiro | Estado civil 🟢 `PessoaController.php:100` |
| `nis_pis_pasep` | texto | NIS da pessoa 🟢 `PessoaController.php:100` |
| `tipo_nacionalidade` | inteiro | Nacionalidade 🟢 `PessoaController.php:129` |
| `pais_origem_id`, `pais_origem_nome` | inteiro, texto | País de origem estrangeiro 🟢 `PessoaController.php:128` e `:133-135` |
| `idmun_nascimento` | inteiro | Naturalidade 🟢 `PessoaController.php:127` |
| `pais_residencia` | inteiro | País de residência 🟢 `PessoaController.php:142` |
| `zona_localizacao_censo` | inteiro | Zona de localização do Censo Escolar 🟢 `PessoaController.php:130` |
| `localizacao_diferenciada` | inteiro | Localização diferenciada 🟢 `PessoaController.php:131` |
| `cor_raca` | inteiro | Raça ou cor 🟢 `PessoaController.php:136` |
| `povo_indigena_educacenso_id` | inteiro | Povo indígena do Censo Escolar 🟢 `PessoaController.php:101` |
| `rg`, `uf_emissao_rg`, `orgao_emissao_rg`, `data_emissao_rg` | texto, data | Documento de identidade 🟢 `PessoaController.php:107-110` |
| `tipo_cert_civil`, `num_termo`, `num_livro`, `num_folha` | inteiro, texto | Certidão civil no formato antigo 🟢 `PessoaController.php:111` e `:121-123` |
| `certidao_nascimento`, `certidao_casamento`, `passaporte` | texto | Documentos civis 🟢 `PessoaController.php:124-126` |
| `cartorio_cert_civil`, `cartorio_cert_civil_inep`, `nome_cartorio` | texto, inteiro | Cartório da certidão 🟢 `PessoaController.php:115-118` |
| `ddd_fone_fixo`, `fone_fixo`, `ddd_fone_mov`, `fone_mov` | texto | Contatos 🟢 `PessoaController.php:137-140` |
| `sus`, `observacao` | texto | Complementos da pessoa física 🟢 `PessoaController.php:143-144` |
| `possui_documento` | booleano | Verdadeiro quando há CPF, NIS ou certidão 🟢 `PessoaController.php:150-154` |
| `deficiencias` | objeto | Mapa de identificador para nome da deficiência 🟢 `PessoaController.php:324-340` |

---

## 3. Contrato de gravação da pessoa

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| POST | `/module/Api/Pessoa?pessoa` | `pessoa_id`, campos da pessoa | `{ "pessoa_id": 123 }` | 🟢 `ieducar/modules/Api/Views/PessoaController.php:805-806` e `:586` |
| POST | `/module/Api/Pessoa?pessoa-endereco` | `person_id`, `postal_code`, `address`, `number`, `complement`, `neighborhood`, `city_id` | Endereço gravado | 🟢 `PessoaController.php:811-812` |

| Campo da requisição | Destino no legado | Validação observada |
|----------------------|-------------------|----------------------|
| `pessoa_id` | `cadastro.pessoa.idpes` | Ausente cria nova pessoa 🟢 `PessoaController.php:582-583` |
| `nome` | `cadastro.pessoa.nome` | Validador de nome 🟢 `PessoaController.php:486-494` |
| `nome_social` | `cadastro.fisica.nome_social` | Validador de nome, apenas quando informado 🟢 `PessoaController.php:497-510` |
| `datanasc` | `cadastro.fisica.data_nasc` | Validador de data de nascimento 🟢 `PessoaController.php:512-527` |
| `cpf` | `cadastro.fisica.cpf` | Módulo 11, obrigatoriedade e unicidade 🟢 `PessoaController.php:542-572` |
| `sexo` | `cadastro.fisica.sexo` | Domínio `M` e `F` no banco 🟢 `database/migrations/legacy/2020_01_01_110000_create_cadastro_fisica_table.php:69` |
| `estadocivil` | `cadastro.fisica.ideciv` | Sem validação observada 🟢 `PessoaController.php:620` |
| `naturalidade` | `cadastro.fisica.idmun_nascimento` | Sem validação observada 🟢 `PessoaController.php:621` |
| `pais_residencia` | `cadastro.fisica.pais_residencia` | Sem validação observada 🟢 `PessoaController.php:622` |
| `tipo_nacionalidade` | `cadastro.fisica.nacionalidade` | Anula o país estrangeiro quando brasileira 🟢 `PessoaController.php:625-628` |
| `pais_origem_id` | `cadastro.fisica.idpais_estrangeiro` | Sem validação observada 🟢 `PessoaController.php:624` |
| `zona_localizacao_censo` | `cadastro.fisica.zona_localizacao_censo` | Validada em conjunto com a localização 🟢 `PessoaController.php:529-540` |
| `localizacao_diferenciada` | `cadastro.fisica.localizacao_diferenciada` | Validada em conjunto com a zona 🟢 `PessoaController.php:529-540` |
| `cor_raca` | `cadastro.fisica_raca` | Sincroniza o vínculo, ou desvincula quando ausente 🟢 `PessoaController.php:647-652` |
| `falecido` | `cadastro.fisica.falecido` | Convertido para booleano 🟢 `PessoaController.php:623` |
| `observacao_aluno` | `cadastro.fisica.observacao` | Sem validação observada 🟢 `PessoaController.php:632` |
| `ddd_telefone_1`, `telefone_1` | `cadastro.fone_pessoa` | Gravados como linha fixa 🟢 `PessoaController.php:654-666` |
| `ddd_telefone_mov`, `telefone_mov` | `cadastro.fone_pessoa` | Gravados como celular 🟢 `PessoaController.php:667-674` |
| `povo_indigena_educacenso_id` | `cadastro.fisica.povo_indigena_educacenso_id` | Anulado quando ausente 🟢 `PessoaController.php:634-638` |

### Mensagens de validação 🟢 `ieducar/modules/Api/Views/PessoaController.php`

| Mensagem | Gatilho |
|----------|---------|
| `É necessário receber uma variavel 'id' ou 'cpf'` | Consulta sem identificador nem CPF 🟢 `:25` |
| `CPF deve conter caracteres numéricos` | Consulta por CPF sem dígitos 🟢 `:82` |
| `É necessário o preenchimento do CPF.` | CPF obrigatório por configuração institucional 🟢 `:549` |
| `CPF inválido.` | CPF reprovado no módulo 11 🟢 `:558` |
| `CPF já utilizado pela pessoa {idpes}.` | CPF em uso por outra pessoa 🟢 `:566` |
| Mensagem do `NameValidator` | Nome ou nome social inválido 🟢 `:489` e `:503` |
| Mensagem do `BirthDateValidator` | Data de nascimento inválida 🟢 `:521` |
| Mensagem do `DifferentiatedLocationValidator` | Localização diferenciada incompatível 🟢 `:534` |

---

## 4. Contrato da busca de pessoas

| Tipo de busca | Termo | Resultado | Limite | Fonte |
|---------------|-------|-----------|--------|-------|
| Numérica | Prefixo do identificador | Pessoas ativas, com nome social exibido à frente | 15 | 🟢 `PessoaController.php:380-403` |
| Numérica | CPF com zeros à esquerda removidos | Pessoas ativas | 15 | 🟢 `PessoaController.php:396-398` |
| Numérica | RG com zeros à esquerda removidos | Pessoas ativas | 15 | 🟢 `PessoaController.php:406-429` |
| Textual | Fragmento do nome social ou do nome de registro | Pessoas ativas, ordenadas por identificador e nome | 15 | 🟢 `PessoaController.php:824-848` |

O rótulo exibido é o nome social concatenado ao nome de registro, ou apenas o nome de registro quando não há nome social. 🟢 `PessoaController.php:383-388`

---

## 5. Contrato da comparação de candidatos à unificação

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| GET | `/module/Api/Pessoa?dadosUnificacaoPessoa` | `pessoas_ids` | `{ "pessoas": [...] }` | 🟢 `ieducar/modules/Api/Views/PessoaController.php:817-818` |

| Campo | Formato | Observação |
|-------|---------|------------|
| `idpes` | inteiro | Identificador da pessoa 🟢 `PessoaController.php:776` |
| `vinculo` | texto | Lista separada por vírgula de aluno, responsável, servidor e usuário 🟢 `PessoaController.php:741-746` |
| `nome` | texto | Nome da pessoa 🟢 `PessoaController.php:747` |
| `data_nascimento` | data | No formato brasileiro, ou `Não consta` 🟢 `PessoaController.php:748` |
| `sexo` | texto | Masculino, Feminino ou `Não consta` 🟢 `PessoaController.php:749-753` |
| `cpf` | texto | CPF ou `Não consta` 🟢 `PessoaController.php:754` |
| `rg` | texto | RG ou `Não consta` 🟢 `PessoaController.php:755` |
| `pessoa_mae` | texto | Nome da mãe ou `Não consta` 🟢 `PessoaController.php:756` |

Quando a pessoa não tem nenhum vínculo, o campo `vinculo` recebe o texto `Sem vínculo`. 🟢 `PessoaController.php:788-792`

---

## 6. Contrato da unificação de pessoa

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| POST | `/intranet/educar_unifica_pessoa.php` | `pessoas` em JSON, com `idpes` e `pessoa_principal` por item | Mensagem de sucesso ou de erro | 🟢 `ieducar/intranet/educar_unifica_pessoa.php:64-137` |

### Formato da seleção 🟢 `ieducar/intranet/educar_unifica_pessoa.php:139-152`

```json
[
  { "idpes": 123, "pessoa_principal": true },
  { "idpes": 456, "pessoa_principal": false }
]
```

| Campo | Tipo | Regra |
|-------|------|-------|
| `idpes` | inteiro | Obrigatório em todos os itens 🟢 `:141-144` |
| `pessoa_principal` | booleano | Exatamente um item com o valor verdadeiro 🟢 `:98-108` |

### Mensagens da unificação 🟢 `ieducar/intranet/educar_unifica_pessoa.php`

| Mensagem | Gatilho |
|----------|---------|
| `Informações inválidas para unificação` | JSON inválido no corpo da requisição 🟢 `:82` e `:87` |
| `Informe no mínimo duas pessoas para unificação.` | Seleção com menos de duas pessoas 🟢 `:91` |
| `Dados enviados inválidos, recarregue a tela e tente novamente!` | Item sem `idpes` ou sem `pessoa_principal` 🟢 `:96` |
| `Pessoa principal não informada` | Nenhum item marcado como principal 🟢 `:99` |
| `Não pode haver mais de uma pessoa principal` | Mais de um item marcado como principal 🟢 `:106` |
| `Erro ao tentar unificar pessoas, foi inserido cadastro duplicados` | Identificador repetido na seleção 🟢 `:111` |
| `Não é permitido unificar mais de uma pessoa vinculada com alunos. Efetue primeiro a unificação de alunos e tente novamente.` | Mais de uma pessoa com aluno ativo 🟢 `ieducar/lib/App/Unificacao/Pessoa.php:226` |
| `Erro ao deletar registros duplicados. Por favor, entre em contato com suporte.` | Falha na remoção dos registros duplicados 🟢 `ieducar/lib/App/Unificacao/Base.php:84` |
| `Não foi possível realizar este processo de unificação. Por favor, entre em contato com o suporte.` | Falha na unificação 🟢 `Base.php:53` |
| `Pessoas unificadas com sucesso.` | Unificação concluída 🟢 `ieducar/intranet/educar_unifica_pessoa.php:134` |

---

## 7. Contrato de persistência do log de unificação

| Tabela | Colunas | Fonte |
|--------|---------|-------|
| `log_unifications` | `type`, `main_id`, `duplicates_id` em JSON, `duplicates_name` em JSON, `created_by`, `updated_by`, `active` | 🟢 `ieducar/intranet/educar_unifica_pessoa.php:170-182` e `app/Models/LogUnification.php` |
| `log_unification_old_data` | `unification_id`, `table`, `keys` em JSON, `old_data` em JSON | 🟢 `app/Models/LogUnificationOldData.php:13-35` |

| Tipo de unificação | Classe registrada |
|-------------------|--------------------|
| Pessoa | `iEducar\Modules\Unification\PersonLogUnification` 🟢 `PersonLogUnification.php:22-25` |
| Aluno | `iEducar\Modules\Unification\StudentLogUnification` 🟢 `app/Models/LogUnification.php:127-130` |

---

## 8. Contrato do catálogo de chaves de unificação

| Grupo | Efeito | Tabelas declaradas |
|-------|--------|--------------------|
| Manter o primeiro vínculo | Remove os registros das duplicadas e repontua o conjunto para a pessoa principal | 12 tabelas 🟢 `ieducar/lib/App/Unificacao/Pessoa.php:5-54` |
| Manter todos os vínculos | Repontua as referências para a pessoa principal, preservando todos os vínculos | 33 tabelas 🟢 `Pessoa.php:56-197` |
| Deletar duplicados | Remove os registros das duplicadas quando a tabela não aceita o vínculo replicado | 1 tabela 🟢 `Pessoa.php:199-204` |
| Gatilhos necessários | Mantidos habilitados durante a operação | 1 gatilho 🟢 `Pessoa.php:206-211` |

| Grupo | Efeito na unificação de servidor |
|-------|------------------------------------|
| Manter o primeiro vínculo | 2 tabelas 🟢 `ieducar/lib/App/Unificacao/Servidor.php` |
| Manter todos os vínculos | 8 tabelas 🟢 `Servidor.php` |
| Deletar duplicados | 2 tabelas 🟢 `Servidor.php` |

---

## 9. Contrato planejado para o modelo novo

Endpoints previstos em `_reversa_sdd/People/legacy-mapping.md`, seção 4, a derivar do contrato legado acima:

| Método | Caminho | Deriva de |
|--------|---------|-----------|
| GET | `/api/v1/people` | busca e listagem de pessoas 🟢 `ieducar/modules/Api/Views/PessoaController.php:375-459` |
| GET | `/api/v1/people/{id}` | consulta da pessoa por identificador 🟢 `PessoaController.php:461-482` |
| GET | `/api/v1/people/by-cpf/{cpf}` | consulta da pessoa por CPF 🟢 `PessoaController.php:77-92` |
| POST | `/api/v1/people` | gravação da pessoa 🟢 `PessoaController.php:579-588` |
| PUT | `/api/v1/people/{id}` | atualização da pessoa 🟢 `PessoaController.php:590-611` |
| POST | `/api/v1/people/{id}/activate` | reativação da pessoa 🟢 `PessoaController.php:726-733` |
| POST | `/api/v1/people/{id}/addresses` | gravação do endereço 🟢 `PessoaController.php:677-688` |
| GET | `/api/v1/people/unification-candidates` | comparação de candidatos à unificação 🟢 `PessoaController.php:735-797` |
| POST | `/api/v1/people/unifications` | unificação de pessoa 🟢 `ieducar/intranet/educar_unifica_pessoa.php:119-132` |
| POST | `/api/v1/people/unifications/{id}/undo` | desfeito da unificação de pessoa, ausente no legado 🔴 |
| GET | `/api/v1/people/unifications` | log de unificações 🟢 `app/Http/Controllers/PersonLogUnificationController.php:13-34` |
| GET | `/api/v1/people/{id}/guardians` | responsáveis da pessoa, derivado do vínculo de filiação 🟢 `ieducar/modules/Api/Views/PessoaController.php:99` |
