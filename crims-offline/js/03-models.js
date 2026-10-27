/**
 * =============================================================================
 * 03-models.js
 * -----------------------------------------------------------------------------
 * Camada de MODELOS (POO pura): entidades de domínio do jogo.
 *
 * Padrão de projeto aplicado: STATE
 *   -> O "estado" do jogador (Livre / Preso / Hospitalizado) é modelado como
 *      uma hierarquia de classes (PlayerState) em vez de um emaranhado de
 *      "if/else" espalhado pelo código. Cada estado sabe se o jogador pode
 *      agir, qual rótulo exibir e quanto tempo falta para mudar de estado.
 * =============================================================================
 */
(function (global) {
  'use strict';

  const Game = global.Game;

  // ------------------------------------------------------------------
  // STATE PATTERN — estados possíveis do jogador
  // ------------------------------------------------------------------
  class PlayerState {
    constructor(player) { this.player = player; }
    get key() { throw new Error('Não implementado'); }
    get label() { throw new Error('Não implementado'); }
    canAct() { return true; }
    /** Segundos restantes até o estado terminar (0 se não aplicável). */
    secondsRemaining() {
      const until = this.player.estadoFim;
      if (!until) return 0;
      return Math.max(0, Math.round((until - Date.now()) / 1000));
    }
    /** Verifica se o estado já deveria ter terminado (chamado a cada tick). */
    isExpired() {
      return this.player.estadoFim !== null && Date.now() >= this.player.estadoFim;
    }
  }

  class FreeState extends PlayerState {
    get key() { return 'livre'; }
    get label() { return 'Livre nas ruas'; }
    canAct() { return true; }
  }

  class JailState extends PlayerState {
    get key() { return 'preso'; }
    get label() { return 'Preso'; }
    canAct() { return false; }
  }

  class HospitalState extends PlayerState {
    get key() { return 'hospital'; }
    get label() { return 'No hospital'; }
    canAct() { return false; }
  }

  class IllnessState extends PlayerState {
    get key() { return 'doente'; }
    get label() { return 'Doente'; }
    canAct() { return false; }
  }

  class OverdoseState extends PlayerState {
    get key() { return 'overdose'; }
    get label() { return 'Em recuperação'; }
    canAct() { return false; }
  }

  const STATE_CLASSES = { livre: FreeState, preso: JailState, hospital: HospitalState, doente: IllnessState, overdose: OverdoseState };

  // ------------------------------------------------------------------
  // ITEM — representa uma arma, proteção, veículo ou consumível
  // ------------------------------------------------------------------
  class Item {
    constructor({ id, nome, tipo, icone, preco, descricao, efeitos }) {
      this.id = id;                 // id do catálogo (ex: 'faca')
      this.uid = Item._nextUid++;   // identificador único da instância no inventário
      this.nome = nome;
      this.tipo = tipo;             // 'arma' | 'protecao' | 'veiculo' | 'consumivel'
      this.icone = icone;
      this.preco = preco;
      this.descricao = descricao;
      this.efeitos = efeitos || {}; // ex: { ataque: 5 }, { vida: 30 } (consumível)
    }

    get isEquipavel() {
      return ['arma', 'protecao', 'veiculo'].includes(this.tipo);
    }

    get isConsumivel() {
      return this.tipo === 'consumivel';
    }

    toJSON() {
      return { id: this.id, uid: this.uid, equipado: !!this.equipado };
    }
  }
  Item._nextUid = 1;

  // ------------------------------------------------------------------
  // NPC — oponente gerado proceduralmente (pela NPCFactory)
  // ------------------------------------------------------------------
  class NPC {
    constructor({ id, nome, avatar, nivel, poder, dinheiro, faccao }) {
      this.id = id;
      this.nome = nome;
      this.avatar = avatar;
      this.nivel = nivel;
      this.poder = poder;
      this.dinheiro = dinheiro;
      this.faccao = faccao;
    }
  }

  // ------------------------------------------------------------------
  // PLAYER — entidade central do jogo
  // ------------------------------------------------------------------
  class Player {
    constructor(nome, avatar, opcoes) {
      opcoes = opcoes || {};
      this.nome = nome;
      this.avatar = avatar;
      this.fotoUrl = opcoes.fotoUrl || null; // dataURL (base64) de foto de perfil, opcional
      this.idade = opcoes.idade || 25;
      this.profissao = opcoes.profissao || null; // id do catálogo Game.Data.PROFISSOES

      this.nivel = 1;
      this.xp = 0;

      this.vidaMax = 100;
      this.vida = 100;
      this.energiaMax = 50;
      this.energia = 50;
      this.staminaMax = 100;
      this.stamina = 100;

      // Atributos primários
      this.forca = 5;
      this.velocidade = 5;
      this.inteligencia = 5;
      this.respeito = 0;

      this.dinheiro = 250;
      this.banco = 0;
      this.drogas = 0;            // estoque genérico legado, mantido para saves antigos
      this.estoqueDrogasCompradas = {};   // produtos adquiridos no fornecedor (inventário do jogador)
      this.estoqueDrogasProduzidas = {};  // produção recolhida das fábricas
      this.estoqueDrogasBoate = {};       // mercadoria já transferida para a boate
      this.estoqueDrogasPontos = {};      // mercadoria transferida para pontos de venda
      this.estoquePecas = {};             // peças compradas para revenda na garagem
      this.mesasCassino = 0;
      this.equipeEstabelecimentos = [];   // contratos de equipes adultas, nunca pessoas como mercadoria
      this.doencaTipo = null;

      /** @type {Object<string,{nivel:number, ultimaColeta:number}>} negócios/propriedades que o jogador possui */
      this.propriedades = {};

      /** @type {Array<{uid:string, nivel:number, ultimaColeta:number}>} territórios de venda de drogas */
      this.pontosDrogas = [];

      this.inventario = [];       // Array<Item>
      this.equipamento = { arma: null, protecao: null, veiculo: null };

      this.estadoAtual = 'livre'; // livre | preso | hospital
      this.estadoFim = null;      // timestamp (ms) de término, ou null

      this.crimesCometidos = 0;
      this.crimesFalhos = 0;
      this.lutasVencidas = 0;
      this.lutasPerdidas = 0;

      this.criadoEm = Date.now();
      this.ultimoTick = Date.now();
    }

    // -------------------- STATE PATTERN: fábrica do estado atual --------------------
    get state() {
      const Cls = STATE_CLASSES[this.estadoAtual] || FreeState;
      return new Cls(this);
    }

    entrarEm(estado, duracaoSegundos) {
      this.estadoAtual = estado;
      this.estadoFim = duracaoSegundos ? Date.now() + duracaoSegundos * 1000 : null;
      Game.Core.EventBus.emit(Game.Events.PLAYER_STATE_CHANGED, { player: this });
    }

    liberar() {
      this.estadoAtual = 'livre';
      this.estadoFim = null;
      Game.Core.EventBus.emit(Game.Events.PLAYER_STATE_CHANGED, { player: this });
    }

    /** Verifica expiração de prisão/hospital; cura ao sair do hospital. */
    verificarExpiracaoEstado() {
      const st = this.state;
      if (st.key !== 'livre' && st.isExpired()) {
        if (st.key === 'hospital') this.vida = this.vidaMax;
        if (st.key === 'doente') this.doencaTipo = null;
        if (st.key === 'overdose') { this.energia = Math.min(this.energia, 10); this.stamina = Math.max(10, this.stamina); }
        this.liberar();
      }
    }

    // -------------------- XP / NÍVEL --------------------
    xpParaProximoNivel() {
      return Math.round(100 * this.nivel * 1.45);
    }

    ganharXp(quantidade) {
      this.xp += quantidade;
      let subiu = false;
      while (this.xp >= this.xpParaProximoNivel()) {
        this.xp -= this.xpParaProximoNivel();
        this.nivel += 1;
        this.vidaMax += 8;
        this.energiaMax += 3;
        this.vida = this.vidaMax;
        this.energia = Math.min(this.energiaMax, this.energia + 10);
        subiu = true;
      }
      if (subiu) Game.Core.EventBus.emit(Game.Events.PLAYER_LEVEL_UP, { player: this });
      return subiu;
    }

    // -------------------- RECURSOS --------------------
    gastarEnergia(qtd) {
      if (this.energia < qtd) return false;
      this.energia -= qtd;
      return true;
    }

    gastarStamina(qtd) {
      this.stamina = Math.max(0, this.stamina - Math.max(0, qtd));
      return true;
    }

    curar(qtd) { this.vida = Math.min(this.vidaMax, this.vida + qtd); }
    sofrerDano(qtd) { this.vida = Math.max(0, this.vida - qtd); }

    depositar(qtd) {
      if (qtd <= 0 || qtd > this.dinheiro) return false;
      this.dinheiro -= qtd; this.banco += qtd; return true;
    }
    sacar(qtd) {
      if (qtd <= 0 || qtd > this.banco) return false;
      this.banco -= qtd; this.dinheiro += qtd; return true;
    }

    // -------------------- PODER DE COMBATE --------------------
    /** Calcula o "poder" total do jogador considerando atributos + equipamentos. */
    calcularPoder() {
      let base = this.forca * 2.2 + this.velocidade * 1.6 + this.inteligencia * 1.1 + this.nivel * 3;
      // Baixa stamina reduz discretamente a eficiência em combate (até -20%).
      base *= 0.8 + 0.2 * (this.stamina / Math.max(1, this.staminaMax));
      Object.values(this.equipamento).forEach((item) => {
        if (item && item.efeitos) {
          base += (item.efeitos.ataque || 0) + (item.efeitos.defesa || 0) + (item.efeitos.velocidade || 0);
        }
      });
      return Math.round(base);
    }

    // -------------------- INVENTÁRIO --------------------
    adicionarItem(item) {
      this.inventario.push(item);
    }

    equiparItem(uid) {
      const item = this.inventario.find((i) => i.uid === uid);
      if (!item || !item.isEquipavel) return false;
      // desequipa item anterior do mesmo slot
      const slot = item.tipo;
      if (this.equipamento[slot]) this.equipamento[slot].equipado = false;
      this.equipamento[slot] = item;
      item.equipado = true;
      Game.Core.EventBus.emit(Game.Events.ITEM_EQUIPPED, { player: this, item });
      return true;
    }

    consumirItem(uid) {
      const idx = this.inventario.findIndex((i) => i.uid === uid);
      if (idx === -1) return false;
      const item = this.inventario[idx];
      if (!item.isConsumivel) return false;
      // Estados incapacitantes bloqueiam consumo recreativo; medicamento só trata doença/overdose.
      if (!this.state.canAct() && !item.efeitos.tratarEstado) return false;
      if (item.efeitos.tratarEstado && !['doente', 'overdose'].includes(this.estadoAtual)) return false;
      if (item.efeitos.vida) this.curar(item.efeitos.vida);
      if (item.efeitos.energia) this.energia = Math.max(0, Math.min(this.energiaMax, this.energia + item.efeitos.energia));
      if (item.efeitos.stamina) this.stamina = Math.max(0, Math.min(this.staminaMax, this.stamina + item.efeitos.stamina));
      ['forca', 'velocidade', 'inteligencia'].forEach((atributo) => {
        if (item.efeitos[atributo]) this[atributo] += item.efeitos[atributo];
      });
      this.ultimoEventoConsumo = { nome: item.nome, overdose: false };
      if (item.efeitos.tratarEstado && ['doente', 'overdose'].includes(this.estadoAtual)) {
        this.doencaTipo = null; this.liberar();
        this.vida = Math.min(this.vidaMax, this.vida + 10);
      } else if (item.efeitos.riscoOverdose && Math.random() * 100 < item.efeitos.riscoOverdose) {
        this.ultimoEventoConsumo.overdose = true;
        this.entrarEm('overdose', item.efeitos.tempoOverdose || 90);
      }
      this.inventario.splice(idx, 1);
      return true;
    }

    // -------------------- SERIALIZAÇÃO --------------------
    toJSON() {
      return {
        nome: this.nome, avatar: this.avatar, fotoUrl: this.fotoUrl,
        idade: this.idade, profissao: this.profissao,
        nivel: this.nivel, xp: this.xp,
        vidaMax: this.vidaMax, vida: this.vida,
        energiaMax: this.energiaMax, energia: this.energia,
        staminaMax: this.staminaMax, stamina: this.stamina,
        forca: this.forca, velocidade: this.velocidade, inteligencia: this.inteligencia, respeito: this.respeito,
        dinheiro: this.dinheiro, banco: this.banco, drogas: this.drogas,
        estoqueDrogasCompradas: this.estoqueDrogasCompradas,
        estoqueDrogasProduzidas: this.estoqueDrogasProduzidas,
        estoqueDrogasBoate: this.estoqueDrogasBoate,
        estoqueDrogasPontos: this.estoqueDrogasPontos,
        estoquePecas: this.estoquePecas, mesasCassino: this.mesasCassino,
        equipeEstabelecimentos: this.equipeEstabelecimentos, doencaTipo: this.doencaTipo,
        propriedades: this.propriedades, pontosDrogas: this.pontosDrogas,
        inventario: this.inventario.map((i) => ({ id: i.id, uid: i.uid, equipado: !!i.equipado })),
        equipamento: {
          arma: this.equipamento.arma ? this.equipamento.arma.uid : null,
          protecao: this.equipamento.protecao ? this.equipamento.protecao.uid : null,
          veiculo: this.equipamento.veiculo ? this.equipamento.veiculo.uid : null
        },
        estadoAtual: this.estadoAtual, estadoFim: this.estadoFim,
        crimesCometidos: this.crimesCometidos, crimesFalhos: this.crimesFalhos,
        lutasVencidas: this.lutasVencidas, lutasPerdidas: this.lutasPerdidas,
        criadoEm: this.criadoEm, ultimoTick: this.ultimoTick
      };
    }

    /** Reconstrói um Player a partir do JSON salvo (usa a ItemFactory p/ itens). */
    static fromJSON(json, itemFactory) {
      const p = new Player(json.nome, json.avatar, { fotoUrl: json.fotoUrl, idade: json.idade, profissao: json.profissao });
      Object.assign(p, {
        nivel: json.nivel, xp: json.xp,
        vidaMax: json.vidaMax, vida: json.vida,
        energiaMax: json.energiaMax, energia: json.energia,
        staminaMax: json.staminaMax || 100, stamina: json.stamina == null ? 100 : json.stamina,
        forca: json.forca, velocidade: json.velocidade, inteligencia: json.inteligencia, respeito: json.respeito,
        dinheiro: json.dinheiro, banco: json.banco,
        drogas: json.drogas || 0,                     // fallback p/ saves antigos sem o sistema de negócios
        estoqueDrogasCompradas: json.estoqueDrogasCompradas || {},
        estoqueDrogasProduzidas: json.estoqueDrogasProduzidas || {},
        estoqueDrogasBoate: json.estoqueDrogasBoate || {},
        estoqueDrogasPontos: json.estoqueDrogasPontos || {},
        estoquePecas: json.estoquePecas || {}, mesasCassino: json.mesasCassino || 0,
        equipeEstabelecimentos: json.equipeEstabelecimentos || [], doencaTipo: json.doencaTipo || null,
        propriedades: json.propriedades || {},
        pontosDrogas: json.pontosDrogas || [],         // fallback p/ saves antigos sem territórios de tráfico
        estadoAtual: json.estadoAtual, estadoFim: json.estadoFim,
        crimesCometidos: json.crimesCometidos, crimesFalhos: json.crimesFalhos,
        lutasVencidas: json.lutasVencidas, lutasPerdidas: json.lutasPerdidas,
        criadoEm: json.criadoEm, ultimoTick: json.ultimoTick || Date.now()
      });
      p.inventario = (json.inventario || []).map((i) => {
        const item = itemFactory.criar(i.id);
        item.uid = i.uid;
        item.equipado = i.equipado;
        return item;
      });
      Item._nextUid = Math.max(Item._nextUid, ...p.inventario.map((i) => i.uid + 1), 1);
      if (json.equipamento) {
        ['arma', 'protecao', 'veiculo'].forEach((slot) => {
          const uid = json.equipamento[slot];
          if (uid) p.equipamento[slot] = p.inventario.find((i) => i.uid === uid) || null;
        });
      }
      return p;
    }
  }

  Game.Models = { Player, Item, NPC, PlayerState, FreeState, JailState, HospitalState, IllnessState, OverdoseState };

})(window);
