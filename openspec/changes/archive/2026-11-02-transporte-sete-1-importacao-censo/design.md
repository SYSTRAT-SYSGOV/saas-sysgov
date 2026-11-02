# Design — Transporte/SETE 1: importação do Censo com leiaute configurável

As decisões comuns do módulo estão em `openspec/specs/transporte/spec.md` e nas fases arquivadas (D1 a D35).

## Decisões

### D-I1. O leiaute é dado, não código
O arquivo do Educacenso é lido por **posição de coluna**. As posições vivem num **leiaute** guardado por órgão, e não em constantes do código. O código só conhece o **catálogo de destinos** (para onde cada valor pode ir) e o leiaute base **Educacenso 2023**, que é a fábrica.

### D-I2. Modelo no padrão do Licita (`CampoConfiguracaoService`)
- Campos **nativos** (do leiaute base) têm `chave` e `destino` fixos, vindos do código. O órgão controla posição, rótulo, obrigatoriedade e **se está ativo**. "Excluir" um nativo é **desativá-lo** (reversível; "restaurar padrão" reativa). Isso evita que o payload do cliente mude o destino de um campo nativo.
- Campos **personalizados** são criados pelo órgão: `chave` própria (slug único), `registro`, `posicao`, `rotulo`, `tipo`, `destino`, `obrigatorio`, `ativo`. Excluir um personalizado o **remove**.
- A lista "mesclada" (nativos com os ajustes do órgão + personalizados) é o que a tela mostra e o importador usa.
- Campos **travados** (não podem ser desativados nem ter destino trocado): `registro` (posição 0), código Inep da escola, identificador do aluno (Inep ou id próprio), código da turma e a marca de transporte do Registro 60. Sem eles não há como conciliar; a tela explica o porquê.

### D-I3. Tabelas
- `transporte_censo_leiautes`: `tenant_id`, `nome`, `base` (`educacenso-2023`), `ano_censo`, `delimitador` (padrão `|`), `codificacao` (padrão `ISO-8859-1`), `campos` (JSON: ajustes dos nativos + personalizados), `padrao` (um por tenant), timestamps; único por `tenant_id` + `nome`. Sem registro, vale o leiaute de fábrica em memória.
- `transporte_censo_extras`: `tenant_id`, `entidade` (`aluno|turma|escola`), `entidade_id`, `chave`, `valor`, `importacao_id`; único por entidade + chave (o valor mais recente vence). Valores de campos marcados como sensíveis nunca aparecem em listagem, relatório ou auditoria.
- `transporte_importacoes` ganha `leiaute_id` (nulo) e o `relatorio` guarda o **resumo** do leiaute usado (nome, base, ano, hash dos campos ativos) para a auditoria saber como o arquivo foi lido.

### D-I4. Tipos e destinos
- Tipos: `texto`, `numero`, `data` (formato configurável, padrão `dd/mm/aaaa`), `booleano` (valor verdadeiro configurável, padrão `1`), `codigo` (mapa valor→rótulo, usado em sexo, cor, localização e dependência).
- Destinos do catálogo (lista declarativa, estendida só por código): **de conciliação** (Inep da escola, da turma e do aluno, id próprio, CPF, nome, nascimento, marca de transporte) e **`extra`** por entidade (escola, turma ou aluno), que guarda o valor sem alterar o cadastro. Os dados de CEP, endereço, localização, sexo e cor entram como extras.
- Campo personalizado com destino diferente de `extra` só é aceito se o tipo for compatível com o destino; do contrário, 422 com a explicação.

### D-I5. Leitura em fluxo e limites
- O arquivo é lido **linha a linha** (gerador), nunca carregado inteiro. Decodificação ISO-8859-1 → UTF-8 conforme o leiaute.
- Limite de tamanho no envio (padrão 50 MB, configurável) e de linhas por importação. Como a produção usa fila `sync`, a confirmação roda **na requisição**; arquivos grandes só são aceitos se a execução couber no limite de tempo. **Pergunta aberta 3**: subir um worker de fila para importações maiores.
- Duas passadas: a primeira lê os Registros 60 e guarda só os alunos com transporte; a segunda lê os Registros 00, 20 e 30 apenas das chaves guardadas. Não depende da ordem das linhas e não monta a base inteira como o SETE faz.

