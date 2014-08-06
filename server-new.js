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
  res.render('salon', { "username": req.session.username });
});
app.get('/wait', [requireLogin], function (req, res, next) {
  res.render('wait', { "username": req.session.username });
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
      if (!err && session && session.username) {
        handshakeData.username = session.username;
        callback(null, true);
      } else {
        callback(err || 'User not authenticated', false);
      }
    });
  }
});

var player_connected = {};
var game_created = {};

io.sockets.on('connection', function (socket) {
  
  console.log('Client connected from: ' + socket.handshake.address);

  var sessionID = socket.handshake.sessionID;
  var username = socket.handshake.username;
  
  player_connected[sessionID] = {
    name: username
  }

  console.log(player_connected);

  socket.on('isThereGames', function() {
    console.log('simple try');
    io.sockets.emit('showGames', game_created);
  })

  socket.on('disconnect', function () {
    io.emit('bye', username);
    delete player_connected[sessionID];
  });

});