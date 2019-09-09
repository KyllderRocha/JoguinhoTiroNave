var config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: 800,
    height: 600,
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
        gravity: { y: 0 }
      }
    },
    scene: {
      preload: preload,
      create: create,
      update: update
    } 
};
   
var game = new Phaser.Game(config);
var name='defaut';

function preload() {
  this.load.image('ship', 'assets/spaceShips_001.png');
  this.load.image('otherPlayer', 'assets/enemyBlack5.png');
  this.load.image('star', 'assets/star_gold.png');
  this.load.image('shot', 'assets/bala.png');
}
   
function create() {
  
  var self = this;
  this.nameOld='defaut';
  this.socket = io();
  this.otherPlayers = this.physics.add.group();
  this.scoreText = this.add.text(16, 16, '', { fontSize: '32px', fill: '#FFFFFF' });
  this.redScoreText = this.add.text(584, 16, '', { fontSize: '32px', fill: '#FF0000' });
  this.socket.on('scoreUpdate', function (score) {
    self.scoreText.setText('Score: ' + score);
  });

  this.socket.on('currentPlayers', players => {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id]);
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });

  this.socket.on('newPlayer', function (playerInfo) {
    addOtherPlayers(self, playerInfo);
  });

  this.socket.on('playerCreateShot', function (shotInfo) {
    addOtherShot(self, shotInfo);
  });

  this.socket.on('playerCreate',(player)=>{
    addOtherPlayers(self, player);
  });

  this.socket.on('visibleShip', (player)=>{
    self.ship.x=player.x;
    self.ship.y=player.y;
    self.ship.visible=true;
  });

  this.socket.on('disconnect', function (playerId) {
    self.otherPlayers.getChildren().forEach(otherPlayer => {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });

  this.socket.on('playerMoved', function (playerInfo) {
    self.otherPlayers.getChildren().forEach(otherPlayer => {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });

  this.cursors = this.input.keyboard.createCursorKeys();
  this.cursors.SPACEBAR = this.input.keyboard.addKey(32);
  this.cursors.SPACEBAR.ESTADO = true;
}
   
function update() {
  if (this.ship) {
    if (this.cursors.left.isDown) {
      this.ship.setAngularVelocity(-150);
    } else if (this.cursors.right.isDown) {
      this.ship.setAngularVelocity(150);
    } else {
      this.ship.setAngularVelocity(0);
    }
  
    if (this.cursors.up.isDown) {
      this.physics.velocityFromRotation(this.ship.rotation + 1.5, 100, this.ship.body.acceleration);
    } else {
      this.ship.setAcceleration(0);
    }

    if (this.cursors.SPACEBAR.isDown ) {
      if(this.cursors.SPACEBAR.ESTADO && this.ship.visible==true){
        addShot(this);
      }
      this.cursors.SPACEBAR.ESTADO=false;
    } else {
      this.cursors.SPACEBAR.ESTADO=true;
    }

    this.physics.world.wrap(this.ship, 0);
    // emit player movement
    var x = this.ship.x;
    var y = this.ship.y;
    var r = this.ship.rotation;
    if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
      this.socket.emit('playerMovement', { x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation });
    }

    // save old position data
    this.ship.oldPosition = {
      x: this.ship.x,
      y: this.ship.y,
      rotation: this.ship.rotation
    };
  }
  if(name!=this.nameOld){
    this.nameOld=name;
    this.socket.emit('alterarNome',name,this.socket.id);
  }
}

function addPlayer(self, playerInfo) {
  self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
  if (playerInfo.team === 'blue') {
    self.ship.setTint(0x0000ff);
  } else {
    self.ship.setTint(0xff0000);
  }
  self.ship.setDrag(100);
  self.ship.setAngularDrag(100);
  self.ship.setMaxVelocity(200);
}

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
  if (playerInfo.team === 'blue') {
    otherPlayer.setTint(0x0000ff);
  } else {
    otherPlayer.setTint(0xff0000);
  }
  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayer);
}

function addShot(self) {
  const shot = self.physics.add.image(self.ship.x, self.ship.y,'shot').setOrigin(0.5, 0.5).setDisplaySize(200, 200);
  shot.rotation = self.ship.rotation;
  self.physics.velocityFromRotation(shot.rotation + 1.5,200,shot.body.velocity);
  self.physics.add.overlap(shot,self.otherPlayers,(s,o)=>{
    if(s.x < o.x+25 && s.x > o.x-25 && s.y < o.y+25 && s.y > o.y-25){
      s.destroy();
      o.destroy();
      console.log("destruido");
    } 
  })
  self.socket.emit('playerShot', { x: self.ship.x, y: self.ship.y, rotation: self.ship.rotation, playerId:self.socket.id });
}

function addOtherShot(self,playerInfo) {
  const shot = self.physics.add.image(playerInfo.x, playerInfo.y,'shot').setOrigin(0.5, 0.5).setDisplaySize(200, 200);
  shot.rotation = playerInfo.rotation;
  self.physics.velocityFromRotation(shot.rotation + 1.5,200,shot.body.velocity);
  self.physics.add.overlap(shot,self.otherPlayers,(s,o)=>{
    if(playerInfo.playerId!=o.playerId && s.x < o.x+25 && s.x > o.x-25 && s.y < o.y+25 && s.y > o.y-25){
      s.destroy();
      o.destroy();
      console.log("destruido");
    } 
  })
  self.physics.add.overlap(shot,self.ship,(s,o)=>{
    if(s.x < o.x+25 && s.x > o.x-25 && s.y < o.y+25 && s.y > o.y-25){
      s.destroy();
      o.visible=false;
      self.socket.emit('destroy',playerInfo.playerId);
    } 
  })
}

function alterarNome(){
  name = document.getElementById('name').value;
}