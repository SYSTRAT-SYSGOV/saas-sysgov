# language: pt
Funcionalidade: Gestão da Alimentação Escolar e Nutrição (PNAE) no SYS-Educa
  Como nutricionista e gestor da alimentação escolar municipal
  Desejo planejar cardápios nutricionais, monitorar restrições alimentares de estudantes e registrar refeições
  Para garantir o cumprimento da Lei do PNAE (Lei 11.947/2009), a segurança biológica dos alunos e a transparência com o CAE

  Contexto:
    Dado que o tenant da Prefeitura possui o módulo "SYS-Educa" ativo
    E que existe um ano letivo vigente com escolas municipais cadastradas
    E que o usuário operador possui perfil de nutricionista com registro no CRN

  Cenário: Elaboração e homologação de cardápio semanal por etapa de ensino
    Dado que o nutricionista cria um cardápio intitulado "Cardápio Anos Iniciais - Março"
    E define a etapa como "Ensino Fundamental" e o turno como "Matutino"
    Quando adiciona a preparação "Arroz integral, feijão carioca, frango desfiado com legumes e salada de tomate"
    E informa os dados nutricionais: 480 kcal, 65g de carboidratos, 24g de proteínas, 12g de lipídios e 8g de fibras
    E confirma a homologação com seu número de registro profissional "CRN-3 45892"
    Então o sistema altera o status do cardápio para "homologado"
    E registra o timestamp de homologação e a identificação do profissional no log de auditoria

  Cenário: Rejeição de publicação de cardápio sem homologação do CRN
    Dado que existe um cardápio em status "rascunho"
    Quando um operador administrativo sem registro no CRN tenta homologar o cardápio
    Então o sistema bloqueia a transação com código de erro HTTP 422
    E emite mensagem exigindo a identificação profissional de nutricionista responsável

  Cenário: Registro de laudo de restrição alimentar grave e emissão de alertas
    Dado que a estudante "Ana Clara Santos" possui diagnóstico de Doença Celíaca
    Quando a secretaria escolar cadastra a restrição alimentar do tipo "gluten" com gravidade "severa_anafilatica"
    E anexa os dados do laudo emitido pelo médico com CRM válido
    E define a preparação adaptada "Marmita celíaca isenta de glúten e contaminação cruzada"
    Então o sistema grava a restrição no prontuário do estudante
    E passa a exibir um selo de alerta crítico em vermelho em qualquer consulta à matrícula ou diário da aluna

  Cenário: Lançamento de consumo diário de refeições e apuração de desperdício
    Dado que a escola "EMEF Monteiro Lobato" serviu o almoço do cardápio homologado
    Quando a direção escolar registra 320 alunos presentes e 315 refeições servidas
    E informa 3.2 kg de sobra limpa e 1.5 kg de restos nos pratos
    Então o sistema calcula a taxa de adesão em 98.44%
    E atualiza os índices de desperdício alimentar da unidade escolar para o relatório do CAE
