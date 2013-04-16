/**
 * @fileoverview This file provides server socket listener for the game
 * @author Christine Talbot & Todd Dobbs
 */
var io = require('socket.io').listen(8081);
io.configure('production', function() {
	io.set('log level', 0);
});
var networkServer = require('./networkServer');

var sockets =[-1, -1, -1, -1];
var confirmed = [false,false,false,false]; // used once confirmed to get updates

/**
 * This handles new connections to the game server
 */
io.sockets.on('connection', function (socket) {
	var pnum = -1; // initialize to all connections being used
		for (var i=0; i < sockets.length; i++) {
			if (sockets[i] === -1) { // check each slot to see if it is free
				pnum = i; // if slot is free, give it to this player & save socket here
				sockets[i] = socket;
				break;
			}
		}
		if (numPlayers() === 1) { // if first player, then start up the simulation
			networkServer.start(pnum);
		} else {
			networkServer.addPlayer(pnum);
		}
		// get rock configurations from server code
		if (pnum !== -1) {
			var rocks = networkServer.getRocks();
			var otherInfo = networkServer.createUpdMsg();
			otherInfo = otherInfo.toString().substr(4); // trims out the UPD, text
			socket.send('PNO,'+pnum+','+rocks+','+otherInfo+','+(new Date()).getTime()); // let client know whether he can play or not
		} else {
			socket.send('PNO,'+pnum+','+(new Date()).getTime());

		}
/**
 * This handles messages from the client(s) - mainly KEY presses and PINGs
 */
	socket.on('message', function(data) {
		// when get data from client, process it in gameserver
		var pnum = sockets.indexOf(socket);

		if (pnum !== -1) { // don't know why we hit this state, but apparently do
			var splitData = data.toString().split(',');
			if(splitData[0] === 'KEY' && splitData.length === 3) {
				networkServer.handleKeyboard(splitData[1], splitData[2], pnum);
			} else {
				if(splitData[0] === 'PING') {
					socket.send(data+','+(new Date()).getTime()); // echo what we got
				} else {
					if (splitData[0] === 'CONFIRMED') {
						confirmed[pnum] = true;
						if (numPlayers() === 1) { // wait to start game until first player is ready
							networkServer.runGame();
						}
					}
				}
			}
		}

	});
	
/**
 * This handles disconnects from the server by the players
 */
	socket.on('disconnect', function() {
		// when client terminates session, remove them:

		var pnum = sockets.indexOf(socket);
		if (pnum !== -1) {
			sockets[pnum] = -1; // invalidate this player number so available for others
			confirmed[pnum] = false;
			networkServer.removePlayer(pnum);

		} else {

		}
		if (numPlayers() === 0) { // if all of the players are gone, then stop the simulation
			networkServer.endSimulation();
		}

		// this slot of data will be -1 until another player comes in, no need to notify everyone?
	
	});
});

/**
 * This counts how many players we have playing currently
 * @return {Number} Number of players playing
 */
numPlayers = function() {
	var count = 4;
	for (var i = 0; i < 4; i++) {
		if (sockets[i] === -1) { // if no player here, then decrement player count
			count--;
		}
	}
	// use 0 or 1 so can check after deleting a player in the socket on end function
	return count;
}

/**
 * This sends the new information for every entity in the game
 * @param {String} updMsg The string to be sent to all connected clients
 */
function sendMsg(updMsg) {
	for (var i=0; i < 4; i++) {
		if(sockets[i] !== -1) {

			if (confirmed[i]) { // only send updates if client confirmed ready
				sockets[i].send(updMsg+','+(new Date()).getTime());
			}
		}
	}
}

/**
 * This handles closing a socket when the player hits 0 health
 */
function closeSocket(i) {

	sockets[i] = -1;
}

// export these functions so networkServer.js can call them
exports.closeSocket = closeSocket;
exports.sendMsg = sendMsg;
