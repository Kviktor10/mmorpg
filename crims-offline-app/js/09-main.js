/**
 * =============================================================================
 * 09-main.js
 * -----------------------------------------------------------------------------
 * Ponto de entrada da aplicação. Responsabilidade única: inicializar a UI
 * quando o DOM estiver pronto. Toda a orquestração real já está encapsulada
 * em Game.Core.UIManager / Game.Core.GameState.
 * =============================================================================
 */
(function (global) {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    try {
      global.Game.Core.UIManager.init();
    } catch (err) {
      console.error('[CityOfCrims] Falha fatal ao iniciar o jogo:', err);
      document.body.innerHTML = `
        <div style="padding:40px;text-align:center;font-family:sans-serif;color:#fff;background:#0a0b0f;min-height:100vh;">
          <h2>😵 Ocorreu um erro ao iniciar o jogo</h2>
          <p style="color:#999;">Verifique o console do navegador para mais detalhes.</p>
        </div>`;
    }
  });

  // Salva automaticamente o progresso antes de fechar/recarregar a página
  window.addEventListener('beforeunload', () => {
    if (global.Game.Core.GameState.player) {
      global.Game.Core.GameState.salvar();
    }
  });

})(window);
