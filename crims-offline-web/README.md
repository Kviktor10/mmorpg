# 🕶️ CITY OF CRIMS — RPG de Vida de Crime (Offline)

Jogo de navegador inspirado no gênero de RPGs de crime urbano (estilo *The
Crims*), reimaginado como uma **versão 100% original, offline e single-player**,
construída do zero **apenas com HTML5 + CSS3 + JavaScript puro (vanilla)**,
sem frameworks, sem build tools e sem dependências externas.

> Nenhum código, asset ou texto do jogo "The Crims" foi copiado. O projeto
> recria, de forma independente, as mecânicas **tradicionais do gênero**
> (crimes, combate, treino, loja, banco, prisão/hospital, níveis), que são
> comuns a dezenas de jogos deste estilo desde os anos 2000.

## ▶️ Como jogar

Não precisa instalar nada. Basta abrir o arquivo `index.html` em qualquer
navegador moderno (Chrome, Edge, Firefox, Safari), inclusive **offline** e
**no celular**. O layout é mobile-first.

```
city-of-crims/
├── index.html         <- abra este arquivo
├── css/style.css
├── js/
└── README.md
```

Todo o progresso é salvo automaticamente no `localStorage` do navegador
(a cada 15s e após cada ação importante), então você pode fechar a aba e
continuar depois de onde parou — inclusive a energia/vida regeneram mesmo
com o jogo fechado (calculado pelo tempo decorrido ao reabrir).

## 🎮 Mecânicas do jogo

- **Crimes**: 8 tipos de crime com risco/recompensa crescente, chance de
  sucesso calculada com base nos seus atributos, chance de prisão ao falhar.
- **Combate**: enfrente rivais gerados proceduralmente (nome, nível, poder,
  facção) para ganhar dinheiro e respeito.
- **Academia**: treine Força, Velocidade, Inteligência e Stamina gastando energia; a stamina afeta discretamente o poder de combate.
- **Loja**: compre armas, proteções, veículos e consumíveis (energético,
  kits médicos) que alteram seu poder de combate.
- **Banco**: proteja seu dinheiro depositando (dinheiro em mãos não é
  "perdido" no jogo atual, mas a mecânica está pronta para expansão, como
  roubos entre jogadores).
- **Negócios (crime organizado)**: compre e evolua propriedades com renda passiva baseada no tempo real, inclusive enquanto o jogo está fechado (até 12 horas de produção acumulada):
  - 🧪 **Oito fábricas por categoria** — produzem unidades virtuais de maconha, LSD, ninfetamina fictícia, cigarro, cerveja, heroína, morfina e analgésico fictício. Cada fábrica tem custo e produção próprios e pode ser vendida por três vezes o custo original de aquisição; a produção pendente é recolhida antes da venda.
  - 🎧 **Boate do Submundo** — compre estoque para clientes ou transfira mercadoria produzida nas fábricas; venda o estoque da boate para receber renda.
  - 🏮 **Bordel** — negócio de renda passiva com contratação de equipes adultas. O jogo administra equipes contratadas em vez de comprar ou revender pessoas.
  - 🎲 **Casa de Jogos Clandestina** — compre mesas adicionais; cada mesa concede bônus à renda passiva.
  - 🔧 **Garagem Clandestina** — compre filtros, pneus, baterias e outras peças para revender por preços variáveis.
  - 📦 **Depósito de Contrabando** — revende cargas contrabandeadas.
  - 📍 **Até cinco pontos de venda** — podem ser abastecidos com produção recolhida; a venda dos estoques dos pontos tem risco de batida policial e confisco.
  Cada negócio pode ser melhorado, aumentando a produção por hora com custo crescente (~55% por nível).
