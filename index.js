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

var colors = {};
var users = [], connections = [], messageHistory = [];
var user, nickVal, colorVal, payload, usercolor;

io.on('connection', function(socket){
  console.log('A socket connected');
  connections.push(socket); // add socket to array of connections
  console.log('Connected: %s sockets connected', connections.length);

  // Generate a random username on-click from client
  socket.on('setUsername', function(data){
    if (data == null){
      userid = randUsername();
      if (users.indexOf(userid) > -1){
        socket.emit('userExists', userid);
      }
      else{
        socket.userid = userid;
        socket.emit('newUser', {username: userid});
        console.log('Randomly generated user: %s', socket.userid);
      }
    }
    else{
      socket.userid = data.username;
      socket.emit('newUser', null);
    }
    users.push(socket.userid);
    updateUsernames();
    chatHistory(socket);
    console.log('Connected users: ', users);
  });

  // Broadcast changes in users array
  function updateUsernames(){
    io.sockets.emit('getUsers', users);
  };

  // Disconnect user & socket
  socket.on('disconnect', function(data, userid){
    removeUser(userid);
    console.log('User %s has disconnected', socket.userid);
    io.sockets.emit('getUsers', users);
    console.log('Connected users: ', users);
    connections.splice(connections.indexOf(socket), 1); // remove socket from connections
    console.log('Disconnection: %s socket(s) connected', connections.length);
  });

  // Sending messages to other clients
  socket.on('msg', function(msg, userid){
    user = socket.userid;
    console.log('Message: "' + msg + '" from user: ' + user);
    
    // set a nickname color with RRGGBB values
    if (msg.substring(0,10) === "/nickcolor"){
      colorVal = msg.substring(11);
      setColor(user, colorVal);
      messageHistory.push(payload);
    }

    // set a new nickname
    else if (msg.substring(0,5) === "/nick"){
      nickVal = msg.substring(6);
      if (users.indexOf(nickVal) > -1){
        socket.emit('nickExists', nickVal);
      }
      else{
        usercolor = getColor(user);
        payload = {timestamp: getUTC(), userid: '', color: usercolor, message: "User " + user + " changed their nickname to: " + nickVal};
        messageHistory.push(payload);
        io.sockets.emit('msg', payload);
        removeUser(userid);
        setNick(nickVal, usercolor);
      }
    } 

    else{
      usercolor = getColor(user);
      payload = {timestamp: getUTC(), userid: user, color: usercolor, message: msg};
      io.sockets.emit('msg', payload); // emit to other users
      messageHistory.push(payload); // log msg into chat history 
    }
  });

  // Print the chat history to new users 
  function chatHistory(socket){
    socket.emit('msgHistory', messageHistory); 
  }

  // Change the user nickname
  function setNick(nickVal, usercolor){ 
    console.log('Nickname %s set by user %s', nickVal, socket.userid);
    socket.userid = nickVal;
    setColor(socket.userid, usercolor);
    users.push(socket.userid);
    updateUsernames();
    socket.emit('newUser', {username: nickVal});
    console.log('Connected users: ', users);
  }

  // Set the RRGGBB for a user 
  function setColor(userid, color){
    var colorsKey = userid;
    colors[colorsKey] = color;
  }

  // Get the user-specific color 
  function getColor(userid){
    var colorsKey = userid;
    var colorsValue = colors[colorsKey];
    return colorsValue;
  }

  // Remove/disconnect userid from users array 
  function removeUser(userid){
    var dUser = users.splice(users.indexOf(socket.userid), 1);
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

// Generate a random userid b/w 1-10000
function randUsername(){
  var data = Math.floor((Math.random() * 10000)+1);
  return data;
};
