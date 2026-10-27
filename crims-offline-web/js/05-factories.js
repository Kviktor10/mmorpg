/**
 * =============================================================================
 * 05-factories.js
 * -----------------------------------------------------------------------------
 * Padrão de projeto aplicado: FACTORY METHOD
 *   -> Centraliza e encapsula a lógica de criação de objetos complexos
 *      (Item, NPC) a partir dos dados estáticos do catálogo, isolando o
 *      resto do código de detalhes de construção/validação.
 * =============================================================================
 */
(function (global) {
  'use strict';

  const Game = global.Game;
  const { Item, NPC } = Game.Models;
  const { ITENS, NOMES_NPC, FACCOES, AVATARES } = Game.Data;

  class ItemFactory {
    constructor(catalogo) {
      this._catalogo = new Map(catalogo.map((def) => [def.id, def]));
    }

    criar(id) {
      const def = this._catalogo.get(id);
      if (!def) throw new Error(`[ItemFactory] Item desconhecido: ${id}`);
      return new Item(def);
    }

    listarPorTipo(tipo) {
      return [...this._catalogo.values()].filter((d) => d.tipo === tipo);
    }

    listarTodos() {
      return [...this._catalogo.values()];
    }
  }

  class NPCFactory {
    constructor(nomes, faccoes, avatares) {
      this._nomes = nomes;
      this._faccoes = faccoes;
      this._avatares = avatares;
    }

    _randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    _pick(arr) { return arr[this._randInt(0, arr.length - 1)]; }

    /** Cria um NPC com poder proporcional ao nível do jogador (dificuldade relativa). */
    criarParaNivel(nivelReferencia) {
      const nivel = Math.max(1, nivelReferencia + this._randInt(-2, 3));
      const poderBase = nivel * 9 + this._randInt(-10, 15);
      return new NPC({
        id: `npc_${Date.now()}_${this._randInt(1000, 9999)}`,
        nome: this._pick(this._nomes),
        avatar: this._pick(this._avatares),
        nivel,
        poder: Math.max(5, poderBase),
        dinheiro: Math.max(20, nivel * this._randInt(15, 40)),
        faccao: this._pick(this._faccoes)
      });
    }

    /** Gera uma lista (ranking/oponentes) de N NPCs ao redor do nível do jogador. */
    gerarLista(qtd, nivelReferencia) {
      const lista = [];
      for (let i = 0; i < qtd; i++) lista.push(this.criarParaNivel(nivelReferencia));
      return lista.sort((a, b) => b.poder - a.poder);
    }
  }

  Game.Factories = {
    itemFactory: new ItemFactory(ITENS),
    npcFactory: new NPCFactory(NOMES_NPC, FACCOES, AVATARES)
  };

})(window);
