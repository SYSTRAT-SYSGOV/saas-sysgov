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
- Destinos do catálogo (lista declarativa, estendida só por código): escola (nome, CEP, endereço, localização, dependência), turma (nome, etapa, turno derivado de horário, modalidade), aluno (nome, nascimento, sexo, cor, CEP, localização, deficiências, filiação), marca de transporte, e `extra`.
- Campo personalizado com destino diferente de `extra` só é aceito se o tipo for compatível com o destino; do contrário, 422 com a explicação.

### D-I5. Leitura em fluxo e limites
- O arquivo é lido **linha a linha** (gerador), nunca carregado inteiro. Decodificação ISO-8859-1 → UTF-8 conforme o leiaute.
- Limite de tamanho no envio (padrão 50 MB, configurável) e de linhas por importação. Como a produção usa fila `sync`, a confirmação roda **na requisição**; arquivos grandes só são aceitos se a execução couber no limite de tempo. **Pergunta aberta 3**: subir um worker de fila para importações maiores.
- Primeira passada: coleta só o necessário (alunos com transporte e as turmas/escolas deles), em vez de montar a base inteira como o SETE faz.

### D-I6. Conciliação com o Escola
- **Escola**: pelo `inep`. Não encontrada → "escola não cadastrada", criada só se o usuário marcar.
- **Turma**: pelo `inep` da turma (coluna criada na Fase 4). Não encontrada → idem; ao criar, usa `TurmaService` com turno derivado do horário (regra do SETE: início ≥ 18h noturno; ≥ 12h vespertino; início ≥ 5h e fim ≥ 15h integral; senão matutino).
- **Aluno**: por `inep_id`; depois por CPF via Pessoas (`documento_hash`); sem casamento → "aluno novo", criado só se marcado, por `AlunoService` (que já resolve a Pessoa).
- Nunca sobrescreve dado cadastrado com valor vazio; divergência de nome ou nascimento vira **divergência** na pré-visualização, não alteração silenciosa.
- A pré-visualização roda as linhas pelos Services reais dentro de transação desfeita (mesmo princípio da Fase 5).

### D-I7. Teste do leiaute
Endpoint que lê as primeiras linhas (limite de 500) e devolve, por tipo de registro, quantas linhas viu e 3 amostras `{coluna, valor, chave, rotulo}`. Sinaliza inconsistência óbvia (data que não converte, CEP com letras, código fora do mapa). Valores de campos sensíveis (CPF, nome, filiação, telefone, e-mail) vêm **mascarados**. Não grava nada.

### D-I8. Segurança e LGPD
- Arquivo não é persistido; o relatório guarda contagens, números de linha e códigos Inep, **sem CPF, nome ou filiação**.
- Permissões separadas: importar (`transporte.censo.importar`) e editar leiaute (`transporte.censo.leiaute`). Auditoria de cada importação e de cada alteração de leiaute, com o nome dos campos mudados.
- Proteção contra arquivo hostil: limite de colunas por linha, de tamanho de campo e de linhas; tipo de registro desconhecido é ignorado e contado.

### D-I9. Leiaute Educacenso 2023 (base)
Mapeamento extraído do SETE (posições com base em zero; coluna 0 é o tipo de registro). **Deve ser conferido com um arquivo real antes de virar padrão** (tarefa 0.1); por isso o Teste do leiaute existe.
- **00 Escola**: 1 Inep, 2 situação, 5 nome, 6 CEP, 7 município (IBGE), 8 distrito, 9 endereço, 10 número, 11 complemento, 12 bairro, 13 DDD, 14 telefone, 18 localização, 19 localização diferenciada, 20 dependência.
- **20 Turma**: 1 Inep da escola, 2 código da turma, 6 hora de início, 8 hora de término, 17 tipo de atendimento (1 = escolarização), 27 modalidade, 28 etapa.
- **30 Pessoa**: 1 Inep da escola, 2 Inep da pessoa, 3 id próprio, 4 CPF, 5 nome, 6 nascimento, 7 informa responsável, 8 mãe, 9 pai, 10 sexo, 11 cor, 15 possui deficiência, 16 a 24 tipos de deficiência, 41 CEP, 43 localização, 80 e-mail.
- **40 Gestor**: 1 Inep da escola, 2 Inep do gestor, 3 id próprio.
- **60 Matrícula**: 1 Inep da escola, 2 Inep do aluno, 3 id próprio, 4 código da turma, 20 transporte escolar público (1 = sim).
- Etapas: 1, 2, 3 e 56 → pré-escola; 4 a 24, 65, 69, 70, 72 e 73 → fundamental; demais → médio (regra do SETE; editável como mapa `codigo`).
- Deficiências: o SETE agrupa os tipos em caminhar, enxergar, ouvir e mental; o agrupamento é um mapa do leiaute, não código.
- A **observação de necessidade especial** nunca é lida, gravada ou listada (regra LGPD das fases anteriores).

### D-I10. Relação com a exportação
A exportação da Fase 4 continua no leiaute básico (`basico-1`). O leiaute de importação **não** é o de exportação: o Inep publica documentos distintos. Reaproveitar o mesmo editor de campos na exportação fica como evolução (pergunta aberta 2).

## Riscos e perguntas abertas

1. **Fidelidade do mapeamento 2023**: as posições vêm da leitura do código do SETE, não do documento do Inep. Mitigação: tarefa 0.1 (arquivo real) e Teste do leiaute.
2. Reaproveitar o editor de campos para a **exportação** (Registro 60) quando o documento do Inep chegar?
3. Worker de fila em produção para arquivos grandes?
4. Escolas estaduais e privadas aparecem no arquivo municipal? Padrão proposto: ignorar escolas fora do cadastro, a menos que o usuário marque a criação.
