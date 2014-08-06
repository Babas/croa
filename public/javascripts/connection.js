var socket = io.connect('http://localhost:3700');

socket.on('connect', function(){
	socket.emit('addThisPlayer', username);
});