### D-I6. Conciliação com o Escola (sem criar cadastro)
**Decisão do usuário:** escola e aluno precisam estar cadastrados no sistema para aparecerem no Transporte. A importação **nunca cria** escola, turma ou aluno.
- **Escola**: pelo `inep`. Não encontrada → pendência `escola_nao_cadastrada` (uma por escola, com a contagem de alunos com transporte), e os alunos dela não são processados.
- **Turma**: pelo `inep` da turma (coluna criada na Fase 4), dentro da escola. Não encontrada → aviso `turma_nao_cadastrada`; o aluno é processado normalmente e a turma dele não é tocada.
- **Aluno**, nesta ordem, parando no primeiro casamento:
  1. `inep_id` igual ao do arquivo;
  2. CPF igual (Pessoas, `documento_hash`);
  3. nome e data de nascimento iguais (sem acento e sem diferença de caixa) **dentro da escola do arquivo, somente se houver um único candidato**; vários candidatos → pendência `aluno_ambiguo`. Esta etapa pode ser desligada na confirmação (`casar_por_nome`).
  Sem casamento → pendência `aluno_nao_cadastrado`.
  Se o aluno foi achado pelo Inep, tem CPF cadastrado e o arquivo traz outro CPF, é divergência `cpf_divergente` (provável código trocado) e nada é alterado.
- **O que a importação grava no aluno casado**: o `inep_id`, quando está vazio, e os campos extras. Se o `inep_id` já existe e é diferente → divergência `inep_divergente`, sem alterar. Se o aluno está em outra escola que não a do arquivo → divergência `escola_divergente`, sem alterar. A turma, o nome e os demais dados **nunca** são alterados.
- Nunca sobrescreve dado cadastrado com valor vazio. Código Inep já usado por outro aluno → erro da linha.
- Para o Transporte, o resultado útil é a lista de alunos que **declaram transporte no Censo e ainda não têm alocação ativa** (`sem_alocacao`), com contagem e identificadores.
- A pré-visualização roda as linhas pelos Services reais dentro de transação desfeita (mesmo princípio da Fase 5).

### D-I7. Teste do leiaute
Endpoint que lê as primeiras linhas (limite de 500) e devolve, por tipo de registro, quantas linhas viu e 3 amostras `{coluna, valor, chave, rotulo}`. Sinaliza inconsistência óbvia (data que não converte, CEP com letras, código fora do mapa). Valores de campos sensíveis (CPF, nome, filiação, telefone, e-mail) vêm **mascarados**. Não grava nada.

### D-I8. Segurança e LGPD
- O arquivo fica guardado **só entre a pré-visualização e a confirmação** (como na Fase 5) e é apagado ao confirmar, cancelar ou falhar; o relatório guarda contagens, números de linha e códigos Inep, **sem CPF, nome ou filiação**.
- Permissões separadas: importar (`transporte.censo.importar`) e editar leiaute (`transporte.censo.leiaute`). Auditoria de cada importação e de cada alteração de leiaute, com o nome dos campos mudados.
- Proteção contra arquivo hostil: limite de colunas por linha, de tamanho de campo e de linhas; tipo de registro desconhecido é ignorado e contado.

### D-I9. Leiaute Educacenso 2023 (base)
Mapeamento extraído do SETE (posições com base em zero; coluna 0 é o tipo de registro). **Deve ser conferido com um arquivo real antes de virar padrão** (tarefa 0.1); por isso o Teste do leiaute existe.
- **00 Escola**: 1 Inep, 2 situação, 5 nome, 6 CEP, 7 município (IBGE), 8 distrito, 9 endereço, 10 número, 11 complemento, 12 bairro, 13 DDD, 14 telefone, 18 localização, 19 localização diferenciada, 20 dependência.
- **20 Turma**: 1 Inep da escola, 2 código da turma (usado só para casar a turma já cadastrada).
- **30 Pessoa**: 1 Inep da escola, 2 Inep da pessoa, 3 id próprio, 4 CPF, 5 nome, 6 nascimento, 8 filiação 1, 9 filiação 2, 10 sexo, 11 cor, 41 CEP, 43 localização, 80 e-mail. As colunas de **deficiência (15 a 24) não vêm ativas**: dado de saúde de criança, minimização. O órgão pode criá-las como campos personalizados sensíveis.
- **40 Gestor**: **não é lido** nesta versão (não há destino no SysGov).
- **60 Matrícula**: 1 Inep da escola, 2 Inep do aluno, 3 id próprio, 4 código da turma, 20 transporte escolar público (1 = sim).
- A **observação de necessidade especial** nunca é lida, gravada ou listada (regra LGPD das fases anteriores).

### D-I10. Relação com a exportação
A exportação da Fase 4 continua no leiaute básico (`basico-1`). O leiaute de importação **não** é o de exportação: o Inep publica documentos distintos. Reaproveitar o mesmo editor de campos na exportação fica como evolução (pergunta aberta 2).

## Riscos e perguntas abertas

1. **Fidelidade do mapeamento 2023**: as posições vêm da leitura do código do SETE, não do documento do Inep. Mitigação: tarefa 0.1 (arquivo real) e Teste do leiaute.
2. Reaproveitar o editor de campos para a **exportação** (Registro 60) quando o documento do Inep chegar?
3. Worker de fila em produção para arquivos grandes?
4. O arquivo pode trazer escolas estaduais e privadas: elas aparecem como `escola_nao_cadastrada` e são ignoradas (decisão do usuário: só entra quem está cadastrado).
