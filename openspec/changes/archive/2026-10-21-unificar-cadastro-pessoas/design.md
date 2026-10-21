# Design

## Context

Ver `proposal.md` (Why). Estado atual verificado no código e nas migrations:

- `pessoas.documento` (criptografado) e `pessoas.documento_hash` são `NOT NULL`; a unicidade é
  `(tenant_id, tipo, documento_hash)`. Sem documento, a pessoa não entra no MDM.
- `ResolucaoPessoaService::resolverPorCpf` é a porta de entrada dos módulos: resolve ou cria por CPF, só
  completa campos vazios e audita a origem. Não existe caminho equivalente para pessoa sem documento.
- Mapa de adoção por tabela de módulo (levantado nas migrations):
  - **Só FK**: Ata (participantes), Meio Ambiente (geradores, empreendimentos, responsáveis técnicos),
    Vistoria (autuado, testemunha, proprietário).
  - **FK + cópia civil**: Cemitérios (operadores, concessionários, herdeiros), Escola (`escola_alunos`:
    cpf, mãe, pai, nascimento; `escola_aluno_contatos`), Campanha (candidatos, coordenadores, cabos),
    Cursos (participantes), Multiprofissional (profissionais).
  - **Só cópia, sem FK**: Capd (`capd_servidores`), Campanha (prefeitos, vereadores, eleitores), Cursos
    (empresas), Inservível (entidades), Passeio (veículos), Procurement (participantes de licitação).
- O Escola já usa um padrão de ponte (`AlunoPessoaService`): liga o aluno à pessoa por CPF e mantém uma
  cópia; editar o aluno grava na pessoa. A cópia é o que esta change quer eliminar.
- Campanha e Inservível têm `Support/Documento` próprio que só delega ao validador do Pessoas.
- Produção tem um único tenant (`systrat`) e poucos registros reais; as massas de demonstração (Escola:
  400 alunos sem CPF) são o caso de teste mais realista de pessoa sem documento.

## Goals / Non-Goals

**Goals:**
- Uma única fonte de dados civis por pessoa: o MDM. Módulos guardam só `pessoa_id` e dados do próprio domínio.
- Aceitar no MDM quem não tem CPF, sem criar uma segunda estrutura de pessoa.
- Migrar módulo a módulo, em fases independentes, reversíveis até a última fase.
- Nunca perder nem sobrescrever dado: divergência vai para revisão humana.

**Non-Goals:**
- Esta change implementa só a Fase 0 (fundação comum). A adoção por módulo (Fases 1 a 5) tem change própria.
- Não unifica pessoa e usuário (conta de acesso); a separação atual (`pessoa_usuarios`) permanece.
- Não cria "pessoa não identificada" anônima nem tabela paralela de pessoas.
- Não altera pessoa jurídica: o escopo é pessoa física sem documento. CNPJ continua obrigatório para jurídica.

## Decisions

### D1. Pessoa sem CPF vive no MDM como `documento_pendente`
`documento` e `documento_hash` passam a aceitar `NULL` apenas para `tipo = fisica`, com a coluna
`documento_pendente` (boolean, derivada e indexada) explícita. A unicidade `(tenant_id, tipo,
documento_hash)` continua valendo para documentos informados: no MySQL, o índice único admite múltiplos
`NULL`, então várias pessoas pendentes convivem sem colisão.
- **Alternativa descartada**: tabela separada de "pessoa não identificada". Voltaria a fragmentar o cadastro,
  exigiria um segundo picker e uma promoção entre tabelas na regularização.
- **Alternativa descartada**: documento sintético (CPF fictício). Quebra a validação e contamina a unicidade.
- Regra de negócio, não só de banco: jurídica exige CNPJ; física sem documento exige nome e, para menor, responsável.

### D2. Responsável obrigatório para menor com documento pendente
Reaproveita `responsavel_id` (já existe, aponta para pessoa física do tenant). A obrigatoriedade é
condicional: menor de 18 anos + `documento_pendente`. Menor com CPF não exige responsável no cadastro
central (a regra do domínio, como a matrícula escolar, fica no módulo).

### D3. Regularização preserva o identificador
Informar o CPF depois apenas preenche `documento`/`documento_hash` e limpa o estado; `pessoa_id`, vínculos e
referências dos módulos não mudam. Se o CPF já pertencer a outra pessoa, a operação é recusada e
oferece **mesclagem** (as referências dos módulos são reapontadas para a pessoa mantida, com auditoria).

