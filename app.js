'use strict';

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const uuidv4 = require('uuid').v4;

let board = ['_', '_', '_', '_', '_', '_', '_', '_', '_'];

let clients = [];

let game_started = false;

let game_interval;

io.on('connection', (socket) => {

    console.log(`${new Date()} - a user connected: ${socket.id}`);

    socket.on('disconnect', () => {

        console.log(`user disconnected: ${socket.id}`);

        const index = clients.indexOf(socket);
        clients.splice(index, 1);

        if (game_started && (clients.length < 2 || socket === player1.socket || socket === player2.socket)) {
            stop_game();
        }
    });

    socket.on('res-move', (message) => {

        let id = message.id;

        if (id === last_message_id) {

            let square = message.square;

            if (is_square_available(square)) {

                update_board(socket, square);

                if (game_ended) {
                    broadcast_winner();
                    next_player();
                    start_game();
                } else {
                    next_player();
                    request_move();
                }

            } else {
                // invalid square
            }
        }
    });

    clients.push(socket);

    if (clients.length >= 2) {
        start_game();
    }
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});

let player1 = {};
let player2 = {};

player1.n_wins = 0;
player1.socket = undefined;

player2.n_wins = 0;
player2.socket = undefined;

let current_player = 0;

let last_message_id;

let game_ended;
let winner;

function is_square_available(square) {
    return board[square] === '_';
}

function stop_game() {

    console.log('Game ended');
    game_started = false;

}

function broadcast_winner() {

    last_message_id = uuidv4();

    let message = {};
    message.id = last_message_id;
    message.winner = winner.socket.id;

    io.sockets.emit('game-ended', message);
}

function broadcast_board() {

    last_message_id = uuidv4();

    let message = {};
    message.id = last_message_id;
    message.board = board.join('');

    io.sockets.emit('board-state', message);
}

function request_move() {

    last_message_id = uuidv4();

    let message = {};
    message.id = last_message_id;
    message.player_idx = current_player;
    message.board = board.join('');

    let player = current_player === 0 ? player1 : player2;

    player.socket.emit('req-move', message);
}

function update_board(socket, boardIndex) {

    let c = socket == player1.socket ? 'x' : 'o';
    board[boardIndex] = c;
    broadcast_board();

    check_winner();
}

function next_player() {
    current_player = (current_player + 1) % 2;
}

function check_winner() {

    // rows
    for (let i = 0; i < 3; ++i) {

        let a = board[3 * i];
        let b = board[3 * i + 1];
        let c = board[i * i + 2];

        if (a !== '_' && a === b && b === c) {
            end_game(a == 'x' ? player1 : player2);
            return;
        }
    }

    // cols
    for (let i = 0; i < 3; ++i) {

        let a = board[i];
        let b = board[i + 3];
        let c = board[i + 6];

        if (a !== '_' && a === b && b === c) {
            end_game(a == 'x' ? player1 : player2);
            return;
        }
    }

    // diags
    {
        let a = board[0];
        let b = board[4];
        let c = board[8];

        if (a !== '_' && a === b && b === c) {
            end_game(a == 'x' ? player1 : player2);
            return;
        }
    }
    {
        let a = board[2];
        let b = board[4];
        let c = board[6];

        if (a !== '_' && a === b && b === c) {
            end_game(a == 'x' ? player1 : player2);
            return;
        }
    }
}

function end_game(w) {

    winner = w;

    game_ended = true;
    winner.n_wins++;

    console.log(`${winner.socket.id} won!`);
}

function start_game() {

    winner = undefined;
    game_ended = false;

    board = ['_', '_', '_', '_', '_', '_', '_', '_', '_'];

    player1.socket = clients[0];
    player2.socket = clients[1];

    console.log('Game started');

    game_started = true;

    broadcast_board();
    request_move();
}