# Spec Delta

## Purpose

Registra vistorias de conservação dos jazigos e conduz o processo administrativo de abandono, da notificação e
edital até a extinção da concessão, a demolição e a reversão do jazigo ao município.

## ADDED Requirements

### Requirement: Registro de vistoria com fotos e classificação de risco
<!-- rastreabilidade: RF-33; DRS §4 (Fiscal de Campo) -->
O sistema SHALL registrar vistorias de jazigo com data, vistoriador, estado de conservação (bom, regular, ruim,
em ruína, indício de abandono), classificação de risco (baixo, médio, alto), observações e ao menos uma foto,
armazenando data/hora de captura. A tela de vistoria SHALL ser utilizável em celular. O fiscal SHALL poder mover
o jazigo para Em Ruína/Manutenção a partir de vistoria com estado "em ruína".

#### Scenario: Vistoria sem foto
- **WHEN** a vistoria é enviada sem nenhuma foto
- **THEN** o sistema rejeita com erro de validação

### Requirement: Instauração do processo de abandono
<!-- rastreabilidade: RF-34 -->
O sistema SHALL permitir instaurar processo administrativo de abandono somente para jazigo com concessão e com
vistoria registrando estado "em ruína" ou "indício de abandono". Ao instaurar, o sistema SHALL notificar o
concessionário pelos meios cadastrados e registrar a notificação.

#### Scenario: Sem vistoria que justifique
- **WHEN** o usuário tenta instaurar processo para jazigo cuja última vistoria é "bom"
- **THEN** o sistema recusa a instauração

### Requirement: Edital de notificação
<!-- rastreabilidade: RF-35; RN-10 -->
O sistema SHALL emitir edital de notificação do processo com prazo de manifestação igual ao parametrizado (faixa
legal de 10 a 30 dias) contado da data de publicação informada, e SHALL impedir a decisão final antes do fim
desse prazo.

#### Scenario: Decisão antes do prazo
- **WHEN** o prazo do edital é 30 dias e o usuário tenta decidir no 20º dia
- **THEN** o sistema recusa informando a data de término do prazo

### Requirement: Manifestação e arquivamento
<!-- rastreabilidade: RF-34 -->
O sistema SHALL registrar manifestação do concessionário dentro do prazo; se houver compromisso de regularização
aceito pela administração, o processo SHALL ser arquivado e a concessão mantida.

#### Scenario: Concessionário regulariza
- **WHEN** o concessionário se manifesta no prazo e a regularização é aceita
- **THEN** o processo é arquivado e a concessão continua vigente

### Requirement: Extinção, demolição e reversão do jazigo
<!-- rastreabilidade: RF-36; RN-01, RN-02 -->
Findo o prazo do edital sem manifestação aceita, a decisão SHALL alterar a concessão para Extinta, emitir ordem
de serviço de demolição e registrar o ato. Havendo restos, a remoção para ossuário SHALL seguir as regras de
exumação (prazos legais) antes de o jazigo voltar a Disponível; até lá o jazigo permanece com os restos e a
remoção fica pendente.

#### Scenario: Extinção com demolição
- **WHEN** o prazo terminou sem manifestação e a decisão é registrada para jazigo sem restos
- **THEN** a concessão passa a Extinta, a ordem de demolição é emitida e, concluída a demolição, o jazigo volta a Disponível

#### Scenario: Reversão com restos dentro do prazo legal
- **WHEN** a decisão é registrada para jazigo cujo último sepultamento ainda não atingiu o prazo de exumação
- **THEN** a concessão é Extinta, o jazigo não fica Disponível e a remoção fica pendente até a data de liberação
