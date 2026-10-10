# inservivel Specification

## Purpose
Gestão de bens inservíveis da prefeitura no SYSGOV, do cadastro do bem à doação a entidades sem fins lucrativos.
Cobre lotes, sorteio equitativo e auditável, portal da entidade, termos, transferência interna entre secretarias,
parâmetros, configurações e importação da planilha patrimonial.

## Requirements

### Requirement: Permissões e perfis do módulo Inservível
O módulo SHALL declarar as permissões:

| Permissão | Libera |
|---|---|
| `inservivel.acesso` | Item de menu |
| `inservivel.view` | Consulta interna |
| `inservivel.bens.manage` | Bens e fotos |
| `inservivel.lotes.manage` | Lotes que o próprio usuário criou |
| `inservivel.lotes.gestao` | Todos os lotes, status, sorteio e exclusão |
| `inservivel.entidades.manage` | Entidades e documentos |
| `inservivel.transferencias.manage` | Anunciar, solicitar e cancelar |
| `inservivel.transferencias.aprovar` | Tela Solicitações e aprovar ou recusar |
| `inservivel.configuracao.manage` | Parâmetros, configurações e importação |
| `inservivel.portal` | Portal da entidade |

O módulo SHALL provisionar três perfis:
- **Gestor do Patrimônio**: todas as permissões, exceto `inservivel.portal`.
- **Servidor de Secretaria**: `acesso`, `view`, `bens.manage`, `lotes.manage` e `transferencias.manage`.
- **Entidade (Inservível)**: `acesso` e `portal`.

Toda autorização SHALL ser feita no servidor, autorizando o objeto e não só a rota.

#### Scenario: Servidor não aprova transferência
- **WHEN** um usuário com o perfil Servidor de Secretaria chama a aprovação de uma transferência
- **THEN** o sistema responde 403

#### Scenario: Entidade não acessa rotas internas
- **WHEN** um usuário com o perfil Entidade (Inservível) chama a listagem interna de bens ou de entidades
- **THEN** o sistema responde 403

#### Scenario: Módulo não habilitado
- **WHEN** um usuário de um tenant sem o módulo Inservível habilitado chama qualquer rota do módulo
- **THEN** o sistema responde 403

#### Scenario: Isolamento entre prefeituras
- **WHEN** um usuário do tenant A consulta bens, lotes, entidades ou transferências
- **THEN** só recebe registros do tenant A, e um id do tenant B responde 404

### Requirement: Parâmetros e situações por papel
O tenant SHALL manter três listas de parâmetros: categorias, situações e estados de conservação. Cada item tem nome
único no tenant e flag ativo.

As situações SHALL ter um campo `papel`. As sete situações de sistema SHALL ser criadas na primeira utilização do
módulo pelo tenant, com os nomes padrão:

| Papel | Nome padrão |
|---|---|
| `inservivel` | Inservível |
| `em_avaliacao` | Em Avaliação |
| `em_lote` | Em Lote |
| `doado` | Doado |
| `baixado` | Baixado |
| `disponivel` | Disponível |
| `em_transferencia` | Em Transferência |

Uma situação de sistema SHALL poder ser renomeada, mas não excluída nem desativada. Situações livres (sem papel)
SHALL poder ser criadas, editadas e excluídas quando nenhum bem as usa.

Todas as regras do módulo SHALL usar o papel da situação, nunca o nome. O sistema SHALL oferecer "substituir em
massa": trocar a situação ou o estado de conservação A pelo B em todos os bens do tenant, informando quantos bens
mudaram e auditando a operação.

#### Scenario: Renomear situação de sistema
- **WHEN** o Gestor renomeia a situação de papel `inservivel` para "Inservível p/ doação"
- **THEN** os bens com essa situação continuam aptos a entrar em lote

#### Scenario: Excluir situação em uso
- **WHEN** o Gestor tenta excluir uma situação livre usada por algum bem
- **THEN** o sistema responde 422 informando que a situação está em uso

#### Scenario: Excluir situação de sistema
- **WHEN** o Gestor tenta excluir uma situação com papel
- **THEN** o sistema responde 422

#### Scenario: Substituir em massa
- **WHEN** o Gestor substitui o estado de conservação "Sucata" por "Inservível - Sucata"
- **THEN** todos os bens do tenant com "Sucata" passam ao novo estado e a resposta informa a quantidade

