/// /////
/// SERVEUR params
var express       = require('express');
var app           = express();
var port          = 3700;
var url           = require('url');
var cookie        = require('express/node_modules/cookie');
var connect       = require('express/node_modules/connect');
var sessionSecret = "my priv. key"

const sessionStore = new express.session.MemoryStore({ reapInterval: 60000 * 10 });

/// /////
/// APP params
app.configure(function() {
  this.set('views', __dirname + '/views');
  this.set('view engine', 'ejs');
  this.use(express.static(__dirname + '/public'));
});
app.configure(function() {
  this.use(express.cookieParser());
  this.use(express.session({ "secret": sessionSecret, "store":  sessionStore }));
  this.use(express.bodyParser());
});

/// /////
/// APP renders
function requireLogin (req, res, next) {
  if (req.session.username) {
    next();
  } else {
    res.redirect("/");
  }
}
app.get('/salon', [requireLogin], function (req, res, next) {
  res.render('salon', { "session": req.session });
});
app.get('/wait', [requireLogin], function (req, res, next) {
  res.render('wait', { "session": req.session });
});
app.get('/', function(req, res) {
    res.render("connect");
});
app.post("/", function (req, res) {
  var mysql      = require('mysql');
  var connection = mysql.createConnection({
    host     : 'localhost',
    database : 'smallworld',
    user     : 'root',
    password : ''
  });
  connection.connect();
  connection.query(' SELECT * from SW_USERS WHERE USE_MAIL = "'+req.body.login+'" AND USE_PWD = "'+req.body.pwd+'" ', function(err, rows, fields) {
      if (err) throw err;
      if(rows != "")
      {
          req.session.username = rows[0]["USE_NAME"];
          req.session.userId = rows[0]["USE_ID"];
          req.session.id = req.sessionID;
          req.session.room = false;
          res.redirect("/salon");
      }
      else
      {
          res.redirect("/");
      }
  });
  connection.end();
});
app.get('/*', function(req, res) {
    res.redirect("/");
});
app.post('/*', function(req, res) {
    res.redirect("/");
});

/// /////
/// START server & socket
var players = [];
var io = require('socket.io').listen(app.listen(port));

io.set('authorization', function(handshakeData, callback) {
  var cookies = cookie.parse(handshakeData.headers.cookie);
  var sessionID;
  if (cookies['connect.sid']) {
    sessionID = connect.utils.parseSignedCookie(cookies['connect.sid'], sessionSecret);
  }
  if (!sessionID) {
    callback('No session', false);
  } else {
    handshakeData.sessionID = sessionID;
    sessionStore.get(sessionID, function (err, session) {
      if (!err && session) {
        handshakeData.session = session
        callback(null, true);
      } else {
        callback(err || 'User not authenticated', false);
      }
    });
  }
});

var players_connected = {};
var created_games = {};

io.sockets.on('connection', function (socket) {

  var sessionID = socket.handshake.sessionID;
  var session = socket.handshake.session;
  var username = session.username;
  if ('undefined' == typeof players_connected[sessionID]) {
    players_connected[sessionID] = { "length": 0 };
    players_connected[sessionID].username = username;
    // sockets.emit('join', created_games);
  }
  players_connected[sessionID].length ++;

  socket.on('isThereGames', function() {
    socket.emit('showGames', created_games);
  })

  socket.on('createGame', function() {
    setID = ( Math.random() * 100000 ) | 0;
    setID = setID.toString();
    session.room = setID;
    console.log(session);
    created_games[sessionID] = { creator: username, since: Date.now(), players: 0 };
    socket.emit('newGameCreated', created_games);
    // socket.join(inRoom);
  })

  socket.on('disconnect', function () {
    players_connected[sessionID].length --;
    if(players_connected[sessionID].length == 0) {
      delete players_connected[sessionID];
    }
  });

  console.log(session);

});

// io.of('/salon').on('connection', function (socket) {

//   var sessionID = socket.handshake.sessionID;
//   var username = socket.handshake.username;
//   players_connected[sessionID].length ++;

//   socket.on('isThereGames', function() {
//     socket.emit('showGames', created_games);
//   })

//   socket.on('createGame', function() {
//     setID = ( Math.random() * 100000 ) | 0;
//     setID = setID.toString();
//     players_connected[sessionID].inRoom = setID;
//     created_games[sessionID] = { creator: username, since: Date.now(), players: 0 };
//     socket.emit('newGameCreated', created_games);
//     // socket.join(inRoom);
//   })

//   socket.on('disconnect', function () {
//     players_connected[sessionID].length --;
//     if(players_connected[sessionID].length == 0) {
//       delete players_connected[sessionID];
//     }
//   });

// });

// io.of('/wait').on('connection', function (socket) {

//   var sessionID = socket.handshake.sessionID;
//   var username = socket.handshake.username;
//   players_connected[sessionID].length ++;

//   // socket.on('setGameId', function() {
//   //   socket.emit('showGameId', players_connected[sessionID].gameID);
//   // })

//   socket.on('disconnect', function () {
//     players_connected[sessionID].length --;
//     if(players_connected[sessionID].length == 0) {
//       delete players_connected[sessionID];
//     }
//   });

// });