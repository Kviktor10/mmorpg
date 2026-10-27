/**
 * =============================================================================
 * 02-eventbus.js
 * -----------------------------------------------------------------------------
 * Padrão de projeto aplicado: OBSERVER
 *   -> Permite que diferentes partes do jogo (Services, GameState) publiquem
 *      eventos ("jogador.levelUp", "crime.sucesso", etc.) sem conhecer
 *      diretamente quem está "ouvindo" (a UI). Isso desacopla totalmente
 *      a lógica de negócio da camada de apresentação.
 *
 * Padrão de projeto aplicado: SINGLETON
 *   -> Um único barramento de eventos compartilhado por toda a aplicação.
 * =============================================================================
 */
(function (global) {
  'use strict';

  class EventBus {
    constructor() {
      if (EventBus._instance) return EventBus._instance;
      /** @type {Map<string, Set<Function>>} */
      this._listeners = new Map();
      EventBus._instance = this;
    }

    /** Registra um observador para um evento. Retorna função de unsubscribe. */
    on(eventName, callback) {
      if (!this._listeners.has(eventName)) {
        this._listeners.set(eventName, new Set());
      }
      this._listeners.get(eventName).add(callback);
      return () => this.off(eventName, callback);
    }

    off(eventName, callback) {
      if (this._listeners.has(eventName)) {
        this._listeners.get(eventName).delete(callback);
      }
    }

    /** Publica um evento para todos os observadores inscritos. */
    emit(eventName, payload) {
      if (!this._listeners.has(eventName)) return;
      // Copia o set para permitir que listeners se desinscrevam durante o emit
      [...this._listeners.get(eventName)].forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`[EventBus] Erro ao executar listener de "${eventName}":`, err);
        }
      });
    }
  }

  global.Game = global.Game || {};
  global.Game.Core = global.Game.Core || {};
  global.Game.Core.EventBus = new EventBus(); // instância única (Singleton)

  // Catálogo central de nomes de eventos (evita strings mágicas espalhadas)
  global.Game.Events = Object.freeze({
    PLAYER_UPDATED: 'player.updated',
    PLAYER_LEVEL_UP: 'player.levelUp',
    PLAYER_STATE_CHANGED: 'player.stateChanged',
    CRIME_RESOLVED: 'crime.resolved',
    COMBAT_RESOLVED: 'combat.resolved',
    TRAIN_RESOLVED: 'train.resolved',
    SHOP_PURCHASE: 'shop.purchase',
    BANK_OPERATION: 'bank.operation',
    ITEM_EQUIPPED: 'item.equipped',
    GAME_SAVED: 'game.saved',
    GAME_TICK: 'game.tick',
    NAVIGATE: 'ui.navigate'
  });

})(window);