### Requirement: Cadastro de bens
O Gestor e o Servidor SHALL poder cadastrar e editar bens com os campos:
- nº patrimonial (obrigatório e único no tenant) e plaqueta antiga;
- descrição (obrigatória), categoria, marca, modelo e nº de série;
- situação e estado de conservação, ambos ativos nos parâmetros;
- valor contábil e valor avaliado, em centavos inteiros;
- datas de aquisição e de incorporação;
- secretaria e setor, como unidades ativas do Organograma do tenant, com o setor descendente da secretaria;
- observações.

A edição comum SHALL rejeitar a troca para os papéis `em_lote` ou `em_transferencia`. Essas situações só são
alcançadas pelos fluxos de lote e de transferência.

Um bem SHALL poder ter várias fotos (JPEG, PNG ou WebP, até 5 MB cada), uma delas a principal. O bem SHALL NOT ser
excluído. A listagem SHALL ser paginada e filtrar por:
- texto (nº patrimonial, plaqueta, descrição, marca e modelo);
- situação;
- estado de conservação;
- secretaria;
- setor.

A visualização SHALL trazer todos os dados, as fotos e os lotes por onde o bem passou.

#### Scenario: Patrimônio repetido
- **WHEN** alguém cadastra um bem com um nº patrimonial que já existe no tenant
- **THEN** o sistema responde 422

#### Scenario: Setor fora da secretaria
- **WHEN** alguém informa um setor que não está abaixo da secretaria escolhida
- **THEN** o sistema responde 422

#### Scenario: Excluir bem
- **WHEN** alguém tenta excluir um bem
- **THEN** a rota não existe e o bem continua cadastrado

#### Scenario: Foto principal
- **WHEN** o usuário envia duas fotos e marca a segunda como principal
- **THEN** a listagem e os cards passam a exibir a segunda foto

### Requirement: Lotes
O Gestor e o Servidor SHALL poder criar lotes com número, descrição, data de criação, responsável, data prevista do
sorteio e observações. Se o número vier sem `/`, o sistema SHALL completar com `/<ano corrente>`, e o número SHALL
ser único no tenant.

Regras de acesso:
- O Servidor só SHALL ver e alterar os lotes que ele mesmo criou.
- Quem tem `inservivel.lotes.gestao` vê e altera todos.

Regras dos bens no lote:
- Só bens com papel `inservivel` SHALL entrar num lote, e ao entrar passam a `em_lote`.
- Só lote **Aberto** SHALL ser editado, receber bens (por seleção ou pelo nº patrimonial) ou ter bens retirados.
- Bem retirado SHALL voltar a `inservivel`.

Ciclo de status, alterado por quem tem `inservivel.lotes.gestao`:
- Aberto → Publicado → Sorteado → Entregue → Baixado.
- A volta de Publicado para Aberto SHALL ser permitida enquanto não houver sorteio.
- Sorteado SHALL ser alcançado só pelo sorteio.
- Ao passar a Entregue, os bens do lote SHALL ir para `doado`.
- Ao passar a Baixado, os bens do lote SHALL ir para `baixado`.

Exclusão:
- SHALL exigir a senha do usuário logado.
- SHALL ser bloqueada em lotes com sorteio realizado ou Baixados.
- Ao excluir, os bens SHALL voltar a `inservivel` e as inscrições SHALL ser removidas.

A listagem SHALL mostrar cards com:
- número;
- data de criação;
- valor do lote (soma do valor avaliado de cada bem, ou do contábil quando o avaliado for zero);
- total de bens;
- status;
- data de criação do registro.

O lote SHALL aceitar anexos (PDF, JPEG ou PNG, até 10 MB).

#### Scenario: Bem fora da situação
- **WHEN** alguém adiciona a um lote um bem com situação de papel `disponivel`
- **THEN** o sistema responde 422 citando o nº patrimonial

#### Scenario: Número completado
- **WHEN** alguém cria o lote "007" em 2026
- **THEN** o lote é gravado como "007/2026"

#### Scenario: Lote de outro servidor
- **WHEN** um Servidor tenta abrir ou alterar um lote criado por outro usuário
- **THEN** o sistema responde 403

#### Scenario: Editar lote publicado
- **WHEN** alguém tenta adicionar um bem a um lote Publicado
- **THEN** o sistema responde 422