- **Mercado e estoques separados**: produtos comprados vão para o estoque pessoal. Produtos fabricados permanecem na produção da fábrica até serem recolhidos. Depois, podem ser vendidos ou transferidos para a boate/pontos. Estoque pessoal, produção, boate e pontos são contabilizados separadamente. Os preços dos produtos e das peças variam periodicamente.
- **Loja expandida**: 45 itens entre armas de arcade, proteções, veículos e consumíveis. Inclui MP5-Navy, AK-47, Desert Eagle, metralhadora pesada, arma laser fictícia, novos veículos, recuperação de energia/stamina e itens de jogo que aumentam permanentemente Força, Velocidade ou Inteligência. Itens do inventário podem ser vendidos por metade do preço de tabela (Perfil → Inventário).
- **Perfil customizável** (Perfil → Editar): defina uma foto, nome e idade (mínimo 18 anos) e escolha uma profissão com bônus permanente:
  - 🔫 Assaltante (+15% de recompensa em crimes) • 🥷 Ladrão (+10 de chance em crimes) • 🧪 Traficante (+25% na produção das fábricas e pontos) • 🏮 Cafetão (+30% de renda do Bordel) • 💪 Gangster (+12% no poder de combate) • 👮 Policial Corrupto (-10% no custo do suborno) • ⚖️ Advogado (-30% no custo da fiança) • 👨‍⚖️ Juiz (-25% no tempo de prisão) • 🎩 Político (+20% na produção dos negócios).
  Trocar de profissão depois tem um custo simbólico. As equipes adultas são contratos de trabalho dentro do jogo; personagens humanos não podem ser comprados ou revendidos como mercadoria.
- **Fiança e suborno**: ao ser preso, pague fiança para sair imediatamente ou escolha o nível de suborno: baixo (25% de chance), médio (50%) ou alto (70%). O custo cresce com a chance de sucesso; se o suborno falhar, você perde o dinheiro e recebe tempo extra de prisão.
- **Doença, overdose e recuperação médica**: eventos abstratos do jogo e determinados consumíveis podem deixar o personagem temporariamente inativo. Durante esses estados, não é possível cometer crimes, treinar ou lutar. Um medicamento fictício encerra doença/overdose; uma consulta médica reduz em aproximadamente 80% o tempo de recuperação. As substâncias têm apenas parâmetros virtuais de energia, stamina e risco; o projeto não contém receitas ou métodos reais de fabricação.
- **Progressão**: sistema de XP, níveis, títulos (de "Novato nas ruas" a
  "Padrinho da cidade") e ranking de poder de combate.
- **Conselheiro IA**: um sistema especialista baseado em regras (IA
  simbólica, 100% offline) analisa seu estado atual (vida, energia, prisão,
  equipamentos, dinheiro) e sugere a melhor próxima ação no Dashboard.

## 🏗️ Arquitetura & Engenharia de Software

O projeto foi estruturado em **camadas**, seguindo um raciocínio próximo de
MVC, com responsabilidades bem separadas (Clean Code / SOLID):

| Camada           | Arquivo(s)                | Responsabilidade                                   |
|-------------------|----------------------------|-----------------------------------------------------|
| Infraestrutura     | `01-storage.js`, `02-eventbus.js` | Persistência (localStorage) e comunicação desacoplada |
| Modelos (POO)      | `03-models.js`             | Entidades de domínio: `Player`, `Item`, `NPC`, estados |
| Dados              | `04-data.js`               | Catálogo estático: crimes, itens, nomes, títulos     |
| Factories          | `05-factories.js`          | Criação de `Item` e `NPC`                            |
| Serviços           | `06-services.js`, `06b-expansion-services.js` | Regras de negócio (crimes, combate, lojas, fábricas, estoques, saúde...) |
| Orquestração       | `07-gamestate.js`          | Facade + Singleton: liga tudo, game loop, autosave    |
| Apresentação       | `08-ui.js`                 | Renderização de telas, eventos de UI, modais, toasts |
| Bootstrap          | `09-main.js`                | Ponto de entrada da aplicação                         |

### Padrões de projeto (Design Patterns) aplicados

- **Singleton** — `StorageManager`, `EventBus`, `GameState`: garantem uma
  única instância coordenando persistência, eventos e o estado da partida.
- **Observer** — `EventBus`: Services emitem eventos (`player.levelUp`,
  `crime.resolved`, etc.) e a UI reage a eles sem acoplamento direto.
- **Factory Method** — `ItemFactory` e `NPCFactory`: encapsulam a criação de
  objetos complexos a partir do catálogo de dados.
- **NegocioService / TerritorioService / MercadoNegroService** (`06-services.js`):
  gerenciam compra, evolução, coleta de produção passiva (fábrica de
  drogas, bordel, garagem, cassino, depósito, pontos de drogas) e a
  flutuação de preço no mercado negro — seguindo o mesmo padrão dos demais
  serviços (entrada = Player + parâmetros, saída = objeto de resultado
  explícito).
- **ProfissaoService**: catálogo de profissões e seus bônus; os demais
  serviços consultam `bonus(player, chave)` para aplicar o efeito certo —
  um exemplo direto de **Strategy**/injeção de comportamento sem acoplar
  cada serviço ao conceito de "profissão".
