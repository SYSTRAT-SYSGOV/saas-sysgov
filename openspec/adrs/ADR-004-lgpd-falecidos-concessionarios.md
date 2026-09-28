# ADR-004: Tratamento LGPD de dados de falecidos e concessionários

- **Status**: Aceita
- **Data**: 2026-09-22
- **Mudança relacionada**: `openspec/changes/cemiterio-fundacao`

## Contexto

O módulo trata dados de pessoas falecidas (nome, datas, certidão, causa da morte, documentos médicos) e de
pessoas vivas (concessionários e empreiteiros pessoa física). A Nota Técnica ANPD nº 3/2023 entende que dados
de pessoas falecidas estão fora do alcance da LGPD, mas a causa da morte e a documentação médica continuam
sensíveis (sigilo médico e dignidade da família). No DRS: RN-04 (dados de falecidos não são dados pessoais),
RN-05 (concessionários com proteção integral da LGPD), RN-06 (causa da morte com acesso restrito a
autoridades), RNF-09 (encriptação em repouso) e CA-03 (consulta pública sem CPF nem causa da morte).

## Decisão

- **Falecidos**: identificação e localização são dados de interesse público e podem aparecer na busca pública
  (nome, datas, cemitério, jazigo). **Causa da morte e documentos médicos** ficam criptografados em repouso,
  fora das respostas padrão, liberados só com uma permissão específica, e toda leitura é auditada.
- **Concessionários e empreiteiros PF**: proteção integral da LGPD — base legal registrada; documento, e-mail
  e telefone criptografados; hash HMAC para unicidade/busca; CPF mascarado em listagens; consulta e correção
  pelo titular via portal; minimização no envio a serviços externos (nenhum dado de concessionário é enviado a
  provedores de mapa ou índice econômico).
- **Auditoria**: `AuditLogger` com hash encadeado para todas as mutações e para a leitura de dados restritos;
  exclusão lógica nos dados de negócio.

## Alternativas consideradas

- **Tratar tudo como dado pessoal sensível**: impediria a busca pública de falecidos, que é requisito do DRS.
- **Não criptografar e depender só de RBAC**: não atende ao RNF de criptografia em repouso e expõe dados em
  backups e dumps.

## Consequências

- (+) Portal público viável sem expor dados sensíveis.
- (−) Campos criptografados não podem ser buscados por `LIKE`; a busca exata usa hash, e a busca por nome de
  concessionário usa o nome (não criptografado).
- (−) Rotação da chave de criptografia exige recifragem planejada.
