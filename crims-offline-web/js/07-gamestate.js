/**
 * =============================================================================
 * 07-gamestate.js
 * -----------------------------------------------------------------------------
 * Padrão de projeto aplicado: SINGLETON + FACADE
 *   -> GameState é o único ponto de acesso de alto nível para a UI. Ele
 *      esconde a complexidade de como Player, Services, Factories e
 *      StorageManager se comunicam (Facade), e garante uma única "partida"
 *      ativa por vez (Singleton).
 *
 * Responsabilidades:
 *   - Dono do ciclo de vida do Player (criar, carregar, salvar, autosave)
 *   - Game loop (tick) para regeneração de energia/vida e expiração de estados
 *   - Cache do ranking de NPCs (gerado proceduralmente pela NPCFactory)
 * =============================================================================
 */
(function (global) {
  'use strict';

  const Game = global.Game;
  const { Player } = Game.Models;
  const { itemFactory, npcFactory } = Game.Factories;
  const { regenService } = Game.Services;
  const EventBus = Game.Core.EventBus;
  const Events = Game.Events;
  const Storage = Game.Core.StorageManager;

  const AUTOSAVE_INTERVAL_MS = 15000;
  const TICK_INTERVAL_MS = 1000;
  const NPC_REFRESH_COUNT = 10;

  class GameState {
    constructor() {
      if (GameState._instance) return GameState._instance;
      this.player = null;
      this._npcCache = [];
      this._loopHandle = null;
      this._autosaveHandle = null;
      GameState._instance = this;
    }

    // -------------------- CICLO DE VIDA --------------------
    temSalvoAnterior() {
      return Storage.hasSave();
    }

    novoJogo(nome, avatar, opcoes) {
      this.player = new Player(nome.trim().slice(0, 16) || 'Criminoso', avatar, opcoes || {});
      this._npcCache = npcFactory.gerarLista(NPC_REFRESH_COUNT, this.player.nivel);
      this.salvar();
      this._iniciarLoops();
    }

    carregarJogo() {
      const data = Storage.load();
      if (!data || !data.player) return false;
      this.player = Player.fromJSON(data.player, itemFactory);
      regenService.aplicar(this.player); // aplica progresso offline
      this._npcCache = npcFactory.gerarLista(NPC_REFRESH_COUNT, this.player.nivel);
      this._iniciarLoops();
      return true;
    }

    apagarJogo() {
      this._pararLoops();
      Storage.clear();
      this.player = null;
    }

    salvar() {
      if (!this.player) return;
      const ok = Storage.save({ player: this.player.toJSON() });
      if (ok) EventBus.emit(Events.GAME_SAVED, { at: Date.now() });
    }

    // -------------------- GAME LOOP --------------------
    _iniciarLoops() {
      this._pararLoops();
      this._loopHandle = setInterval(() => this._tick(), TICK_INTERVAL_MS);
      this._autosaveHandle = setInterval(() => this.salvar(), AUTOSAVE_INTERVAL_MS);
    }

    _pararLoops() {
      if (this._loopHandle) clearInterval(this._loopHandle);
      if (this._autosaveHandle) clearInterval(this._autosaveHandle);
      this._loopHandle = null;
      this._autosaveHandle = null;
    }

    _tick() {
      if (!this.player) return;
      regenService.aplicar(this.player);
      EventBus.emit(Events.GAME_TICK, { player: this.player });
    }

    // -------------------- RANKING / NPCs --------------------
    obterOponentes() {
      // Renova parcialmente o cache para sensação de "mundo vivo"
      if (Math.random() < 0.15) {
        this._npcCache = npcFactory.gerarLista(NPC_REFRESH_COUNT, this.player.nivel);
      }
      return this._npcCache;
    }

    // -------------------- METADADOS DE EXIBIÇÃO --------------------
    obterTitulo() {
      const { TITULOS } = Game.Data;
      const nivel = this.player.nivel;
      let titulo = TITULOS[0].titulo;
      for (const t of TITULOS) if (nivel >= t.min) titulo = t.titulo;
      return titulo;
    }
  }

  Game.Core.GameState = new GameState(); // instância única (Singleton)

})(window);
