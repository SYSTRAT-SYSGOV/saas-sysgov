# Perguntas e Lacunas — Servidores (i-Educar legado)

> Inventário de dúvidas de negócio, inconsistências estruturais e decisões arquiteturais pendentes de validação com os responsáveis pela modernização do sistema.
> Todas as perguntas referenciam evidências literais encontradas no código legado (`arquivo.ext:linha`).

---

| # | Pergunta | Origem | Impacto | Dono | Prazo |
|---|---|---|---|---|---|
| 01 | Como tratar a concorrência na geração do `sequencial` de afastamento que utiliza `MAX()+1` sem lock pessimista? | `app/Models/EmployeeWithdrawal.php:63` | Alto (Risco de colisão de chaves em ambientes de alta concorrência) | Arquitetura | Sprint 1 |
| 02 | O sistema novo deve manter a obrigatoriedade da proporção de no mínimo 1/3 para `hora_atividade` segundo a Lei Federal nº 11.738/2008 de forma impeditiva na UI? | `ieducar/intranet/educar_servidor_alocacao_cad.php:42-46` | Alto (Conformidade legal e trabalhista municipal) | Jurídico / RH | Sprint 1 |
| 03 | Como deve ser modelado o histórico de substituição docente para que o professor substituto receba acesso temporário ao diário de classe da turma? | `app/Models/Employee.php:208-213` | Alto (Operação escolar e integridade de notas) | Produto | Sprint 1 |
| 04 | A validação de choque de horários (mesmo dia e faixa horária para escolas diferentes) deve ser estritamente bloqueante no cadastro da alocação? | `ieducar/intranet/educar_servidor_alocacao_cad.php:89-93` | Médio (Prevenção de fraude e inconsistência de folha) | RH / Pedagógico | Sprint 2 |
| 05 | Como migrar a coluna `carga_horaria` de `pmieducar.servidor_alocacao` que no legado é manipulada ora como `time`, ora como `interval` e ora como `int`? | `ieducar/intranet/educar_servidor_cad.php:136` | Médio (Normalização de dados no banco) | Engenharia de Dados | Sprint 2 |
| 06 | Os atestados médicos e documentos de falta contendo dados de saúde (CID) devem ser criptografados em repouso para atender à LGPD? | `ieducar/intranet/educar_falta_atraso_cad.php:5-8` | Alto (Privacidade e conformidade com a LGPD) | DPO / Segurança | Sprint 1 |
| 07 | Servidores que atuam exclusivamente em funções administrativas (merendeiras, zeladores) devem possuir conta de usuário no SYSGOV Core mesmo sem acessar o sistema? | `app/Models/Employee.php:31-40` | Médio (Dimensionamento de licenças e tenants) | Arquitetura | Sprint 2 |
| 08 | Qual a regra de transição quando um servidor possui alocações vigentes e tem seu vínculo funcional exonerado ou inativado no meio do ano letivo? | `ieducar/intranet/educar_servidor_cad.php:126-128` | Alto (Continuidade pedagógica das turmas) | Pedagógico | Sprint 2 |
| 09 | A matrícula funcional em `pmieducar.servidor_funcao` deve ser globalmente única por tenant ou pode se repetir entre funções diferentes do mesmo servidor? | `app/Models/LegacyEmployeeRole.php:23-28` | Médio (Integridade referencial na folha de pagamento) | RH / Produto | Sprint 2 |
| 10 | A consulta `getServidoresDisciplinasTurmas` continuará aceitando array não tipado de escolas na URL sem autenticação por token OAuth/Sanctum? | `ieducar/modules/Api/Views/ServidorController.php:128-130` | Alto (Vulnerabilidade de injeção e exposição indevida) | Segurança | Sprint 1 |
| 11 | O código docente INEP de 12 dígitos deve ser obrigatório no ato da contratação ou pode ser preenchido a posteriori durante o censo? | `ieducar/intranet/educar_servidor_cad.php:63-65` | Médio (Flexibilidade de cadastro escolar) | Operações | Sprint 2 |
| 12 | O sistema novo deve permitir que um mesmo professor seja alocado com cargas horárias distintas em duas turmas no mesmo turno em regime de co-docência? | `ieducar/lib/Portabilis/Business/Professor.php:51-70` | Médio (Flexibilidade pedagógica para AEE e apoio) | Pedagógico | Sprint 2 |
| 13 | Quais os limites de tolerância para atrasos funcionais antes de converter automaticamente a ocorrência em falta no cômputo da folha? | `ieducar/intranet/educar_falta_atraso_cad.php:29-34` | Médio (Regulamentação do estatuto dos servidores) | Jurídico / RH | Sprint 3 |
| 14 | Como tratar a unificação de pessoas físicas quando dois cadastros duplicados de servidores forem fundidos via `UnificationService`? | `ieducar/modules/Api/Views/ServidorController.php:322-328` | Alto (Integridade de histórico funcional e notas lançadas) | Arquitetura | Sprint 1 |
| 15 | A remoção de alocação de professor deve disparar automaticamente o cancelamento do vínculo de professor-turma no diário de classe? | `ieducar/modules/Api/Views/ServidorController.php:175-185` | Alto (Integridade de registros de notas e faltas) | Produto / Pedagógico | Sprint 1 |
| 16 | Deve haver integração direta via webhook ou mensageria com o sistema central de Recursos Humanos / Folha de Pagamento da Prefeitura? | `app/Models/EmployeeAllocation.php:44-50` | Médio (Interoperabilidade de governo digital) | Integração / Produto | Sprint 3 |
| 17 | Como validar a complementação pedagógica (`complementacao_pedagogica`) quando o docente leciona disciplinas fora de sua graduação original? | `ieducar/intranet/educar_servidor_cad.php:51-52` | Médio (Exigência das diretrizes curriculares do MEC) | Pedagógico | Sprint 2 |
