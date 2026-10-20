# Design

## O que a análise de 20/10 mudou
O plano original dizia "remover as colunas civis duplicadas de todos os módulos". A leitura do código e dos dados
mostrou que a palavra "duplicada" esconde três situações diferentes, e só uma delas pede remoção:

1. **Cópia pura**: o dado só existe para exibir o que a pessoa já tem. Pode sair, depois de trocar as leituras.
2. **Chave de busca e ordenação**: o `nome` do aluno ou do servidor alimenta `where like` e `orderBy` em dezenas de
   telas paginadas. Trocar por `join` com `pessoas` em cada uma é custo e risco altos para ganho baixo.
3. **Registro histórico, jurídico ou do domínio**: certificado com o nome da época, licitação homologada, óbito com
   certidão, contato do responsável que a escola usa. Remover enfraquece prova ou apaga dado que não está no MDM.

## Regras
- **R1.** O `nome` fica como **coluna derivada** de exibição e busca. A fonte é a pessoa: o evento `PessoaAtualizada`
  a mantém, e nenhuma escrita direta no módulo muda o nome sem passar pelo serviço do MDM.
- **R2.** Dado de documento (CPF/CNPJ), nascimento e filiação **saem** do módulo quando a pessoa é obrigatória no
  módulo. Quem lê passa a ler a relação `pessoa`.
- **R3.** Registro histórico ou jurídico **fica** como foto do momento. O vínculo com a pessoa é acrescentado, nunca
  substitui.
- **R4.** Nada destrutivo roda sem: trava (`TravaRemocaoColunasService`) liberada, backup verificado e confirmação
  do responsável pelo módulo. Cada coluna passa por **duas etapas separadas por um ciclo de uso em produção**:
  (A) trocar a leitura e manter a coluna; (B) remover.

## Classificação coluna por coluna
Legenda: **L** = trocar a leitura pela pessoa e, depois, remover · **D** = manter como derivada (R1) ·
**M** = manter (R3 ou dado do domínio) · **A** = adiar, depende de outra mudança.

| Tabela (linhas em prod. em 20/10) | Coluna | Decisão | Motivo |
|---|---|---|---|
| `escola_alunos` (400) | `nome` | D | busca e ordenação em todas as telas |
| | `cpf`, `cpf_hash` | L | unicidade por escola passa a ser por `pessoa_id` |
| | `nascimento`, `mae`, `pai` | L | boletins, atas e fichas leem da pessoa |
| `escola_aluno_contatos` (500) | todas | M | são os telefones do **responsável** para a escola, não do aluno; o MDM guarda os da pessoa |
| `capd_servidores` (0) | `nome_completo` | D | busca e ordenação |
| | `cpf`, `nome_social`, `data_nascimento` | L | |
| | `email`, `telefone` | A | o vínculo com o usuário e o login usam o e-mail; falta propagar dos contatos da pessoa |
| | `pis_pasep` | M | o MDM ainda não guarda PIS/PASEP |
| `cemetery_operators` (8) | `cpf_cnpj`, `documento_hash` | L | o mascarado já vem da pessoa |
| | `nome`, `telefone`, `email` | D / M | exibição; contato operacional |
| `concession_holders` (49) | `documento`, `documento_hash` | A | o portal autentica o titular pelo documento; precisa de outra chave primeiro |
| `sucessao_herdeiros` (10) | `documento` | L | |
| `deceased_records` (50) | todas | M | registro legal do óbito (certidão, nascimento declarado) |
| `campanha_coordenadores`, `campanha_cabos` (0) | `telefone`, `whatsapp`, `email` | M | contato operacional da campanha |
| `cursos_participantes`, `cursos_empresas` (0) | todas | M | participante pode não ter pessoa por desenho; certificado guarda o nome da época |
| `inservivel_entidades` (0) | cadastro submetido (`razao_social`, `cnpj`, endereço, banco...) | M | é o que a entidade declarou e a análise avaliou |
| `passeio_veiculos` (0) | `motorista`, `telefone` | M | texto livre do passeio |
| `licitacao_participantes` (0) | `razao_social`, `cnpj` | M | registro jurídico da licitação |

Resultado: **5 colunas de Escola, 3 de Capd, 2 de Operadores e 1 de Herdeiros** são candidatas a remoção. O resto
não sai, ou sai depois de outra mudança (A).

## `pessoa_id NOT NULL`
Só onde a pessoa é obrigatória por regra de negócio e a trava confirma 100% de vínculo: `escola_alunos`,
`capd_servidores`, `cemetery_operators`, `sucessao_herdeiros`. Em Cursos, Inservível, Passeio e Procurement o vínculo
continua opcional (CNPJ inválido ou participante sem documento).

## Riscos
- Integrações externas que leiam as colunas L pela API ou direto do banco: inventariar antes da etapa B.
- A busca por CPF do Escola (`AlunoController`) e do portal de Cemitérios usa o hash da coluna; migra para a pessoa.
- Rollback: etapa A reverte voltando o código; etapa B só por restauração de backup.
