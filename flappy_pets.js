const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GAME_STATE = { MENU: 0, PLAYING: 1, GAME_OVER: 2, SHOP: 3 };
let gameState = GAME_STATE.MENU;

const GRAVITY = 0.4;
const FLAP_STRENGTH = -7;
const PIPE_SPEED = 2;
const PIPE_SPAWN_INTERVAL = 1800;
const GROUND_HEIGHT = 50;
const PIPE_WIDTH = 80;
const PIPE_CAP_HEIGHT = 30;
const PIPE_CAP_EXTRA_WIDTH = 10;
let raindrops = [];

let pet, pipes, score, highScore, lastPipeSpawn, foodCurrency;
const pets = ['🐱', '🐶', '🐰', '🐦', '🐷', '🐸', '🐵', '🐼', '🦊'];
let currentPetIndex = 0;
let unlockedPets = ['🐱'];

let lastTapTime = 0;

// Add food array and player's food count
const foods = ['🍎', '🍌', '🥕', '🍓', '🥩'];
let foodItems = [];
let petEnergy = 100;

const PIPE_GAP = 180;

function init() {
    canvas.width = 360;
    canvas.height = 640;
    highScore = parseInt(localStorage.getItem('flappyPetsHighScore')) || 0;
    foodCurrency = parseInt(localStorage.getItem('flappyPetsFoodCurrency')) || 0;
    unlockedPets = JSON.parse(localStorage.getItem('flappyPetsUnlockedPets')) || ['🐱'];
    currentPetIndex = parseInt(localStorage.getItem('flappyPetsCurrentPet')) || 0;
    resetGame();
    createRaindrops();
}

function resetGame() {
    pet = { 
        x: 60, 
        y: canvas.height / 2, 
        velocity: 0, 
        size: 40,
        hitboxRadius: 15
    };
    pipes = [];
    foodItems = [];
    score = 0;
    lastPipeSpawn = 0;
}

function createRaindrops() {
    for (let i = 0; i < 100; i++) {
        raindrops.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            length: Math.random() * 20 + 10,
            speed: Math.random() * 5 + 5
        });
    }
}

function updateRain() {
    raindrops.forEach(drop => {
        drop.y += drop.speed;
        if (drop.y > canvas.height) {
            drop.y = -drop.length;
            drop.x = Math.random() * canvas.width;
        }
    });
}

function drawRain() {
    ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
    ctx.lineWidth = 1;
    raindrops.forEach(drop => {
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x, drop.y + drop.length);
        ctx.stroke();
    });
}

function drawMarioPipe(x, height, isTop) {
    const pipeColor = '#00AA00';
    const pipeBorderColor = '#006600';
    const pipeHighlightColor = '#00FF00';

    ctx.fillStyle = pipeColor;
    ctx.strokeStyle = pipeBorderColor;
    ctx.lineWidth = 4;

    // Pipe body
    ctx.fillRect(x, isTop ? 0 : height, PIPE_WIDTH, isTop ? height : canvas.height - height);
    ctx.strokeRect(x, isTop ? 0 : height, PIPE_WIDTH, isTop ? height : canvas.height - height);

    // Pipe cap
    ctx.fillRect(x - PIPE_CAP_EXTRA_WIDTH / 2, isTop ? height - PIPE_CAP_HEIGHT : height, 
                 PIPE_WIDTH + PIPE_CAP_EXTRA_WIDTH, PIPE_CAP_HEIGHT);
    ctx.strokeRect(x - PIPE_CAP_EXTRA_WIDTH / 2, isTop ? height - PIPE_CAP_HEIGHT : height, 
                   PIPE_WIDTH + PIPE_CAP_EXTRA_WIDTH, PIPE_CAP_HEIGHT);

    // Pipe highlight
    ctx.fillStyle = pipeHighlightColor;
    ctx.fillRect(x + 5, isTop ? 0 : height + 5, 10, isTop ? height - 5 : canvas.height - height - 5);
    ctx.fillRect(x - PIPE_CAP_EXTRA_WIDTH / 2 + 5, isTop ? height - PIPE_CAP_HEIGHT + 5 : height + 5, 10, PIPE_CAP_HEIGHT - 10);
}

