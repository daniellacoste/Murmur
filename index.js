
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

http.listen(3000, function(){
  console.log('listening on *:3000');
});

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.use(express.static(__dirname + '/'));

var users = [];
var connections = [];

io.on('connection', function(socket){
  console.log('A user connected');
  connections.push(socket); // add socket to array of connections
  console.log('Connected: %s sockets connected', connections.length);


  // Set username
  socket.on('setUsername', function(userid){
    userid = randUsername(userid);
    if(users.indexOf(userid) > -1){
      socket.emit('userExists', userid);
    }
    else{
      socket.userid = userid;
      users.push(socket.userid);
      updateUsernames();
      socket.emit('newUser', {username: userid});
      console.log(users);
    }
  });
  
  function updateUsernames() {
    io.sockets.emit('getUsers', users);
  };

  // Disconnect
  socket.on('disconnect', function(data, userid){
    users.splice(users.indexOf(socket.userid), 1);
    console.log('User disconnected');
    connections.splice(connections.indexOf(socket), 1); // remove socket from connections

    console.log('Disconnected: %s sockets connected', connections.length);
    io.sockets.emit('getUsers', users); // update the list of connected users
    
    if(users.indexOf(userid > -1)){
      users.pop(userid);
      console.log(users);
    }
  });

  socket.on('msg', function(msg, userid){
    console.log('Message: ' + msg);
    io.sockets.emit('msg', '[' + getUTC() + ']: ' + msg);
  });

  io.of('/').clients(function(error, clients){
    if (error) throw error;
    console.log(clients); 
  });
});


// Calculate the current time
function getUTC(){
  var d = new Date();
  var dateStr = d.toUTCString();
  return dateStr;
};

// Generate a random userid b/w 1-1000
function randUsername(data){
  data = Math.floor((Math.random() * 1000)+1);
  return data;
};