#### Scenario: Excluir com senha errada
- **WHEN** o Gestor exclui um lote informando a senha errada
- **THEN** o sistema responde 422 e nada muda

#### Scenario: Excluir lote sorteado
- **WHEN** o Gestor tenta excluir um lote com sorteio realizado
- **THEN** o sistema responde 422

#### Scenario: Entregar lote
- **WHEN** o Gestor muda um lote Sorteado para Entregue
- **THEN** todos os bens do lote passam à situação de papel `doado`

#### Scenario: Baixar lote
- **WHEN** o Gestor muda um lote Entregue para Baixado
- **THEN** todos os bens do lote passam à situação de papel `baixado`

### Requirement: Entidades sem fins lucrativos
O sistema SHALL manter entidades com os campos:
- identificação: razão social, nome fantasia, CNPJ válido e único no tenant, inscrições estadual e municipal;
- endereço: endereço, CEP, cidade e UF;
- contato: telefone, celular e e-mail;
- representante legal: nome, CPF válido, RG e cargo;
- atuação: tempo de funcionamento, área de atuação, finalidade, nº de beneficiários e certificações;
- dados bancários: banco, agência, conta e chave PIX;
- controle: status, motivo da reprovação e lotes ganhos.

O status SHALL ser um de Pendente, Em Análise, Habilitada, Reprovada e Desabilitada.

Mudança de status pelo Gestor:
- Ao mudar para Reprovada ou Desabilitada, o Gestor SHALL informar os documentos faltantes ou uma observação, e
  isso vira o motivo.
- O sistema SHALL publicar o evento `inservivel.EntidadeReprovada` no Outbox.
- Ao mudar para Habilitada, o motivo SHALL ser limpo.

Documentos:
- Cada documento enviado (tipo, arquivo, data de envio e validade) SHALL ter a situação Pendente, Aprovado ou
  Reprovado, com observação da prefeitura.
- O Gestor SHALL poder aprovar ou reprovar cada documento.

O Gestor SHALL também poder editar a entidade, redefinir a senha da conta dela e excluí-la (com a senha do Gestor).
A exclusão SHALL ser bloqueada se a entidade venceu algum sorteio. A listagem SHALL filtrar por texto (razão social,
nome fantasia, CNPJ e representante) e status.

#### Scenario: Reprovar com motivo
- **WHEN** o Gestor reprova uma entidade marcando "Certidões negativas" como faltante
- **THEN** a entidade fica Reprovada com o motivo gravado, e o evento é publicado no Outbox

#### Scenario: Reprovar sem motivo
- **WHEN** o Gestor reprova uma entidade sem documentos faltantes nem observação
- **THEN** o sistema responde 422

#### Scenario: Excluir entidade vencedora
- **WHEN** o Gestor tenta excluir uma entidade que venceu um sorteio
- **THEN** o sistema responde 422

### Requirement: Validade dos documentos da entidade
Cada documento da entidade SHALL poder ter uma data de validade. A entidade pode informá-la no envio, e o Gestor
pode informá-la ou corrigi-la ao analisar o documento.

Uma entidade SHALL ficar **bloqueada por documento vencido** quando algum documento obrigatório tiver validade
anterior à data de hoje. O bloqueio é calculado, não é um status gravado, e some sozinho quando a entidade envia o
documento novo. Enquanto estiver bloqueada, a entidade:
- SHALL NOT participar de lotes;
- SHALL NOT concorrer no sorteio. Inscrições já feitas ficam gravadas, mas o sorteio desconsidera a entidade e
  registra no retrato e no relatório que ela foi excluída por documento vencido.

O sistema SHALL abrir um **alerta**:
- no dashboard do Gestor, com as entidades bloqueadas e as que têm documento obrigatório vencendo nos próximos 30
  dias, cada uma com o documento, a data e o link para a ficha;
- no portal da entidade, com um aviso destacado do documento vencido ou a vencer e o botão para reenviar;
- na ficha da entidade e na lista de inscritas do lote, marcando a entidade bloqueada.

O documento reenviado volta a Pendente. O bloqueio por validade SHALL considerar só a validade, de forma que um
documento novo, ainda Pendente e com validade futura, já tira o bloqueio de validade. A análise do documento segue
pelo fluxo normal.

#### Scenario: Participar com documento vencido
- **WHEN** uma entidade Habilitada, com a certidão negativa vencida ontem, tenta participar de um lote
- **THEN** o sistema responde 422 informando o documento vencido