function update() {
    if (gameState === GAME_STATE.PLAYING) {
        updatePet();
        updatePipes();
        updateFood();
        checkCollisions();
        petEnergy = Math.max(0, petEnergy - 0.1);  // Decrease energy over time
    }
    updateRain();
}

function updatePet() {
    pet.velocity += GRAVITY;
    pet.y += pet.velocity;
    
    if (pet.y < 0) pet.y = 0;
    if (pet.y + pet.size > canvas.height - GROUND_HEIGHT) {
        pet.y = canvas.height - GROUND_HEIGHT - pet.size;
        gameOver();
    }
}

function updatePipes() {
    const now = Date.now();
    if (now - lastPipeSpawn > PIPE_SPAWN_INTERVAL) {
        const minHeight = 50;
        const maxHeight = canvas.height - PIPE_GAP - minHeight - GROUND_HEIGHT;
        const height = Math.random() * (maxHeight - minHeight) + minHeight;
        pipes.push({ 
            x: canvas.width, 
            height: height, 
            passed: false,
            hasFood: Math.random() < 0.5 // 50% chance for a pipe to have food
        });
        lastPipeSpawn = now;

        // Spawn food in the gap if the pipe has food
        if (pipes[pipes.length - 1].hasFood) {
            const pipeCenter = height + PIPE_GAP / 2;
            foodItems.push({
                x: canvas.width + PIPE_WIDTH / 2,
                y: pipeCenter - 15, // Center the food in the gap
                type: foods[Math.floor(Math.random() * foods.length)]
            });
        }
    }

    pipes.forEach(pipe => {
        pipe.x -= PIPE_SPEED;
        
        if (!pipe.passed && pipe.x + PIPE_WIDTH < pet.x) {
            pipe.passed = true;
            score++; // Increase score only when passing pipes
        }
    });

    pipes = pipes.filter(pipe => pipe.x > -PIPE_WIDTH);
}

function updateFood() {
    foodItems.forEach(food => {
        food.x -= PIPE_SPEED;
    });

    foodItems = foodItems.filter(food => food.x > -30);
}

function checkCollisions() {
    const centerX = pet.x + pet.size / 2;
    const centerY = pet.y + pet.size / 2;

    pipes.forEach(pipe => {
        if (circleRectCollision(centerX, centerY, pet.hitboxRadius, pipe.x, 0, PIPE_WIDTH, pipe.height) ||
            circleRectCollision(centerX, centerY, pet.hitboxRadius, pipe.x, pipe.height + PIPE_GAP, PIPE_WIDTH, canvas.height - pipe.height - PIPE_GAP)) {
            gameOver();
        }
    });

    foodItems = foodItems.filter(food => {
        if (circleCircleCollision(centerX, centerY, pet.hitboxRadius + 5, food.x + 15, food.y + 15, 15)) {
            foodCurrency++; // Increase only food currency when collecting food
            return false;
        }
        return true;
    });

    if (centerY + pet.hitboxRadius > canvas.height - GROUND_HEIGHT) {
        gameOver();
    }
}

function circleRectCollision(circleX, circleY, radius, rectX, rectY, rectWidth, rectHeight) {
    const distX = Math.abs(circleX - rectX - rectWidth / 2);
    const distY = Math.abs(circleY - rectY - rectHeight / 2);

    if (distX > (rectWidth / 2 + radius)) { return false; }
    if (distY > (rectHeight / 2 + radius)) { return false; }

    if (distX <= (rectWidth / 2)) { return true; }
    if (distY <= (rectHeight / 2)) { return true; }

    const dx = distX - rectWidth / 2;
    const dy = distY - rectHeight / 2;
    return (dx * dx + dy * dy <= (radius * radius));
}

function circleCircleCollision(x1, y1, r1, x2, y2, r2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < r1 + r2;
}

