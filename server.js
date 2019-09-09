var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

var players = {};

app.use(express.static(__dirname + '/public'));
 
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    console.log('a user connected');

    // create a new player and add it to our players object
    players[socket.id] = {
        rotation: 0,
        x: Math.floor(Math.random() * 700) + 50,
        y: Math.floor(Math.random() * 500) + 50,
        playerId: socket.id,
        score: 0,
        name:"default"
    };
    socket.on('alterarNome',(n, id)=>{
      players[id].name=n;
    });
    // send the players object to the new player
    socket.emit('currentPlayers', players);
    // send the current scores
    socket.emit('scoreUpdate', players[socket.id].score);
    // update all other players of the new player
    socket.broadcast.emit('newPlayer', players[socket.id]);
    // when a player moves, update the player data
    socket.on('playerMovement', movementData => {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      players[socket.id].rotation = movementData.rotation;

      // emit a message to all players about the player that moved
      socket.broadcast.emit('playerMoved', players[socket.id]);
    });

    socket.on('playerShot', shotInfo => {
      socket.broadcast.emit('playerCreateShot', shotInfo);
    });

    socket.on('destroy', (id) => {
      players[socket.id].x = Math.floor(Math.random() * 700) + 50;
      players[socket.id].y = Math.floor(Math.random() * 500) + 50;
      players[id].score+=1;
      socket.broadcast.emit('playerCreate', players[socket.id]);
      socket.emit('visibleShip', players[socket.id]);
      io.to (`${id}`).emit('scoreUpdate',players[id].score);
    });

    socket.on('disconnect',() => {
        console.log('user disconnected');
        // remove this player from our players object
        delete players[socket.id];
        // emit a message to all players to remove this player
        io.emit('disconnect', socket.id);
    });
  });
  

server.listen(8081, function () {
  console.log(`Listening on ${server.address().port}`);
});