#### Scenario: Sorteio desconsidera bloqueada
- **WHEN** as entidades A e B estão inscritas e o documento obrigatório de A venceu depois da inscrição
- **THEN** B vence, e o relatório do sorteio registra A como excluída por documento vencido

#### Scenario: Todas bloqueadas
- **WHEN** todas as inscritas de um lote estão bloqueadas por documento vencido
- **THEN** o sistema responde 422 e o lote continua Publicado

#### Scenario: Alerta de vencimento próximo
- **WHEN** o estatuto de uma entidade vence daqui a 10 dias
- **THEN** o dashboard do Gestor e o portal da entidade mostram o alerta com a data

#### Scenario: Reenvio tira o bloqueio
- **WHEN** a entidade bloqueada reenvia a certidão com validade futura
- **THEN** ela volta a poder participar dos lotes

### Requirement: Cadastro público da entidade
Cada tenant com o módulo habilitado SHALL ter uma página pública de cadastro, identificada pelo slug do tenant. O
formulário SHALL ter:
- os dados da entidade;
- e-mail e senha de acesso;
- os documentos exigidos configurados pela prefeitura (PDF, JPEG ou PNG, até 5 MB cada);
- o aceite do termo de privacidade.

O cadastro SHALL criar:
- a entidade, como Pendente;
- os documentos, como Pendentes;
- um usuário SYSGOV ativo, ligado ao tenant só com o perfil Entidade (Inservível), com o representante legal
  ligado ao Cadastro de Pessoas pelo CPF.

O cadastro SHALL ter limite de requisições por IP e um campo isca. O preenchimento do campo isca SHALL fazer o
cadastro ser descartado silenciosamente. CNPJ ou e-mail repetidos no tenant SHALL ser rejeitados.

#### Scenario: Cadastro válido
- **WHEN** uma entidade envia o formulário completo com os documentos exigidos
- **THEN** a entidade e o usuário são criados, e ela consegue entrar pelo login normal e ver o status Pendente

#### Scenario: Documento exigido faltando
- **WHEN** o formulário chega sem um dos documentos exigidos
- **THEN** o sistema responde 422 e nada é criado

#### Scenario: Campo isca preenchido
- **WHEN** o campo isca chega preenchido
- **THEN** o sistema responde como sucesso sem criar nada

#### Scenario: Tenant sem o módulo
- **WHEN** alguém acessa a página pública de um slug cujo tenant não tem o módulo habilitado
- **THEN** o sistema responde 404

### Requirement: Portal da entidade
O usuário com `inservivel.portal` SHALL acessar só a sua entidade, sempre resolvida pelo usuário logado e nunca por
um id vindo da requisição. No portal, a entidade SHALL poder:
- ver o status e o motivo da reprovação;
- editar os dados cadastrais (CNPJ e status ficam de fora);
- reenviar documentos, que voltam a Pendente.

Lotes:
- Uma entidade **Habilitada** SHALL ver os lotes Publicados, Sorteados, Entregues e Baixados, com os bens e as
  fotos.
- Ela SHALL poder **participar** ou **desistir** de um lote Publicado. A participação grava o IP e a data.
- Uma entidade não Habilitada SHALL ver a mensagem do seu status, sem acesso aos lotes.
- Uma entidade bloqueada por documento vencido SHALL ver os lotes, mas sem poder participar, e o alerta do
  documento.

A entidade vencedora SHALL ver o resultado e baixar os termos do lote que ganhou.

#### Scenario: Participar sem estar habilitada
- **WHEN** uma entidade Em Análise tenta participar de um lote
- **THEN** o sistema responde 403

#### Scenario: Participar de lote não publicado
- **WHEN** uma entidade Habilitada tenta participar de um lote Aberto ou Sorteado
- **THEN** o sistema responde 422

#### Scenario: Desistir
- **WHEN** uma entidade inscrita aciona Desistir num lote Publicado
- **THEN** a inscrição é removida

#### Scenario: Termo de lote alheio
- **WHEN** uma entidade pede o termo de um lote que outra entidade ganhou
- **THEN** o sistema responde 404

### Requirement: Sorteio equitativo e auditável
Quem tem `inservivel.lotes.gestao` SHALL poder sortear um lote Publicado que tenha ao menos uma inscrição. A
vencedora SHALL ser escolhida entre as inscritas **aptas**: Habilitadas e sem bloqueio por documento vencido. Se não
houver nenhuma apta, o sistema SHALL responder 422. A escolha é assim:

1. Uma única apta: ela vence (regra `unica_inscrita`).
2. Senão, ficam só as aptas com o menor número de lotes ganhos. Se for uma, ela vence (regra `menos_lotes`).
3. Se houver empate, o sistema gera uma semente aleatória e escolhe pelo índice `mt_rand(0, n-1)` depois de
   `mt_srand(crc32(semente))`, com as empatadas ordenadas pelo id da inscrição (regra `sorteio_semente`).

O sorteio SHALL gravar:
- a vencedora, a data e a regra aplicada;
- a semente;
- o retrato dos participantes (id, razão social, CNPJ e lotes ganhos no momento, e as excluídas com o motivo);
- um hash de conferência.

Em seguida, numa só transação, o sistema SHALL somar 1 aos lotes ganhos da vencedora, mudar o lote para Sorteado,
gerar o PDF do relatório oficial do sorteio (bens, participantes, regra, semente e explicação da lógica) nos
documentos do lote, auditar e publicar `inservivel.LoteSorteado` no Outbox.

#### Scenario: Sem inscrições
- **WHEN** o Gestor sorteia um lote Publicado sem inscrições
- **THEN** o sistema responde 422

#### Scenario: Prioridade para quem ganhou menos
- **WHEN** a entidade A (2 lotes ganhos) e a B (0) estão inscritas
- **THEN** B vence pela regra `menos_lotes`

#### Scenario: Reprodução pela semente
- **WHEN** um auditor repete o cálculo com a semente gravada e a lista de empatadas do retrato
- **THEN** obtém a mesma vencedora

#### Scenario: Sortear duas vezes
- **WHEN** o Gestor tenta sortear um lote já Sorteado
- **THEN** o sistema responde 422

### Requirement: Termos do lote
A partir do status Sorteado, o sistema SHALL gerar em PDF:
- o termo de conferência;
- o termo de entrega;
- o termo de doação com encargo.

Os termos SHALL usar os dados do doador e a legislação das configurações do tenant, os bens do lote e a entidade
vencedora. SHALL poder baixar os termos: quem tem `inservivel.lotes.gestao`, o criador do lote e a entidade
vencedora.

#### Scenario: Termo antes do sorteio
- **WHEN** alguém pede o termo de doação de um lote Publicado
- **THEN** o sistema responde 422

#### Scenario: Dados do doador
- **WHEN** a prefeitura configurou o doador "Município de Exemplo" e a "Lei 100/2025"
- **THEN** o termo de doação cita esse doador e essa lei, sem nenhum texto fixo de outro município

### Requirement: Transferência interna entre secretarias
Para anunciar um bem com papel `disponivel` ou `inservivel`, o usuário SHALL ter `inservivel.transferencias.manage`
e o bem SHALL pertencer à sua secretaria (lotação no Organograma). O Gestor anuncia bens de qualquer secretaria.
Ao ser anunciado, o bem passa a `em_transferencia`.

Fluxo:
- Um usuário de **outra** secretaria SHALL poder solicitar o bem. A secretaria de destino é a lotação de quem
  solicita.
- Quem tem `inservivel.transferencias.aprovar` SHALL aprovar ou recusar as solicitações.
- Na aprovação, o bem passa à secretaria de destino (com o setor limpo) e à situação `disponivel`.
- Na recusa, o anúncio volta a Anunciado, com o motivo registrado.
- O anunciante ou o Gestor SHALL poder cancelar um anúncio ainda não solicitado, e o bem volta à situação anterior.

O termo de transferência em PDF SHALL ficar disponível depois da aprovação.

#### Scenario: Solicitar bem da própria secretaria
- **WHEN** um servidor solicita um bem anunciado pela sua própria secretaria
- **THEN** o sistema responde 422

#### Scenario: Usuário sem lotação
- **WHEN** um servidor sem lotação no Organograma tenta solicitar um bem
- **THEN** o sistema responde 422 pedindo a lotação

#### Scenario: Aprovar
- **WHEN** o Gestor aprova uma solicitação
- **THEN** o bem passa à secretaria de destino com a situação de papel `disponivel`, e a transferência fica Aceita

#### Scenario: Anunciado não entra em lote
- **WHEN** alguém tenta adicionar a um lote um bem em transferência
- **THEN** o sistema responde 422

