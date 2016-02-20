var express   = require('express');
var _         = require('underscore');
var app 	    = express();
var http 	    = require('http').Server(app);
var io 		    = require('socket.io')(http);
var path 	    = require('path');
var Twitter   = require('node-tweet-stream');
var tStream   = new Twitter({ consumer_key: 'f8GdXuni5nyMQ44jHuV87MJxD', consumer_secret: 'VHNgVnAF2rahIRNvGugAokLoTVcbnk7rHNkdzmZw1fq1XtbAwt', token: '101474406-GAWVCzXu7UZ5QZGeaLgncaQAeiG6QKIS5jr2XjS2',token_secret: 'DD7vOomrYynIMjdWoCwlPppY521rSJzIoS4nbubBfzdJe'});

//Client map -> [id,["hashtag","hashtag2","hashtag3"]] So we can filter. We can extend to Redis later on if time allows it
var clients = {};

//Index path Listen on port
app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res){ res.sendFile(path.resolve(__dirname + '/../public/index.html'));});
app.get('/js/app.js', function(req, res) { res.sendfile(path.resolve(__dirname + '/../public/js/app.js'));  });
http.listen(3000, function(){ console.log('listening on *:3000'); });

//Socket listener
io.on('connection', function(socket){
  
  //CLIENT CONNECTS -> REGISTER IN USER MAP
  clients[socket.id] = [];
  console.log(socket.id+" joined");
  
  //CLIENT DISCONNECT -> REMOVE FROM MAP, PURGE TAGS IF NOT USED BY ANYONE ELSE
  socket.on('disconnect', function() {
    //Untrack any non required hastag, if not used by other client
    _.each(clients[socket.id],function(tag) { 
      //Is this tag being used somewhere else ? if not dont delete from tracking
      var match = _.find(clients,function(client) { return _.indexOf(client,tag); });
      if (match && match.length == 1) {
        tStream.untrack(tag); 
        console.log("Untracking tag "+tag);
      } 
    });
    delete clients[socket.id];
    console.log(socket.id+" left");
  });

  //Client sends array of hashtags through the hashtags item -> ["hashtag","hashtag2","hashtag3"]
  socket.on('hashtags', function(data){
    //Update this client tags in mapper
    clients[socket.id] = data;
    //Tell twitter to track
    _.each(data,function(tag) {  
      tStream.track(tag.toLowerCase()); 
      console.log("Tracking tag "+tag); 
    });
  });

});

//Message received
tStream.on('tweet', function (tweet) {
  //TO_DO OPTIMIZE BY IMPLEMENTING SOME PATTERN MATCHING ALGORITHM
  for (var identifier in clients) {
    //Evaluate, is message relevant for this client?
    var relevant = _.intersection(clients[identifier],tweet.text.toLowerCase().split(" ")).length > 0;
    //Send
    if (io.sockets.connected[identifier] && relevant == true) {
      io.sockets.connected[identifier].emit('output', tweet);
    }
  }
})
 
//Something happened!
tStream.on('error', function (err) {
  console.log('Error in Twitter Stream '+err);
});