
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
var messageHistory = []; 

io.on('connection', function(socket){
  console.log('A user connected');
  connections.push(socket); // add socket to array of connections
  console.log('Connected: %s sockets connected', connections.length);

  // Set username
  socket.on('setUsername', function(userid){
    userid = randUsername();
    if (users.indexOf(userid) > -1){
      socket.emit('userExists', userid);
    }
    else{
      socket.userid = userid;
      users.push(socket.userid);
      updateUsernames();
      chatHistory(socket);
      socket.emit('newUser', {username: userid});
      console.log('Randomly generated user: %s', socket.userid);
      console.log('Connected users: ', users);
    }
  });
 
  function updateUsernames(){
    io.sockets.emit('getUsers', users);
  };

  // Disconnect
  socket.on('disconnect', function(data, userid){
    removeUser(userid);
    console.log('User %s has disconnected', socket.userid);
    io.sockets.emit('getUsers', users); // update the list of connected users
    console.log('Connected users: ', users);
    connections.splice(connections.indexOf(socket), 1); // remove socket from connections
    console.log('Disconnection: %s sockets connected', connections.length);
  });

  // Sending messages to other clients
  socket.on('msg', function(msg, userid){
    console.log('Message: "' + msg + '" from user: ' + socket.userid);

    if (msg.substring(0,5) === "/nick"){
      var nickVal = msg.substring(6);
      if (users.indexOf(nickVal) > -1){
        socket.emit('nickExists', nickVal);
      }
      else{
        removeUser(userid);
        setNick(nickVal);
      }
//      var payload = {timestamp: getUTC(), userid: nickVal, color: 'black', message: msg}; // color function
//      io.sockets.emit('msg', payload);
//      messageHistory.push(payload); // log msg into chat history 
    } 

    if (msg.substring(0,10) === "/nickcolor"){
      var colorVal = msg.substring(12);
      var payload = {timestamp: getUTC(), userid: socket.userid, color: colorVal, message: msg}; // color function
      io.sockets.emit('msg', payload);
      messageHistory.push(payload);
    }

    else{
      var payload = {timestamp: getUTC(), userid: socket.userid, color: 'black', message: msg}; // color function
      io.sockets.emit('msg', payload); // emit to other users
      messageHistory.push(payload); // log msg into chat history 
    }
  });

  // Print the chat history to new users 
  function chatHistory(socket){
    for (var i = 0; i < messageHistory.length; i++){
      socket.emit('msg', messageHistory[i]); 
    }
  }

  function setNick(userid){ 
    console.log(userid);
    if (users.indexOf(userid) > -1){
      socket.emit('userExists', userid);
    }
    else{
      socket.userid = userid;
      users.push(socket.userid);
      updateUsernames();
      socket.emit('newUser', {username: userid});
      // Print individual messages that exists in the history array
      console.log(users);
    }
  }
    
  function removeUser(userid){
    var dUser = users.splice(users.indexOf(socket.userid), 1); // disconnect userid
    return dUser;
  }

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

// Generate a random userid b/w 1-10
function randUsername(){
  var data = Math.floor((Math.random() * 10)+1);
  return data;
};