### D4. Contrato de consumo: uma porta de entrada para os módulos
`ResolucaoPessoaService` ganha o caminho sem documento (por exemplo, `resolverOuCriarPendente`) com a
mesma garantia de "só completa campos vazios, audita a origem" e com sugestão de pessoa existente por
nome + data de nascimento antes de criar. Módulos deixam de chamar `Pessoa::create` e de manter
validadores próprios; `Support/Documento` dos módulos passa a delegar integralmente ao MDM e é removido.
- Leitura: módulo expõe dados civis lendo a relação `pessoa`, não colunas próprias.
- Escrita: edição de dado civil no módulo chama o serviço do MDM (generaliza o padrão do `AlunoPessoaService`).

### D5. Conciliação em lote, idempotente e sem sobrescrever
Cada fase tem um comando/seeder de conciliação por módulo: resolve por documento (ou cria pendente),
vincula `pessoa_id`, completa campos vazios e grava divergências em uma tabela
`pessoas_divergencias` (módulo, registro, campo, valor do módulo, valor do MDM, estado, decisão). A
reexecução não cria pessoa nem altera registro já conciliado. A pessoa mestre sempre prevalece até
decisão humana.

### D6. Compatibilidade em duas etapas, remoção só na última fase
1. Fase do módulo: módulo passa a **ler** do MDM e a **escrever** no MDM; as colunas antigas continuam
   existindo como fallback somente leitura (como o piloto de Cemitérios).
2. Fase 5: remoção das colunas, bloqueada enquanto houver registro sem pessoa ou divergência aberta.
Isso mantém o rollback de cada fase trivial (voltar a ler a coluna) até a remoção.

### D7. Ordem das fases
`Fase 0` fundação (D1–D4, validação única) → `1` Escola (maior volume, caso sem CPF) → `2` Capd (cópia
completa vinda de integração de RH) → `3` Cemitérios, Campanha, Cursos, Multiprofissional (já têm FK) → `4`
Inservível, Passeio, Procurement (entidades/jurídicas) → `5` remoção das colunas e relatório de adoção final.
A ordem pode mudar por prioridade de negócio; só a Fase 0 é pré-requisito das demais.

### D8. LGPD e dados de menores
Pessoa pendente e menor são dado de acesso restrito: seletores e listagens mostram nome e indicador de
pendência, sem documento, nascimento ou filiação; leitura completa exige a permissão de desmascaramento
já existente e é auditada. O relatório de adoção mostra somente totais.

## Risks / Trade-offs

- **Duplicidade de pessoas sem CPF** (mesma criança cadastrada duas vezes) → sugestão por nome + data de
  nascimento antes de criar, fila de possíveis duplicados e mesclagem (D3).
- **Documento anulável afrouxa uma garantia** que o código hoje assume (`Pessoa::boot` calcula o hash do
  documento; exportação e importação supõem CPF) → ajustar o modelo, resources, importação e exportação na
  Fase 0 e cobrir com testes de feature de pessoa pendente e regularização.
- **Divergências em volume** podem travar a Fase 5 → priorizar a fila de revisão por módulo e permitir
  decisão em lote com o mesmo valor.
- **Dependência de integração externa (Capd/RH)** que hoje grava CPF no módulo → adaptar a sincronização
  para chamar o MDM e tratar servidor sem CPF válido como pendente, sem descartar o registro.
- **Escopo grande** → fases independentes, cada uma entregue e usada em produção antes da próxima.
- **Colunas legadas ficam por mais tempo** (D6) → relatório de adoção deixa visível o que falta remover.

## Migration Plan

1. Fase 0: migration que torna `documento`/`documento_hash` anuláveis só para física e adiciona
   `documento_pendente` (índice composto com `tenant_id`); backfill `false` nos registros existentes;
   ajustes de serviço, validação e UI. Rollback: reverter a migration é seguro enquanto não houver pessoa
   pendente; depois disso, exige regularizar ou excluir as pendentes.
2. Cada fase de módulo: conciliação em lote (dry-run primeiro, com relatório), depois ligar leitura e
   escrita via MDM. Rollback: voltar a ler a coluna legada, que permanece intacta.
3. Fase 5: confirmar relatório de adoção sem pendências, remover colunas por módulo, uma migration por módulo.
4. Todas as fases rodam primeiro com `--dry-run` e geram relatório antes de gravar em produção.

## Open Questions

- Quais campos civis mínimos tornam uma pessoa pendente "suficiente" para sugerir duplicidade (nome +
  nascimento, ou também filiação)? Pode ser calibrado na Fase 0 sem mudar spec nem tarefas.
- Política de retenção de pessoa pendente sem nenhum vínculo ativo (limpeza automática ou manual)? Pode
  ser decidida depois da Fase 1, com dados reais de uso.
