/**
 * =============================================================================
 * 06b-expansion-services.js — sistemas complementares do City of Crims.
 * Mantém regras de domínio fora da UI e usa somente estoques virtuais do jogo.
 * =============================================================================
 */
(function (global) {
  'use strict';

  const Game = global.Game;
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const DROGAS = Game.Data.DROGAS;
  const PECAS = Game.Data.PECAS_GARAGEM;

  class ExpansaoService {
    constructor() {
      this.intervaloPrecos = 5 * 60 * 1000;
      this.proximaAtualizacao = 0;
      this.precos = {};
      this.atualizarPrecos(true);
    }

    _inicializarEstoques(player) {
      ['estoqueDrogasCompradas', 'estoqueDrogasProduzidas', 'estoqueDrogasBoate', 'estoqueDrogasPontos', 'estoquePecas']
        .forEach((chave) => { if (!player[chave] || typeof player[chave] !== 'object') player[chave] = {}; });
    }

    atualizarPrecos(forcar = false) {
      if (!forcar && Date.now() < this.proximaAtualizacao) return;
      DROGAS.forEach((droga) => {
        this.precos[droga.id] = {
          compra: Math.max(1, Math.round(droga.precoCompra * (0.85 + Math.random() * 0.30))),
          venda: Math.max(1, Math.round(droga.precoVenda * (0.85 + Math.random() * 0.30)))
        };
      });
      PECAS.forEach((peca) => {
        this.precos[`peca_${peca.id}`] = {
          compra: peca.precoCompra,
          venda: Math.max(1, Math.round(peca.precoVendaBase * (0.75 + Math.random() * 0.50)))
        };
      });
      this.proximaAtualizacao = Date.now() + this.intervaloPrecos;
    }

    preco(drogaId, tipo = 'compra') {
      this.atualizarPrecos();
      return this.precos[drogaId] ? this.precos[drogaId][tipo] : 0;
    }

    comprarDroga(player, drogaId, quantidade = 5) {
      this._inicializarEstoques(player);
      const droga = DROGAS.find((d) => d.id === drogaId);
      const qtd = clamp(Math.floor(Number(quantidade) || 0), 1, 50);
      if (!droga) return { sucesso: false, mensagem: 'Produto não encontrado.' };
      const custo = this.preco(drogaId, 'compra') * qtd;
      if (player.dinheiro < custo) return { sucesso: false, mensagem: `Dinheiro insuficiente. São necessários R$ ${custo}.` };
      player.dinheiro -= custo;
      player.estoqueDrogasCompradas[drogaId] = (player.estoqueDrogasCompradas[drogaId] || 0) + qtd;
      return { sucesso: true, quantidade: qtd, custo, mensagem: `Você comprou ${qtd} un. de ${droga.nome}; o produto foi para seu estoque pessoal.` };
    }

    venderProducao(player, drogaId, quantidade = Infinity) {
      this._inicializarEstoques(player);
      const droga = DROGAS.find((d) => d.id === drogaId);
      if (!droga) return { sucesso: false, mensagem: 'Produto não encontrado.' };
      const disponivel = Math.floor(player.estoqueDrogasProduzidas[drogaId] || 0);
      const qtd = Math.min(disponivel, Number.isFinite(quantidade) ? Math.max(0, Math.floor(quantidade)) : disponivel);
      if (qtd <= 0) return { sucesso: false, mensagem: 'Não há produção recolhida desse produto para vender.' };
      const valor = qtd * this.preco(drogaId, 'venda');
      player.estoqueDrogasProduzidas[drogaId] -= qtd;
      player.dinheiro += valor;
      return { sucesso: true, quantidade: qtd, valor, mensagem: `Você vendeu ${qtd} un. de ${droga.nome} por R$ ${valor}.` };
    }

    transferirEstoque(player, drogaId, quantidade = 5, origem = 'produzidas', destino = 'boate') {
      this._inicializarEstoques(player);
      const droga = DROGAS.find((d) => d.id === drogaId);
      if (!droga) return { sucesso: false, mensagem: 'Produto não encontrado.' };
      if (!['compradas', 'produzidas'].includes(origem) || !['boate', 'pontos'].includes(destino)) {
        return { sucesso: false, mensagem: 'Transferência inválida.' };
      }
      if (destino === 'boate' && !player.propriedades.boate) return { sucesso: false, mensagem: 'Compre a Boate do Submundo antes de abastecê-la.' };
      if (destino === 'pontos' && player.pontosDrogas.length === 0) return { sucesso: false, mensagem: 'Conquiste ao menos um ponto de venda antes de abastecê-lo.' };
      const estoqueOrigem = origem === 'compradas' ? player.estoqueDrogasCompradas : player.estoqueDrogasProduzidas;
      const qtd = Math.min(Math.max(1, Math.floor(Number(quantidade) || 1)), Math.floor(estoqueOrigem[drogaId] || 0));
      if (qtd <= 0) return { sucesso: false, mensagem: `Não há ${droga.nome} suficiente nesse estoque.` };
      const estoqueDestino = destino === 'boate' ? player.estoqueDrogasBoate : player.estoqueDrogasPontos;
      estoqueOrigem[drogaId] -= qtd;
      estoqueDestino[drogaId] = (estoqueDestino[drogaId] || 0) + qtd;
      const destinoLabel = destino === 'boate' ? 'boate' : 'pontos de venda';
      return { sucesso: true, quantidade: qtd, mensagem: `${qtd} un. de ${droga.nome} transferidas para ${destinoLabel}.` };
    }

    venderEstoqueEstabelecimento(player, drogaId, destino = 'boate', quantidade = Infinity) {
      this._inicializarEstoques(player);
      const droga = DROGAS.find((d) => d.id === drogaId);
      if (!droga) return { sucesso: false, mensagem: 'Produto não encontrado.' };
      if (destino === 'boate' && !player.propriedades.boate) return { sucesso: false, mensagem: 'Você ainda não possui uma boate.' };
      if (destino === 'pontos' && player.pontosDrogas.length === 0) return { sucesso: false, mensagem: 'Você ainda não possui ponto de venda.' };
      const estoque = destino === 'boate' ? player.estoqueDrogasBoate : player.estoqueDrogasPontos;
      const disponivel = Math.floor(estoque[drogaId] || 0);
      const qtd = Math.min(disponivel, Number.isFinite(quantidade) ? Math.max(0, Math.floor(quantidade)) : disponivel);
      if (qtd <= 0) return { sucesso: false, mensagem: `Não há ${droga.nome} nesse estoque.` };
      if (destino === 'pontos' && rand(1, 100) <= 10) {
        estoque[drogaId] -= qtd;
        return { sucesso: false, batida: true, mensagem: `Batida policial no ponto: ${qtd} un. de ${droga.nome} foram confiscadas.` };
      }
      const multiplicador = destino === 'boate' ? 1.25 : 1.10;
      const valor = Math.round(qtd * this.preco(drogaId, 'venda') * multiplicador);
      estoque[drogaId] -= qtd;
      player.dinheiro += valor;
      return { sucesso: true, quantidade: qtd, valor, mensagem: `Venda concluída: ${qtd} un. de ${droga.nome} renderam R$ ${valor}.` };
    }

    venderFabrica(player, fabricaId) {
      const def = Game.Services.negocioService.obterDef(fabricaId);
      const propriedade = player.propriedades[fabricaId];
      if (!def || !String(def.recurso).startsWith('droga:') || !propriedade) {
        return { sucesso: false, mensagem: 'Você não possui essa fábrica.' };
      }
      // Recolhe primeiro a produção acumulada para que ela não seja perdida.
      Game.Services.negocioService.coletar(player, fabricaId);
      const valorCompra = propriedade.custoCompra || def.custoBase;
      const valor = Math.round(valorCompra * 3);
      delete player.propriedades[fabricaId];
      player.dinheiro += valor;
      return { sucesso: true, valor, mensagem: `Fábrica vendida por R$ ${valor} (três vezes o custo de aquisição).` };
    }

    custoMesaCassino(player) {
      return Math.round(650 * Math.pow(1.6, Math.max(0, player.mesasCassino || 0)));
    }

    comprarMesaCassino(player) {
      if (!player.propriedades.casa_jogos) return { sucesso: false, mensagem: 'Compre a Casa de Jogos antes de adquirir mesas.' };
      const custo = this.custoMesaCassino(player);
      if (player.dinheiro < custo) return { sucesso: false, mensagem: 'Dinheiro insuficiente para comprar uma mesa.' };
      player.dinheiro -= custo;
      player.mesasCassino = (player.mesasCassino || 0) + 1;
      return { sucesso: true, mensagem: `Mesa adquirida. Total de mesas: ${player.mesasCassino}.` };
    }

    comprarPeca(player, pecaId, quantidade = 1) {
      this._inicializarEstoques(player);
      if (!player.propriedades.garagem) return { sucesso: false, mensagem: 'Compre uma garagem para negociar peças.' };
      const peca = PECAS.find((item) => item.id === pecaId);
      if (!peca) return { sucesso: false, mensagem: 'Peça não encontrada.' };
      const qtd = clamp(Math.floor(Number(quantidade) || 1), 1, 20);
      const custo = peca.precoCompra * qtd;
      if (player.dinheiro < custo) return { sucesso: false, mensagem: 'Dinheiro insuficiente para comprar as peças.' };
      player.dinheiro -= custo;
      player.estoquePecas[pecaId] = (player.estoquePecas[pecaId] || 0) + qtd;
      return { sucesso: true, quantidade: qtd, mensagem: `Você comprou ${qtd} un. de ${peca.nome} para a garagem.` };
    }

    venderPeca(player, pecaId, quantidade = 1) {
      this._inicializarEstoques(player);
      if (!player.propriedades.garagem) return { sucesso: false, mensagem: 'Você precisa possuir uma garagem para revender peças.' };
      const peca = PECAS.find((item) => item.id === pecaId);
      if (!peca) return { sucesso: false, mensagem: 'Peça não encontrada.' };
      const estoque = Math.floor(player.estoquePecas[pecaId] || 0);
      const qtd = Math.min(estoque, clamp(Math.floor(Number(quantidade) || 1), 1, 20));
      if (qtd <= 0) return { sucesso: false, mensagem: 'Você não tem essa peça no estoque.' };
      this.atualizarPrecos();
      const preco = this.precos[`peca_${pecaId}`].venda;
      const valor = qtd * preco;
      player.estoquePecas[pecaId] -= qtd;
      player.dinheiro += valor;
      return { sucesso: true, quantidade: qtd, valor, mensagem: `Você revendeu ${qtd} un. de ${peca.nome} por R$ ${valor}.` };
    }

    contratarEquipe(player, local, categoria) {
      const negociosValidos = { boate: 'boate', bordel: 'bordel' };
      if (!negociosValidos[local] || !player.propriedades[negociosValidos[local]]) {
        return { sucesso: false, mensagem: `Você precisa possuir ${local === 'boate' ? 'uma boate' : 'um bordel'} para contratar equipe.` };
      }
      const opcoes = {
        economica: { nome: 'Equipe econômica adulta', custo: 350, bonus: 0.08 },
        padrao: { nome: 'Equipe padrão adulta', custo: 850, bonus: 0.16 },
        premium: { nome: 'Equipe premium adulta', custo: 1800, bonus: 0.28 }
      };
      const def = opcoes[categoria];
      if (!def) return { sucesso: false, mensagem: 'Categoria de equipe inválida.' };
      if (player.dinheiro < def.custo) return { sucesso: false, mensagem: 'Dinheiro insuficiente para contratar a equipe.' };
      player.dinheiro -= def.custo;
      player.equipeEstabelecimentos = player.equipeEstabelecimentos || [];
      player.equipeEstabelecimentos.push({ id: `eq_${Date.now()}_${rand(100,999)}`, local, categoria, nome: def.nome, bonus: def.bonus, custo: def.custo });
      return { sucesso: true, mensagem: `${def.nome} contratada para o estabelecimento.` };
    }

    visitarBordelEconomico(player) {
      if (!player.propriedades.bordel) return { sucesso: false, mensagem: 'Você precisa possuir um bordel para acessar esta atividade do jogo.' };
      if (!player.state.canAct()) return { sucesso: false, mensagem: `Você está ${player.state.label.toLowerCase()} e não pode realizar esta ação.` };
      const custo = 50;
      if (player.dinheiro < custo) return { sucesso: false, mensagem: 'Dinheiro insuficiente para esta atividade.' };
      player.dinheiro -= custo;
      player.gastarEnergia(Math.min(player.energia, 2));
      if (rand(1, 100) <= 12) {
        player.doencaTipo = 'doença temporária';
        player.entrarEm('doente', 180);
        return { sucesso: true, doente: true, mensagem: 'Evento de risco sanitário: seu personagem ficou doente por 3 minutos de jogo.' };
      }
      return { sucesso: true, doente: false, mensagem: 'Atividade concluída sem evento adverso.' };
    }

    consultarMedico(player) {
      if (!['doente', 'overdose', 'hospital'].includes(player.state.key)) {
        return { sucesso: false, mensagem: 'Você não precisa de atendimento médico agora.' };
      }
      const restante = player.state.secondsRemaining();
      const custo = Math.max(100, Math.round(restante * 2));
      if (player.dinheiro < custo) return { sucesso: false, mensagem: `A consulta custa R$ ${custo}; saldo insuficiente.` };
      player.dinheiro -= custo;
      if (restante <= 10) {
        if (player.state.key === 'hospital') player.vida = player.vidaMax;
        player.doencaTipo = null;
        player.liberar();
      } else {
        player.estadoFim = Date.now() + Math.max(1, Math.round(restante * 0.2)) * 1000;
      }
      return { sucesso: true, custo, mensagem: `Atendimento concluído. O tempo de recuperação foi reduzido em cerca de 80%.` };
    }
  }

  Game.Services.expansaoService = new ExpansaoService();
})(window);
