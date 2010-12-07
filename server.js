/**
 * Important note: this application is not suitable for benchmarks!
 */

var http = require('http')
  , url = require('url')
  , fs = require('fs')
  //, io = require('../')
  , io = require('../')
  , sys = require('sys')
  , redis = require('redis')
  , server;
    
var redis_client = redis.createClient();
server = http.createServer(function(req, res){
  // your normal server code
  var path = url.parse(req.url).pathname;
  switch (path){
    case '/':
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write('<h1>Welcome. Try the <a href="/chat.html">chat</a> example.</h1>');
      res.end();
      break;
      
    case '/json.js':
    case '/chat.html':
      fs.readFile(__dirname + path, function(err, data){
        if (err) return send404(res);
        res.writeHead(200, {'Content-Type': path == 'json.js' ? 'text/javascript' : 'text/html'})
        res.write(data, 'utf8');
        res.end();
      });
      break;
      
    default: send404(res);
  }
}),

send404 = function(res){
  res.writeHead(404);
  res.write('404');
  res.end();
};

server.listen(8082);

// simplest chat application evar
var io = io.listen(server)
  , buffer = [];
  
io.on('connection', function(client){
  client.send({ buffer: buffer });
  //client.broadcast({ announcement: client.sessionId + ' connected' });
  
  client.on('message', function(message){
    var msg = { message: [client.sessionId, message] };
    var msg_str = message;
    console.log(msg_str);
    if(msg_str.match(/^\$/)) {
       console.log("command has been received: "+msg_str);
      //client.broadcast({ message: [client.sessionId, "received command"]});
      var cmd_str = msg_str.split(":");
      var cmd = cmd_str[0];
      if(cmd === "$connect") {
        console.log("connect command...");
        var name = cmd_str[1];
        client.broadcast({ announcement: name + ' connected' });
        redis_client.set(client.sessionId, name);
      } else {
        client.send({ announcement: "Cannot understand the command: "+ cmd_str+ "\ntry: $connect:<your name>"});
      }
    } else {
      redis_client.get(client.sessionId, function(err,data){
        var client_name = client.sessionId;
        if(data){
          client_name = data.toString();
        }
        var msg = { message: [client_name, message] };
        buffer.push(msg);
        if (buffer.length > 15) buffer.shift();
        client.broadcast(msg);
      });
    }
  });


  client.on('disconnect', function(){
    redis_client.get(client.sessionId, function(err,data){
      var client_name = client.sessionId;
      if(data){
        client_name = data.toString();
      }
      client.broadcast({ announcement: client_name + ' disconnected' });
      });
    redis_client.del(client.sessionId);
  });
});

io.on('message', function(client){
    var msg = { message: [client.sessionId, message] };
    var msg_str = msg.message[1];
    if(msg_str.search(/^$/)) {
      //client.broadcast({ message: [client.sessionId, "received command"]});
      var cmd_str = msg_str.split(":");
      var cmd = cmd_str[0];
      if(cmd === "$connect") {
        var name = cmd_str[1];
        client.broadcast({ announcement: name + ' connected' });
      } else {
        client.send({ announcement: "Cannot understand the command: "+ cmd_str});
      }
    } else {
      console.log("io.on 'message': "+msg_str);
    }
});
