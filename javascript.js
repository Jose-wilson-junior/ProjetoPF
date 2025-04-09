// ======= CONFIGURAÇÕES INICIAIS =======

// Tamanho de cada célula do tabuleiro em pixels
const TILE_SIZE = 51;

// Dimensões do tabuleiro (10x10)
const GRID_WIDTH = 10;
const GRID_HEIGHT = 10;

// Número de bombas e número máximo de bandeiras
const NUM_BOMBS = 10;
const MAX_FLAGS = 10;

// Cores associadas aos números de bombas ao redor (1-8)
const COLORS = [
  "#ffffff", // 0 (não aparece)
  "#3498db", // 1
  "#2ecc71", // 2
  "#f1c40f", // 3
  "#e67e22", // 4
  "#e74c3c", // 5
  "#9b59b6", // 6
  "#1abc9c", // 7
  "#34495e"  // 8
];

// Cria um objeto célula com os estados padrões
const createTile = (i, j) => ({
  i, j,                  // Posição (linha, coluna)
  isBomb: false,         // Indica se a célula contém uma bomba
  isOpen: false,         // Indica se a célula foi aberta
  bombsAround: 0,        // Número de bombas ao redor
  marked: false,         // Indica se a célula foi marcada com uma bandeira
});

// Gera a grade completa com base na largura e altura
const generateGrid = (width, height) =>
  Array.from({ length: width * height }, (_, index) => {
    const i = Math.floor(index / height); // Calcula a linha
    const j = index % height;            // Calcula a coluna
    return createTile(i, j);             // Retorna uma célula com as coordenadas calculadas
  });

// Coloca bombas em posições aleatórias no tabuleiro
const placeBombs = (tiles, numBombs) => {
  const indices = [...Array(tiles.length).keys()]; // Cria um array de índices
  const bombIndices = shuffle(indices).slice(0, numBombs); // Embaralha e seleciona os índices das bombas
  return tiles.map((tile, index) => ({ ...tile, isBomb: bombIndices.includes(index) })); // Atualiza as células com bombas
};

// Embaralha um array usando o algoritmo Fisher-Yates
const shuffle = (array) => {
  const arr = [...array]; // Cria uma cópia do array original
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // Escolhe um índice aleatório
    [arr[i], arr[j]] = [arr[j], arr[i]]; // Troca os elementos
  }
  return arr;
};

// Retorna coordenadas dos vizinhos válidos da célula
const getNeighbors = (i, j) => {
  const deltas = [-1, 0, 1]; // Possíveis variações nas coordenadas
  return deltas.flatMap(di =>
    deltas.map(dj => [i + di, j + dj]) // Gera todas as combinações de vizinhos
  ).filter(([ni, nj]) =>               // Filtra vizinhos inválidos
    (ni !== i || nj !== j) &&          // Remove a própria célula
    ni >= 0 && ni < GRID_WIDTH && nj >= 0 && nj < GRID_HEIGHT // Remove coordenadas fora do tabuleiro
  );
};

// Retorna uma célula específica da grade
const getTile = (tiles, i, j) =>
  tiles.find(t => t.i === i && t.j === j); // Procura a célula com as coordenadas (i, j)

// Conta quantas bombas existem ao redor de cada célula
const calculateNBombs = (tiles) =>
  tiles.map(tile => {
    const bombsAround = getNeighbors(tile.i, tile.j).reduce((acc, [ni, nj]) => {
      const neighbor = getTile(tiles, ni, nj); // Obtém o vizinho
      return acc + (neighbor?.isBomb ? 1 : 0); // Incrementa se o vizinho for uma bomba
    }, 0);
    return { ...tile, bombsAround }; // Atualiza o número de bombas ao redor
  });

// Abre uma célula recursivamente (e seus vizinhos, se necessário)
const openTileRecursive = (tiles, i, j, visited = new Set(), currentScore) => {
  const key = `${i},${j}`;
  if (visited.has(key)) return { tiles, score: currentScore }; // Evita repetição
  visited.add(key);

  const tile = getTile(tiles, i, j);
  if (!tile || tile.isOpen || tile.isBomb || tile.marked) return { tiles, score: currentScore }; // Verifica condições para abrir

  let newTiles = tiles.map(t =>
    t.i === i && t.j === j ? { ...t, isOpen: true } : t // Marca a célula como aberta
  );
  let newScore = currentScore + 1; // Incrementa a pontuação

  // Se não há bombas ao redor, abre os vizinhos recursivamente
  if (tile.bombsAround === 0) {
    const neighbors = getNeighbors(i, j);
    for (const [ni, nj] of neighbors) {
      const result = openTileRecursive(newTiles, ni, nj, visited, newScore);
      newTiles = result.tiles;
      newScore = result.score;
    }
  }

  return { tiles: newTiles, score: newScore };
};

// Revela todas as bombas (quando o jogador perde)
const revealAllBombs = (tiles) =>
  tiles.map(tile => tile.isBomb ? { ...tile, isOpen: true } : tile); // Abre todas as células com bombas

// ======= DOM & LÓGICA DE INTERAÇÃO =======

// Obtém elementos do DOM
const canvas = document.getElementById('jogo');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameover');
const startButton = document.getElementById('start');
const tutorialBtn = document.getElementById('tutorialBtn');
const tutorialBox = document.getElementById('tutorial');
const closeTutorial = document.getElementById('closeTutorial');

// Adiciona estilos aos botões
startButton.classList.add('styled-button');
tutorialBtn.classList.add('styled-button');

// Cria e adiciona o elemento de contagem de bandeiras
const flagElement = document.createElement('span');
flagElement.id = 'flags';
flagElement.textContent = '🚩: 0';
document.querySelector('.menu').appendChild(flagElement);

