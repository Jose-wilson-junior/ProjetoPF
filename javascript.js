// Seleciona os elementos do HTML
const canvas = document.getElementById('jogo');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameover');
const startButton = document.getElementById('start');

// Constantes do jogo
const TILE_SIZE = 51; // Tamanho de cada célula
const GRID_WIDTH = 10; // Largura da grade (número de colunas)
const GRID_HEIGHT = 10; // Altura da grade (número de linhas)
const NUM_BOMBS = 10; // Número de bombas no jogo

let gameOver = true; // Estado inicial: jogo desativado
let gameStarted = false; // Controle de início do jogo
let score = 0; // Pontuação do jogador

// Cria um objeto "tile" (célula) com suas propriedades
function createTile(i, j) {
    return {
        i, j, // posição na grade
        isBomb: false, // se é bomba ou não
        isOpen: false, // se está aberta ou não
        bombsAround: 0, // número de bombas ao redor
        marked: false // (não usado mais)
    };
}

// Gera a grade de células (tiles)
function generateGrid(width, height) {
    return Array.from({ length: width * height }, (_, index) => {
        const i = Math.floor(index / height);
        const j = index % height;
        return createTile(i, j);
    });
}

// Coloca bombas aleatoriamente no grid
function placeBombs(tiles, numBombs) {
    const bombFreeTiles = [...tiles];
    let bombsPlaced = 0;

    while (bombsPlaced < numBombs) {
        const index = Math.floor(Math.random() * bombFreeTiles.length);
        const tile = bombFreeTiles[index];
        bombFreeTiles.splice(index, 1);

        // Marca a célula como bomba
        tiles = tiles.map(t => (t.i === tile.i && t.j === tile.j ? { ...t, isBomb: true } : t));
        bombsPlaced++;
    }

    return tiles;
}

// Calcula o número de bombas ao redor de cada célula
function calculateNBombs(tiles) {
    return tiles.map(tile => {
        const neighbors = getNeighbors(tile.i, tile.j);
        const bombsAround = neighbors.reduce((acc, [ni, nj]) => {
            const neighbor = getTile(tiles, ni, nj);
            return acc + (neighbor?.isBomb ? 1 : 0);
        }, 0);
        return { ...tile, bombsAround };
    });
}

// Retorna a célula com coordenadas i, j
function getTile(tiles, i, j) {
    return tiles.find(t => t.i === i && t.j === j);
}

// Retorna os vizinhos de uma célula (coordenadas ao redor)
function getNeighbors(i, j) {
    const neighbors = [];
    for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
            if (di !== 0 || dj !== 0) {
                neighbors.push([i + di, j + dj]);
            }
        }
    }
    return neighbors.filter(([ni, nj]) => ni >= 0 && ni < GRID_WIDTH && nj >= 0 && nj < GRID_HEIGHT);
}

// Abre recursivamente as células que não têm bombas ao redor
function openTileRecursive(tiles, i, j, visited = new Set()) {
    const key = `${i},${j}`;
    if (visited.has(key)) return tiles;
    visited.add(key);

    const tile = getTile(tiles, i, j);
    if (!tile || tile.isOpen || tile.isBomb || tile.marked) return tiles;

    // Marca a célula como aberta e incrementa o score
    tiles = tiles.map(t => {
        if (t.i === i && t.j === j && !t.isOpen) {
            score++;
            return { ...t, isOpen: true };
        }
        return t;
    });

    // Se não há bombas ao redor, abre os vizinhos também
    if (tile.bombsAround === 0) {
        const neighbors = getNeighbors(i, j);
        for (const [ni, nj] of neighbors) {
            tiles = openTileRecursive(tiles, ni, nj, visited);
        }
    }

    return tiles;
}

// Desenha o estado atual do jogo no canvas
function draw(tiles) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    tiles.forEach(tile => drawTile(tile));
    scoreElement.textContent = `Score: ${score}`;
}

// Desenha uma célula individual no canvas
function drawTile(tile) {
    const x = tile.i * TILE_SIZE + 1;
    const y = tile.j * TILE_SIZE + 1;

    if (tile.isOpen) {
        ctx.fillStyle = tile.isBomb ? "#ff0000" : "#999999";
        ctx.fillRect(x, y, 50, 50);

        // Se a célula não for bomba e tiver bombas ao redor, desenha o número
        if (!tile.isBomb && tile.bombsAround > 0) {
            ctx.font = "30px Arial";
            ctx.textAlign = "center";
            ctx.fillStyle = "red";
            ctx.fillText(tile.bombsAround, x + 25, y + 38);
        }
    } else {
        ctx.fillStyle = "#aaaaaa";
        ctx.fillRect(x, y, 50, 50);
    }
}

// Inicializa o estado do jogo
function initializeGame() {
    gameOver = false;
    gameStarted = true;
    score = 0;
    gameOverElement.style.display = 'none';
    let tiles = generateGrid(GRID_WIDTH, GRID_HEIGHT);
    tiles = placeBombs(tiles, NUM_BOMBS);
    tiles = calculateNBombs(tiles);
    return tiles;
}

let state = []; // Estado atual do jogo (grade)
draw(state); // Desenha a grade inicial (vazia)

// Evento de clique esquerdo no canvas
// Este bloco lida com o clique do jogador em uma célula do jogo
canvas.addEventListener("click", e => {
    if (gameOver || !gameStarted) return; // Ignora se o jogo não começou

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calcula a célula clicada
    const i = Math.floor((mouseX / canvas.width) * GRID_WIDTH);
    const j = Math.floor((mouseY / canvas.height) * GRID_HEIGHT);

    const clickedTile = getTile(state, i, j);
    if (!clickedTile || clickedTile.marked) return;

    if (clickedTile.isBomb) {
        // Se clicou numa bomba: fim de jogo
        gameOver = true;
        state = state.map(t => (t.i === i && t.j === j ? { ...t, isOpen: true } : t));
        gameOverElement.style.display = 'block';
    } else {
        // Caso contrário, abre a célula recursivamente
        state = openTileRecursive(state, i, j);
    }
    draw(state);
});

// Evento de clique no botão Start
startButton.addEventListener("click", () => {
    state = initializeGame(); // Gera nova grade
    draw(state); // Desenha a nova grade
});
