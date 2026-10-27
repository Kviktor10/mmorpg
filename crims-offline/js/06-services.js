/**
 * =============================================================================
 * 06-services.js
 * -----------------------------------------------------------------------------
 * Camada de SERVIÇOS: contém toda a regra de negócio do jogo. Os serviços
 * recebem um Player e devolvem um "resultado" (DTO simples), sem conhecer
 * nada sobre a UI (Single Responsibility Principle).
 *
 * Padrão de projeto aplicado: STRATEGY
 *   -> O cálculo de chance de sucesso de um crime é delegado a um objeto
 *      "estratégia" intercambiável (ChanceStrategy). Hoje usamos uma única
 *      estratégia padrão, mas o jogo pode plugar outra (ex: "modo difícil")
 *      sem alterar o CrimeService.
 *
 * Princípios de Código Limpo aplicados:
 *   -> Funções pequenas, nomes descritivos em português (domínio do jogo),
 *      sem efeitos colaterais escondidos, retornando sempre um objeto de
 *      resultado explícito ({ sucesso, mensagens, ... }).
 * =============================================================================
 */
(function (global) {
  'use strict';

  const Game = global.Game;
  const EventBus = Game.Core.EventBus;
  const Events = Game.Events;

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // ------------------------------------------------------------------
  // STRATEGY: cálculo de chance de sucesso em crimes
  // ------------------------------------------------------------------
  class ChanceStrategyPadrao {
    calcular(player, crime) {
      const base = 50 + player.respeito * 0.5 + player.inteligencia * 0.6 + player.nivel * 1.2;
      return clamp(Math.round(base - crime.dificuldade), 5, 95);
    }
  }

  // ------------------------------------------------------------------
  // CrimeService
  // ------------------------------------------------------------------
  class CrimeService {
    constructor(chanceStrategy) {
      this._chance = chanceStrategy;
    }

    podeCometer(player, crime) {
      if (!player.state.canAct()) return { ok: false, motivo: `Você está ${player.state.label.toLowerCase()}.` };
      if (player.energia < crime.energia) return { ok: false, motivo: 'Energia insuficiente.' };
      return { ok: true };
    }

    cometer(player, crime) {
      const permissao = this.podeCometer(player, crime);
      if (!permissao.ok) return { sucesso: false, bloqueado: true, mensagem: permissao.motivo };

      player.gastarEnergia(crime.energia);
      player.gastarStamina(3 + Math.ceil(crime.energia / 8));
      const Prof = Game.Services.profissaoService;
      const chanceBase = this._chance.calcular(player, crime);
      const chance = clamp(Math.round(chanceBase + Prof.bonus(player, 'crimeChance')), 5, 97);
      const rolou = rand(1, 100);
      const sucesso = rolou <= chance;

      let resultado;
      if (sucesso) {
        const bonusRecompensa = Prof.bonus(player, 'crimeRecompensa');
        const valor = Math.round(rand(crime.recompensaMin, crime.recompensaMax) * (1 + bonusRecompensa));
        player.dinheiro += valor;
        player.respeito += Math.round(crime.xp * 0.15);
        const subiuNivel = player.ganharXp(crime.xp);
        player.crimesCometidos += 1;
        resultado = {
          sucesso: true, chance, valor, xp: crime.xp, subiuNivel,
          mensagem: `Você cometeu "${crime.nome}" e faturou R$ ${valor}!`
        };
      } else {
        player.crimesFalhos += 1;
        const foiPreso = rand(1, 100) <= 55 + Math.round(crime.dificuldade * 0.3);
        if (foiPreso) {
          const bonusTempo = Prof.bonus(player, 'tempoPrisao'); // ex: Juiz = -0.25 (25% menos tempo)
          const tempoPrisao = Math.max(10, Math.round(crime.tempoPrisao * (1 + bonusTempo)));
          player.entrarEm('preso', tempoPrisao);
          resultado = {
            sucesso: false, chance, preso: true, tempoPrisao,
            mensagem: `Você foi pego tentando "${crime.nome}" e preso!`
          };
        } else {
          resultado = { sucesso: false, chance, preso: false, mensagem: `Você falhou em "${crime.nome}", mas escapou.` };
        }
      }
      EventBus.emit(Events.CRIME_RESOLVED, { player, crime, resultado });
      return resultado;
    }
  }

  // ------------------------------------------------------------------
  // CombatService
  // ------------------------------------------------------------------
  class CombatService {
    custoEnergia() { return 8; }

    podeLutar(player) {
      if (!player.state.canAct()) return { ok: false, motivo: `Você está ${player.state.label.toLowerCase()}.` };
      if (player.energia < this.custoEnergia()) return { ok: false, motivo: 'Energia insuficiente.' };
      if (player.vida < player.vidaMax * 0.15) return { ok: false, motivo: 'Sua vida está muito baixa para lutar.' };
      return { ok: true };
    }

    lutar(player, npc) {
      const permissao = this.podeLutar(player);
      if (!permissao.ok) return { sucesso: false, bloqueado: true, mensagem: permissao.motivo };

      player.gastarEnergia(this.custoEnergia());
      player.gastarStamina(8);
      const bonusPoder = Game.Services.profissaoService.bonus(player, 'poderCombate');
      const poderJogador = player.calcularPoder() * (1 + bonusPoder) * (1 + (rand(-20, 20) / 100));
      const poderNpc = npc.poder * (1 + (rand(-20, 20) / 100));
      const venceu = poderJogador >= poderNpc;

      let resultado;
      if (venceu) {
        const ganho = Math.round(npc.dinheiro * (0.5 + Math.random() * 0.5));
        const xp = 10 + npc.nivel * 2;
        const dano = rand(3, 18);
        player.sofrerDano(dano);
        player.dinheiro += ganho;
        player.respeito += rand(1, 4);
        const subiuNivel = player.ganharXp(xp);
        player.lutasVencidas += 1;
        resultado = {
          sucesso: true, venceu: true, ganho, xp, dano, subiuNivel,
          mensagem: `Você venceu ${npc.nome} e levou R$ ${ganho}!`
        };
      } else {
        const dano = rand(15, 40);
        player.sofrerDano(dano);
        player.lutasPerdidas += 1;
        let hospitalizado = false;
        if (player.vida <= 0) {
          player.vida = 1;
          const tempoHospital = rand(60, 180);
          player.entrarEm('hospital', tempoHospital);
          hospitalizado = true;
        }
        resultado = {
          sucesso: true, venceu: false, dano, hospitalizado,
          mensagem: hospitalizado
            ? `Você apanhou feio de ${npc.nome} e foi parar no hospital!`
            : `Você perdeu a luta para ${npc.nome}.`
        };
      }
      EventBus.emit(Events.COMBAT_RESOLVED, { player, npc, resultado });
      return resultado;
    }
  }

  // ------------------------------------------------------------------
  // TreinoService (academia) — gasta energia para subir atributos
  // ------------------------------------------------------------------
  class TreinoService {
    static ATRIBUTOS = {
      forca: { label: 'Força', icone: '💪' },
      velocidade: { label: 'Velocidade', icone: '🏃' },
      inteligencia: { label: 'Inteligência', icone: '🧠' },
      stamina: { label: 'Stamina', icone: '🔋' }
    };

    custoEnergia() { return 6; }
    ganhoBase() { return rand(1, 3); }

    podeTreinar(player) {
      if (!player.state.canAct()) return { ok: false, motivo: `Você está ${player.state.label.toLowerCase()}.` };
      if (player.energia < this.custoEnergia()) return { ok: false, motivo: 'Energia insuficiente.' };
      return { ok: true };
    }

    treinar(player, atributo) {
      const permissao = this.podeTreinar(player);
      if (!permissao.ok) return { sucesso: false, bloqueado: true, mensagem: permissao.motivo };
      if (!TreinoService.ATRIBUTOS[atributo]) throw new Error('Atributo inválido');

      player.gastarEnergia(this.custoEnergia());
      player.gastarStamina(4);
      const ganho = this.ganhoBase();
      const ganhoEfetivo = atributo === 'stamina' ? ganho * 5 : ganho;
      if (atributo === 'stamina') {
        player.staminaMax += ganhoEfetivo;
        player.stamina = player.staminaMax;
      } else {
        player[atributo] += ganhoEfetivo;
      }
      const xp = 3;
      const subiuNivel = player.ganharXp(xp);
      const resultado = {
        sucesso: true, atributo, ganho: ganhoEfetivo, xp, subiuNivel,
        mensagem: `Treino concluído: +${ganhoEfetivo} em ${TreinoService.ATRIBUTOS[atributo].label}.`
      };
      EventBus.emit(Events.TRAIN_RESOLVED, { player, resultado });
      return resultado;
    }
  }

  // ------------------------------------------------------------------
  // LojaService
  // ------------------------------------------------------------------
  class LojaService {
    constructor(itemFactory) { this._itemFactory = itemFactory; }

    comprar(player, itemId, quantidade = 1) {
      const def = this._itemFactory.listarTodos().find((d) => d.id === itemId);
      if (!def) return { sucesso: false, mensagem: 'Item inexistente.' };
      const qtd = Math.max(1, Math.min(20, Math.floor(Number(quantidade) || 1)));
      const custoTotal = def.preco * qtd;
      if (player.dinheiro < custoTotal) return { sucesso: false, mensagem: `Dinheiro insuficiente. São necessários R$ ${custoTotal} para ${qtd}x.` };
      player.dinheiro -= custoTotal;
      let ultimoItem = null;
      for (let i = 0; i < qtd; i++) {
        ultimoItem = this._itemFactory.criar(itemId);
        player.adicionarItem(ultimoItem);
      }
      const resultado = {
        sucesso: true,
        item: ultimoItem,
        quantidade: qtd,
        mensagem: qtd > 1 ? `Você comprou ${qtd}x "${def.nome}".` : `Você comprou "${def.nome}".`
      };
      EventBus.emit(Events.SHOP_PURCHASE, { player, resultado });
      return resultado;
    }

    /** Vende um item do inventário do jogador por metade do preço de tabela. */
    venderItem(player, uid) {
      const idx = player.inventario.findIndex((i) => i.uid === uid);
      if (idx === -1) return { sucesso: false, mensagem: 'Item não encontrado no inventário.' };
      const item = player.inventario[idx];
      if (item.equipado && player.equipamento[item.tipo] === item) {
        player.equipamento[item.tipo] = null;
      }
      const def = this._itemFactory.listarTodos().find((d) => d.id === item.id);
      const valor = Math.round((def ? def.preco : 0) * 0.5);
      player.dinheiro += valor;
      player.inventario.splice(idx, 1);
      const resultado = { sucesso: true, valor, mensagem: `Você vendeu "${item.nome}" por ${valor > 0 ? 'R$ ' + valor : 'R$ 0'}.` };
      EventBus.emit(Events.SHOP_PURCHASE, { player, resultado });
      return resultado;
    }
  }

  // ------------------------------------------------------------------
  // BancoService
  // ------------------------------------------------------------------
  class BancoService {
    depositar(player, valor) {
      const ok = player.depositar(valor);
      const resultado = { sucesso: ok, mensagem: ok ? `Depositado R$ ${valor}.` : 'Valor inválido.' };
      EventBus.emit(Events.BANK_OPERATION, { player, resultado });
      return resultado;
    }
    sacar(player, valor) {
      const ok = player.sacar(valor);
      const resultado = { sucesso: ok, mensagem: ok ? `Sacado R$ ${valor}.` : 'Valor inválido.' };
      EventBus.emit(Events.BANK_OPERATION, { player, resultado });
      return resultado;
    }
  }

  // ------------------------------------------------------------------
  // NegocioService — compra/evolução de propriedades (negócios do crime
  // organizado) que geram produção passiva (dinheiro ou drogas) com base
  // no tempo real decorrido desde a última coleta.
  // ------------------------------------------------------------------
  class NegocioService {
    static HORAS_CAPACIDADE_MAX = 12; // produção acumula até 12h, depois "transborda" (incentiva visitas)
    static MULTIPLICADOR_CUSTO = 1.55; // custo de cada nível sobe ~55% sobre o anterior

    constructor(catalogo) {
      this._catalogo = new Map(catalogo.map((def) => [def.id, def]));
    }

    listar() { return [...this._catalogo.values()]; }
    obterDef(id) { return this._catalogo.get(id); }

    nivelAtual(player, id) {
      const pr = player.propriedades[id];
      return pr ? pr.nivel : 0;
    }

    /** Custo para adquirir (nivelAlvo=1) ou evoluir até o nível informado. */
    custoParaNivel(def, nivelAlvo) {
      return Math.round(def.custoBase * Math.pow(NegocioService.MULTIPLICADOR_CUSTO, Math.max(0, nivelAlvo - 1)));
    }

    /** Produção/hora, já considerando bônus de profissão (se um player for informado). */
    producaoPorHora(def, nivel, player) {
      if (nivel <= 0) return 0;
      let producao = def.producaoBase * nivel;
      if (player) {
        const Prof = Game.Services.profissaoService;
        producao *= (1 + (Prof.bonus(player, 'producaoGeral') || 0));          // ex: Político
        if (def.recurso === 'drogas' || String(def.recurso).startsWith('droga:')) producao *= (1 + (Prof.bonus(player, 'producaoDrogas') || 0)); // bônus abstrato de produção
        if (def.id === 'bordel') producao *= (1 + (Prof.bonus(player, 'rendaBordel') || 0));         // bônus de renda
        if (def.id === 'casa_jogos' && player.mesasCassino) producao *= (1 + player.mesasCassino * 0.10);
        const equipe = (player.equipeEstabelecimentos || []).filter((item) => item.local === def.id);
        if (equipe.length) producao *= (1 + equipe.reduce((soma, item) => soma + (item.bonus || 0), 0));
      }
      return Math.round(producao);
    }

    capacidadeMaxima(def, nivel, player) {
      return this.producaoPorHora(def, nivel, player) * NegocioService.HORAS_CAPACIDADE_MAX;
    }

    /** Quantidade pendente para coleta (ainda não creditada ao jogador). */
    pendente(player, id) {
      const def = this.obterDef(id);
      const pr = player.propriedades[id];
      if (!def || !pr) return 0;
      const horas = (Date.now() - pr.ultimaColeta) / 3600000;
      const bruto = horas * this.producaoPorHora(def, pr.nivel, player);
      return clamp(bruto, 0, this.capacidadeMaxima(def, pr.nivel, player));
    }

    comprar(player, id) {
      const def = this.obterDef(id);
      if (!def) return { sucesso: false, mensagem: 'Negócio inexistente.' };
      if (player.propriedades[id]) return { sucesso: false, mensagem: 'Você já possui este negócio.' };
      const custo = this.custoParaNivel(def, 1);
      if (player.dinheiro < custo) return { sucesso: false, mensagem: 'Dinheiro insuficiente.' };
      player.dinheiro -= custo;
      player.propriedades[id] = { nivel: 1, ultimaColeta: Date.now(), custoCompra: custo };
      return { sucesso: true, mensagem: `Você adquiriu "${def.nome}"!` };
    }

    upgrade(player, id) {
      const def = this.obterDef(id);
      const pr = player.propriedades[id];
      if (!def || !pr) return { sucesso: false, mensagem: 'Você ainda não possui este negócio.' };
      this.coletar(player, id); // credita produção pendente antes de evoluir, para não perder nada
      const custo = this.custoParaNivel(def, pr.nivel + 1);
      if (player.dinheiro < custo) return { sucesso: false, mensagem: 'Dinheiro insuficiente para melhorar.' };
      player.dinheiro -= custo;
      pr.nivel += 1;
      return { sucesso: true, mensagem: `"${def.nome}" melhorado para o nível ${pr.nivel}!` };
    }

    /** Credita a produção pendente de UM negócio ao jogador. */
    coletar(player, id) {
      const def = this.obterDef(id);
      const pr = player.propriedades[id];
      if (!def || !pr) return { sucesso: false, coletado: 0 };
      const qtd = Math.floor(this.pendente(player, id));
      pr.ultimaColeta = Date.now();
      if (qtd <= 0) return { sucesso: true, coletado: 0 };
      if (def.recurso === 'drogas') { player.drogas += qtd; }
      else if (String(def.recurso).startsWith('droga:')) {
        const drogaId = String(def.recurso).slice('droga:'.length);
        player.estoqueDrogasProduzidas[drogaId] = (player.estoqueDrogasProduzidas[drogaId] || 0) + qtd;
      } else { player.dinheiro += qtd; }
      return { sucesso: true, coletado: qtd, recurso: def.recurso };
    }

    /** Credita a produção pendente de TODOS os negócios do jogador de uma vez. */
    coletarTudo(player) {
      let totalDinheiro = 0, totalDrogas = 0;
      Object.keys(player.propriedades).forEach((id) => {
        const r = this.coletar(player, id);
        if (r.coletado > 0) {
          if (r.recurso === 'drogas' || String(r.recurso).startsWith('droga:')) totalDrogas += r.coletado; else totalDinheiro += r.coletado;
        }
      });
      return { totalDinheiro, totalDrogas };
    }
  }

  // ------------------------------------------------------------------
  // MercadoNegroService — compra/venda de drogas produzidas, com preço
  // que flutua periodicamente (mecânica simples de mercado dinâmico).
  // ------------------------------------------------------------------
  class MercadoNegroService {
    constructor() {
      this.precoMin = 8;
      this.precoMax = 24;
      this.precoAtual = this._gerarPreco();
      this._proximaAtualizacao = Date.now() + this._intervaloMs();
    }

    _intervaloMs() { return 5 * 60 * 1000; } // preço muda a cada 5 minutos
    _gerarPreco() { return Math.round((this.precoMin + Math.random() * (this.precoMax - this.precoMin)) * 10) / 10; }

    atualizar() {
      if (Date.now() >= this._proximaAtualizacao) {
        this.precoAtual = this._gerarPreco();
        this._proximaAtualizacao = Date.now() + this._intervaloMs();
      }
    }

    vender(player, quantidade) {
      this.atualizar();
      const qtd = Math.min(Math.floor(quantidade), Math.floor(player.drogas));
      if (qtd <= 0) return { sucesso: false, mensagem: 'Você não tem drogas suficientes para vender.' };
      const valor = Math.round(qtd * this.precoAtual);
      player.drogas -= qtd;
      player.dinheiro += valor;
      const resultado = { sucesso: true, valor, qtd, mensagem: `Você vendeu ${qtd} un. de drogas por R$ ${valor}.` };
      EventBus.emit(Events.SHOP_PURCHASE, { player, resultado });
      return resultado;
    }
  }

  // ------------------------------------------------------------------
  // ProfissaoService — catálogo de profissões e seus bônus permanentes.
  // Outros serviços consultam `bonus(player, chave)` para aplicar o
  // efeito correspondente (ex: 'crimeChance', 'poderCombate'...).
  // ------------------------------------------------------------------
  class ProfissaoService {
    constructor(catalogo) {
      this._catalogo = new Map(catalogo.map((def) => [def.id, def]));
    }

    listar() { return [...this._catalogo.values()]; }
    obter(id) { return this._catalogo.get(id); }

    /** Retorna o valor do bônus (0 se o jogador não tiver profissão ou ela não afetar essa chave). */
    bonus(player, chave) {
      if (!player || !player.profissao) return 0;
      const def = this.obter(player.profissao);
      return (def && def.bonus && typeof def.bonus[chave] === 'number') ? def.bonus[chave] : 0;
    }

    custoTroca() { return 300; }

    escolher(player, id) {
      const def = this.obter(id);
      if (!def) return { sucesso: false, mensagem: 'Profissão inválida.' };
      if (player.profissao === id) return { sucesso: false, mensagem: `Você já é ${def.nome}.` };
      if (player.profissao) {
        const custo = this.custoTroca();
        if (player.dinheiro < custo) return { sucesso: false, mensagem: `Trocar de profissão custa ${custo}. Dinheiro insuficiente.` };
        player.dinheiro -= custo;
      }
      player.profissao = id;
      return { sucesso: true, mensagem: `Agora você é ${def.nome}! ${def.descricao}` };
    }
  }

  // ------------------------------------------------------------------
  // TerritorioService — "Pontos de Drogas": territórios de venda que o
  // jogador pode controlar em múltiplas unidades (até um limite),
  // diferente das Propriedades (que são únicas). Cada coleta tem uma
  // chance de "batida policial", que confisca a produção pendente —
  // trazendo um elemento de risco condizente com o tema.
  // ------------------------------------------------------------------
  class TerritorioService {
    constructor(config) { this._cfg = config; }

    maxPontos() { return this._cfg.maxPontos; }
    chanceBatida() { return this._cfg.chanceBatida; }

    listar(player) { return player.pontosDrogas; }

    custoParaComprar(player) {
      return Math.round(this._cfg.custoBase * Math.pow(this._cfg.custoMultiplicador, player.pontosDrogas.length));
    }

    custoUpgrade(ponto) {
      return Math.round(this._cfg.custoBase * 0.55 * Math.pow(this._cfg.custoMultiplicador, ponto.nivel));
    }

    producaoPorHora(ponto, player) {
      const Prof = Game.Services.profissaoService;
      let producao = this._cfg.producaoBase * ponto.nivel;
      producao *= (1 + (Prof.bonus(player, 'producaoGeral') || 0));
      producao *= (1 + (Prof.bonus(player, 'producaoDrogas') || 0));
      return Math.round(producao);
    }

    capacidadeMaxima(ponto, player) {
      return this.producaoPorHora(ponto, player) * this._cfg.horasCapacidade;
    }

    pendente(ponto, player) {
      const horas = (Date.now() - ponto.ultimaColeta) / 3600000;
      const bruto = horas * this.producaoPorHora(ponto, player);
      return clamp(bruto, 0, this.capacidadeMaxima(ponto, player));
    }

    comprar(player) {
      if (player.pontosDrogas.length >= this._cfg.maxPontos) {
        return { sucesso: false, mensagem: `Você já controla o máximo de ${this._cfg.maxPontos} pontos de drogas.` };
      }
      const custo = this.custoParaComprar(player);
      if (player.dinheiro < custo) return { sucesso: false, mensagem: 'Dinheiro insuficiente.' };
      player.dinheiro -= custo;
      player.pontosDrogas.push({ uid: `pd_${Date.now()}_${rand(1000, 9999)}`, nivel: 1, ultimaColeta: Date.now() });
      return { sucesso: true, mensagem: 'Novo ponto de drogas conquistado!' };
    }

    upgrade(player, uid) {
      const ponto = player.pontosDrogas.find((pt) => pt.uid === uid);
      if (!ponto) return { sucesso: false, mensagem: 'Ponto não encontrado.' };
      this.coletar(player, uid); // credita pendente antes de evoluir
      const custo = this.custoUpgrade(ponto);
      if (player.dinheiro < custo) return { sucesso: false, mensagem: 'Dinheiro insuficiente para melhorar.' };
      player.dinheiro -= custo;
      ponto.nivel += 1;
      return { sucesso: true, mensagem: `Ponto de drogas melhorado para o nível ${ponto.nivel}!` };
    }

    coletar(player, uid) {
      const ponto = player.pontosDrogas.find((pt) => pt.uid === uid);
      if (!ponto) return { sucesso: false, coletado: 0 };
      const qtd = Math.floor(this.pendente(ponto, player));
      ponto.ultimaColeta = Date.now();
      if (qtd <= 0) return { sucesso: true, coletado: 0 };
      const batida = rand(1, 100) <= this._cfg.chanceBatida;
      if (batida) return { sucesso: true, coletado: 0, batida: true, perdido: qtd };
      player.dinheiro += qtd;
      return { sucesso: true, coletado: qtd, batida: false };
    }
  }

  // ------------------------------------------------------------------
  // PrisaoService — opções para sair da cadeia antes do tempo:
  //  - Fiança: custo mais alto, mas liberação garantida.
  //  - Suborno: mais barato, porém arriscado (chance de ser enganado,
  //    perdendo o dinheiro e ainda ganhando tempo extra de prisão).
  // ------------------------------------------------------------------
  class PrisaoService {
    custoFianca(player) {
      const seg = player.state.secondsRemaining();
      const bonus = Game.Services.profissaoService.bonus(player, 'custoFianca');
      const custo = Math.round(Math.max(60, seg * 2.4) * (1 + bonus));
      return Math.max(30, custo);
    }

    custoSuborno(player, nivel = 'baixo') {
      const seg = player.state.secondsRemaining();
      const multiplicadores = { baixo: 1.1, medio: 2.5, alto: 4.0 };
      const bonus = Game.Services.profissaoService.bonus(player, 'custoSuborno');
      return Math.max(20, Math.round(seg * (multiplicadores[nivel] || multiplicadores.baixo) * (1 + bonus)));
    }

    chanceSuborno(player, nivel = 'baixo') {
      const chances = { baixo: 25, medio: 50, alto: 70 };
      return chances[nivel] || chances.baixo;
    }

    pagarFianca(player) {
      if (player.state.key !== 'preso') return { sucesso: false, mensagem: 'Você não está preso.' };
      const custo = this.custoFianca(player);
      if (player.dinheiro < custo) return { sucesso: false, mensagem: 'Dinheiro insuficiente para pagar a fiança.' };
      player.dinheiro -= custo;
      player.liberar();
      return { sucesso: true, mensagem: `Fiança paga! Você foi liberado por R$ ${custo}.` };
    }

    subornar(player, nivel = 'baixo') {
      if (player.state.key !== 'preso') return { sucesso: false, mensagem: 'Você não está preso.' };
      if (!['baixo', 'medio', 'alto'].includes(nivel)) nivel = 'baixo';
      const custo = this.custoSuborno(player, nivel);
      if (player.dinheiro < custo) return { sucesso: false, mensagem: 'Dinheiro insuficiente para subornar.' };
      player.dinheiro -= custo;
      const chance = this.chanceSuborno(player, nivel);
      const sucesso = rand(1, 100) <= chance;
      if (sucesso) {
        player.liberar();
        return { sucesso: true, enganado: false, custo, chance, nivel, mensagem: `Suborno aceito (${chance}% de chance). Você foi liberado por R$ ${custo}.` };
      }
      const tempoExtra = rand(20, 60);
      player.estadoFim = (player.estadoFim || Date.now()) + tempoExtra * 1000;
      return { sucesso: true, enganado: true, custo, chance, nivel, tempoExtra, mensagem: `Suborno recusado: você perdeu R$ ${custo} e sua pena aumentou em ${tempoExtra}s.` };
    }
  }

  // ------------------------------------------------------------------
  // RegenService — regeneração passiva de vida/energia conforme o tempo
  // ------------------------------------------------------------------
  class RegenService {
    static SEGUNDOS_POR_ENERGIA = 180; // 1 energia a cada 3 minutos
    static SEGUNDOS_POR_VIDA = 300;    // 1 vida a cada 5 minutos (fora do hospital)

    aplicar(player) {
      const agora = Date.now();
      const deltaSeg = Math.max(0, (agora - player.ultimoTick) / 1000);
      if (deltaSeg <= 0) return;

      player.verificarExpiracaoEstado();
      if (player.energia < player.energiaMax) {
        player.energia = clamp(player.energia + deltaSeg / RegenService.SEGUNDOS_POR_ENERGIA, 0, player.energiaMax);
      }
      if (player.state.key !== 'hospital' && player.vida < player.vidaMax) {
        player.vida = clamp(player.vida + deltaSeg / RegenService.SEGUNDOS_POR_VIDA, 0, player.vidaMax);
      }
      if (player.stamina < player.staminaMax) {
        player.stamina = clamp(player.stamina + deltaSeg / 90, 0, player.staminaMax);
      }
      player.ultimoTick = agora;
    }
  }

  // ------------------------------------------------------------------
  // AdvisorAI — heurística simples de "inteligência artificial" baseada
  // em regras que analisa o estado do jogador e sugere a próxima ação.
  // (IA simbólica / sistema especialista: não depende de rede nem de
  // bibliotecas externas, funcionando 100% offline.)
  // ------------------------------------------------------------------
  class AdvisorAI {
    gerarDica(player, context) {
      const st = player.state;
      if (st.key === 'preso') {
        return `Você está preso por mais ${st.secondsRemaining()}s. Toque na faixa vermelha no topo para pagar fiança ou tentar subornar o policial.`;
      }
      if (!player.profissao) {
        return 'Você ainda não escolheu uma profissão. Vá em Perfil → Editar e escolha uma para ganhar bônus permanentes.';
      }
      if (['hospital', 'doente', 'overdose'].includes(st.key)) {
        return `Seu personagem está em recuperação (${st.secondsRemaining()}s restantes). Consulte a seção Negócios ou use um medicamento de tratamento quando permitido para reduzir a espera.`;
      }
      if (player.vida < player.vidaMax * 0.3) {
        return 'Sua vida está baixa! Use um kit médico ou descanse antes de arriscar uma luta.';
      }
      if (player.energia < 6) {
        return 'Energia quase no fim. Espere regenerar ou tome um energético para continuar ativo.';
      }
      const melhorEquip = ['arma', 'protecao', 'veiculo'].find((slot) => !player.equipamento[slot]);
      if (melhorEquip && player.dinheiro > 80) {
        return `Você não tem nenhum item de "${melhorEquip}" equipado. Dê uma olhada na loja para ficar mais forte.`;
      }
      if (player.drogas >= 20) {
        return `Você tem ${Math.floor(player.drogas)} unidades de droga em estoque. Venda no Mercado Negro antes que o preço caia.`;
      }
      const negocios = Game.Services.negocioService;
      const negocioParado = Object.keys(player.propriedades).find((id) => negocios.pendente(player, id) >= negocios.capacidadeMaxima(negocios.obterDef(id), player.propriedades[id].nivel, player) * 0.8);
      if (negocioParado) {
        const def = negocios.obterDef(negocioParado);
        return `"${def.nome}" está quase no limite de armazenamento. Vá em Negócios e colete a produção.`;
      }
      if (Object.keys(player.propriedades).length === 0 && player.dinheiro > 1000) {
        return 'Invista em um negócio (fábrica de drogas, bordel, garagem...) para ter renda passiva mesmo offline.';
      }
      if (player.dinheiro > 400 && player.banco < player.dinheiro) {
        return 'Você está com muito dinheiro em mãos. Deposite no banco para proteger seu patrimônio.';
      }
      if (player.respeito < player.nivel * 5) {
        return 'Seu respeito está baixo para o seu nível. Cometer crimes e vencer lutas aumenta seu respeito.';
      }
      const dicasGerais = [
        'Treine seus atributos na academia regularmente para encarar crimes mais arriscados.',
        'Crimes de risco alto rendem muito mais, mas aumentam a chance de prisão — avalie sua energia.',
        'Fique de olho no ranking de criminosos para saber se está pronto para desafiar os mais fortes.',
        'Equipamentos melhores aumentam seu poder de combate — invista parte dos seus lucros na loja.'
      ];
      return dicasGerais[Math.floor(Math.random() * dicasGerais.length)];
    }
  }

  Game.Services = {
    crimeService: new CrimeService(new ChanceStrategyPadrao()),
    combatService: new CombatService(),
    treinoService: new TreinoService(),
    lojaService: new LojaService(Game.Factories.itemFactory),
    bancoService: new BancoService(),
    negocioService: new NegocioService(Game.Data.PROPRIEDADES),
    territorioService: new TerritorioService(Game.Data.PONTOS_DROGAS),
    mercadoNegroService: new MercadoNegroService(),
    prisaoService: new PrisaoService(),
    profissaoService: new ProfissaoService(Game.Data.PROFISSOES),
    regenService: new RegenService(),
    advisorAI: new AdvisorAI()
  };

})(window);
