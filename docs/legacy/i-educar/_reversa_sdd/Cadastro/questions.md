# Cadastro (i-Educar legado), Perguntas

> Perguntas em aberto que dependem de validação humana, derivadas das lacunas desta unit. Insumo da fase de revisão (`revisao`).
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

| # | Pergunta | Origem | Impacto | Dono | Prazo |
|---|----------|--------|---------|------|-------|
| Q-01 | As três interpolações SQL da API (escolas em ocorrências e listagem) e a do `id` do aluno na tela de cadastro foram exploradas ou há diagnóstico do risco em produção? | `Api/Views/AlunoController.php:881` e `:1380` e `:1404` e `Cadastro/Views/AlunoController.php:336` | Alto — injeção SQL | Segurança e Dados | Antes da migração |
| Q-02 | Na criação, a falha da gravação dos pais deixa a transação aberta e o commit se mantém mesmo com falha; há registros de gravações parciais na base? | `Api/Views/AlunoController.php:1712-1739` | Alto — integridade da base | Dados | Antes da migração |
| Q-03 | A moradia descarta campos nulos na gravação; há dados obsoletos de moradia acumulados na base real? | `Api/Views/AlunoController.php:508-514` | Médio — dados socioeconômicos | Dados | Antes do piloto |
| Q-04 | A gravação de projetos apaga e regrava com mensagens de erro sem exceção; há projetos inconsistentes na base pela confirmação com falha? | `Api/Views/AlunoController.php:1638-1683` | Médio — integridade dos projetos | Dados | Antes do piloto |
| Q-05 | Quem, na rede, tem a permissão do processo 578 e de que nível de acesso? | `Cadastro/Views/AlunoController.php:32-34` | Médio — governança de quem cadastra aluno | Arquitetura | Antes do piloto |
| Q-06 | A semântica do campo `analfabeto` invertido é compreendida pelas secretarias, e o modelo novo deve exibir a lógica clara do campo? | `Api/Views/AlunoController.php:632-634` | Alto — risco de inversão na migração de dados | Dados e Pedagogo | Antes da migração |
| Q-07 | A instituição ativa exige justificativa para a falta de documentação, e como o modelo novo deve aplicar a exigência? | `Cadastro/Views/AlunoController.php:320-326` | Médio — regulatório de matrícula | Arquitetura | Antes do piloto |
| Q-08 | O tamanho mínimo do código da rede estadual está configurado, e o padrão de máscara automática deve se manter? | `Api/Views/AlunoController.php:161-163` e `:603-614` | Médio — integração com a rede estadual | Arquitetura | Antes do piloto |
| Q-09 | O CPF é exigido pela instituição, e a dispensa de estrangeiros é política pedagógica ou regulatória? | `Api/Views/AlunoController.php:245-272` | Médio — regulatório | Jurídico | Antes do piloto |
| Q-10 | Um aluno pode mudar de pessoa física no legado, ou a referência é imutável, e o modelo novo deve permitir a transferência de identidade? | `Api/Views/AlunoController.php:627-630` | Alto — casos de papel trocado ou de duplicidade de pessoa | Arquitetura | Antes da migração |
| Q-11 | Qual é o uso real dos cinco grupos de autorizado com parentesco autorizado (`autorizado_um` a `autorizado_cinco`) e quem consome? | `Api/Views/AlunoController.php:616-625` | Médio — busca de parentes para busca de afastado | Pedagogo e Arquitetura | Antes do piloto |
| Q-12 | A ficha médica tem vinte e quatro booleanos; os campos têm consumo nas escolas ou na saúde pública, e o modelo novo pode reduzir? | `Api/Views/AlunoController.php:436-476` | Médio — escopo do modelo novo | Pedagogo | Antes do piloto |
| Q-13 | Os recursos tecnológicos são gravados em JSON na moradia, e o modelo novo deve normalizar em tabela de referência? | `Api/Views/AlunoController.php:508-509` | Baixo — modelagem | Arquitetura | Antes da migração |
| Q-14 | Os veículos do transporte escolar são gravados como lista CSV; o modelo novo deve normalizar em vínculo? | `Api/Views/AlunoController.php:651-657` | Médio — modelagem | Arquitetura | Antes da migração |
| Q-15 | O transporte da pessoa está marcado para remoção; ainda é consumido em produção, e o modelo novo pode eliminar? | `Api/Views/AlunoController.php:1779-1800` | Médio — remoção de dívida | Arquitetura | Antes do piloto |
| Q-16 | A exigência do laudo médico quando há deficiência é aplicada em que situações, e o modelo novo deve aplicar em um cadastro? | `_reversa_sdd/Cadastro/legacy-mapping.md` e `Api/Views/AlunoController.php:1901-1928` | Alto — regulatório da inclusão | Pedagogo e Jurídico | Antes do piloto |
| Q-17 | O nome social prevalece na exibição com o nome civil; há exigência legal ou de política de rede no formato de exibição? | `Api/Views/AlunoController.php:940-944` | Médio — direito de identidade | Jurídico | Antes do piloto |
| Q-18 | A listagem completa de alunos com excluídos é consumida por qual aplicativo de terceiros, e o contrato se mantém no modelo novo? | `Api/Views/AlunoController.php:1324-1427` | Médio — integração externa | Arquitetura | Antes do piloto |
| Q-19 | A exclusão do aluno só é permitida sem matrícula ativa; como as matrículas inativas são tratadas na desativação de cadastro integral no modelo novo? | `Api/Views/AlunoController.php:1822-1853` | Médio — governança do ciclo de vida | Arquitetura | Antes do piloto |
| Q-20 | Os campos de deficiência e transtorno são sincronizados no vínculo da pessoa, e quando catalogados pelo censo, houve duplo problema de códigos na base? | `Api/Views/AlunoController.php:2264-2299` | Alto — integridade dos dados do censo | Dados | Antes da migração |

> Total: 20 perguntas. Acumulado do plano: 207 perguntas em 11 units (187 de 10 units anteriores).
