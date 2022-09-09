const options = {
    fps: 60,
    showPing: true,
    pingDelay: 1,
    canvasSelector: 'canvas',
    startCooldown: 5,

    boardWidth: 500,
    boardHeight: 500,
    boardFillColor: 'white',
    boardBorderWidth: 1,
    boardBorderColor: 'black',

    playerWidth: 10,
    playerHeight: 100,
    playerFillColor: 'black',
    playerSpeed: 5,

    ballRadius: 10,
    ballSpeed: 5,
    ballFillColor: 'red',
    ballMaxBounceAngle: Math.PI/4,
    ballAcceleratesOverTime: true,
    ballAcceleration: 1,

    netHeight: 20,
    netWidth: 10,
    netGapHeigth: 6,
    netFillColor: 'black',

    scoreboardFontFace: 'sans-serif',
    scoreboardFontSize: 32,
    scoreboardFontColor: 'black',
    messageFontFace: 'sans-serif',
    messageFontSize: 20,
    messageFontColor: 'black',
    pingFontFace: 'sans-serif',
    pingFontSize: 12,
    pingFontColor: 'black'
}
const socket = io();

function game() {
    let host = false;
    let ping = 0;
    let timestamp;
    let message;
    const board = {
        width: options.boardWidth,
        height: options.boardHeight,
        fillColor: options.boardFillColor,
        borderWidth: options.boardBorderWidth,
        borderColor: options.borderColor,
        canvas: document.querySelector('canvas'),
        context: document.querySelector(options.canvasSelector).getContext('2d'),
        render() {
            this.canvas.setAttribute('width', `${this.width}px`);
            this.canvas.setAttribute('height', `${this.height}px`);
            this.canvas.style.background = this.fillColor;
            this.canvas.style.borderWidth = `${this.borderWidth}px`;
            this.canvas.style.borderColor = this.borderColor;
            this.canvas.style.borderStyle = 'solid';
        }
    }

    const player1 = {
        playerNumber: 1,
        width: options.playerWidth,
        height: options.playerHeight,
        fillColor: options.fillColor,
        speed: options.playerSpeed,
        movingUp: false,
        movingDown: false,
        x: 0,
        y: board.height/2 - options.playerHeight/2,
        render() {
            drawRect(this.x, this.y, this.width, this.height, this.fillColor);
        },
        move() {
            let playerTop = this.y;
            let playerBottom = this.y + this.height;

            if(this.movingUp && playerTop > 0)
            socket.emit('playerMoveUp', { y: this.y, speed: this.speed, playerNumber: this.playerNumber });

            if(this.movingDown && playerBottom < board.height)
            socket.emit('playerMoveDown', { y: this.y, speed: this.speed, playerNumber: this.playerNumber });
        },
        reset() {
            socket.emit('playerReset', this.playerNumber);
        }
    }

    const player2 = {
        ...player1, 
        playerNumber: 2,
        x: board.width - options.playerWidth
    }

    const ball = {
        radius: options.ballRadius,
        fillColor: options.ballFillColor,
        speed: options.ballSpeed,
        velocityX: 0,
        velocityY: 0,
        x: board.width/2,
        y: board.height/2,
        move() {
            this.x += this.velocityX;
            this.y += this.velocityY;

            if(this.y - this.radius < 0 || this.y + this.radius > board.height)
            this.velocityY = -this.velocityY;

            let player = ball.x < board.width/2 ? player1 : player2;
            if(this.collision(player)){
                let collisionPoint = (this.y - (player.y + player.height/2)) / (player.height/2);
                let angle = collisionPoint * options.ballMaxBounceAngle;
                let direction = this.x < board.width/2 ? 1 : -1;
        
                if(options.ballAcceleratesOverTime)
                ball.speed += options.ballAcceleration;

                this.velocityX = direction * this.speed * Math.cos(angle);
                this.velocityY = direction * this.speed * Math.sin(angle);
            }
        },
        collision(player) {
            let ballTop = this.y - this.radius;
            let ballLeft = this.x - this.radius;
            let ballRight = this.x + this.radius;
            let ballBottom = this.y + this.radius;

            let playerTop = player.y;
            let playerLeft = player.x;
            let playerRight = player.x + player.width;
            let playerBottom = player.y + player.height;

            return ballRight > playerLeft && ballTop < playerBottom && ballLeft < playerRight && ballBottom > playerTop;
        },
        score() {
            let ballLeft = this.x - this.radius;
            let ballRight = this.x + this.radius;

            return ballRight < 0 || ballLeft > board.width; 
        },
        reset() {
            this.x = board.width/2;
            this.y = board.height/2;
            this.speed = options.ballSpeed;
            this.velocityX = this.velocityX > 0 ? this.speed : -this.speed;
            this.velocityY = 0;
        },
        render() {
            drawCircle(this.x, this.y, this.radius, this.fillColor);
        }
    }

    const net = {
        width: options.netWidth,
        height: options.netHeight,
        fillColor: options.netFillColor,
        netGapHeigth: options.netGapHeigth,
        x: board.width/2 - options.netWidth/2,
        y: 0,
        render() {
            const count = Math.ceil(board.height/(this.height+this.netGapHeigth));
            for(let i=0; i<count; i++){
                let y = (this.height+this.netGapHeigth)*i;
                drawRect(this.x, y, this.width, this.height, this.fillColor);
            }

        }
    }

    const scoreboard = {
        fontColor: options.scoreboardFontColor,
        fontOptions: `${options.scoreboardFontSize}px ${options.scoreboardFontFace}`,
        player1Score: 0,
        player2Score: 0,
        render() {
            if(ball.score()) {
                ball.x > board.width/2 ? this.player1Score++ : this.player2Score++;
                reset();
            }
            drawText(this.player1Score, board.width/4, board.height/4, this.fontColor, this.fontOptions);
            drawText(this.player2Score, board.width * 3/4, board.height/4, this.fontColor, this.fontOptions);
        }
    }

    function drawRect(x, y, width, height, fillColor) {
        board.context.fillStyle = fillColor;
        board.context.fillRect(x, y, width, height);
    }
    
    function drawCircle(x, y, radius, fillColor) {
        board.context.fillStyle = fillColor;
        board.context.beginPath();
        board.context.arc(x, y, radius, 0, 2*Math.PI, false);
        board.context.fill();
    }

    function drawText(text, x, y, color, options) {
        board.context.font = options || '';
        board.context.fillStyle = color || 'black';
        board.context.fillText(text, x, y);
    }

    function getPlayerObject(number){
        return number === 1 ? player1 : player2;
    }

    function renderMessage(text){
        board.context.font = `${options.messageFontSize}px ${options.messageFontFace}`;
        let lineHeight = board.context.measureText('M').width;
        drawText(text || '', 5, lineHeight+5, options.messageFontColor);
    }

    function pingServer(){
        timestamp = Date.now();
        socket.emit('ping');
    }

    function giveControls(id, playerNumber){
        if(id === socket.id){
            const player = getPlayerObject(playerNumber);
            window.addEventListener('keydown', function keyDownHandler(e) {
                if(e.key === 'ArrowUp')
                player.movingUp = true;

                if(e.key === 'ArrowDown')
                player.movingDown = true;
            });
            window.addEventListener('keyup', function keyUpHandler(e) {
                if(e.key === 'ArrowUp')
                player.movingUp = false;

                if(e.key === 'ArrowDown')
                player.movingDown = false;
            });
        }
    }

    function render() {
        board.render();
        player1.render();
        player2.render();
        net.render();
        scoreboard.render();
        ball.render();

        renderMessage(message);

        if(options.showPing)
        drawText(`${ping} ms`, 5, board.height-5, options.pingFontColor, `${options.pingFontSize}px ${options.pingFontFace}`);
    }

    function update() {
        player1.move();
        player2.move();
        render();

        if(!host) return;
        socket.emit('hostData', { 
            ballSpeed: ball.speed,
            ballX: ball.x, 
            ballY: ball.y, 
            ballVelocityX: ball.velocityX, 
            ballVelocityY: ball.velocityY,
            player1Score: scoreboard.player1Score,
            player2Score: scoreboard.player2Score
        });

        ball.move();
    }

    function reset() {
        ball.reset();
        player1.reset();
        player2.reset();
    }

    function start() {
        let countdown = options.startCooldown;
        message = 'All players joined!';

        let counter = setInterval(() => {
            if(countdown > 0){
                message = `The game begins in ${countdown}...`;
                countdown--;
            }
            else {
                clearInterval(counter);
                message = '';
                ball.velocityX = -options.ballSpeed;
            }
        }, 1000);
    }

    function reload() {
        window.location.reload();
    }

    socket.on('connection', id => {
        if(id === socket.id)
        socket.emit('gameState', socket.id);

        socket.emit('serverConfig', { boardHeight: options.boardHeight, playerHeight: options.playerHeight });
    });

    socket.on('gameState', data => {
        if(data.id === socket.id)
        data.full ? document.write('Game is full.') : giveControls(data.id, data.playerNumber);

        if(data.host === socket.id)
        host = true;
    });

    socket.on('gameStart', () => {
        start();
    });

    socket.on('playerDisconnected', () => {
        reload();
    })

    socket.on('playerMove', data => {
        const player = getPlayerObject(data.playerNumber);
        player.y = data.y;
    });

    socket.on('playerReset', number => {
        number === 1 ? player1.y = board.height/2 - options.playerHeight/2 : player2.y = board.height/2 - options.playerHeight/2;
    })

    socket.on('hostData', data => {
        if(host) return;
        ball.speed = data.ballSpeed;
        ball.x = data.ballX;
        ball.y = data.ballY;
        ball.velocityX = data.ballVelocityX;
        ball.velocityY = data.ballVelocityY;
        scoreboard.player1Score = data.player1Score;
        scoreboard.player2Score = data.player2Score;
    });

    socket.on('pong', () => {
        ping = Date.now() - timestamp;
    })

    render();
    message = 'Waiting for players...';

    setInterval(update, 1/options.fps*1000);

    if(options.showPing)
    setInterval(pingServer, options.pingDelay*1000);
}

window.onload = game;