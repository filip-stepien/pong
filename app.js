import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('view engine', 'ejs');
app.use(express.static('js'));

app.get('/', (req, res) => {
    res.render('index');
})

server.listen(3000, () => {
    console.log('Listening on 3000...');
})

let sockets = [];
let boardHeight;
let playerHeight;
let position = {
    player1: 0,
    player2: 0
}

io.on('connection', socket => {
    sockets.push(socket.id);
    io.emit('connection', socket.id);

    if(sockets.length == 2)
    io.emit('gameStart');

    socket.on('disconnect', () => {
        sockets = sockets.filter(e => e !== socket.id);
        if(sockets.length !== 2)
        io.emit('playerDisconnected');
    });

    socket.on('serverConfig', data => {
        boardHeight = data.boardHeight;
        playerHeight = data.playerHeight;
        position = {
            player1: boardHeight/2 - playerHeight/2,
            player2: boardHeight/2 - playerHeight/2,
        }
    })

    socket.on('gameState', id => {
        const full = sockets.length > 2;
        const playerNumber = sockets.indexOf(id)+1;
        io.emit('gameState', { full: full, id: id, playerNumber: playerNumber, host: sockets[0] } );
    });

    socket.on('playerMoveUp', data => {
        data.playerNumber === 1 ? position.player1 = position.player1 - data.speed : position.player2 = position.player2 - data.speed;
        let y = data.playerNumber === 1 ? position.player1 : position.player2;
        io.emit('playerMove', { ...data, y: y });
    });

    socket.on('playerMoveDown', data => {
        data.playerNumber === 1 ? position.player1 = position.player1 + data.speed : position.player2 = position.player2 + data.speed;
        let y = data.playerNumber === 1 ? position.player1 : position.player2;
        io.emit('playerMove', { ...data, y: y });
    });

    socket.on('playerReset', number => {
        number === 1 ? position.player1 = boardHeight/2 - playerHeight/2 : position.player2 = boardHeight/2 - playerHeight/2;
        io.emit('playerReset', number);
    })

    socket.on('hostData', data => {
        io.emit('hostData', data);
    });

    socket.on('ping', () => {
        socket.emit('pong');
    });
})