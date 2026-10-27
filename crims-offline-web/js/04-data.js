/**
 * =============================================================================
 * 04-data.js
 * -----------------------------------------------------------------------------
 * Dados estáticos (conteúdo) do jogo, separados da lógica (Clean Code:
 * separação de dados e comportamento). Nenhuma regra de negócio aqui.
 * =============================================================================
 */
(function (global) {
  'use strict';

  const Game = global.Game;

  // dificuldade: 0 (fácil) a 100 (quase impossível) — usada no cálculo de sucesso
  const CRIMES = [
    { id: 'furto_bolso', nome: 'Furto de bolso', icone: '👛', energia: 4, dificuldade: 8,
      recompensaMin: 15, recompensaMax: 45, xp: 6, tempoPrisao: 30, risco: 'baixo' },
    { id: 'assalto_loja', nome: 'Assalto a loja de conveniência', icone: '🏪', energia: 7, dificuldade: 22,
      recompensaMin: 60, recompensaMax: 150, xp: 14, tempoPrisao: 60, risco: 'baixo' },
    { id: 'roubo_carro', nome: 'Roubo de carro', icone: '🚗', energia: 10, dificuldade: 35,
      recompensaMin: 150, recompensaMax: 320, xp: 26, tempoPrisao: 120, risco: 'medio' },
    { id: 'trafico', nome: 'Ponto de tráfico', icone: '💊', energia: 12, dificuldade: 42,
      recompensaMin: 200, recompensaMax: 420, xp: 34, tempoPrisao: 150, risco: 'medio' },
    { id: 'assalto_banco', nome: 'Assalto a banco', icone: '🏦', energia: 18, dificuldade: 58,
      recompensaMin: 500, recompensaMax: 1100, xp: 60, tempoPrisao: 240, risco: 'alto' },
    { id: 'contrabando', nome: 'Contrabando internacional', icone: '📦', energia: 20, dificuldade: 66,
      recompensaMin: 700, recompensaMax: 1500, xp: 80, tempoPrisao: 300, risco: 'alto' },
    { id: 'cassino', nome: 'Golpe no cassino', icone: '🎰', energia: 24, dificuldade: 74,
      recompensaMin: 1000, recompensaMax: 2200, xp: 110, tempoPrisao: 360, risco: 'alto' },
    { id: 'joalheria', nome: 'Roubo à joalheria', icone: '💎', energia: 28, dificuldade: 82,
      recompensaMin: 1500, recompensaMax: 3200, xp: 150, tempoPrisao: 420, risco: 'alto' }
  ];

  const ITENS = [
    // Armas
    { id: 'faca', nome: 'Faca enferrujada', tipo: 'arma', icone: '🔪', preco: 80, descricao: '+4 de ataque.', efeitos: { ataque: 4 } },
    { id: 'bastao', nome: 'Bastão de beisebol', tipo: 'arma', icone: '🏏', preco: 220, descricao: '+9 de ataque.', efeitos: { ataque: 9 } },
    { id: 'pistola', nome: 'Pistola 9mm', tipo: 'arma', icone: '🔫', preco: 650, descricao: '+18 de ataque.', efeitos: { ataque: 18 } },
    { id: 'uzi', nome: 'Submetralhadora', tipo: 'arma', icone: '💥', preco: 1400, descricao: '+26 de ataque.', efeitos: { ataque: 26 } },
    { id: 'rifle', nome: 'Rifle de assalto', tipo: 'arma', icone: '🪖', preco: 2200, descricao: '+34 de ataque.', efeitos: { ataque: 34 } },
    { id: 'rifle_sniper', nome: 'Rifle de precisão', tipo: 'arma', icone: '🎯', preco: 4200, descricao: '+48 de ataque.', efeitos: { ataque: 48 } },
    { id: 'lanca_chamas', nome: 'Lança-chamas', tipo: 'arma', icone: '🔥', preco: 7000, descricao: '+65 de ataque.', efeitos: { ataque: 65 } },
    { id: 'mp5_navy', nome: 'MP5-Navy', tipo: 'arma', icone: '💥', preco: 3600, descricao: '+42 de ataque.', efeitos: { ataque: 42 } },
    { id: 'ak47', nome: 'AK-47', tipo: 'arma', icone: '🪖', preco: 4800, descricao: '+52 de ataque.', efeitos: { ataque: 52 } },
    { id: 'desert_eagle', nome: 'Desert Eagle', tipo: 'arma', icone: '🔫', preco: 3900, descricao: '+46 de ataque.', efeitos: { ataque: 46 } },
    { id: 'metralhadora_pesada', nome: 'Metralhadora pesada', tipo: 'arma', icone: '💣', preco: 12500, descricao: '+82 de ataque.', efeitos: { ataque: 82 } },
    { id: 'arma_laser', nome: 'Arma a laser experimental', tipo: 'arma', icone: '🔆', preco: 18000, descricao: '+95 de ataque (equipamento fictício de ficção científica).', efeitos: { ataque: 95 } },
    { id: 'escopeta_tatica', nome: 'Escopeta tática', tipo: 'arma', icone: '🎯', preco: 5200, descricao: '+57 de ataque.', efeitos: { ataque: 57 } },
    { id: 'magnum', nome: 'Revólver Magnum', tipo: 'arma', icone: '🔫', preco: 2900, descricao: '+38 de ataque.', efeitos: { ataque: 38 } },
    // Proteções
    { id: 'jaqueta', nome: 'Jaqueta de couro', tipo: 'protecao', icone: '🧥', preco: 90, descricao: '+3 de defesa.', efeitos: { defesa: 3 } },
    { id: 'capacete', nome: 'Capacete tático', tipo: 'protecao', icone: '🪖', preco: 320, descricao: '+7 de defesa.', efeitos: { defesa: 7 } },
    { id: 'colete', nome: 'Colete à prova de balas', tipo: 'protecao', icone: '🦺', preco: 600, descricao: '+14 de defesa.', efeitos: { defesa: 14 } },
    { id: 'blindagem', nome: 'Blindagem tática', tipo: 'protecao', icone: '🛡️', preco: 2000, descricao: '+30 de defesa.', efeitos: { defesa: 30 } },
    { id: 'exoesqueleto', nome: 'Exoesqueleto blindado', tipo: 'protecao', icone: '🤖', preco: 6000, descricao: '+55 de defesa.', efeitos: { defesa: 55 } },
    // Veículos (velocidade de fuga / combate)
    { id: 'moto', nome: 'Moto roubada', tipo: 'veiculo', icone: '🏍️', preco: 350, descricao: '+8 de velocidade.', efeitos: { velocidade: 8 } },
    { id: 'carro_esportivo', nome: 'Carro esportivo', tipo: 'veiculo', icone: '🚘', preco: 1800, descricao: '+20 de velocidade.', efeitos: { velocidade: 20 } },
    { id: 'suv_blindado', nome: 'SUV blindado', tipo: 'veiculo', icone: '🚙', preco: 4500, descricao: '+32 de velocidade.', efeitos: { velocidade: 32 } },
    { id: 'helicoptero', nome: 'Helicóptero de fuga', tipo: 'veiculo', icone: '🚁', preco: 9000, descricao: '+50 de velocidade.', efeitos: { velocidade: 50 } },
    { id: 'pickup', nome: 'Picape preparada', tipo: 'veiculo', icone: '🛻', preco: 1200, descricao: '+15 de velocidade.', efeitos: { velocidade: 15 } },
    { id: 'muscle_car', nome: 'Muscle car', tipo: 'veiculo', icone: '🏎️', preco: 3900, descricao: '+28 de velocidade.', efeitos: { velocidade: 28 } },
    { id: 'van_blindada', nome: 'Van blindada', tipo: 'veiculo', icone: '🚐', preco: 6200, descricao: '+36 de velocidade.', efeitos: { velocidade: 36 } },
    { id: 'supercarro', nome: 'Supercarro importado', tipo: 'veiculo', icone: '🏁', preco: 15000, descricao: '+62 de velocidade.', efeitos: { velocidade: 62 } },
    // Consumíveis
    { id: 'energetico', nome: 'Energético', tipo: 'consumivel', icone: '🥤', preco: 40, descricao: 'Recupera 20 de energia.', efeitos: { energia: 20 } },
    { id: 'adrenalina', nome: 'Injeção de adrenalina', tipo: 'consumivel', icone: '💉', preco: 90, descricao: 'Recupera 35 de energia.', efeitos: { energia: 35 } },
    { id: 'kit_medico', nome: 'Kit médico', tipo: 'consumivel', icone: '🩹', preco: 70, descricao: 'Recupera 40 de vida.', efeitos: { vida: 40 } },
    { id: 'kit_medico_grande', nome: 'Kit médico avançado', tipo: 'consumivel', icone: '⚕️', preco: 160, descricao: 'Recupera 100 de vida.', efeitos: { vida: 100 } },
    { id: 'isotonico', nome: 'Bebida isotônica', tipo: 'consumivel', icone: '🧃', preco: 55, descricao: 'Recupera 30 de stamina.', efeitos: { stamina: 30 } },
    { id: 'refeicao_forte', nome: 'Refeição reforçada', tipo: 'consumivel', icone: '🍲', preco: 100, descricao: 'Recupera 20 de energia e 35 de stamina.', efeitos: { energia: 20, stamina: 35 } },
    { id: 'guia_forca', nome: 'Treino guiado de força', tipo: 'consumivel', icone: '💪', preco: 240, descricao: 'Aumenta permanentemente a força em 2.', efeitos: { forca: 2 } },
    { id: 'manual_tatico', nome: 'Manual tático', tipo: 'consumivel', icone: '🧠', preco: 260, descricao: 'Aumenta permanentemente a inteligência em 2.', efeitos: { inteligencia: 2 } },
    { id: 'treino_agilidade', nome: 'Plano de agilidade', tipo: 'consumivel', icone: '🏃', preco: 260, descricao: 'Aumenta permanentemente a velocidade em 2.', efeitos: { velocidade: 2 } },
    { id: 'remedio_tratamento', nome: 'Medicamento de tratamento', tipo: 'consumivel', icone: '💊', preco: 180, descricao: 'Item fictício do jogo: encerra doença ou recuperação por overdose.', efeitos: { tratarEstado: true } },
    // Substâncias são apenas itens abstratos da simulação: não há fórmulas nem processos reais de fabricação.
    { id: 'consumivel_maconha', nome: 'Maconha (jogo)', tipo: 'consumivel', icone: '🌿', preco: 35, descricao: 'Energia +8, stamina -2; risco de overdose no jogo: 2%.', efeitos: { energia: 8, stamina: -2, riscoOverdose: 2, tempoOverdose: 45 } },
    { id: 'consumivel_cigarro', nome: 'Cigarro (jogo)', tipo: 'consumivel', icone: '🚬', preco: 15, descricao: 'Energia +2, stamina -1; risco de overdose no jogo: 1%.', efeitos: { energia: 2, stamina: -1, riscoOverdose: 1, tempoOverdose: 30 } },
    { id: 'consumivel_cerveja', nome: 'Cerveja (jogo)', tipo: 'consumivel', icone: '🍺', preco: 20, descricao: 'Energia +3, stamina -2; risco de overdose no jogo: 2%.', efeitos: { energia: 3, stamina: -2, riscoOverdose: 2, tempoOverdose: 45 } },
    { id: 'consumivel_analgesico', nome: 'Analgésico fictício (jogo)', tipo: 'consumivel', icone: '🩹', preco: 45, descricao: 'Energia +5, stamina -1; risco de overdose no jogo: 1%.', efeitos: { energia: 5, stamina: -1, riscoOverdose: 1, tempoOverdose: 45 } },
    { id: 'consumivel_ninfetamina', nome: 'Ninfetamina (substância fictícia no jogo)', tipo: 'consumivel', icone: '⚗️', preco: 90, descricao: 'Energia +14, stamina -3; risco de overdose no jogo: 12%.', efeitos: { energia: 14, stamina: -3, riscoOverdose: 12, tempoOverdose: 90 } },
    { id: 'consumivel_lsd', nome: 'LSD (jogo)', tipo: 'consumivel', icone: '🌀', preco: 100, descricao: 'Energia +13, stamina -3; risco de overdose no jogo: 15%.', efeitos: { energia: 13, stamina: -3, riscoOverdose: 15, tempoOverdose: 120 } },
    { id: 'consumivel_morfina', nome: 'Morfina (jogo)', tipo: 'consumivel', icone: '💉', preco: 120, descricao: 'Energia +16, stamina -4; risco de overdose no jogo: 18%.', efeitos: { energia: 16, stamina: -4, riscoOverdose: 18, tempoOverdose: 150 } },
    { id: 'consumivel_heroina', nome: 'Heroína (jogo)', tipo: 'consumivel', icone: '☠️', preco: 140, descricao: 'Energia +18, stamina -5; risco de overdose no jogo: 24%.', efeitos: { energia: 18, stamina: -5, riscoOverdose: 24, tempoOverdose: 180 } }
  ];

  // Catálogo abstrato do jogo. As fábricas apenas geram unidades virtuais por hora.
  const DROGAS = [
    { id: 'maconha', nome: 'Maconha', icone: '🌿', precoCompra: 24, precoVenda: 32, producaoBase: 4, custoFabrica: 950, riscoOverdose: 2 },
    { id: 'lsd', nome: 'LSD', icone: '🌀', precoCompra: 55, precoVenda: 74, producaoBase: 3, custoFabrica: 1900, riscoOverdose: 15 },
    { id: 'ninfetamina', nome: 'Ninfetamina (fictícia)', icone: '⚗️', precoCompra: 45, precoVenda: 62, producaoBase: 4, custoFabrica: 1650, riscoOverdose: 12 },
    { id: 'cigarro', nome: 'Cigarro', icone: '🚬', precoCompra: 8, precoVenda: 12, producaoBase: 7, custoFabrica: 700, riscoOverdose: 1 },
    { id: 'cerveja', nome: 'Cerveja', icone: '🍺', precoCompra: 12, precoVenda: 18, producaoBase: 6, custoFabrica: 800, riscoOverdose: 2 },
    { id: 'heroina', nome: 'Heroína', icone: '☠️', precoCompra: 80, precoVenda: 108, producaoBase: 2, custoFabrica: 3200, riscoOverdose: 24 },
    { id: 'morfina', nome: 'Morfina', icone: '💉', precoCompra: 65, precoVenda: 88, producaoBase: 3, custoFabrica: 2500, riscoOverdose: 18 },
    { id: 'analgesico', nome: 'Analgésico fictício', icone: '🩹', precoCompra: 18, precoVenda: 25, producaoBase: 6, custoFabrica: 850, riscoOverdose: 1 }
  ];

  const PECAS_GARAGEM = [
    { id: 'filtro', nome: 'Filtro de motor', icone: '⚙️', precoCompra: 80, precoVendaBase: 105 },
    { id: 'pneu', nome: 'Pneu esportivo', icone: '🛞', precoCompra: 140, precoVendaBase: 180 },
    { id: 'bateria', nome: 'Bateria automotiva', icone: '🔋', precoCompra: 110, precoVendaBase: 145 },
    { id: 'turbo', nome: 'Kit turbo (item fictício do jogo)', icone: '🧰', precoCompra: 420, precoVendaBase: 560 },
    { id: 'eletronica', nome: 'Módulo eletrônico', icone: '🔌', precoCompra: 250, precoVendaBase: 330 }
  ];

  // Negócios/propriedades que o jogador pode comprar e evoluir (produção passiva por hora)
  const PROPRIEDADES = [
    { id: 'fabrica_drogas', nome: 'Fábrica de Drogas', icone: '🧪', recurso: 'drogas',
      custoBase: 800, producaoBase: 6, descricao: 'Produz drogas para revender no Mercado Negro.' },
    { id: 'garagem', nome: 'Garagem Clandestina', icone: '🔧', recurso: 'dinheiro',
      custoBase: 1000, producaoBase: 35, descricao: 'Desmancha carros roubados e gera dinheiro.' },
    { id: 'bordel', nome: 'Bordel', icone: '🏮', recurso: 'dinheiro',
      custoBase: 1800, producaoBase: 65, descricao: 'Casa noturna clandestina com renda passiva alta.' },
    { id: 'casa_jogos', nome: 'Casa de Jogos Clandestina', icone: '🎲', recurso: 'dinheiro',
      custoBase: 3200, producaoBase: 150, descricao: 'Jogatina ilegal de alto retorno.' },
    { id: 'deposito', nome: 'Depósito de Contrabando', icone: '📦', recurso: 'dinheiro',
      custoBase: 5500, producaoBase: 280, descricao: 'Armazena e revende cargas contrabandeadas.' },
    { id: 'boate', nome: 'Boate do Submundo', icone: '🎧', recurso: 'dinheiro',
      custoBase: 2400, producaoBase: 90, descricao: 'Casa noturna: contrate equipes e abasteça o estoque da boate.' },
    ...DROGAS.map((droga) => ({ id: `fabrica_${droga.id}`, nome: `Fábrica de ${droga.nome}`, icone: droga.icone, recurso: `droga:${droga.id}`,
      custoBase: droga.custoFabrica, producaoBase: droga.producaoBase, drogaId: droga.id, descricao: `Produção abstrata de ${droga.nome} para vender ou encaminhar aos estabelecimentos.` }))
  ];

  const AVATARES = ['🕶️', '🧔', '👨‍🦱', '👩‍🦰', '🧕', '👨‍🦲', '👩‍🦱', '🧑‍🦳', '👨‍🎤', '👩‍🎤', '🧑‍🦰', '👨‍🦳'];

  const NOMES_NPC = [
    'Zé Faca', 'Rodrigo Sombra', 'Carlão da Vila', 'Marcinho 220', 'Bianca Veneno',
    'Tuta do Morro', 'Kiko Trinca', 'Leandro Fantasma', 'Dudu Alemão', 'Vini Caveira',
    'Juliana Navalha', 'Paulinho PCC', 'Robson Sete', 'Fábio Raposa', 'Camila Gelo',
    'Nino Corleone', 'Sgt. Arruda', 'Bruno Sinistro', 'Delegado Nogueira', 'Rafa Cobra',
    'Thiago Fumaça', 'Vera Lâmina', 'Edu Tremonha', 'Soraia Punhal', 'Gil Metralha'
  ];

  const FACCOES = ['Comando da Zona Sul', 'Família Bahia', 'Os Invisíveis', 'Rota 66', 'Sindicato Negro', 'Lobos da Capital'];

  // Títulos exibidos conforme o nível do jogador (flavor text)
  const TITULOS = [
    { min: 1, titulo: 'Novato nas ruas' },
    { min: 5, titulo: 'Ladrão de bairro' },
    { min: 10, titulo: 'Criminoso conhecido' },
    { min: 18, titulo: 'Membro de facção' },
    { min: 28, titulo: 'Braço direito' },
    { min: 40, titulo: 'Chefão de quadrilha' },
    { min: 55, titulo: 'Lenda do submundo' },
    { min: 75, titulo: 'Padrinho da cidade' }
  ];

  // Profissões: escolha opcional do jogador que concede bônus permanentes.
  // A chave em "bonus" corresponde ao identificador usado pelos Services
  // (ProfissaoService.bonus(player, chave)) para aplicar o efeito.
  const PROFISSOES = [
    { id: 'assaltante', nome: 'Assaltante', icone: '🔫',
      descricao: '+15% na recompensa de crimes.', bonus: { crimeRecompensa: 0.15 } },
    { id: 'ladrao', nome: 'Ladrão', icone: '🥷',
      descricao: '+10 pontos na chance de sucesso em crimes.', bonus: { crimeChance: 10 } },
    { id: 'traficante', nome: 'Traficante', icone: '🧪',
      descricao: '+25% na produção de drogas (fábricas e pontos de venda).', bonus: { producaoDrogas: 0.25 } },
    { id: 'cafetao', nome: 'Cafetão', icone: '🏮',
      descricao: '+30% na renda passiva do Bordel.', bonus: { rendaBordel: 0.30 } },
    { id: 'gangster', nome: 'Gangster', icone: '💪',
      descricao: '+12% no poder de combate.', bonus: { poderCombate: 0.12 } },
    { id: 'policial_corrupto', nome: 'Policial Corrupto', icone: '👮',
      descricao: '-10% no custo de subornos; as chances seguem o nível escolhido (25%, 50% ou 70%).', bonus: { custoSuborno: -0.10 } },
    { id: 'advogado', nome: 'Advogado', icone: '⚖️',
      descricao: '-30% no custo da fiança.', bonus: { custoFianca: -0.30 } },
    { id: 'juiz', nome: 'Juiz', icone: '👨‍⚖️',
      descricao: '-25% no tempo de prisão ao ser pego em um crime.', bonus: { tempoPrisao: -0.25 } },
    { id: 'politico', nome: 'Político', icone: '🎩',
      descricao: '+20% na produção de todos os negócios.', bonus: { producaoGeral: 0.20 } }
  ];

  // Configuração dos "Pontos de Drogas": territórios de venda que o jogador
  // pode controlar em múltiplas unidades (diferente das propriedades acima,
  // que são únicas). Cada ponto gera dinheiro por hora, mas tem uma chance
  // de "batida policial" ao coletar, que confisca a produção pendente.
  const PONTOS_DROGAS = {
    custoBase: 1800,
    producaoBase: 22,       // dinheiro/hora por nível, por ponto
    custoMultiplicador: 1.4, // cada novo ponto / upgrade fica mais caro
    maxPontos: 5,
    chanceBatida: 10,        // % de chance de perder a produção pendente ao coletar
    horasCapacidade: 10
  };

  Game.Data = { CRIMES, ITENS, PROPRIEDADES, PROFISSOES, PONTOS_DROGAS, DROGAS, PECAS_GARAGEM, AVATARES, NOMES_NPC, FACCOES, TITULOS };

})(window);
