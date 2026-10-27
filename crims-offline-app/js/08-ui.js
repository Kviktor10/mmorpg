/**
 * =============================================================================
 * 08-ui.js
 * -----------------------------------------------------------------------------
 * Camada de APRESENTAÇÃO. Único arquivo que manipula o DOM diretamente,
 * aplicando separação de camadas (Model-Service-UI, similar a um MVC):
 *   - Models (03)  -> dados e regras intrínsecas da entidade
 *   - Services (06)-> regras de negócio / casos de uso
 *   - GameState(07)-> orquestração + persistência (Facade)
 *   - UI (aqui)    -> apenas renderiza e captura eventos do usuário
 *
 * A UI nunca manipula o Player diretamente: sempre passa pelos Services.
 * Isso mantém o código limpo, testável e de fácil manutenção.
 * =============================================================================
 */
(function (global) {
  'use strict';

  const Game = global.Game;
  const GameState = Game.Core.GameState;
  const EventBus = Game.Core.EventBus;
  const Events = Game.Events;
  const Services = Game.Services;
  const { CRIMES, ITENS, AVATARES } = Game.Data;

  // -------------------- HELPERS DE FORMATAÇÃO --------------------
  const fmtMoney = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  const fmtTime = (s) => {
    if (s <= 0) return '0s';
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };
  const riskLabel = { baixo: 'Risco baixo', medio: 'Risco médio', alto: 'Risco alto' };

  class UIManager {
    constructor() {
      this.$ = {}; // cache de elementos DOM
      this.currentScreen = 'dashboard';
      this.selectedAvatar = AVATARES[0];
      this.bootFotoUrl = null;
      this.lojaTabAtiva = 'arma';
      this.perfilTabAtiva = 'status';
      this._tickCount = 0;
    }

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================
    init() {
      this._cacheDom();
      this._bindBootScreen();
      this._bindNav();
      this._bindEventBus();
      this._renderAvatarPicker();
      this._decideBootView();
    }

    _cacheDom() {
      const ids = [
        'screen-boot', 'boot-new', 'input-nome', 'input-idade', 'avatar-picker',
        'btn-foto-boot', 'input-foto-boot',
        'btn-start-game', 'btn-continue-game', 'btn-reset-game',
        'main-app', 'player-avatar', 'player-name', 'player-title',
        'stat-dinheiro', 'stat-banco', 'label-vida', 'bar-vida',
        'label-energia', 'bar-energia', 'label-stamina', 'bar-stamina', 'label-nivel', 'label-xp', 'bar-xp',
        'status-banner', 'screen-content', 'bottom-nav',
        'modal-overlay', 'modal-box', 'toast-container'
      ];
      ids.forEach((id) => { this.$[id] = document.getElementById(id); });
    }

    // ============================================================
    // TELA DE BOOT (criação / continuar)
    // ============================================================
    _decideBootView() {
      if (GameState.temSalvoAnterior()) {
        this.$['boot-new'].classList.add('hidden');
        this.$['btn-continue-game'].classList.remove('hidden');
        this.$['btn-reset-game'].classList.remove('hidden');
      } else {
        this.$['boot-new'].classList.remove('hidden');
        this.$['btn-continue-game'].classList.add('hidden');
        this.$['btn-reset-game'].classList.add('hidden');
      }
    }

    _renderAvatarPicker() {
      const el = this.$['avatar-picker'];
      el.innerHTML = AVATARES.map((a, i) =>
        `<div class="avatar-opt ${i === 0 ? 'selected' : ''}" data-avatar="${a}">${a}</div>`
      ).join('');
      el.querySelectorAll('.avatar-opt').forEach((opt) => {
        opt.addEventListener('click', () => {
          el.querySelectorAll('.avatar-opt').forEach((o) => o.classList.remove('selected'));
          opt.classList.add('selected');
          this.selectedAvatar = opt.dataset.avatar;
        });
      });
    }

    /**
     * Lê um arquivo de imagem, recorta em quadrado e redimensiona para
     * 160x160px via <canvas>, devolvendo um dataURL JPEG leve (evita
     * estourar a cota do localStorage com fotos grandes).
     */
    _processarFoto(file, callback) {
      if (!file) return;
      if (!file.type || !file.type.startsWith('image/')) {
        this.toast('Selecione um arquivo de imagem válido.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const TAM = 160;
          const canvas = document.createElement('canvas');
          canvas.width = TAM; canvas.height = TAM;
          const ctx = canvas.getContext('2d');
          const lado = Math.min(img.width, img.height);
          const sx = (img.width - lado) / 2;
          const sy = (img.height - lado) / 2;
          ctx.drawImage(img, sx, sy, lado, lado, 0, 0, TAM, TAM);
          callback(canvas.toDataURL('image/jpeg', 0.72));
        };
        img.onerror = () => this.toast('Não foi possível carregar essa imagem.', 'error');
        img.src = e.target.result;
      };
      reader.onerror = () => this.toast('Falha ao ler o arquivo de imagem.', 'error');
      reader.readAsDataURL(file);
    }

    _bindBootScreen() {
      this.$['btn-foto-boot'].addEventListener('click', () => this.$['input-foto-boot'].click());
      this.$['input-foto-boot'].addEventListener('change', (e) => {
        this._processarFoto(e.target.files[0], (dataUrl) => {
          this.bootFotoUrl = dataUrl;
          this.$['btn-foto-boot'].textContent = '✅ Foto selecionada (substituirá o avatar)';
          this.toast('Foto carregada!', 'success');
        });
      });

      this.$['btn-start-game'].addEventListener('click', () => {
        const nome = this.$['input-nome'].value.trim();
        if (!nome) { this.toast('Digite um nome para seu personagem.', 'error'); return; }
        const idade = parseInt(this.$['input-idade'].value, 10);
        if (!idade || idade < 18 || idade > 90) { this.toast('Informe uma idade válida (mínimo 18 anos).', 'error'); return; }
        GameState.novoJogo(nome, this.selectedAvatar, { idade, fotoUrl: this.bootFotoUrl });
        this._entrarNoJogo();
        this.toast(`Bem-vindo à vida do crime, ${nome}!`, 'success');
      });

      this.$['btn-continue-game'].addEventListener('click', () => {
        if (GameState.carregarJogo()) this._entrarNoJogo();
        else this.toast('Não foi possível carregar o save.', 'error');
      });

      this.$['btn-reset-game'].addEventListener('click', () => {
        this.confirmar('Apagar progresso?', 'Essa ação não pode ser desfeita. Todo o progresso será perdido.', () => {
          GameState.apagarJogo();
          this._decideBootView();
          this.toast('Progresso apagado.', 'info');
        });
      });
    }

    _entrarNoJogo() {
      this.$['screen-boot'].classList.add('hidden');
      this.$['main-app'].classList.remove('hidden');
      this.refreshHeader();
      this.navigate('dashboard');
    }

    // ============================================================
    // NAVEGAÇÃO
    // ============================================================
    _bindNav() {
      this.$['bottom-nav'].querySelectorAll('.nav-btn').forEach((btn) => {
        btn.addEventListener('click', () => this.navigate(btn.dataset.screen));
      });
    }

    navigate(screen) {
      this.currentScreen = screen;
      this.$['bottom-nav'].querySelectorAll('.nav-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.screen === screen);
      });
      this.render();
      this.$['screen-content'].scrollTop = 0;
    }

    render() {
      const renderers = {
        dashboard: () => this.renderDashboard(),
        crimes: () => this.renderCrimes(),
        combate: () => this.renderCombate(),
        academia: () => this.renderAcademia(),
        negocios: () => this.renderNegocios(),
        loja: () => this.renderLoja(),
        perfil: () => this.renderPerfil()
      };
      (renderers[this.currentScreen] || renderers.dashboard)();
    }

    // ============================================================
    // EVENTOS GLOBAIS (Observer) — mantém header e status sempre atualizados
    // ============================================================
    _bindEventBus() {
      const atualizar = () => this.refreshHeader();
      EventBus.on(Events.GAME_TICK, atualizar);
      EventBus.on(Events.GAME_TICK, () => {
        this._tickCount += 1;
        if (this.currentScreen === 'negocios' && this._tickCount % 5 === 0) this.renderNegocios();
      });
      EventBus.on(Events.PLAYER_STATE_CHANGED, atualizar);
      EventBus.on(Events.PLAYER_LEVEL_UP, (p) => {
        atualizar();
        this.toast(`🎉 Você subiu para o nível ${p.player.nivel}!`, 'success');
      });

      // Faixa de status: quando preso, um toque abre as opções de fiança/suborno.
      this.$['status-banner'].addEventListener('click', () => {
        if (GameState.player && GameState.player.state.key === 'preso') this._abrirAcoesPrisao();
        else if (GameState.player && ['hospital', 'doente', 'overdose'].includes(GameState.player.state.key)) this._abrirAcoesSaude();
      });
    }

    // ============================================================
    // HEADER (barras, carteira, status)
    // ============================================================
    refreshHeader() {
      const p = GameState.player;
      if (!p) return;
      if (p.fotoUrl) {
        this.$['player-avatar'].innerHTML = `<img src="${p.fotoUrl}" alt="Foto de ${p.nome}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        this.$['player-avatar'].textContent = p.avatar;
      }
      this.$['player-name'].textContent = `${p.nome}${p.idade ? ' • ' + p.idade + ' anos' : ''}`;
      const profDef = p.profissao ? Services.profissaoService.obter(p.profissao) : null;
      this.$['player-title'].textContent = GameState.obterTitulo() + (profDef ? ` • ${profDef.icone} ${profDef.nome}` : '');
      this.$['stat-dinheiro'].textContent = fmtMoney(p.dinheiro);
      this.$['stat-banco'].textContent = fmtMoney(p.banco);

      this.$['label-vida'].textContent = `${Math.round(p.vida)}/${p.vidaMax}`;
      this.$['bar-vida'].style.width = `${(p.vida / p.vidaMax) * 100}%`;
      this.$['label-energia'].textContent = `${Math.round(p.energia)}/${p.energiaMax}`;
      this.$['bar-energia'].style.width = `${(p.energia / p.energiaMax) * 100}%`;
      this.$['label-stamina'].textContent = `${Math.round(p.stamina)}/${p.staminaMax}`;
      this.$['bar-stamina'].style.width = `${(p.stamina / Math.max(1, p.staminaMax)) * 100}%`;
      this.$['label-nivel'].textContent = p.nivel;
      this.$['label-xp'].textContent = `${p.xp}/${p.xpParaProximoNivel()}`;
      this.$['bar-xp'].style.width = `${(p.xp / p.xpParaProximoNivel()) * 100}%`;

      const banner = this.$['status-banner'];
      const st = p.state;
      if (st.key === 'preso') {
        banner.className = 'status-banner jail';
        banner.textContent = `🚔 Preso — libertação em ${fmtTime(st.secondsRemaining())} • toque para opções`;
      } else if (st.key === 'hospital') {
        banner.className = 'status-banner hospital';
        banner.textContent = `🏥 No hospital — alta em ${fmtTime(st.secondsRemaining())} • toque para atendimento`;
      } else if (st.key === 'doente') {
        banner.className = 'status-banner hospital';
        banner.textContent = `🤒 Doente — recuperação em ${fmtTime(st.secondsRemaining())} • toque para atendimento`;
      } else if (st.key === 'overdose') {
        banner.className = 'status-banner hospital';
        banner.textContent = `⚠️ Em recuperação — ${fmtTime(st.secondsRemaining())} • toque para atendimento`;
      } else {
        banner.className = 'status-banner hidden';
      }
    }

    /** Modal de fiança e suborno com níveis de risco/custo. */
    _abrirAcoesPrisao() {
      const p = GameState.player;
      if (p.state.key !== 'preso') return;
      const Prisao = Services.prisaoService;
      const custoFianca = Prisao.custoFianca(p);
      const niveis = [
        { id: 'baixo', nome: 'Suborno baixo', chance: 25 },
        { id: 'medio', nome: 'Suborno médio', chance: 50 },
        { id: 'alto', nome: 'Suborno alto', chance: 70 }
      ];
      const opcoes = niveis.map((item) => {
        const custo = Prisao.custoSuborno(p, item.id);
        return `<div class="card" style="margin-bottom:8px;">
          <strong>🤝 ${item.nome}</strong>
          <p style="font-size:12.5px;color:var(--text-2);margin:4px 0 10px;">Chance fixa de sucesso: ${item.chance}%. Se falhar, você perde o dinheiro e recebe tempo extra de prisão.</p>
          <button class="btn btn-danger btn-block btn-sm" data-suborno="${item.id}" ${p.dinheiro < custo ? 'disabled' : ''}>Tentar por ${fmtMoney(custo)}</button>
        </div>`;
      }).join('');
      this.modal('🚔 Você está preso', `Libertação natural em ${fmtTime(p.state.secondsRemaining())}`, `
        <div class="card" style="margin-bottom:10px;">
          <strong>💰 Pagar fiança</strong>
          <p style="font-size:12.5px;color:var(--text-2);margin:4px 0 10px;">Liberação imediata e garantida, sem riscos.</p>
          <button class="btn btn-primary btn-block btn-sm" id="btn-fianca" ${p.dinheiro < custoFianca ? 'disabled' : ''}>Pagar ${fmtMoney(custoFianca)}</button>
        </div>
        ${opcoes}
      `);
      document.getElementById('btn-fianca').addEventListener('click', () => {
        const r = Prisao.pagarFianca(p);
        this.closeModal(); this.toast(r.mensagem, r.sucesso ? 'success' : 'error');
        GameState.salvar(); this.refreshHeader(); this.render();
      });
      document.querySelectorAll('[data-suborno]').forEach((btn) => btn.addEventListener('click', () => {
        const r = Prisao.subornar(p, btn.dataset.suborno);
        this.closeModal(); this.toast(r.mensagem, r.enganado ? 'error' : (r.sucesso ? 'success' : 'error'));
        GameState.salvar(); this.refreshHeader(); this.render();
      }));
    }

    /** Atendimento opcional para reduzir o tempo de doença, hospital ou overdose. */
    _abrirAcoesSaude() {
      const p = GameState.player;
      if (!p || !['hospital', 'doente', 'overdose'].includes(p.state.key)) return;
      const restante = p.state.secondsRemaining();
      const custo = Math.max(100, Math.round(restante * 2));
      this.modal('🏥 Atendimento médico', `Tempo restante: ${fmtTime(restante)}`, `
        <p style="font-size:13px;color:var(--text-2);">A consulta reduz em aproximadamente 80% o tempo restante de recuperação. Também há um medicamento de tratamento na Loja.</p>
        <button class="btn btn-primary btn-block" id="btn-consulta-medica" ${p.dinheiro < custo ? 'disabled' : ''}>Consultar por ${fmtMoney(custo)}</button>
      `);
      document.getElementById('btn-consulta-medica').addEventListener('click', () => {
        const r = Services.expansaoService.consultarMedico(p);
        this.closeModal(); this.toast(r.mensagem, r.sucesso ? 'success' : 'error');
        GameState.salvar(); this.refreshHeader(); this.render();
      });
    }

    // ============================================================
    // TELA: DASHBOARD
    // ============================================================
    renderDashboard() {
      const p = GameState.player;
      const dica = Services.advisorAI.gerarDica(p);
      const estoqueTotal = Math.floor(p.drogas + Object.values(p.estoqueDrogasCompradas || {}).reduce((a, b) => a + b, 0) + Object.values(p.estoqueDrogasProduzidas || {}).reduce((a, b) => a + b, 0) + Object.values(p.estoqueDrogasBoate || {}).reduce((a, b) => a + b, 0) + Object.values(p.estoqueDrogasPontos || {}).reduce((a, b) => a + b, 0));
      const html = `
        <div class="advisor-card card">
          <div class="advisor-head"><span>🤖</span> Conselheiro IA</div>
          <p>${dica}</p>
        </div>

        <div class="section-title">📊 Visão geral</div>
        <div class="quickstats">
          <div class="quickstat"><div class="qs-val">${p.nivel}</div><div class="qs-label">Nível</div></div>
          <div class="quickstat"><div class="qs-val">${p.respeito}</div><div class="qs-label">Respeito</div></div>
          <div class="quickstat"><div class="qs-val">${p.calcularPoder()}</div><div class="qs-label">Poder de combate</div></div>
          <div class="quickstat"><div class="qs-val">${p.crimesCometidos}</div><div class="qs-label">Crimes cometidos</div></div>
          <div class="quickstat"><div class="qs-val">${estoqueTotal}</div><div class="qs-label">Unidades de produto</div></div>
          <div class="quickstat"><div class="qs-val">${Object.keys(p.propriedades).length}</div><div class="qs-label">Negócios possuídos</div></div>
        </div>

        <div class="section-title">🏦 Banco</div>
        <div class="card">
          <div class="card-row">
            <div><small style="color:var(--text-2)">Em mãos</small><br><strong>${fmtMoney(p.dinheiro)}</strong></div>
            <div style="text-align:right"><small style="color:var(--text-2)">Guardado</small><br><strong>${fmtMoney(p.banco)}</strong></div>
          </div>
          <div class="btn-row" style="margin-top:12px;">
            <button class="btn btn-secondary btn-sm" id="btn-depositar">Depositar</button>
            <button class="btn btn-secondary btn-sm" id="btn-sacar">Sacar</button>
          </div>
        </div>

        <div class="section-title">⚡ Atalhos</div>
        <div class="action-list">
          <div class="action-item" data-go="crimes">
            <div class="action-icon">🔫</div>
            <div class="action-info"><strong>Cometer um crime</strong><div class="action-meta">Ganhe dinheiro e XP arriscando a liberdade</div></div>
          </div>
          <div class="action-item" data-go="combate">
            <div class="action-icon">🥊</div>
            <div class="action-info"><strong>Procurar uma briga</strong><div class="action-meta">Desafie um rival e ganhe respeito</div></div>
          </div>
          <div class="action-item" data-go="academia">
            <div class="action-icon">💪</div>
            <div class="action-info"><strong>Treinar na academia</strong><div class="action-meta">Evolua seus atributos</div></div>
          </div>
          <div class="action-item" data-go="negocios">
            <div class="action-icon">🏭</div>
            <div class="action-info"><strong>Administrar negócios</strong><div class="action-meta">Fábrica de drogas, bordel, cassino e mais</div></div>
          </div>
        </div>
      `;
      this.$['screen-content'].innerHTML = html;

      this.$['screen-content'].querySelectorAll('[data-go]').forEach((el) => {
        el.addEventListener('click', () => this.navigate(el.dataset.go));
      });
      document.getElementById('btn-depositar').addEventListener('click', () => this._promptBanco('depositar'));
      document.getElementById('btn-sacar').addEventListener('click', () => this._promptBanco('sacar'));
    }

    _promptBanco(tipo) {
      const p = GameState.player;
      const max = tipo === 'depositar' ? p.dinheiro : p.banco;
      const titulo = tipo === 'depositar' ? 'Depositar no banco' : 'Sacar do banco';
      this.modal(titulo, `Disponível: ${fmtMoney(max)}`, `
        <input type="number" id="input-valor-banco" min="0" max="${max}" placeholder="Valor" 
          style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--border);background:var(--bg-3);color:var(--text-0);font-size:15px;margin-bottom:14px;">
        <div class="btn-row">
          <button class="btn btn-ghost" id="modal-cancel">Cancelar</button>
          <button class="btn btn-primary" id="modal-confirm-banco">Confirmar</button>
        </div>
      `);
      document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());
      document.getElementById('modal-confirm-banco').addEventListener('click', () => {
        const valor = parseInt(document.getElementById('input-valor-banco').value, 10) || 0;
        const r = tipo === 'depositar' ? Services.bancoService.depositar(p, valor) : Services.bancoService.sacar(p, valor);
        this.closeModal();
        this.toast(r.mensagem, r.sucesso ? 'success' : 'error');
        this.refreshHeader(); this.render(); GameState.salvar();
      });
    }

    // ============================================================
    // TELA: CRIMES
    // ============================================================
    renderCrimes() {
      const p = GameState.player;
      const itens = CRIMES.map((c) => `
        <div class="action-item">
          <div class="action-icon">${c.icone}</div>
          <div class="action-info">
            <strong>${c.nome}</strong>
            <div class="action-meta">
              <span class="chip">⚡ ${c.energia}</span>
              <span class="chip">💰 ${fmtMoney(c.recompensaMin)}–${fmtMoney(c.recompensaMax)}</span>
              <span class="chip chip-risk-${c.risco}">${riskLabel[c.risco]}</span>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" data-crime="${c.id}" ${p.energia < c.energia || !p.state.canAct() ? 'disabled' : ''}>Ir</button>
        </div>
      `).join('');

      this.$['screen-content'].innerHTML = `
        <div class="section-title">🔫 Oportunidades criminosas</div>
        <div class="action-list">${itens}</div>
      `;

      this.$['screen-content'].querySelectorAll('[data-crime]').forEach((btn) => {
        btn.addEventListener('click', () => this._executarCrime(btn.dataset.crime));
      });
    }

    _executarCrime(crimeId) {
      const crime = CRIMES.find((c) => c.id === crimeId);
      const r = Services.crimeService.cometer(GameState.player, crime);
      GameState.salvar();
      this.refreshHeader();

      if (r.bloqueado) { this.toast(r.mensagem, 'error'); return; }

      const corResultado = r.sucesso ? 'result-win' : 'result-lose';
      this.modal(
        r.sucesso ? '✅ Sucesso!' : '🚨 Deu errado!',
        `Chance de sucesso: ${r.chance}%`,
        `<p class="${corResultado}" style="font-size:14px;line-height:1.5;">${r.mensagem}</p>
         ${r.sucesso ? `<p style="font-size:13px;color:var(--text-2);">+${r.xp} XP ${r.subiuNivel ? ' • 🎉 Nível aumentado!' : ''}</p>` : ''}
         ${r.preso ? `<p style="font-size:13px;color:var(--text-2);">Tempo de prisão: ${fmtTime(r.tempoPrisao)}</p>` : ''}
         <button class="btn btn-primary btn-block" id="modal-ok" style="margin-top:14px;">OK</button>`
      );
      document.getElementById('modal-ok').addEventListener('click', () => { this.closeModal(); this.render(); });
    }

    // ============================================================
    // TELA: COMBATE
    // ============================================================
    renderCombate() {
      const p = GameState.player;
      const oponentes = GameState.obterOponentes();
      const lista = oponentes.map((npc) => `
        <div class="npc-card">
          <div class="npc-avatar">${npc.avatar}</div>
          <div class="npc-info">
            <strong>${npc.nome}</strong>
            <small>Nível ${npc.nivel} • ${npc.faccao}</small>
          </div>
          <div style="text-align:right;">
            <div class="power-tag">⚔ ${npc.poder}</div>
            <button class="btn btn-danger btn-sm" style="margin-top:6px;" data-npc="${npc.id}" ${!p.state.canAct() || p.energia < Services.combatService.custoEnergia() ? 'disabled' : ''}>Lutar</button>
          </div>
        </div>
      `).join('');

      this.$['screen-content'].innerHTML = `
        <div class="section-title">🥊 Rivais nas ruas</div>
        <p style="font-size:12.5px;color:var(--text-2);margin:-4px 0 14px;">Seu poder de combate atual: <strong style="color:var(--gold-soft)">${p.calcularPoder()}</strong></p>
        ${lista || '<div class="empty-state"><span class="es-icon">🕊️</span>Nenhum rival por perto agora.</div>'}
      `;

      this.$['screen-content'].querySelectorAll('[data-npc]').forEach((btn) => {
        btn.addEventListener('click', () => this._executarCombate(btn.dataset.npc, oponentes));
      });
    }

    _executarCombate(npcId, oponentes) {
      const npc = oponentes.find((n) => n.id === npcId);
      const r = Services.combatService.lutar(GameState.player, npc);
      GameState.salvar();
      this.refreshHeader();

      if (r.bloqueado) { this.toast(r.mensagem, 'error'); return; }

      const venceuTxt = r.venceu ? 'result-win' : 'result-lose';
      this.modal(
        r.venceu ? '🏆 Vitória!' : '💥 Derrota',
        `Luta contra ${npc.nome}`,
        `<p class="${venceuTxt}" style="font-size:14px;line-height:1.5;">${r.mensagem}</p>
         <p style="font-size:13px;color:var(--text-2);">Dano recebido: ${r.dano}</p>
         <button class="btn btn-primary btn-block" id="modal-ok" style="margin-top:14px;">OK</button>`
      );
      document.getElementById('modal-ok').addEventListener('click', () => { this.closeModal(); this.render(); });
    }

    // ============================================================
    // TELA: ACADEMIA
    // ============================================================
    renderAcademia() {
      const p = GameState.player;
      const atrs = Game.Services.treinoService.constructor.ATRIBUTOS;
      const custo = Services.treinoService.custoEnergia();
      const itens = Object.entries(atrs).map(([key, def]) => `
        <div class="action-item">
          <div class="action-icon">${def.icone}</div>
          <div class="action-info">
            <strong>${def.label}</strong>
            <div class="action-meta"><span class="chip">Atual: ${p[key]}</span><span class="chip">⚡ ${custo}</span></div>
          </div>
          <button class="btn btn-primary btn-sm" data-treino="${key}" ${p.energia < custo || !p.state.canAct() ? 'disabled' : ''}>Treinar</button>
        </div>
      `).join('');

      this.$['screen-content'].innerHTML = `
        <div class="section-title">💪 Academia clandestina</div>
        <div class="action-list">${itens}</div>
      `;

      this.$['screen-content'].querySelectorAll('[data-treino]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const r = Services.treinoService.treinar(GameState.player, btn.dataset.treino);
          GameState.salvar();
          this.refreshHeader();
          if (r.bloqueado) { this.toast(r.mensagem, 'error'); return; }
          this.toast(r.mensagem, 'success');
          this.render();
        });
      });
    }

    // ============================================================
    // TELA: NEGÓCIOS (propriedades do crime organizado + Mercado Negro)
    // ============================================================
    renderNegocios() {
      // Preserva as seções de gerenciamento abertas durante atualizações periódicas e ações.
      const detalhesAbertos = Array.from(this.$['screen-content'].querySelectorAll('details')).map((el) => !!el.open);
      const p = GameState.player;
      const Neg = Services.negocioService;
      const Terr = Services.territorioService;
      const Mercado = Services.mercadoNegroService;
      const Exp = Services.expansaoService;
      const DROGAS = Game.Data.DROGAS;
      const PECAS = Game.Data.PECAS_GARAGEM;
      Mercado.atualizar();
      Exp.atualizarPrecos();

      // ---------- Propriedades: negócios únicos e fábricas por categoria ----------
      const propsHtml = Neg.listar().map((def) => {
        const nivel = Neg.nivelAtual(p, def.id);
        const possui = nivel > 0;
        const pendente = possui ? Math.floor(Neg.pendente(p, def.id)) : 0;
        const producaoHora = Neg.producaoPorHora(def, Math.max(nivel, 1), p);
        const custo = Neg.custoParaNivel(def, nivel + 1);
        const recursoDroga = def.recurso === 'drogas' || String(def.recurso).startsWith('droga:');
        const fabricaIndividual = String(def.recurso).startsWith('droga:');
        const drogaId = fabricaIndividual ? String(def.recurso).slice('droga:'.length) : '';
        const unidade = recursoDroga ? 'un.' : 'R$';
        const precoVendaFabrica = Math.round((p.propriedades[def.id] && p.propriedades[def.id].custoCompra || def.custoBase) * 3);
        return `
          <div class="action-item">
            <div class="action-icon">${def.icone}</div>
            <div class="action-info">
              <strong>${def.nome}</strong>
              <div class="action-meta">
                ${possui
                  ? `<span class="chip">Nível ${nivel}</span><span class="chip">+${producaoHora} ${unidade}/h</span>`
                  : `<span class="chip">${def.descricao}</span>`}
                ${possui && pendente > 0 ? `<span class="chip chip-risk-baixo">${pendente} ${unidade} prontos</span>` : ''}
                ${fabricaIndividual && possui ? `<span class="chip">Estoque recolhido: ${Math.floor(p.estoqueDrogasProduzidas[drogaId] || 0)} un.</span>` : ''}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;align-items:stretch;min-width:94px;">
              ${possui ? `<button class="btn btn-secondary btn-sm" data-coletar="${def.id}" ${pendente <= 0 ? 'disabled' : ''}>Coletar</button>` : ''}
              <button class="btn btn-primary btn-sm" data-negocio="${def.id}" ${p.dinheiro < custo ? 'disabled' : ''}>${possui ? 'Melhorar' : 'Comprar'} (${fmtMoney(custo)})</button>
              ${fabricaIndividual && possui ? `<button class="btn btn-danger btn-sm" data-vender-fabrica="${def.id}">Vender (${fmtMoney(precoVendaFabrica)})</button>` : ''}
            </div>
          </div>`;
      }).join('');

      // ---------- Pontos de venda ----------
      const pontos = Terr.listar(p);
      const pontosHtml = pontos.map((ponto, idx) => {
        const pendente = Math.floor(Terr.pendente(ponto, p));
        const producaoHora = Terr.producaoPorHora(ponto, p);
        const custoUp = Terr.custoUpgrade(ponto);
        return `
          <div class="action-item">
            <div class="action-icon">📍</div>
            <div class="action-info">
              <strong>Ponto de Venda #${idx + 1}</strong>
              <div class="action-meta">
                <span class="chip">Nível ${ponto.nivel}</span>
                <span class="chip">+${fmtMoney(producaoHora)}/h</span>
                ${pendente > 0 ? `<span class="chip chip-risk-baixo">${fmtMoney(pendente)} prontos</span>` : ''}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;align-items:stretch;">
              <button class="btn btn-secondary btn-sm" data-coletar-ponto="${ponto.uid}" ${pendente <= 0 ? 'disabled' : ''}>Coletar</button>
              <button class="btn btn-primary btn-sm" data-upgrade-ponto="${ponto.uid}" ${p.dinheiro < custoUp ? 'disabled' : ''}>Melhorar (${fmtMoney(custoUp)})</button>
            </div>
          </div>`;
      }).join('');
      const custoNovoPonto = Terr.custoParaComprar(p);
      const podeComprarPonto = pontos.length < Terr.maxPontos();

      // ---------- Mercado de produtos, estoques separados e abastecimento ----------
      const drogasHtml = DROGAS.map((droga) => {
        const compradas = Math.floor(p.estoqueDrogasCompradas[droga.id] || 0);
        const produzidas = Math.floor(p.estoqueDrogasProduzidas[droga.id] || 0);
        const boate = Math.floor(p.estoqueDrogasBoate[droga.id] || 0);
        const ponto = Math.floor(p.estoqueDrogasPontos[droga.id] || 0);
        const precoCompra = Exp.preco(droga.id, 'compra');
        const possuiBoate = !!p.propriedades.boate;
        const possuiPonto = pontos.length > 0;
        return `
          <div class="action-item" style="align-items:flex-start;flex-wrap:wrap;">
            <div class="action-icon">${droga.icone}</div>
            <div class="action-info" style="min-width:145px;">
              <strong>${droga.nome}</strong>
              <div class="action-meta">
                <span class="chip">Compra: ${fmtMoney(precoCompra)}/un.</span>
                <span class="chip">Pessoal: ${compradas}</span>
                <span class="chip">Produção: ${produzidas}</span>
                <span class="chip">Boate: ${boate}</span>
                <span class="chip">Pontos: ${ponto}</span>
              </div>
            </div>
            <button class="btn btn-primary btn-sm" data-comprar-droga="${droga.id}" ${p.dinheiro < precoCompra * 5 ? 'disabled' : ''}>Comprar 5 (${fmtMoney(precoCompra * 5)})</button>
            <details style="width:100%;margin-top:4px;">
              <summary style="cursor:pointer;color:var(--gold-soft);font-size:12px;padding:7px 0;">Gerenciar estoques e vendas</summary>
              <div class="btn-row" style="flex-wrap:wrap;gap:6px;">
                <button class="btn btn-danger btn-sm" data-vender-producao="${droga.id}" ${produzidas < 1 ? 'disabled' : ''}>Vender produção (${produzidas})</button>
                <button class="btn btn-secondary btn-sm" data-transferir-droga="${droga.id}" data-origem="compradas" data-destino="boate" ${!possuiBoate || compradas < 1 ? 'disabled' : ''}>Compradas → boate</button>
                <button class="btn btn-secondary btn-sm" data-transferir-droga="${droga.id}" data-origem="produzidas" data-destino="boate" ${!possuiBoate || produzidas < 1 ? 'disabled' : ''}>Produção → boate</button>
                <button class="btn btn-secondary btn-sm" data-transferir-droga="${droga.id}" data-origem="produzidas" data-destino="pontos" ${!possuiPonto || produzidas < 1 ? 'disabled' : ''}>Produção → ponto</button>
                <button class="btn btn-danger-ghost btn-sm" data-vender-estoque="${droga.id}" data-destino="boate" ${!possuiBoate || boate < 1 ? 'disabled' : ''}>Vender na boate (${boate})</button>
                <button class="btn btn-danger-ghost btn-sm" data-vender-estoque="${droga.id}" data-destino="pontos" ${!possuiPonto || ponto < 1 ? 'disabled' : ''}>Vender nos pontos (${ponto})</button>
              </div>
              <p style="font-size:11px;color:var(--text-2);margin:7px 0 0;">Cada transferência move até 5 unidades. O estoque comprado permanece separado da produção das fábricas até ser transferido.</p>
            </details>
          </div>`;
      }).join('');

      // ---------- Garagem: compra de peças e revenda a preço variável ----------
      const possuiGaragem = !!p.propriedades.garagem;
      const pecasHtml = PECAS.map((peca) => {
        const estoque = Math.floor(p.estoquePecas[peca.id] || 0);
        const precoRevenda = Exp.precos[`peca_${peca.id}`] ? Exp.precos[`peca_${peca.id}`].venda : peca.precoVendaBase;
        return `<div class="action-item">
          <div class="action-icon">${peca.icone}</div>
          <div class="action-info"><strong>${peca.nome}</strong>
            <div class="action-meta"><span class="chip">Estoque: ${estoque}</span><span class="chip">Compra: ${fmtMoney(peca.precoCompra)}</span><span class="chip">Revenda: ${fmtMoney(precoRevenda)}</span></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <button class="btn btn-secondary btn-sm" data-comprar-peca="${peca.id}" ${!possuiGaragem || p.dinheiro < peca.precoCompra ? 'disabled' : ''}>Comprar</button>
            <button class="btn btn-danger btn-sm" data-vender-peca="${peca.id}" ${!possuiGaragem || estoque < 1 ? 'disabled' : ''}>Revender 1</button>
          </div>
        </div>`;
      }).join('');

      const mesaCost = Exp.custoMesaCassino(p);
      const casinoHtml = p.propriedades.casa_jogos ? `
        <div class="card" style="margin-bottom:12px;">
          <strong>🎲 Mesas do cassino</strong>
          <p style="font-size:12px;color:var(--text-2);">Mesas: ${p.mesasCassino || 0}. Cada mesa aumenta a renda passiva da Casa de Jogos em 10%.</p>
          <button class="btn btn-primary btn-sm" id="btn-comprar-mesa" ${p.dinheiro < mesaCost ? 'disabled' : ''}>Comprar mesa (${fmtMoney(mesaCost)})</button>
        </div>` : '';

      const equipeAtual = p.equipeEstabelecimentos || [];
      const equipeHtml = `
        <div class="card" style="margin-bottom:12px;">
          <strong>🎤 Equipes dos estabelecimentos</strong>
          <p style="font-size:12px;color:var(--text-2);">Contrate equipes adultas para melhorar a renda de um local. São funcionários contratados, não itens compráveis ou revendáveis.</p>
          <p style="font-size:12px;">Boate: ${equipeAtual.filter((e) => e.local === 'boate').length} equipe(s) • Bordel: ${equipeAtual.filter((e) => e.local === 'bordel').length} equipe(s)</p>
          <div class="btn-row" style="flex-wrap:wrap;gap:6px;">
            <button class="btn btn-secondary btn-sm" data-contratar-equipe="boate|economica" ${!p.propriedades.boate || p.dinheiro < 350 ? 'disabled' : ''}>Equipe econômica — boate (R$ 350)</button>
            <button class="btn btn-secondary btn-sm" data-contratar-equipe="boate|padrao" ${!p.propriedades.boate || p.dinheiro < 850 ? 'disabled' : ''}>Equipe padrão — boate (R$ 850)</button>
            <button class="btn btn-secondary btn-sm" data-contratar-equipe="boate|premium" ${!p.propriedades.boate || p.dinheiro < 1800 ? 'disabled' : ''}>Equipe premium — boate (R$ 1.800)</button>
            <button class="btn btn-secondary btn-sm" data-contratar-equipe="bordel|economica" ${!p.propriedades.bordel || p.dinheiro < 350 ? 'disabled' : ''}>Equipe econômica — bordel (R$ 350)</button>
            <button class="btn btn-secondary btn-sm" data-contratar-equipe="bordel|padrao" ${!p.propriedades.bordel || p.dinheiro < 850 ? 'disabled' : ''}>Equipe padrão — bordel (R$ 850)</button>
            <button class="btn btn-secondary btn-sm" data-contratar-equipe="bordel|premium" ${!p.propriedades.bordel || p.dinheiro < 1800 ? 'disabled' : ''}>Equipe premium — bordel (R$ 1.800)</button>
          </div>
          ${p.propriedades.bordel ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);"><strong>Atividade de risco do bordel</strong><p style="font-size:12px;color:var(--text-2);">A atividade econômica custa R$ 50 e tem 12% de chance de causar doença temporária no personagem (3 minutos de jogo).</p><button class="btn btn-danger-ghost btn-sm" id="btn-visita-bordel" ${p.dinheiro < 50 || !p.state.canAct() ? 'disabled' : ''}>Realizar atividade econômica (R$ 50)</button></div>` : ''}
        </div>`;

      const saudeHtml = ['hospital', 'doente', 'overdose'].includes(p.state.key) ? `
        <div class="card" style="margin-bottom:12px;border-color:rgba(90,167,255,.35);">
          <strong>🏥 Recuperação do personagem</strong>
          <p style="font-size:12px;color:var(--text-2);">Estado: ${p.state.label}. Tempo restante: ${fmtTime(p.state.secondsRemaining())}. Use um Medicamento de tratamento no inventário ou pague uma consulta para reduzir a espera.</p>
          <button class="btn btn-primary btn-sm" id="btn-consulta-medica-negocios" ${p.dinheiro < Math.max(100, Math.round(p.state.secondsRemaining() * 2)) ? 'disabled' : ''}>Consultar médico (${fmtMoney(Math.max(100, Math.round(p.state.secondsRemaining() * 2)) )})</button>
        </div>` : '';

      this.$['screen-content'].innerHTML = `
        <div class="advisor-card card" style="border-color:rgba(216,173,78,.35);background:linear-gradient(135deg, rgba(216,173,78,.12), rgba(226,73,90,.06));">
          <div class="advisor-head" style="color:var(--gold-soft);"><span>💊</span> Mercado Negro — estoque legado</div>
          <p>Estoque genérico de fábricas antigas: <strong>${Math.floor(p.drogas)} un.</strong><br>
          Preço atual: <strong>${fmtMoney(Mercado.precoAtual)}</strong> por unidade.</p>
          <div class="btn-row" style="margin-top:10px;">
            <input type="number" id="input-qtd-drogas" min="1" max="${Math.floor(p.drogas)}" placeholder="Quantidade" style="flex:1;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--bg-3);color:var(--text-0);">
            <button class="btn btn-secondary btn-sm" id="btn-vender-parcial" ${p.drogas < 1 ? 'disabled' : ''}>Vender qtd.</button>
          </div>
          <button class="btn btn-danger btn-block btn-sm" id="btn-vender-drogas" style="margin-top:8px;" ${p.drogas < 1 ? 'disabled' : ''}>Vender todo o estoque legado</button>
        </div>

        <div class="section-title">🧪 Fornecedores e estoque por produto</div>
        <p style="font-size:12px;color:var(--text-2);margin:-4px 0 10px;">Comprar unidades adiciona ao estoque pessoal; fábricas geram produção separada. A produção recolhida pode ser vendida ou transferida para a boate/pontos. Os efeitos de consumo e os riscos são mecânicas abstratas do jogo.</p>
        <div class="action-list">${drogasHtml}</div>

        <div class="section-title">🏭 Seus negócios</div>
        <p style="font-size:12px;color:var(--text-2);margin:-4px 0 10px;">A produção passiva continua acumulando com o jogo fechado, até o limite de capacidade. Fábricas individuais podem ser vendidas por três vezes o custo original de aquisição; a produção pendente é recolhida antes da venda.</p>
        <div class="action-list">${propsHtml}</div>

        <div class="section-title">📍 Pontos de venda <span class="chip">${pontos.length}/${Terr.maxPontos()}</span></div>
        <p style="font-size:12px;color:var(--text-2);margin:-4px 0 10px;">Os pontos geram renda passiva. Vender estoque transferido para os pontos tem 10% de chance de batida policial e confisco do estoque daquele produto.</p>
        <div class="action-list">${pontosHtml || '<div class="empty-state">Você ainda não controla nenhum ponto de venda.</div>'}</div>
        <button class="btn btn-secondary btn-block" id="btn-novo-ponto" style="margin-top:4px;" ${!podeComprarPonto || p.dinheiro < custoNovoPonto ? 'disabled' : ''}>${podeComprarPonto ? `Conquistar novo ponto (${fmtMoney(custoNovoPonto)})` : 'Limite de pontos atingido'}</button>

        ${casinoHtml}
        <div class="section-title">🔧 Garagem — peças para revenda</div>
        <p style="font-size:12px;color:var(--text-2);margin:-4px 0 10px;">Compre peças quando estiverem baratas e revenda pelo preço de mercado, que varia periodicamente. É necessário possuir a Garagem Clandestina.</p>
        <div class="action-list">${pecasHtml}</div>
        ${equipeHtml}
        ${saudeHtml}
      `;
      Array.from(this.$['screen-content'].querySelectorAll('details')).forEach((el, idx) => {
        if (detalhesAbertos[idx]) el.open = true;
      });

      // Mercado genérico legado
      document.getElementById('btn-vender-drogas').addEventListener('click', () => {
        const r = Mercado.vender(p, p.drogas);
        this.toast(r.mensagem, r.sucesso ? 'success' : 'error');
        GameState.salvar(); this.refreshHeader(); this.renderNegocios();
      });
      document.getElementById('btn-vender-parcial').addEventListener('click', () => {
        const qtd = parseInt(document.getElementById('input-qtd-drogas').value, 10) || 0;
        const r = Mercado.vender(p, qtd);
        this.toast(r.mensagem, r.sucesso ? 'success' : 'error');
        GameState.salvar(); this.refreshHeader(); this.renderNegocios();
      });

      this.$['screen-content'].querySelectorAll('[data-comprar-droga]').forEach((btn) => btn.addEventListener('click', () => {
        const r = Exp.comprarDroga(p, btn.dataset.comprarDroga, 5);
        this.toast(r.mensagem, r.sucesso ? 'success' : 'error'); GameState.salvar(); this.refreshHeader(); this.renderNegocios();
      }));
      this.$['screen-content'].querySelectorAll('[data-vender-producao]').forEach((btn) => btn.addEventListener('click', () => {
        const r = Exp.venderProducao(p, btn.dataset.venderProducao);
        this.toast(r.mensagem, r.sucesso ? 'success' : 'error'); GameState.salvar(); this.refreshHeader(); this.renderNegocios();
      }));
      this.$['screen-content'].querySelectorAll('[data-transferir-droga]').forEach((btn) => btn.addEventListener('click', () => {
        const r = Exp.transferirEstoque(p, btn.dataset.transferirDroga, 5, btn.dataset.origem, btn.dataset.destino);
        this.toast(r.mensagem, r.sucesso ? 'success' : 'error'); GameState.salvar(); this.refreshHeader(); this.renderNegocios();
      }));
      this.$['screen-content'].querySelectorAll('[data-vender-estoque]').forEach((btn) => btn.addEventListener('click', () => {
        const r = Exp.venderEstoqueEstabelecimento(p, btn.dataset.venderEstoque, btn.dataset.destino);
        this.toast(r.mensagem, r.sucesso ? 'success' : 'error'); GameState.salvar(); this.refreshHeader(); this.renderNegocios();
      }));
      this.$['screen-content'].querySelectorAll('[data-vender-fabrica]').forEach((btn) => btn.addEventListener('click', () => {
        const r = Exp.venderFabrica(p, btn.dataset.venderFabrica);
        this.toast(r.mensagem, r.sucesso ? 'success' : 'error'); GameState.salvar(); this.refreshHeader(); this.renderNegocios();
      }));
      this.$['screen-content'].querySelectorAll('[data-comprar-peca]').forEach((btn) => btn.addEventListener('click', () => {
        const r = Exp.comprarPeca(p, btn.dataset.comprarPeca, 1);
        this.toast(r.mensagem, r.sucesso ? 'success' : 'error'); GameState.salvar(); this.refreshHeader(); this.renderNegocios();
      }));
      this.$['screen-content'].querySelectorAll('[data-vender-peca]').forEach((btn) => btn.addEventListener('click', () => {
        const r = Exp.venderPeca(p, btn.dataset.venderPeca, 1);
        this.toast(r.mensagem, r.sucesso ? 'success' : 'error'); GameState.salvar(); this.refreshHeader(); this.renderNegocios();
      }));
      this.$['screen-content'].querySelectorAll('[data-contratar-equipe]').forEach((btn) => btn.addEventListener('click', () => {
        const [local, categoria] = btn.dataset.contratarEquipe.split('|');
        const r = Exp.contratarEquipe(p, local, categoria);
        this.toast(r.mensagem, r.sucesso ? 'success' : 'error'); GameState.salvar(); this.refreshHeader(); this.renderNegocios();
      }));

      const btnMesa = document.getElementById('btn-comprar-mesa');
      if (btnMesa) btnMesa.addEventListener('click', () => {
        const r = Exp.comprarMesaCassino(p);
        this.toast(r.mensagem, r.sucesso ? 'success' : 'error'); GameState.salvar(); this.refreshHeader(); this.renderNegocios();
      });
      const btnVisita = document.getElementById('btn-visita-bordel');
      if (btnVisita) btnVisita.addEventListener('click', () => {
        const r = Exp.visitarBordelEconomico(p);
        this.toast(r.mensagem, r.doente ? 'error' : (r.sucesso ? 'success' : 'error')); GameState.salvar(); this.refreshHeader(); this.renderNegocios();
      });
      const btnMedico = document.getElementById('btn-consulta-medica-negocios');
      if (btnMedico) btnMedico.addEventListener('click', () => {
        const r = Exp.consultarMedico(p);
        this.toast(r.mensagem, r.sucesso ? 'success' : 'error'); GameState.salvar(); this.refreshHeader(); this.renderNegocios();
      });

      this.$['screen-content'].querySelectorAll('[data-coletar]').forEach((btn) => btn.addEventListener('click', () => {
        const r = Neg.coletar(p, btn.dataset.coletar);
        if (r.coletado > 0) {
          const ehDroga = r.recurso === 'drogas' || String(r.recurso).startsWith('droga:');
          this.toast(ehDroga ? `+${r.coletado} un. de produção recolhidas.` : `+${fmtMoney(r.coletado)} coletados.`, 'success');
        }
        GameState.salvar(); this.refreshHeader(); this.renderNegocios();
      }));
      this.$['screen-content'].querySelectorAll('[data-negocio]').forEach((btn) => btn.addEventListener('click', () => {
        const id = btn.dataset.negocio;
        const nivel = Neg.nivelAtual(p, id);
        const r = nivel > 0 ? Neg.upgrade(p, id) : Neg.comprar(p, id);
        this.toast(r.mensagem, r.sucesso ? 'success' : 'error'); GameState.salvar(); this.refreshHeader(); this.renderNegocios();
      }));
      this.$['screen-content'].querySelectorAll('[data-coletar-ponto]').forEach((btn) => btn.addEventListener('click', () => {
        const r = Terr.coletar(p, btn.dataset.coletarPonto);
        if (r.batida) this.toast(`🚨 Batida policial! Você perdeu ${fmtMoney(r.perdido)} em produto confiscado.`, 'error');
        else if (r.coletado > 0) this.toast(`+${fmtMoney(r.coletado)} coletados do ponto de venda.`, 'success');
        GameState.salvar(); this.refreshHeader(); this.renderNegocios();
      }));
      this.$['screen-content'].querySelectorAll('[data-upgrade-ponto]').forEach((btn) => btn.addEventListener('click', () => {
        const r = Terr.upgrade(p, btn.dataset.upgradePonto);
        this.toast(r.mensagem, r.sucesso ? 'success' : 'error'); GameState.salvar(); this.refreshHeader(); this.renderNegocios();
      }));
      const btnNovoPonto = document.getElementById('btn-novo-ponto');
      if (podeComprarPonto) btnNovoPonto.addEventListener('click', () => {
        const r = Terr.comprar(p);
        this.toast(r.mensagem, r.sucesso ? 'success' : 'error'); GameState.salvar(); this.refreshHeader(); this.renderNegocios();
      });
    }

    // ============================================================
    // TELA: LOJA
    // ============================================================
    renderLoja() {
      const p = GameState.player;
      const tabs = [
        { id: 'arma', label: '🔪 Armas' },
        { id: 'protecao', label: '🛡️ Proteção' },
        { id: 'veiculo', label: '🏍️ Veículos' },
        { id: 'consumivel', label: '💊 Consumo' }
      ];
      const tabsHtml = tabs.map((t) => `<button class="tab-btn ${this.lojaTabAtiva === t.id ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('');

      const itensDoTipo = ITENS.filter((i) => i.tipo === this.lojaTabAtiva);
      const lista = itensDoTipo.map((def) => `
        <div class="action-item">
          <div class="action-icon">${def.icone}</div>
          <div class="action-info">
            <strong>${def.nome}</strong>
            <div class="action-meta"><span class="chip">${def.descricao}</span></div>
          </div>
          <button class="btn btn-primary btn-sm" data-comprar="${def.id}" ${p.dinheiro < def.preco ? 'disabled' : ''}>${fmtMoney(def.preco)}</button>
        </div>
      `).join('');

      this.$['screen-content'].innerHTML = `
        <div class="section-title">🛒 Loja do submundo</div>
        <div class="tabs">${tabsHtml}</div>
        <div class="action-list">${lista || '<div class="empty-state">Nenhum item nesta categoria.</div>'}</div>
      `;

      this.$['screen-content'].querySelectorAll('[data-tab]').forEach((btn) => {
        btn.addEventListener('click', () => { this.lojaTabAtiva = btn.dataset.tab; this.renderLoja(); });
      });
      this.$['screen-content'].querySelectorAll('[data-comprar]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const r = Services.lojaService.comprar(GameState.player, btn.dataset.comprar);
          GameState.salvar();
          this.refreshHeader();
          this.toast(r.mensagem, r.sucesso ? 'success' : 'error');
          this.renderLoja();
        });
      });
    }

    // ============================================================
    // TELA: PERFIL
    // ============================================================
    renderPerfil() {
      const tabs = [
        { id: 'status', label: 'Status' },
        { id: 'inventario', label: 'Inventário' },
        { id: 'equipamento', label: 'Equipado' },
        { id: 'editar', label: 'Editar' },
        { id: 'cheats', label: '🎮 Cheats' }
      ];
      const tabsHtml = tabs.map((t) => `<button class="tab-btn ${this.perfilTabAtiva === t.id ? 'active' : ''}" data-ptab="${t.id}">${t.label}</button>`).join('');

      this.$['screen-content'].innerHTML = `
        <div class="section-title">👤 ${GameState.player.nome}</div>
        <div class="tabs">${tabsHtml}</div>
        <div id="perfil-body"></div>
        <button class="btn btn-danger-ghost btn-block" id="btn-apagar-perfil" style="margin-top:22px;">Apagar progresso e sair</button>
      `;

      this.$['screen-content'].querySelectorAll('[data-ptab]').forEach((btn) => {
        btn.addEventListener('click', () => { this.perfilTabAtiva = btn.dataset.ptab; this._renderPerfilBody(); });
      });
      document.getElementById('btn-apagar-perfil').addEventListener('click', () => {
        this.confirmar('Apagar progresso?', 'Essa ação é permanente.', () => {
          GameState.apagarJogo();
          location.reload();
        });
      });
      this._renderPerfilBody();
    }

    _renderPerfilBody() {
      const p = GameState.player;
      const body = document.getElementById('perfil-body');
      if (this.perfilTabAtiva === 'status') {
        body.innerHTML = `
          <div class="card">
            ${this._statRow('Título', GameState.obterTitulo())}
            ${this._statRow('Nível', p.nivel)}
            ${this._statRow('XP', `${p.xp} / ${p.xpParaProximoNivel()}`)}
            ${this._statRow('Respeito', p.respeito)}
            ${this._statRow('Poder de combate', p.calcularPoder())}
            ${this._statRow('Energia', `${Math.round(p.energia)} / ${p.energiaMax}`)}
            ${this._statRow('Stamina', `${Math.round(p.stamina)} / ${p.staminaMax}`)}
            ${this._statRow('Drogas em estoque (legado)', Math.floor(p.drogas))}
            ${this._statRow('Negócios possuídos', Object.keys(p.propriedades).length)}
            ${this._statRow('Força', p.forca)}
            ${this._statRow('Velocidade', p.velocidade)}
            ${this._statRow('Inteligência', p.inteligencia)}
            ${this._statRow('Crimes cometidos', p.crimesCometidos)}
            ${this._statRow('Crimes falhos', p.crimesFalhos)}
            ${this._statRow('Lutas vencidas', p.lutasVencidas)}
            ${this._statRow('Lutas perdidas', p.lutasPerdidas)}
          </div>`;
      } else if (this.perfilTabAtiva === 'inventario') {
        const consumiveis = p.inventario.filter((i) => i.isConsumivel);
        if (consumiveis.length === 0) {
          body.innerHTML = `<div class="empty-state"><span class="es-icon">🎒</span>Seu inventário de consumíveis está vazio.<br>Visite a loja.</div>`;
          return;
        }
        body.innerHTML = `<div class="inv-grid">${consumiveis.map((item) => `
          <div class="inv-item" data-uid="${item.uid}">
            <div class="inv-icon">${item.icone}</div>
            <div class="inv-name">${item.nome}</div>
          </div>`).join('')}</div>`;
        body.querySelectorAll('.inv-item').forEach((el) => {
          el.addEventListener('click', () => this._usarConsumivel(parseInt(el.dataset.uid, 10)));
        });
      } else if (this.perfilTabAtiva === 'editar') {
        this._renderEdicaoPerfil(body, p);
      } else if (this.perfilTabAtiva === 'cheats') {
        body.innerHTML = `
          <div class="card cheat-card">
            <div class="section-title">🎮 Central de códigos</div>
            <p class="muted">Digite um código exatamente como aparece abaixo e pressione Ativar. Os benefícios são aplicados imediatamente e salvos na partida.</p>
            <form id="cheat-form" class="cheat-form">
              <label for="cheat-code">Código de trapaça</label>
              <input id="cheat-code" name="cheat-code" type="text" maxlength="32" autocomplete="off" spellcheck="false" placeholder="Ex.: CRIMS100K" required>
              <button class="btn btn-primary btn-block" type="submit">Ativar código</button>
            </form>
            <div class="cheat-list">
              <div><code>CRIMS100K</code><span>Recebe R$ 100.000</span></div>
              <div><code>SUBMUNDO</code><span>Recebe R$ 500.000</span></div>
              <div><code>VIDAENERGIA</code><span>Restaura vida, energia e stamina</span></div>
              <div><code>FORCA50</code><span>+50 de força</span></div>
              <div><code>GENIO50</code><span>+50 de inteligência</span></div>
              <div><code>VELOCIDADE50</code><span>+50 de velocidade</span></div>
              <div><code>RESPEITO1000</code><span>+1.000 de respeito</span></div>
              <div><code>NIVEL10</code><span>Avança para o nível 10, se estiver abaixo</span></div>
              <div><code>CHEFAO</code><span>R$ 1.000.000 e +100 em cada atributo</span></div>
            </div>
          </div>`;
        const form = body.querySelector('#cheat-form');
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const input = body.querySelector('#cheat-code');
          const code = input.value.trim().toUpperCase();
          const result = this._ativarCheat(code, p);
          this.toast(result.mensagem, result.sucesso ? 'success' : 'error');
          if (result.sucesso) {
            GameState.salvar();
            this.refreshHeader();
            this._renderPerfilBody();
          } else {
            input.select();
          }
        });
      } else {
        const equipaveis = p.inventario.filter((i) => i.isEquipavel);
        const slotsHtml = `
          <div class="card">
            ${this._statRow('Arma', p.equipamento.arma ? `${p.equipamento.arma.icone} ${p.equipamento.arma.nome}` : '— vazio —')}
            ${this._statRow('Proteção', p.equipamento.protecao ? `${p.equipamento.protecao.icone} ${p.equipamento.protecao.nome}` : '— vazio —')}
            ${this._statRow('Veículo', p.equipamento.veiculo ? `${p.equipamento.veiculo.icone} ${p.equipamento.veiculo.nome}` : '— vazio —')}
          </div>`;
        if (equipaveis.length === 0) {
          body.innerHTML = slotsHtml + `<div class="empty-state"><span class="es-icon">🧰</span>Você ainda não possui itens equipáveis.</div>`;
          return;
        }
        body.innerHTML = slotsHtml + `<div class="section-title">Seus itens</div><div class="inv-grid">${equipaveis.map((item) => `
          <div class="inv-item ${item.equipado ? 'equipped' : ''}" data-uid="${item.uid}">
            ${item.equipado ? '<span class="eq-badge">●</span>' : ''}
            <div class="inv-icon">${item.icone}</div>
            <div class="inv-name">${item.nome}</div>
          </div>`).join('')}</div>`;
        body.querySelectorAll('.inv-item').forEach((el) => {
          el.addEventListener('click', () => this._abrirAcoesItem(parseInt(el.dataset.uid, 10)));
        });
      }
    }

    /** Aba "Editar" do Perfil: foto, nome, idade e profissão (com bônus). */
    _ativarCheat(code, p) {
      // Códigos de trapaça são intencionalmente locais e funcionam offline.
      const cheats = {
        CRIMS100K: () => { p.dinheiro += 100000; return 'Você recebeu R$ 100.000.'; },
        SUBMUNDO: () => { p.dinheiro += 500000; return 'Você recebeu R$ 500.000.'; },
        VIDAENERGIA: () => { p.vida = p.vidaMax; p.energia = p.energiaMax; p.stamina = p.staminaMax; return 'Vida, energia e stamina restauradas.'; },
        FORCA50: () => { p.forca += 50; return 'Força aumentada em 50 pontos.'; },
        GENIO50: () => { p.inteligencia += 50; return 'Inteligência aumentada em 50 pontos.'; },
        VELOCIDADE50: () => { p.velocidade += 50; return 'Velocidade aumentada em 50 pontos.'; },
        RESPEITO1000: () => { p.respeito += 1000; return 'Você recebeu 1.000 pontos de respeito.'; },
        NIVEL10: () => {
          if (p.nivel >= 10) return null;
          p.nivel = 10; p.xp = 0; p.vidaMax += 8 * 9; p.energiaMax += 3 * 9;
          p.vida = p.vidaMax; p.energia = p.energiaMax; p.staminaMax += 5 * 9; p.stamina = p.staminaMax;
          return 'Nível ajustado para 10 e atributos vitais atualizados.';
        },
        CHEFAO: () => {
          p.dinheiro += 1000000; p.forca += 100; p.inteligencia += 100; p.velocidade += 100; p.respeito += 5000;
          p.vida = p.vidaMax; p.energia = p.energiaMax; p.stamina = p.staminaMax;
          return 'Pacote CHEFÃO ativado: R$ 1.000.000, atributos reforçados e energia restaurada.';
        }
      };
      if (!code) return { sucesso: false, mensagem: 'Digite um código primeiro.' };
      if (!Object.prototype.hasOwnProperty.call(cheats, code)) return { sucesso: false, mensagem: 'Código inválido. Confira a lista e tente novamente.' };
      const mensagem = cheats[code]();
      if (!mensagem) return { sucesso: false, mensagem: 'Esse código não pode ser usado: você já está no nível 10 ou superior.' };
      return { sucesso: true, mensagem: `Cheat ativado! ${mensagem}` };
    }

    _renderEdicaoPerfil(body, p) {
      const Prof = Services.profissaoService;
      const avatarPreview = p.fotoUrl
        ? `<img src="${p.fotoUrl}" class="profile-photo-preview" alt="Foto de perfil">`
        : `<div class="profile-photo-preview profile-photo-emoji">${p.avatar}</div>`;

      const profissoesHtml = Prof.listar().map((def) => `
        <div class="prof-opt ${p.profissao === def.id ? 'selected' : ''}" data-prof="${def.id}">
          <div class="prof-icon">${def.icone}</div>
          <div class="prof-name">${def.nome}</div>
          <div class="prof-desc">${def.descricao}</div>
        </div>`).join('');

      body.innerHTML = `
        <div class="card" style="text-align:center;">
          ${avatarPreview}
          <div class="btn-row" style="margin-top:12px;">
            <button class="btn btn-secondary btn-sm" id="btn-alterar-foto">📷 Alterar foto</button>
            ${p.fotoUrl ? `<button class="btn btn-ghost btn-sm" id="btn-remover-foto">Remover foto</button>` : ''}
          </div>
          <input type="file" id="input-foto-perfil" accept="image/*" class="hidden">
        </div>

        <div class="section-title">📝 Dados pessoais</div>
        <div class="card">
          <label class="field-label">Nome</label>
          <input type="text" id="input-edit-nome" maxlength="16" value="${p.nome}">
          <label class="field-label">Idade</label>
          <input type="number" id="input-edit-idade" min="18" max="90" value="${p.idade || 25}">
          <button class="btn btn-primary btn-block" id="btn-salvar-dados" style="margin-top:14px;">Salvar nome e idade</button>
        </div>

        <div class="section-title">💼 Profissão ${p.profissao ? '' : '<span class="chip chip-risk-alto">nenhuma escolhida</span>'}</div>
        <p style="font-size:12px;color:var(--text-2);margin:-4px 0 10px;">
          ${p.profissao ? `Trocar de profissão custa ${fmtMoney(Prof.custoTroca())}.` : 'Escolha uma profissão para ganhar um bônus permanente.'}
        </p>
        <div class="prof-grid">${profissoesHtml}</div>
      `;

      document.getElementById('btn-salvar-dados').addEventListener('click', () => {
        const nome = document.getElementById('input-edit-nome').value.trim();
        const idade = parseInt(document.getElementById('input-edit-idade').value, 10);
        if (!nome) { this.toast('O nome não pode ficar vazio.', 'error'); return; }
        if (!idade || idade < 18 || idade > 90) { this.toast('Idade inválida (mínimo 18 anos).', 'error'); return; }
        p.nome = nome.slice(0, 16);
        p.idade = idade;
        GameState.salvar(); this.refreshHeader();
        this.toast('Dados atualizados!', 'success');
      });

      document.getElementById('btn-alterar-foto').addEventListener('click', () => {
        document.getElementById('input-foto-perfil').click();
      });
      document.getElementById('input-foto-perfil').addEventListener('change', (e) => {
        this._processarFoto(e.target.files[0], (dataUrl) => {
          p.fotoUrl = dataUrl;
          GameState.salvar(); this.refreshHeader();
          this.toast('Foto atualizada!', 'success');
          this._renderPerfilBody();
        });
      });
      const btnRemoverFoto = document.getElementById('btn-remover-foto');
      if (btnRemoverFoto) {
        btnRemoverFoto.addEventListener('click', () => {
          p.fotoUrl = null;
          GameState.salvar(); this.refreshHeader();
          this.toast('Foto removida.', 'info');
          this._renderPerfilBody();
        });
      }

      body.querySelectorAll('.prof-opt').forEach((el) => {
        el.addEventListener('click', () => {
          const r = Prof.escolher(p, el.dataset.prof);
          this.toast(r.mensagem, r.sucesso ? 'success' : 'error');
          if (r.sucesso) { GameState.salvar(); this.refreshHeader(); this._renderPerfilBody(); }
        });
      });
    }

    /** Modal de ações para um item equipável: Equipar/Desequipar + Vender. */
    _abrirAcoesItem(uid) {
      const p = GameState.player;
      const item = p.inventario.find((i) => i.uid === uid);
      if (!item) return;
      const def = ITENS.find((d) => d.id === item.id);
      const valorVenda = Math.round((def ? def.preco : 0) * 0.5);
      this.modal(item.nome, item.descricao, `
        <div class="btn-row">
          ${item.equipado
            ? `<button class="btn btn-ghost" id="btn-desequipar">Desequipar</button>`
            : `<button class="btn btn-secondary" id="btn-equipar">Equipar</button>`}
          <button class="btn btn-danger" id="btn-vender-item">Vender (${fmtMoney(valorVenda)})</button>
        </div>
      `);
      const finalizar = () => { this.closeModal(); this.refreshHeader(); this._renderPerfilBody(); GameState.salvar(); };
      const btnEquipar = document.getElementById('btn-equipar');
      if (btnEquipar) btnEquipar.addEventListener('click', () => {
        p.equiparItem(uid); this.toast('Item equipado!', 'success'); finalizar();
      });
      const btnDesequipar = document.getElementById('btn-desequipar');
      if (btnDesequipar) btnDesequipar.addEventListener('click', () => {
        p.equipamento[item.tipo] = null; item.equipado = false;
        this.toast('Item desequipado.', 'info'); finalizar();
      });
      document.getElementById('btn-vender-item').addEventListener('click', () => {
        const r = Services.lojaService.venderItem(p, uid);
        this.toast(r.mensagem, r.sucesso ? 'success' : 'error');
        finalizar();
      });
    }

    _usarConsumivel(uid) {
      const item = GameState.player.inventario.find((i) => i.uid === uid);
      if (!item) return;
      const def = ITENS.find((d) => d.id === item.id);
      const valorVenda = Math.round((def ? def.preco : 0) * 0.5);
      this.modal(item.nome, item.descricao, `
        <div class="btn-row">
          <button class="btn btn-danger" id="btn-vender-consumivel">Vender (${fmtMoney(valorVenda)})</button>
          <button class="btn btn-primary" id="modal-usar">Usar</button>
        </div>
      `);
      document.getElementById('btn-vender-consumivel').addEventListener('click', () => {
        const r = Services.lojaService.venderItem(GameState.player, uid);
        this.toast(r.mensagem, r.sucesso ? 'success' : 'error');
        this.closeModal(); this.refreshHeader(); this._renderPerfilBody(); GameState.salvar();
      });
      document.getElementById('modal-usar').addEventListener('click', () => {
        const player = GameState.player;
        const usou = player.consumirItem(uid);
        const evento = player.ultimoEventoConsumo || {};
        GameState.salvar(); this.refreshHeader(); this.closeModal();
        if (!usou) this.toast('Não é possível usar esse item no estado atual.', 'error');
        else if (evento.overdose) this.toast(`⚠️ Efeito adverso: seu personagem ficará inativo por ${fmtTime(player.state.secondsRemaining())}.`, 'error');
        else if (item.efeitos.tratarEstado) this.toast('Tratamento aplicado.', 'success');
        else this.toast(`Você usou "${item.nome}".`, 'success');
        this._renderPerfilBody();
      });
    }

    _statRow(label, val) {
      return `<div class="stat-row"><span class="stat-name">${label}</span><span class="stat-val">${val}</span></div>`;
    }

    // ============================================================
    // MODAL / TOAST (utilitários de UI reutilizáveis)
    // ============================================================
    modal(titulo, sub, bodyHtml) {
      this.$['modal-box'].innerHTML = `
        <div class="modal-title">${titulo}</div>
        <div class="modal-sub">${sub}</div>
        ${bodyHtml}
      `;
      this.$['modal-overlay'].classList.remove('hidden');
    }

    closeModal() {
      this.$['modal-overlay'].classList.add('hidden');
      this.$['modal-box'].innerHTML = '';
    }

    confirmar(titulo, sub, onConfirm) {
      this.modal(titulo, sub, `
        <div class="btn-row">
          <button class="btn btn-ghost" id="modal-no">Cancelar</button>
          <button class="btn btn-danger" id="modal-yes">Confirmar</button>
        </div>
      `);
      document.getElementById('modal-no').addEventListener('click', () => this.closeModal());
      document.getElementById('modal-yes').addEventListener('click', () => { this.closeModal(); onConfirm(); });
    }

    toast(msg, type = 'info') {
      const el = document.createElement('div');
      el.className = `toast ${type}`;
      el.textContent = msg;
      this.$['toast-container'].appendChild(el);
      setTimeout(() => el.remove(), 3200);
    }
  }

  Game.Core.UIManager = new UIManager();

  // Fecha o modal ao clicar fora da caixa
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') Game.Core.UIManager.closeModal();
    });
  });

})(window);
