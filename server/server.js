var express   = require('express');
var _         = require('underscore');
var app 	    = express();
var http 	    = require('http').Server(app);
var io 		    = require('socket.io')(http);
var path 	    = require('path');
var Firebase 	    = require('firebase');
var Twitter   = require('node-tweet-stream');
var cfg	      = require('./config.json');
var swig       = require('swig');
var tStream   = new Twitter(cfg);
var firedb	= new Firebase('https://socket-streams.firebaseio.com');
//Client map -> [id,["hashtag","hashtag2","hashtag3"]] So we can filter. We can extend to Redis later on if time allows it
var clients = {};

var tpl = swig.compileFile(__dirname + '/views/template.html');


//Index path Listen on port
app.use(require('body-parser').json());
app.use(express.static(__dirname + '/../public'));
// app.get('/:report', function(req, res){ 
//   res.sendFile(path.resolve(__dirname + '/../public/index.html'));
//    // res.send(req.params.report);
// });

// app.use(function(req, res) {
//     // Use res.sendfile, as it streams instead of reading the file into memory.
//     res.sendfile(__dirname + '/../public/index.html');
// });

app.get('/sketchs', function(req, res){
  firedb.once('value',function(dataSketch){
     res.json(dataSketch.val());
  });
});

app.post('/savesketch', function(req, res){
  var sketch = req.body;
  firedb.child(sketch.name).set(sketch);
  firedb.once('value',function(dataSketch){
      res.json(dataSketch.val());
  });
});
// app.get('/js/app.js', function(req, res) { res.sendFile(path.resolve(__dirname + '/../public/js/app.js'));  });

app.get('/sketch/:sketchName', function(req, res) {   
  firedb.child(req.params.sketchName).once('value',function(sketch){
    res.send(tpl(sketch.val()));
  });  
});
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
  console.log( tweet );
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
