/**
 * =============================================================================
 * 01-storage.js
 * -----------------------------------------------------------------------------
 * Camada de infraestrutura responsável por toda a persistência do jogo.
 *
 * Padrão de projeto aplicado: SINGLETON
 *   -> Garante uma única instância responsável por falar com o localStorage,
 *      evitando chaves duplicadas / conflitos de leitura-escrita.
 *
 * Padrão de projeto aplicado: MODULE (IIFE)
 *   -> Todo o arquivo é encapsulado numa função autoexecutável, expondo
 *      apenas o necessário no namespace global `Game`, evitando poluição
 *      do escopo global (boas práticas de Código Limpo).
 * =============================================================================
 */
(function (global) {
  'use strict';

  const NAMESPACE = 'cityOfCrims';
  const SAVE_KEY = `${NAMESPACE}:save`;
  const VERSION = '1.0.0';

  class StorageManager {
    constructor() {
      if (StorageManager._instance) {
        return StorageManager._instance;
      }
      this._available = this._checkAvailability();
      StorageManager._instance = this;
    }

    /** Verifica se o localStorage está disponível no ambiente atual. */
    _checkAvailability() {
      try {
        const testKey = `${NAMESPACE}:__test__`;
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
        return true;
      } catch (e) {
        console.warn('[StorageManager] localStorage indisponível. Progresso não será salvo.', e);
        return false;
      }
    }

    get isAvailable() {
      return this._available;
    }

    /** Salva o estado completo do jogo. */
    save(state) {
      if (!this._available) return false;
      try {
        const payload = {
          version: VERSION,
          savedAt: Date.now(),
          data: state
        };
        window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
        return true;
      } catch (e) {
        console.error('[StorageManager] Falha ao salvar:', e);
        return false;
      }
    }

    /** Carrega o estado salvo, ou null se não existir / corrompido. */
    load() {
      if (!this._available) return null;
      try {
        const raw = window.localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed.data || null;
      } catch (e) {
        console.error('[StorageManager] Save corrompido, ignorando.', e);
        return null;
      }
    }

    hasSave() {
      if (!this._available) return false;
      return window.localStorage.getItem(SAVE_KEY) !== null;
    }

    clear() {
      if (!this._available) return;
      window.localStorage.removeItem(SAVE_KEY);
    }
  }

  // Exposição controlada no namespace global do jogo
  global.Game = global.Game || {};
  global.Game.Core = global.Game.Core || {};
  global.Game.Core.StorageManager = new StorageManager(); // instância única (Singleton)

})(window);