- **PrisaoService**: calcula custo/chance de fiança e suborno, aplicando os
  bônus de profissão (ex: Advogado reduz o custo da fiança).
- **State** — `PlayerState` (`FreeState`, `JailState`, `HospitalState`):
  modela os estados do jogador como classes polimórficas em vez de
  condicionais espalhadas pelo código.
- **Strategy** — `ChanceStrategyPadrao` dentro do `CrimeService`: o cálculo
  de chance de sucesso de um crime é intercambiável sem alterar o serviço.
- **Facade** — `GameState`: esconde toda a complexidade de Models/Services/
  Storage atrás de uma API simples para a UI (`novoJogo`, `salvar`, etc.).
- **Module Pattern (IIFE)** — todo arquivo JS roda em escopo isolado e expõe
  apenas o necessário no namespace global `window.Game`, evitando poluição
  do `window` (boa prática mesmo sem usar ES Modules, o que garante que o
  jogo funcione abrindo o `index.html` diretamente via `file://`, sem
  precisar de um servidor local).

### Princípios de Código Limpo

- Nomenclatura consistente em português (domínio do jogo) e funções curtas
  com responsabilidade única.
- Services nunca manipulam o DOM; UI nunca contém regra de negócio.
- Resultados de ações sempre retornam um objeto explícito (`{ sucesso,
  mensagem, ... }`), evitando efeitos colaterais escondidos.
- Constantes de configuração centralizadas (`Game.Data`, `Game.Events`).
- Serialização (`toJSON` / `fromJSON`) isolada nos próprios modelos.

### Otimizações

- Nenhuma dependência externa → carregamento instantâneo, zero requisições
  de rede, funciona 100% offline.
- Game loop leve (`setInterval` de 1s) apenas recalcula regeneração/tempo;
  a UI só re-renderiza a tela ativa quando necessário.
- Autosave assíncrono e não-bloqueante a cada 15s + salva ao fechar a aba.
- Progresso offline: ao reabrir o jogo, energia/vida são recalculadas com
  base no tempo real decorrido (sem precisar de loop rodando em segundo
  plano).

## 🤖 Sobre o uso de "IA"

O jogo roda inteiramente no navegador, sem backend e sem internet, portanto
a "IA" aqui é um **sistema especialista baseado em regras** (`AdvisorAI`,
em `06-services.js`): ele avalia o estado atual do jogador (vida, energia,
prisão, equipamento, dinheiro) e gera recomendações contextuais — a mesma
técnica usada em NPCs e assistentes de jogos reais antes de redes neurais,
garantindo que o recurso funcione 100% offline, sem custo e sem APIs pagas.

## 🖥️ Desktop e personalização de ícones

- O layout agora é **responsivo**: continua mobile-first no celular, mas em
  telas a partir de ~900px (navegador no PC) a navegação inferior vira uma
  **barra lateral fixa**, o conteúdo ganha grades com mais colunas e o app é
  exibido como um painel centralizado com cantos arredondados — sem precisar
  de instalação, é só abrir o `index.html` no navegador do computador.
- Em **Perfil → 🎨 Ícones** dá para trocar qualquer ícone do jogo (crimes,
  itens da loja, drogas, peças, negócios, profissões e atributos da academia)
  por uma **imagem PNG/JPG sua**: clique em 📤 no ícone desejado, escolha o
  arquivo e ele é automaticamente recortado/reduzido antes de ser salvo. Um
  botão ↺ restaura o emoji padrão individualmente, e outro restaura tudo de
  uma vez. As imagens ficam salvas só neste navegador (localStorage),
  separadas do save da partida — trocar de ícone não afeta seu progresso.

## 📱 Design

Interface mobile-first, tema escuro elegante com acentos em dourado/vermelho
(estética "submundo do crime"), navegação inferior por abas, cartões com
sombra suave, barras de progresso animadas e modais estilo bottom-sheet —
sem imagens externas (usa apenas emojis nativos), o que mantém o projeto
leve e 100% funcional offline.

## 🔧 Extensões possíveis

- Sistema de roubo entre contas salvas (import/export de save em JSON).
- Novas facções com bônus passivos.
- Missões diárias com recompensas.
- Exportação do save para arquivo `.json` (backup manual).

---
Desenvolvido como projeto de estudo de **POO, Engenharia de Software, Design
Patterns e Código Limpo em JavaScript puro**.