function gameOver() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyPetsHighScore', highScore);
    }
    gameState = GAME_STATE.GAME_OVER;
    saveGame();
}

function draw() {
    // Sky
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Rain
    drawRain();

    // Pipes
    pipes.forEach(pipe => {
        drawMarioPipe(pipe.x, pipe.height, true);
        drawMarioPipe(pipe.x, pipe.height + PIPE_GAP, false);
    });

    // Ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);

    // Pet
    ctx.font = `${pet.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pets[currentPetIndex], pet.x + pet.size / 2, pet.y + pet.size / 2);

    // Food
    ctx.font = '30px Arial';
    foodItems.forEach(food => {
        ctx.fillText(food.type, food.x, food.y);
    });

    // Score
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 4;
    ctx.font = 'bold 32px Comic Sans MS';
    ctx.textAlign = 'left';
    ctx.strokeText(`Score: ${score}`, 10, 40);
    ctx.fillText(`Score: ${score}`, 10, 40);

    // High Score
    ctx.font = 'bold 24px Comic Sans MS';
    ctx.strokeText(`High Score: ${highScore}`, 10, 70);
    ctx.fillText(`High Score: ${highScore}`, 10, 70);

    // Food Currency
    ctx.font = 'bold 24px Comic Sans MS';
    ctx.textAlign = 'right';
    ctx.strokeText(`${foodCurrency} 🍎`, canvas.width - 10, 40);
    ctx.fillText(`${foodCurrency} 🍎`, canvas.width - 10, 40);

    if (gameState === GAME_STATE.MENU) {
        drawMenu();
    } else if (gameState === GAME_STATE.GAME_OVER) {
        drawGameOver();
    } else if (gameState === GAME_STATE.SHOP) {
        drawShop();
    }
}

function drawTitle() {
    ctx.fillStyle = '#FF69B4';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 6;
    ctx.font = 'bold 48px Comic Sans MS';
    ctx.textAlign = 'center';
    ctx.strokeText('Flappy Pets', canvas.width / 2, 80);
    ctx.fillText('Flappy Pets', canvas.width / 2, 80);
}

function drawMenu() {
    ctx.fillStyle = 'rgba(255, 182, 193, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#FF69B4';
    ctx.font = '24px Comic Sans MS';
    ctx.fillText('Tap to Start', canvas.width / 2, canvas.height / 2);
    ctx.font = '60px Arial';
    ctx.fillText(pets[currentPetIndex], canvas.width / 2, canvas.height / 2 + 120);

    drawButton('Shop', canvas.width / 2 - 100, canvas.height - 100, 200, 50);
}

function drawButton(text, x, y, width, height) {
    ctx.fillStyle = '#4CAF50';
    ctx.strokeStyle = '#45a049';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'white';
    ctx.font = '20px Comic Sans MS';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '48px Comic Sans MS';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 100);

    ctx.font = '32px Comic Sans MS';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText(`High Score: ${highScore}`, canvas.width / 2, canvas.height / 2 + 50);

    drawButton('Play Again', canvas.width / 2 - 100, canvas.height / 2 + 100, 200, 50);
    drawButton('Shop', canvas.width / 2 - 100, canvas.height / 2 + 170, 200, 50);
}

function drawShop() {
    ctx.fillStyle = 'rgba(255, 182, 193, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FF69B4';
    ctx.font = '36px Comic Sans MS';
    ctx.textAlign = 'center';
    ctx.fillText('Pet Shop', canvas.width / 2, 50);

    ctx.font = '24px Comic Sans MS';
    ctx.fillText(`Food: ${foodCurrency}`, canvas.width / 2, 90);

    const petSize = 80;
    const padding = 20;
    const startX = (canvas.width - (petSize * 3 + padding * 2)) / 2;
    const startY = 150;

    for (let i = 0; i < pets.length; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const x = startX + col * (petSize + padding);
        const y = startY + row * (petSize + padding);

        // Draw highlight for selected pet
        if (i === currentPetIndex) {
            ctx.beginPath();
            ctx.arc(x + petSize / 2, y + petSize / 2, petSize / 2 + 5, 0, Math.PI * 2);
            ctx.fillStyle = 'gold';
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(x + petSize / 2, y + petSize / 2, petSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = unlockedPets.includes(pets[i]) ? '#98FB98' : '#FFA07A';
        ctx.fill();

        // Draw glow effect for selected pet
        if (i === currentPetIndex) {
            ctx.shadowColor = 'gold';
            ctx.shadowBlur = 10;
        } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }

        ctx.font = `${petSize * 0.6}px Arial`;
        ctx.fillStyle = 'black';
        ctx.fillText(pets[i], x + petSize / 2, y + petSize / 2 + petSize * 0.2);

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        if (!unlockedPets.includes(pets[i])) {
            ctx.font = '16px Comic Sans MS';
            ctx.fillText('10 🍎', x + petSize / 2, y + petSize + 20);
        }
    }

    drawButton('Back', canvas.width / 2 - 100, canvas.height - 60, 200, 40);
}

function handleShopInteraction(x, y) {
    const petSize = 80;
    const padding = 20;
    const startX = (canvas.width - (petSize * 3 + padding * 2)) / 2;
    const startY = 150;

    for (let i = 0; i < pets.length; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const petX = startX + col * (petSize + padding);
        const petY = startY + row * (petSize + padding);

        if (x > petX && x < petX + petSize && y > petY && y < petY + petSize) {
            if (unlockedPets.includes(pets[i])) {
                currentPetIndex = i;
                localStorage.setItem('flappyPetsCurrentPet', currentPetIndex);
            } else if (foodCurrency >= 10) {
                foodCurrency -= 10;
                unlockedPets.push(pets[i]);
                currentPetIndex = i;
                localStorage.setItem('flappyPetsFoodCurrency', foodCurrency);
                localStorage.setItem('flappyPetsUnlockedPets', JSON.stringify(unlockedPets));
                localStorage.setItem('flappyPetsCurrentPet', currentPetIndex);
            }
            return;
        }
    }

    if (x >= canvas.width / 2 - 100 && x <= canvas.width / 2 + 100 &&
        y >= canvas.height - 60 && y <= canvas.height - 20) {
        gameState = GAME_STATE.MENU;
    }
}

function handleTap(x, y) {
    if (gameState === GAME_STATE.MENU) {
        gameState = GAME_STATE.PLAYING;
    } else if (gameState === GAME_STATE.PLAYING) {
        pet.velocity = FLAP_STRENGTH;
    } else if (gameState === GAME_STATE.GAME_OVER) {
        if (x >= canvas.width / 2 - 100 && x <= canvas.width / 2 + 100) {
            if (y >= canvas.height / 2 + 100 && y <= canvas.height / 2 + 150) {
                resetGame();
                gameState = GAME_STATE.PLAYING;
            } else if (y >= canvas.height / 2 + 170 && y <= canvas.height / 2 + 220) {
                gameState = GAME_STATE.SHOP;
            }
        }
    } else if (gameState === GAME_STATE.SHOP) {
        handleShopInteraction(x, y);
    }
}

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    handleTap(x, y);
});

canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleTap(x, y);
});

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

init();
gameLoop();

// Remove touch event listeners for scrolling as they're no longer needed
canvas.removeEventListener('touchstart', touchStartHandler);
canvas.removeEventListener('touchmove', touchMoveHandler);

// Update saveGame function to include food
function saveGame() {
    localStorage.setItem('flappyPetsHighScore', highScore);
    localStorage.setItem('flappyPetsFoodCurrency', foodCurrency);
    localStorage.setItem('flappyPetsUnlockedPets', JSON.stringify(unlockedPets));
    localStorage.setItem('flappyPetsCurrentPet', currentPetIndex);
}

// Call saveGame() when appropriate (e.g., after purchasing items, at game over, etc.)