### Requirement: Dashboard
O dashboard SHALL mostrar estes indicadores do tenant:
- bens cadastrados;
- bens em avaliação (papel `em_avaliacao`);
- lotes ativos (Abertos ou Publicados);
- entidades cadastradas;
- entidades aguardando análise (Pendente ou Em Análise);
- entidades com alerta de documento (vencido ou vencendo em 30 dias).

Também SHALL mostrar os últimos bens incorporados, com filtros de texto, situação e secretaria, e as ações rápidas:
- novo bem;
- novo lote;
- solicitações pendentes;
- entidades aguardando análise, cada uma com o nome e o link para a ficha.

#### Scenario: Entidade aguardando
- **WHEN** existe uma entidade Pendente
- **THEN** ela aparece nas ações rápidas com o link para a ficha

### Requirement: Configurações e importação
O Gestor SHALL configurar por tenant:
- os dados do doador: nome do órgão, CNPJ, cidade, UF, foro e nome e cargo do responsável pelo Patrimônio;
- as leis e decretos citados nos termos (lista de textos);
- a lista de documentos exigidos das entidades (chave, nome e obrigatoriedade). A lista padrão é: estatuto social,
  ata de eleição e posse, cartão CNPJ, documento de identidade do representante, comprovante de endereço e
  certidões negativas.

O Gestor SHALL ver o link do cadastro público para divulgar.

O Gestor SHALL importar uma planilha CSV (até 10 MB):
- O sistema SHALL detectar o separador `;` ou `,` e a codificação UTF-8 ou ISO-8859-1.
- As colunas SHALL ser identificadas pelo cabeçalho, por apelido sem acento. Por exemplo: tombamento/patrimônio →
  nº patrimonial; complemento/descrição → descrição; centro de custo → secretaria; setor/localização → setor; valor
  de aquisição → valor contábil; valor contábil/valor avaliado → valor avaliado.
- O bem SHALL ser criado ou atualizado pelo nº patrimonial.
- A secretaria e o setor SHALL ser casados com o Organograma pelo nome ou pela sigla, sem diferenciar acento nem
  maiúscula.
- Linha sem nº patrimonial ou com unidade não encontrada SHALL ser ignorada e entrar num relatório de pendências.
- Bens novos SHALL entrar com a situação de papel `inservivel`.
- O resultado SHALL informar os bens criados, os atualizados e as pendências.

#### Scenario: Planilha do Excel brasileiro
- **WHEN** o Gestor importa um CSV com `;` em ISO-8859-1
- **THEN** os acentos chegam corretos e os bens são criados

#### Scenario: Centro de custo desconhecido
- **WHEN** uma linha traz um centro de custo que não existe no Organograma
- **THEN** a linha entra nas pendências e as demais são importadas

#### Scenario: Documentos exigidos no cadastro
- **WHEN** o Gestor marca "Certidões negativas" como não obrigatório
- **THEN** o cadastro público passa a aceitar o envio sem esse documento

### Requirement: Arquivos privados
Fotos, documentos das entidades, anexos dos lotes e PDFs gerados SHALL ficar em disco privado e SHALL ser servidos
só por rotas que autorizam o objeto (a mesma regra de quem pode ver o bem, o lote ou a entidade). Nenhuma rota SHALL
aceitar um caminho de arquivo vindo da requisição.

#### Scenario: Documento de outra entidade
- **WHEN** uma entidade pede um documento de outra entidade pelo id
- **THEN** o sistema responde 404

### Requirement: Auditoria e eventos
Toda mutação do módulo SHALL ser registrada pelo `AuditLogger`, com o antes e o depois quando houver. Isso inclui:
- bens e fotos;
- parâmetros e substituição em massa;
- lotes, bens do lote, status, exclusão e anexos;
- entidades, documentos e status;
- inscrições e sorteio;
- transferências;
- configurações e importação.

Os eventos de domínio `BemCadastrado`, `LotePublicado`, `LoteSorteado`, `EntidadeCadastrada`, `EntidadeReprovada`,
`EntidadeHabilitada` e `TransferenciaAprovada` SHALL ser publicados no Outbox com o prefixo `inservivel.`.

#### Scenario: Auditoria do sorteio
- **WHEN** um lote é sorteado
- **THEN** existe um registro de auditoria com o lote, a vencedora, a regra e a semente