// Estado inicial do jogo
let state = {
  tiles: generateGrid(GRID_WIDTH, GRID_HEIGHT), // Grade inicial
  score: 0,                                    // Pontuação inicial
  gameOver: true,                              // Indica se o jogo acabou
  flags: 0,                                    // Número de bandeiras colocadas
};

// Inicializa o jogo com uma nova grade e bombas
const initializeGame = () => {
  const baseTiles = generateGrid(GRID_WIDTH, GRID_HEIGHT);
  const withBombs = placeBombs(baseTiles, NUM_BOMBS);
  const finalTiles = calculateNBombs(withBombs);
  return {
    tiles: finalTiles,
    score: 0,
    gameOver: false,
    flags: 0,
  };
};

// Desenha o tabuleiro e atualiza a interface
const draw = ({ tiles, score, flags }) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa o canvas
  tiles.forEach(drawTile);                          // Desenha cada célula
  scoreElement.textContent = `Score: ${score}`;     // Atualiza a pontuação
  flagElement.textContent = `🚩: ${flags}`;        // Atualiza o contador de bandeiras
};

// Desenha uma célula individual
const drawTile = (tile) => {
  const x = tile.i * TILE_SIZE + 1; // Posição X no canvas
  const y = tile.j * TILE_SIZE + 1; // Posição Y no canvas

  // Define a cor da célula com base no estado
  ctx.fillStyle = tile.isOpen
    ? (tile.isBomb ? "#ff7675" : "#dfe6e9") // Vermelho para bomba, cinza para aberta
    : "#74b9ff";                            // Azul para fechada
  ctx.fillRect(x, y, 50, 50);               // Preenche a célula

  // Desenha a borda da célula
  ctx.strokeStyle = "#2d3436";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, 50, 50);

  // Configurações de texto
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Desenha o conteúdo da célula (bomba, número ou bandeira)
  if (tile.isOpen) {
    if (tile.isBomb) {
      ctx.fillText("💣", x + 25, y + 25); // Bomba
    } else if (tile.bombsAround > 0) {
      ctx.fillStyle = COLORS[tile.bombsAround];
      ctx.fillText(tile.bombsAround, x + 25, y + 25); // Número de bombas ao redor
    }
  } else if (tile.marked) {
    ctx.fillText("🚩", x + 25, y + 25); // Bandeira
  }
};

// Evento de clique para abrir células
canvas.addEventListener("click", (e) => {
  if (state.gameOver) return; // Ignora cliques se o jogo acabou

  // Verifica se o jogador venceu
  const checkVictory = (tiles) => {
    return tiles.every(tile =>
      (tile.isBomb && !tile.isOpen) || (!tile.isBomb && tile.isOpen)
    );
  };

  const rect = canvas.getBoundingClientRect();
  const i = Math.floor(((e.clientX - rect.left) / canvas.width) * GRID_WIDTH); // Calcula a linha clicada
  const j = Math.floor(((e.clientY - rect.top) / canvas.height) * GRID_HEIGHT); // Calcula a coluna clicada
  const clickedTile = getTile(state.tiles, i, j);
  if (!clickedTile || clickedTile.marked) return; // Ignora células marcadas

  // Se clicou em uma bomba, termina o jogo
  if (clickedTile.isBomb) {
    const updatedTiles = revealAllBombs(state.tiles);
    state = { ...state, tiles: updatedTiles, gameOver: true };
    const explosion = document.getElementById('explosion-sound');
    explosion.currentTime = 0;
    explosion.play(); // Toca o som de explosão
    gameOverElement.style.display = 'block';
    startButton.disabled = false;
  } else {
    // Abre a célula e atualiza o estado
    const { tiles: newTiles, score: newScore } = openTileRecursive(state.tiles, i, j, new Set(), state.score);
    state = { ...state, tiles: newTiles, score: newScore };
  }

  // Verifica vitória após cada clique
  if (checkVictory(state.tiles)) {
    state = { ...state, gameOver: true };
    gameOverElement.textContent = '🎉 Você venceu!';
    gameOverElement.style.display = 'block';
    startButton.disabled = false;
  }
  draw(state); // Redesenha o tabuleiro
});

// Evento de clique direito para marcar/desmarcar bandeiras
canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault(); // Evita o menu de contexto padrão
  if (state.gameOver) return;

  const rect = canvas.getBoundingClientRect();
  const i = Math.floor(((e.clientX - rect.left) / canvas.width) * GRID_WIDTH);
  const j = Math.floor(((e.clientY - rect.top) / canvas.height) * GRID_HEIGHT);
  const tile = getTile(state.tiles, i, j);
  if (!tile || tile.isOpen) return; // Ignora células abertas

  let flags = state.flags;
  const marked = !tile.marked;
  if (marked && flags >= MAX_FLAGS) return; // Limita o número de bandeiras

  flags = marked ? flags + 1 : flags - 1;
  const newTiles = state.tiles.map(t =>
    t.i === i && t.j === j ? { ...t, marked } : t
  );
  state = { ...state, tiles: newTiles, flags };
  draw(state);
});

// Evento para iniciar o jogo
startButton.addEventListener("click", () => {
  if (startButton.disabled) return;
  state = initializeGame();
  gameOverElement.style.display = 'none';
  gameOverElement.textContent = 'Game Over';
  startButton.disabled = true;
  draw(state);
});

// Eventos para abrir/fechar o tutorial
tutorialBtn.addEventListener("click", () => {
  tutorialBox.style.display = 'flex';
});

closeTutorial.addEventListener("click", () => {
  tutorialBox.style.display = 'none';
});


// Desenha o estado inicial
draw(state);