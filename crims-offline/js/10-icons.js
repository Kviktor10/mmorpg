/**
 * =============================================================================
 * 10-icons.js
 * -----------------------------------------------------------------------------
 * Gerenciador de ícones personalizáveis. Permite que o jogador substitua
 * qualquer emoji do jogo (crimes, itens, drogas, peças, negócios, profissões,
 * atributos) por uma imagem PNG própria, ou escolha entre algumas variações
 * de emoji sugeridas. As substituições ficam salvas separadamente no
 * localStorage (não dentro do save da partida), então não interferem no
 * progresso e sobrevivem a "Apagar progresso".
 * =============================================================================
 */
(function (global) {
  'use strict';

  const Game = global.Game;
  const STORAGE_KEY = 'crims_icon_overrides_v1';
  const MAX_SIDE = 96; // px — imagens enviadas são reduzidas para isso antes de salvar

  let cache = null;

  function load() {
    if (cache) return cache;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      cache = raw ? JSON.parse(raw) : {};
    } catch (e) {
      cache = {};
    }
    return cache;
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cache || {})); } catch (e) { /* quota cheia: ignora silenciosamente */ }
  }

  function key(categoria, id) { return `${categoria}:${id}`; }

  /** Redimensiona um arquivo de imagem para um PNG quadrado pequeno (base64). */
  function resizeToDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type || file.type.indexOf('image/') !== 0) {
        reject(new Error('Selecione um arquivo de imagem (PNG, JPG, WEBP...).'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Arquivo de imagem inválido.'));
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = MAX_SIDE;
          canvas.height = MAX_SIDE;
          const ctx = canvas.getContext('2d');
          // "cover": recorta o quadrado central da imagem antes de reduzir
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2;
          const sy = (img.height - side) / 2;
          ctx.drawImage(img, sx, sy, side, side, 0, 0, MAX_SIDE, MAX_SIDE);
          resolve(canvas.toDataURL('image/png'));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  const Icons = {
    /** Retorna a dataURL salva para `categoria:id`, ou null se não houver. */
    get(categoria, id) {
      return load()[key(categoria, id)] || null;
    },

    /** Define/atualiza o ícone de `categoria:id` a partir de um File do input. */
    async setFromFile(categoria, id, file) {
      const dataUrl = await resizeToDataUrl(file);
      load()[key(categoria, id)] = dataUrl;
      persist();
      return dataUrl;
    },

    /** Remove a substituição, voltando ao emoji padrão do catálogo. */
    remove(categoria, id) {
      delete load()[key(categoria, id)];
      persist();
    },

    /** Remove todas as substituições de uma vez. */
    resetAll() {
      cache = {};
      persist();
    },

    hasAny() {
      return Object.keys(load()).length > 0;
    },

    /**
     * HTML para um ícone dentro de uma "caixa" (classes action-icon, inv-icon,
     * prof-icon, avatar-opt...): se houver PNG customizado, preenche a caixa
     * inteira; senão mostra o emoji padrão.
     */
    boxHtml(categoria, obj) {
      const custom = this.get(categoria, obj.id);
      if (custom) return `<img src="${custom}" class="icon-img-box" alt="${obj.nome || ''}">`;
      return obj.icone || '❔';
    },

    /** Versão compacta para uso dentro de texto corrido (ex: "🔫 Pistola"). */
    inlineHtml(categoria, obj) {
      const custom = this.get(categoria, obj.id);
      if (custom) return `<img src="${custom}" class="icon-img-inline" alt="${obj.nome || ''}">`;
      return obj.icone || '❔';
    }
  };

  Game.Icons = Icons;

})(window);
