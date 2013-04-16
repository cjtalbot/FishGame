/**
 * @fileoverview This file provides a limeJS implementation of a "game" using a game server
 * @author Christine Talbot & Todd Dobbs
 */

//set main namespace
goog.provide('networkClient');

//get requirements
goog.require('lime');
goog.require('lime.Director');
goog.require('lime.Layer');
goog.require('lime.Sprite');
goog.require('lime.Scene');
goog.require('lime.GlossyButton');
goog.require('lime.animation.RotateTo');
goog.require('goog.events.KeyEvent');
goog.require('lime.fill.Image');
goog.require('goog.math.Vec2');
goog.require('lime.RoundedRect');
goog.require('lime.animation.Resize');

// global variables for window & location of sprite - just default them
networkClient.WIDTH = 1024;
networkClient.HEIGHT = 768;
networkClient.DIRECTIONS_WIDTH = 300;
networkClient.STATUS_BAR = 50;
networkClient.MAX_HEALTH = 1000;
networkClient.HEALTH_HEIGHT = 100;
networkClient.PING_INTERVAL = 1000;
// start low so can see the health & allow you to work up
networkClient.CUR_HEALTH = 1000;

networkClient.KEY_DOWN = null; // which key is down
networkClient.GLOBAL_TIME = 0;
networkClient.latencyLabel = null;

// global variables to help with cross-function activities & interruptions
//networkClient.gameScene = null;

networkClient.healthSprite = null; // display current health
networkClient.frogStatusLabel = null; // display current state
networkClient.turtleStatusLabel = null; // display current state
networkClient.timeElapsedLabel = null;
networkClient.GLOBAL_RESTART = false;
//networkClient.gameFullLabel = null;
networkClient.latLbl0 = null;
networkClient.latLbl1 = null;
networkClient.latLbl2 = null;
networkClient.latLbl3 = null;
networkClient.latLbl4 = null;
networkClient.latLbl5 = null;
networkClient.latLbl6 = null;
networkClient.latLbl7 = null;
networkClient.latLbl8 = null;
networkClient.latLbl9 = null;

networkClient.fishColors = ['purple', 'green', 'red', 'orange'];
 	
/**
 * This is the starting point from the program and is called in the html page.
 *   It creates the scene, adds the background layers, sprite, and listens
 *   for events.
 */
networkClient.start = function() {
	if (networkClient.GLOBAL_RESTART) {
		networkClient.GLOBAL_RESTART = false;
		location.reload(true);
	}
	// create new director for the game
	networkClient.director = new lime.Director(document.body, networkClient.WIDTH+networkClient.DIRECTIONS_WIDTH, networkClient.HEIGHT+networkClient.STATUS_BAR);
	// turn off the frames per second image
	networkClient.director.setDisplayFPS(false);
	// create new scene
	networkClient.gameScene = new lime.Scene();
	networkClient.gameScene.setSize(networkClient.WIDTH + networkClient.DIRECTIONS_WIDTH, networkClient.HEIGHT + networkClient.STATUS_BAR); 
	networkClient.director.replaceScene(networkClient.gameScene);
	networkClient.requestGame();
};

/**
 * This method places all of the non moving sprites that are not received from server.
 */
networkClient.startGame = function(){
	// 100 to account for instruction "page"
	networkClient.createBaseLayer();
	networkClient.createSprites();
	
	// put background image
	var bkgrdSprite = new lime.Sprite();
	bkgrdSprite.setAnchorPoint(0,0);
	bkgrdSprite.setPosition(0,0);
	bkgrdSprite.setSize(networkClient.WIDTH, networkClient.HEIGHT);
	bkgrdSprite.setFill(new lime.fill.Image('assets/water.png'));
	bkgrdSprite.setOpacity(.35);
	bkgrd.appendChild(bkgrdSprite);
}

/**
 * This method pings the server for latency calculations
 */
networkClient.doPing = function(){
	var gmMsg = new gameMessage('PING');
	
	networkClient.lastPINGTime = Date.now();
	gmMsg.id = networkClient.lastPINGTime;
	networkClient.socket.send(gmMsg.toString());
}

/**
 * This method updates latency info based on the id/timestamp of a ping message received from server
 * @param {number} id the id/timestamp of the last ping
 */
networkClient.refreshLatecnyInfo = function(id){
	var time = ((Date.now() -  id)/2);
	
	//make sure the labels are created and the ping id is correct
	if ((networkClient.latLbl9 !== null) && (id == networkClient.lastPINGTime)){
		networkClient.latLbl0.setSize(networkClient.latLbl1.getSize());
		networkClient.latLbl1.setSize(networkClient.latLbl2.getSize());
		networkClient.latLbl2.setSize(networkClient.latLbl3.getSize());
		networkClient.latLbl3.setSize(networkClient.latLbl4.getSize());
		networkClient.latLbl4.setSize(networkClient.latLbl5.getSize());
		networkClient.latLbl5.setSize(networkClient.latLbl6.getSize());
		networkClient.latLbl6.setSize(networkClient.latLbl7.getSize());
		networkClient.latLbl7.setSize(networkClient.latLbl8.getSize());
		networkClient.latLbl8.setSize(networkClient.latLbl9.getSize());
		networkClient.latLbl9.setSize(20, time*.8 );
	}
}

/**
 * This method consumes the event of receiving new data from the server
 * @param {string} e the event arguments (message content) of the message
 */
networkClient.onMessage = function(e) {
	var gmMsg = new gameMessage(e);
	
	//console.assert(gmMsg.toString().toLowerCase() == e.toLowerCase(), 'message format exception');
	if (gmMsg.isPINGMessage()){
		networkClient.refreshLatecnyInfo(gmMsg.id);
		return;
	}
	if (gmMsg.isPNOMessage()){
		if (gmMsg.isGameFull()){
//			networkClient.gameFullLabel.setText('This game is full.  Please try again later.');
			alert('This game is full.  Please try again later.');
			networkClient.close();
			location.reload(true); // CJT added to allow re-entry trying
			return;
		}	
		networkClient.playerNumber = gmMsg.playerNumber;
		networkClient.startGame();
		networkClient.bubbleSprites = [];
		createRocks();
		networkClient.turtleSprite.setHidden(false);
		networkClient.frogSprite.setHidden(false);
	}else{
		resetSpriteMovementFlags();
		moveBubbles();
		createBubbles();
		removeBubbles();
	}
	refreshTurtle();
	refreshFrog();
	refreshFish();
			
	/**
	 * This method resets all client side bubbles moved attribute to false
	 */		
	function resetSpriteMovementFlags(){
		for (var i = 0; i < networkClient.bubbleSprites.length; ++i){
			networkClient.bubbleSprites[i].moved = false;
		}
	}		
	
	/**
	 * This method moves all client side bubbles that exist in the server message
	*/	
	function moveBubbles(){
		for (var i = 0; i < networkClient.bubbleSprites.length; ++i){
			for (var j = 0; j < gmMsg.bubbles.length; ++j){
				if (networkClient.bubbleSprites[i].id === gmMsg.bubbles[j].id){
					networkClient.bubbleSprites[i].sprite.setPosition(gmMsg.bubbles[j].position.x, gmMsg.bubbles[j].position.y);
					networkClient.bubbleSprites[i].moved = true;
					gmMsg.bubbles[j].moved = true;
				}
			}	
					
		}
	}	
	
	/**
	 * This method removes all client side bubbles that are not in the server message
	*/		
	function removeBubbles(){
		for (var i = 0; i < networkClient.bubbleSprites.length; ++i){
			if (!networkClient.bubbleSprites[i].moved){
				networkClient.bubbleSprites[i].sprite.setHidden(true); // CJT added
				networkClient.mobLayer.removeChild(networkClient.bubbleSprites[i]);
				networkClient.bubbleSprites.splice(i,1);
			}
		}	
	}
	
	/**
	 * This method creates bubbles that are not on the client but are in the server message
	*/		
	function createBubbles(){
		for (var i = 0; i < gmMsg.bubbles.length; ++i){
			if (!gmMsg.bubbles[i].moved){
				var sprite = new lime.Sprite();
				sprite.setFill(new lime.fill.Image('assets/bubble' + gmMsg.bubbles[i].color + '.png'))
				sprite.setScale(new goog.math.Vec2(.17, .17));
				sprite.setPosition(gmMsg.bubbles[i].position.x, gmMsg.bubbles[i].position.y);
				networkClient.bubbleSprites.push({sprite:sprite, id:gmMsg.bubbles[i].id, moved:true});
				networkClient.mobLayer.appendChild(sprite);
			}
		}	
	}
	
	/**
	 * This method creates rocks received from server
	*/			
	function createRocks(){
		networkClient.rockSprites = [];
		for (var i = 0; i < gmMsg.rocks.length; ++i){
			networkClient.rockSprites[i] = new lime.Sprite();
			networkClient.rockSprites[i].setPosition(gmMsg.rocks[i].position.x, gmMsg.rocks[i].position.y);
			networkClient.rockSprites[i].setFill(new lime.fill.Image('assets/rock.png'));
			networkClient.rockSprites[i].setScale(gmMsg.rocks[i].scale, gmMsg.rocks[i].scale);
			bkgrd.appendChild(networkClient.rockSprites[i]);
		}	
	}

	/**
	 * This method updates the turtle info from the server info
	*/		
	function refreshTurtle(){
		networkClient.turtleSprite.setPosition(gmMsg.turtle.position.x, gmMsg.turtle.position.y);
		networkClient.turtleSprite.setFill(new lime.fill.Image('assets/turtle' + gmMsg.turtle.coloring + '.png'));
		networkClient.turtleSprite.setRotation(gmMsg.turtle.rotation);
		networkClient.turtleStatusLabel.setText('Current Turtle State:  ' + gmMsg.turtle.state);
	}

	/**
	 * This method updates the frog info from the server info
	*/		
	function refreshFrog(){
		networkClient.frogSprite.setPosition(gmMsg.frog.position.x, gmMsg.frog.position.y);
		networkClient.frogSprite.setFill(new lime.fill.Image('assets/frog' + gmMsg.frog.coloring + '.png'));
		networkClient.frogSprite.setRotation(gmMsg.frog.rotation);
		networkClient.frogStatusLabel.setText('Current Frog State:  ' + gmMsg.frog.state);
	}

	/**
	 * This method updates all player fish info based on server info
	*/		
	function refreshFish(){
		for (var i = 0; i < gmMsg.players.length; ++i){
			if (gmMsg.hasPlayerData(i)){
				networkClient.fishSprites[i].setHidden(false);
				networkClient.fishSprites[i].setPosition(gmMsg.players[i].position.x, gmMsg.players[i].position.y);
				networkClient.fishSprites[i].setFill(new lime.fill.Image('assets/fish' + networkClient.fishColors[i] + gmMsg.players[i].coloring + '.png'));
				networkClient.fishSprites[i].setRotation(gmMsg.players[i].rotation);
				//for the players fish, refresh time and health info to check for endgame
				if (i == networkClient.playerNumber){
					refreshTimeCount(gmMsg.players[i].health, gmMsg.players[i].time);
				}	
			}else{
				networkClient.fishSprites[i].setHidden(true);
			}
		}
	}

	/**
	 * This method refreshes time info and checks for end game based on player health
	 * @param {number} health the health remaining for a player
	 * @param {number} time the time the player is in game 
	 */	
	function refreshTimeCount(health, time){
		var anim = new lime.animation.Resize(50,health/networkClient.MAX_HEALTH * networkClient.HEALTH_HEIGHT);
		networkClient.healthSprite.runAction(anim);
		var timeSpent = Math.floor(time/1000);
		var hours = Math.floor(timeSpent/3600);
		var mins = Math.floor((timeSpent - (hours*60))/60);
		var secs = Math.floor(timeSpent - (mins*60) - (hours*60*60));
		
		if (mins < 10) {
			mins = '0'+mins;
		} 
		if (hours < 10) {
		hours = '0'+hours;
		}	
		if (secs < 10) {
			secs = '0'+secs;
		}
		networkClient.timeElapsedLabel.setText('Time Elapsed: ' + hours + ':' + mins + ':' + secs);
		//players game ends when less than 10 health
		if (health <= 10) {
			networkClient.endGame(time);
		}
		
	}
}

/**
 * This shows the green request game screen for the player
 */	
networkClient.requestGame = function(){
	var startLayer = new lime.Layer();
	var startGameSprite = new lime.Sprite();
	var startGameText = new lime.Label();
	var startButton = new lime.GlossyButton('Play');
	var lbl0 = new lime.Label();
	var lbl1 = new lime.Label();
	var lbl2 = new lime.Label();
	var lbl3 = new lime.Label();
	var lbl4 = new lime.Label();
	var lbl5 = new lime.Label();
	var lbl6 = new lime.Label();
	var lbl7 = new lime.Label();
	var lbl8 = new lime.Label();
	var lbl9 = new lime.Label();
	//networkClient.gameFullLabel = new lime.Label();

	/**
	* This is called with a delay to end the game with Green UI
	*/  
	function showRequestGame(){

	 startLayer.appendChild(startGameSprite);
	startLayer.appendChild(startGameText);
	startLayer.appendChild(startButton);
	startLayer.appendChild(lbl0);
	startLayer.appendChild(lbl1);
	startLayer.appendChild(lbl2);
	startLayer.appendChild(lbl3);
	startLayer.appendChild(lbl4);
	startLayer.appendChild(lbl5);
	startLayer.appendChild(lbl6);
	startLayer.appendChild(lbl7);
	startLayer.appendChild(lbl8);
	startLayer.appendChild(lbl9);
	//startLayer.appendChild(networkClient.gameFullLabel);
	networkClient.gameScene.appendChild(startLayer);

	/**
	* This is called to restart the game when click the button
	* @param {Event} e Click event that triggered function
	*/
	goog.events.listen(startButton, 'click', networkClient.connect);
	}
	lbl0.setAnchorPoint(0,0).setPosition(50, 20).setFontSize(26);
	lbl0.setText('How to Play:');
	lbl1.setAnchorPoint(0,0).setPosition(50, 70).setFontSize(20);
	lbl1.setText('Collide with the Frog = Faster Speed and +20 Health Points');
	lbl2.setAnchorPoint(0,0).setPosition(50, 110).setFontSize(20);
	lbl2.setText('Collide with the Turtle = Slower Speed and -20 Health Points');
	lbl3.setAnchorPoint(0,0).setPosition(50, 150).setFontSize(20);
	lbl3.setText('Collide with another Fish = -10 Health Points');
	lbl4.setAnchorPoint(0,0).setPosition(50, 190).setFontSize(20);
	lbl4.setText('Collide with a Rock = -10 Health Points');
	lbl5.setAnchorPoint(0,0).setPosition(50, 230).setFontSize(20);
	lbl5.setText('Hit Frog with Bubble = Stuns frog and +10 Health Points');
	lbl6.setAnchorPoint(0,0).setPosition(50, 270).setFontSize(20);
	lbl6.setText('Hit Turtle with Bubble = Stuns turtle and +10 Health Points');
	lbl7.setAnchorPoint(0,0).setPosition(50, 310).setFontSize(20);
	lbl7.setText('Hit Another Fish with Bubble = +10 Health Points');
	lbl8.setAnchorPoint(0,0).setPosition(50, 350).setFontSize(20);
	lbl8.setText('Get Hit with a Bubble from Another Fish = -10 Health Points');
	lbl9.setAnchorPoint(0,0).setPosition(50, 390).setFontSize(20);
	lbl9.setText('Tick of the Time Clock = -5 Health Points');
	startLayer.setAnchorPoint(0,0);
	startLayer.setPosition(0,0);
	startLayer.setSize(networkClient.WIDTH+networkClient.DIRECTIONS_WIDTH, networkClient.HEIGHT+networkClient.STATUS_BAR);
	startGameSprite.setAnchorPoint(0,0);
	startGameSprite.setPosition(0,0);
	startGameSprite.setSize(networkClient.WIDTH+networkClient.DIRECTIONS_WIDTH, networkClient.HEIGHT+networkClient.STATUS_BAR);
	startGameSprite.setFill("#009900");
	startGameText.setText('Press the Play button to join the game!');
	startGameText.setPosition((networkClient.WIDTH + networkClient.DIRECTIONS_WIDTH)/2,500).setFontSize(50);
	startButton.setPosition(networkClient.WIDTH, networkClient.HEIGHT).setSize(200, 30);
	//networkClient.gameFullLabel.setText('');
	//networkClient.gameFullLabel.setPosition((networkClient.WIDTH+networkClient.DIRECTIONS_WIDTH)/2, 560).setFontSize(30);
	setTimeout(showRequestGame, 500);
}

/**
 * This checks if the game is over, updates health, and shows Game Over
 */
networkClient.endGame = function(time) {
		var endGameLayer = new lime.Layer();
		var endGameSprite = new lime.Sprite();
		var endGameLabel = new lime.Label();
		var scoreLabel = new lime.Label();
		var endGameButton = new lime.GlossyButton('Click to Play Again');
		var timeSpent= Math.floor(time/1000);
		var hours = Math.floor(timeSpent/3600);
		var mins = Math.floor((timeSpent - (hours*60))/60);
		var secs = Math.floor(timeSpent - (mins*60) - (hours*60*60));
		var text;
		
		/**
		 * This is called with a delay to end the game with Red UI
		 */
		function setGameOver(){
			networkClient.close();
			networkClient.GLOBAL_RESTART = true;
			endGameLayer.appendChild(endGameSprite);
			endGameLayer.appendChild(endGameLabel);
			endGameLayer.appendChild(scoreLabel);
			endGameLayer.appendChild(endGameButton);
			networkClient.gameScene.appendChild(endGameLayer);
			/**
			 * This is called to restart the game when click the button
			 * @param {Event} e Click event that triggered function
			 */
			goog.events.listen(endGameButton, 'click', networkClient.start);
		}
		
		if (hours > 0) {
			text = ' hours';
		} else if (mins > 0) {
			text = ' minutes';
		} else {
			text = ' seconds';
		}
		if (mins < 10) {
			mins = '0'+ mins;
		} 
		if (hours < 10) {
			hours = '0'+ hours;
		}	
		if (secs < 10) {
			secs = '0'+ secs;
		}				
		endGameLayer.setAnchorPoint(0,0);
		endGameLayer.setPosition(0,0);
		endGameLayer.setSize(networkClient.WIDTH+networkClient.DIRECTIONS_WIDTH, networkClient.HEIGHT+networkClient.STATUS_BAR);
		endGameSprite.setAnchorPoint(0,0);
		endGameSprite.setPosition(0, 0);
		endGameSprite.setSize(networkClient.WIDTH+networkClient.DIRECTIONS_WIDTH, networkClient.HEIGHT+networkClient.STATUS_BAR).setFill("#CC0000");
		endGameLabel.setText('Game Over!');
		endGameLabel.setPosition((networkClient.WIDTH + networkClient.DIRECTIONS_WIDTH)/2, (networkClient.HEIGHT+networkClient.STATUS_BAR)/2);
		endGameLabel.setFontSize(50);
		scoreLabel.setText('You lived for ' + hours + ':' + mins + ':' + secs + text + '!');
		scoreLabel.setPosition((networkClient.WIDTH+networkClient.DIRECTIONS_WIDTH)/2, ((networkClient.HEIGHT+networkClient.STATUS_BAR)/2)+50);
		scoreLabel.setFontSize(30);
		endGameButton.setPosition(networkClient.WIDTH, networkClient.HEIGHT).setSize(200, 30);
		setTimeout(setGameOver, 500);
}

/**
 * This checks if the key down is valid and should be handled
 * @param {Event.KeyCode} key Key which is down/to be handled
 * @return {Boolean} Whether the key pressed is to be handled or not
 */
networkClient.validKey = function(key) {
	var result = false;
	switch (key) {
		case goog.events.KeyCodes.W:
		case goog.events.KeyCodes.A:
		case goog.events.KeyCodes.S:
		case goog.events.KeyCodes.D:
		case goog.events.KeyCodes.SPACE:
			result = true;
			break;
		default:
			result = false;
			break;
	}
	return result;
}

/**
 * This method restart the intro screen on disconnect
 * @param {object} e event arguments
 */	
networkClient.onDisconnect = function(e){
	networkClient.start();
}

/**
 * This method creates ui event handlers and requests the flow of server data
 * @param {object} e event arguments
 */	
networkClient.onConnect = function(e){
	goog.events.listen(document, ['keydown'], networkClient.onKeyDown);
	goog.events.listen(document, ['keyup'], networkClient.onKeyUp);
	networkClient.socket.send('CONFIRMED');
	lime.scheduleManager.scheduleWithDelay(networkClient.doPing,networkClient.gameScene,networkClient.PING_INTERVAL);
}

/**
 * This listens for keyboard inputs & handles it WASD & space supported only
 * @param {Event} e Keydown event information
 */
networkClient.onKeyDown= function(e){
	if (networkClient.validKey(e.keyCode)){
		var gmMsg = new gameMessage('KEY');
		if(e.keyCode === goog.events.KeyCodes.SPACE){
			gmMsg.key = 'SPACE';
		}else{
			gmMsg.key = String.fromCharCode(e.keyCode)
		}
		gmMsg.keyState = 'DOWN';
		networkClient.socket.send(gmMsg.toString());
	}
}

/**
 * This listens for the keyup event to end the keyboard handling.
 * @param {Event} e Keyup event information to be handled
 */
networkClient.onKeyUp= function(e){
	if (networkClient.validKey(e.keyCode)){
		var gmMsg = new gameMessage('KEY');
		if(e.keyCode === goog.events.KeyCodes.SPACE){
			gmMsg.key = 'SPACE';
		}else{
			gmMsg.key = String.fromCharCode(e.keyCode)
		}
		gmMsg.keyState = 'UP';
		networkClient.socket.send(gmMsg.toString());
	}
}

/**
 * This initializes the variables so can restart the game when completed
 */
networkClient.connect = function() {
  	networkClient.socket = io.connect('http://playground.uncc.edu:8081');
	networkClient.socket.on('message', networkClient.onMessage);	
	networkClient.socket.on('connect', networkClient.onConnect);
	networkClient.socket.on('disconnect', networkClient.onDisconnect);
}

/**
 * This method creates the frog, turtle, and fish sprites in the world
 */
networkClient.createSprites = function() {
 	networkClient.mobLayer = new lime.Layer().setAnchorPoint(0,0).setPosition(0, 0).setSize(networkClient.WIDTH, networkClient.HEIGHT);	
	networkClient.gameScene.appendChild(networkClient.mobLayer);
	createFish();
	createFrog();
	createTurtle();

	/**
	* This method creates the fish sprites in the world
	*/	
	function createFish(){
		networkClient.fishSprites = [];
		for(var i = 0; i < 4; ++i){
			networkClient.fishSprites[i] = new lime.Sprite();
			networkClient.fishSprites[i].setPosition(0,0);
			switch(i){
				case 0:
					networkClient.fishSprites[i].setFill(new lime.fill.Image('assets/fish' + networkClient.fishColors[i] + '.png'));
					break;
				case 1:
					networkClient.fishSprites[i].setFill(new lime.fill.Image('assets/fish' + networkClient.fishColors[i] + '.png'));
					break;
				case 2:
					networkClient.fishSprites[i].setFill(new lime.fill.Image('assets/fish' + networkClient.fishColors[i] + '.png'));
					break;
				case 3:
					networkClient.fishSprites[i].setFill(new lime.fill.Image('assets/fish' + networkClient.fishColors[i] + '.png'));
					break;
			}
			
			networkClient.fishSprites[i].setScale(new goog.math.Vec2(.12,.12));
			networkClient.fishSprites[i].setHidden(true);
			networkClient.mobLayer.appendChild(networkClient.fishSprites[i]);
		}
	}
	
	/**
	* This method creates the frog sprite in the world
	*/		
	function createFrog(){
		networkClient.frogSprite = new lime.Sprite();	
		networkClient.frogSprite.setPosition(0,0);
		networkClient.frogSprite.setFill(new lime.fill.Image('assets/frog.png'));
		networkClient.frogSprite.setScale(new goog.math.Vec2(.07, .07));
		networkClient.frogSprite.setHidden(true);
		networkClient.mobLayer.appendChild(networkClient.frogSprite);
	}
	
	/**
	* This method creates the turtle sprite in the world
	*/			
	function createTurtle(){
		networkClient.turtleSprite = new lime.Sprite();	
		networkClient.turtleSprite.setPosition(0,0);
		networkClient.turtleSprite.setFill(new lime.fill.Image('assets/turtle.png'));
		networkClient.turtleSprite.setScale(new goog.math.Vec2(.17, .17));
		networkClient.turtleSprite.setHidden(true);
		networkClient.mobLayer.appendChild(networkClient.turtleSprite);	
	}
}

/**
 * This creates the background images and the instruction list, health monitor,
 *   Timer, Frog & Turtle states, as well as name & version being run on
 */
networkClient.createBaseLayer = function() {
	
	var baseLayer = new lime.Layer().setAnchorPoint(0,0).setPosition(0,0)
		.setSize(networkClient.WIDTH+networkClient.DIRECTIONS_WIDTH, 
			networkClient.HEIGHT+networkClient.STATUS_BAR);
	networkClient.gameScene.appendChild(baseLayer);
	
	// create background water image
	bkgrd = new lime.Layer().setAnchorPoint(0,0).setPosition(0,0)
							.setSize(networkClient.WIDTH, networkClient.HEIGHT);
	
    // add layers to the scene
	networkClient.gameScene.appendChild(bkgrd);
	
	// put background image
	var bkgrdSprite = new lime.Sprite().setAnchorPoint(0,0).setPosition(0, 0)
                                    .setSize(networkClient.WIDTH, networkClient.HEIGHT)
                                    .setFill("#DEE")
                                    .setOpacity(1);
	bkgrd.appendChild(bkgrdSprite);
	
	var directionSprite = new lime.Sprite().setAnchorPoint(0,0)
		.setPosition(0, 0)
		.setSize(networkClient.WIDTH+networkClient.DIRECTIONS_WIDTH, networkClient.HEIGHT+
			networkClient.STATUS_BAR)
		.setFill("#BE9");
		baseLayer.appendChild(directionSprite);
		
		// add labels for the instructions
	var directions = new lime.Label().setText('Press the following keys')
								.setAnchorPoint(0,0)
								.setPosition(networkClient.WIDTH+5, 30)
								.setFontSize(24);

	baseLayer.appendChild(directions);
	
	directions = new lime.Label().setText('to manipulate the fish:')
								.setAnchorPoint(0,0)
								.setPosition(networkClient.WIDTH+30, 70)
								.setFontSize(24);
	baseLayer.appendChild(directions);
	
	directions = new lime.Label().setText('W - Moves fish forward')
								.setAnchorPoint(0,0)
								.setPosition(networkClient.WIDTH+30, 130)
								.setFontSize(16);
	baseLayer.appendChild(directions);
	
	directions = new lime.Label().setText('S - Moves fish backward')
								.setAnchorPoint(0,0)
								.setPosition(networkClient.WIDTH+30, 170)
								.setFontSize(16);
	baseLayer.appendChild(directions);
	
	directions = new lime.Label().setText('A - Turns fish left')
								.setAnchorPoint(0,0)
								.setPosition(networkClient.WIDTH+30, 210)
								.setFontSize(16);
	baseLayer.appendChild(directions);
	
	directions = new lime.Label().setText('D - Turns fish right')
								.setAnchorPoint(0,0)
								.setPosition(networkClient.WIDTH+30, 250)
								.setFontSize(16);
	baseLayer.appendChild(directions);
	
	directions = new lime.Label().setText('Space - Shoots bubbles from fish')
								.setAnchorPoint(0,0)
								.setPosition(networkClient.WIDTH+30, 290)
								.setFontSize(16);
	baseLayer.appendChild(directions);
	
	networkClient.fishImage = new lime.Sprite();
	networkClient.fishImage.setPosition(networkClient.WIDTH+150, 335);
	networkClient.fishImage.setFill(new lime.fill.Image('assets/fish' + networkClient.fishColors[networkClient.playerNumber] + '.png'));
	networkClient.fishImage.setScale(new goog.math.Vec2(.12,.12));
	baseLayer.appendChild(networkClient.fishImage);
	
	
	var timeSpent= Math.floor((new Date().getTime() - 
		networkClient.GLOBAL_TIME)/1000);
	var hours = Math.floor(timeSpent/3600);

	var mins = Math.floor((timeSpent - (hours*60))/60);
	
	var secs = Math.floor(timeSpent - (mins*60) - (hours*60*60))
	if (mins < 10) {
		mins = '0'+mins;
	} 
	if (hours < 10) {
	hours = '0'+hours;
	}	
	if (secs < 10) {
		secs = '0'+secs;
	}
	networkClient.timeElapsedLabel = new lime.Label().setText('Time Elapsed: ' + 
		hours+':'+mins+':'+secs )
			.setAnchorPoint(0,0).setPosition(networkClient.WIDTH+10, 370)
			.setFontSize(26);
	baseLayer.appendChild(networkClient.timeElapsedLabel);
	
	// this is for the name & where running info
	// parse navigator info into "words", splitting by spaces
	// work from the bottom & go up
	var loc = [navigator.appName, navigator.platform];
	var postn = networkClient.HEIGHT+networkClient.STATUS_BAR - 20;
	
	directions = new lime.Label().setText('Christine Talbot & Todd Dobbs 2011')
								.setAnchorPoint(0,0)
								.setPosition(networkClient.WIDTH+ 
						(networkClient.DIRECTIONS_WIDTH/4)+10, postn-10)
								.setFontSize(10);
	baseLayer.appendChild(directions);
	directions = new lime.Label().setText('[Web Capable] : Running on '+loc[1])
								.setAnchorPoint(0,0)
								.setPosition(networkClient.WIDTH+ 
						(networkClient.DIRECTIONS_WIDTH/4)+10, postn)
								.setFontSize(10);
								
	baseLayer.appendChild(directions);
	
	// latency labels
	/*var lbox = new lime.RoundedRect().setFill("#FFF").setRadius(3)
		.setSize(100, 35).setAnchorPoint(0,0)
		.setPosition( networkClient.WIDTH - 55, networkClient.HEIGHT+10).setStroke(1,"#000");
	baseLayer.appendChild(lbox);*/
	
	var latency = '0 ms';
	directions = new lime.Label().setText('Network Latency (ms)')
							.setAnchorPoint(.5,0)
							.setPosition(networkClient.WIDTH+(networkClient.DIRECTIONS_WIDTH/2), postn-35)
							.setFontSize(12);
	baseLayer.appendChild(directions);
	/*networkClient.latencyLabel = new lime.Label().setText(latency)
							.setAnchorPoint(0,0)
							.setPosition(networkClient.WIDTH - 50, networkClient.HEIGHT+30)
							.setFontSize(12);
	baseLayer.appendChild(networkClient.latencyLabel);*/
	
	// This section is for the bar chart of 10 PING packets:
	networkClient.latBox = new lime.Sprite().setAnchorPoint(0,1).setPosition(networkClient.WIDTH+45, postn-45)
					.setSize(210,90).setStroke(5, "#000").setFill("#FFF");
	baseLayer.appendChild(networkClient.latBox);
	healthVal = new lime.Label().setText('100 ms')
					.setAnchorPoint(0,0).setPosition(networkClient.WIDTH+45+210+5, 
						postn-45-90)
					.setFontSize(12);
	baseLayer.appendChild(healthVal);
	
	healthVal = new lime.Label().setText('0 ms')
					.setAnchorPoint(0,0).setPosition(networkClient.WIDTH+45+210+5, postn-50)
					.setFontSize(12);
	baseLayer.appendChild(healthVal);
	var ms = 0
	networkClient.latLbl0 = new lime.Sprite().setAnchorPoint(0,1).setPosition(networkClient.WIDTH+50, postn-50)
					.setSize(20,ms).setFill("#00F");
	baseLayer.appendChild(networkClient.latLbl0);
	networkClient.latLbl1 = new lime.Sprite().setAnchorPoint(0,1).setPosition(networkClient.WIDTH+70, postn-50)
					.setSize(20,ms).setFill("#00F");
	baseLayer.appendChild(networkClient.latLbl1);
	networkClient.latLbl2 = new lime.Sprite().setAnchorPoint(0,1).setPosition(networkClient.WIDTH+90, postn-50)
					.setSize(20,ms).setFill("#00F");
	baseLayer.appendChild(networkClient.latLbl2);
	networkClient.latLbl3 = new lime.Sprite().setAnchorPoint(0,1).setPosition(networkClient.WIDTH+110, postn-50)
					.setSize(20,ms).setFill("#00F");
	baseLayer.appendChild(networkClient.latLbl3);
	networkClient.latLbl4 = new lime.Sprite().setAnchorPoint(0,1).setPosition(networkClient.WIDTH+130, postn-50)
					.setSize(20,ms).setFill("#00F");
	baseLayer.appendChild(networkClient.latLbl4);
	networkClient.latLbl5 = new lime.Sprite().setAnchorPoint(0,1).setPosition(networkClient.WIDTH+150, postn-50)
					.setSize(20,ms).setFill("#00F");
	baseLayer.appendChild(networkClient.latLbl5);
	networkClient.latLbl6 = new lime.Sprite().setAnchorPoint(0,1).setPosition(networkClient.WIDTH+170, postn-50)
					.setSize(20,ms).setFill("#00F");
	baseLayer.appendChild(networkClient.latLbl6);
	networkClient.latLbl7 = new lime.Sprite().setAnchorPoint(0,1).setPosition(networkClient.WIDTH+190, postn-50)
					.setSize(20,ms).setFill("#00F");
	baseLayer.appendChild(networkClient.latLbl7);
	networkClient.latLbl8 = new lime.Sprite().setAnchorPoint(0,1).setPosition(networkClient.WIDTH+210, postn-50)
					.setSize(20,ms).setFill("#00F");
	baseLayer.appendChild(networkClient.latLbl8);
	networkClient.latLbl9 = new lime.Sprite().setAnchorPoint(0,1).setPosition(networkClient.WIDTH+230, postn-50)
					.setSize(20,ms).setFill("#00F");
	baseLayer.appendChild(networkClient.latLbl9);
	
	// lets create the health bar for the fish
	directions = new lime.Label().setText('Fish Health')
					.setAnchorPoint(0,0).setPosition(networkClient.WIDTH+ 
						(networkClient.DIRECTIONS_WIDTH/4)+10, 415)
					.setFontSize(24);
	baseLayer.appendChild(directions);
	
	// use postn as the bottom level & 375 as upper level for creating sprite
	networkClient.HEALTH_HEIGHT = postn-100-45-460-10;
	var bkgrdHealth = new lime.Sprite().setAnchorPoint(0,0)
					.setPosition(networkClient.WIDTH+
						(networkClient.DIRECTIONS_WIDTH/2)-30, 460)
					.setFill("#FFF").setSize(60, networkClient.HEALTH_HEIGHT+10)
					.setStroke(5,"#000");
	baseLayer.appendChild(bkgrdHealth);
	
	networkClient.healthSprite = new lime.Sprite().setAnchorPoint(0,1)
					.setPosition(networkClient.WIDTH+(
						networkClient.DIRECTIONS_WIDTH/2)-25, postn-50-100)
					.setFill("#F00").setSize(50, networkClient.CUR_HEALTH/networkClient.MAX_HEALTH * networkClient.HEALTH_HEIGHT);
	baseLayer.appendChild(networkClient.healthSprite);
	// resize to current health
	var anim = new lime.animation.Resize(50, 
		networkClient.CUR_HEALTH/networkClient.MAX_HEALTH * networkClient.HEALTH_HEIGHT);
	networkClient.healthSprite.runAction(anim);
	
	var healthVal = new lime.Label().setText('100 %')
					.setAnchorPoint(0,0).setPosition(networkClient.WIDTH + 
						(networkClient.DIRECTIONS_WIDTH/2) + 35, 450)
					.setFontSize(12);
	baseLayer.appendChild(healthVal);
	
	healthVal = new lime.Label().setText('50 %')
					.setAnchorPoint(0,0).setPosition(networkClient.WIDTH + 
						(networkClient.DIRECTIONS_WIDTH/2) + 35, 
						450+((postn-60-450)/2)-50)
					.setFontSize(12);
	baseLayer.appendChild(healthVal);
	
	healthVal = new lime.Label().setText('0 %')
					.setAnchorPoint(0,0).setPosition(networkClient.WIDTH + 
						(networkClient.DIRECTIONS_WIDTH/2) + 35, postn-60-100)
					.setFontSize(12);
	baseLayer.appendChild(healthVal);
	
	// now lets put the current state stuff for the frog & turtle
	// also put a box behind the state so it appears to be in a "field"
	var box = new lime.RoundedRect().setFill("#FFF").setRadius(3)
		.setSize(250, 35).setAnchorPoint(0,0)
		.setPosition( 205, networkClient.HEIGHT+10).setStroke(1,"#000");
	baseLayer.appendChild(box);
	networkClient.frogStatusLabel = new lime.Label()
				.setText('Current Frog State:  '+networkClient.FROG_STATE)
				.setAnchorPoint(0,0).setPosition(30, networkClient.HEIGHT+15)
				.setFontSize(20);
	baseLayer.appendChild(networkClient.frogStatusLabel);
	box = new lime.RoundedRect().setFill("#FFF").setRadius(3).setSize(250, 35)
				.setAnchorPoint(0,0).setPosition( (networkClient.WIDTH/2)+185, 
					networkClient.HEIGHT+10).setStroke(1,"#000");
	baseLayer.appendChild(box);
	networkClient.turtleStatusLabel = new lime.Label()
				.setText('Current Turtle State:  '+networkClient.TURTLE_STATE)
				.setAnchorPoint(0,0)
				.setPosition(networkClient.WIDTH/2, networkClient.HEIGHT+15)
				.setFontSize(20);
	baseLayer.appendChild(networkClient.turtleStatusLabel);
}

/**
* This method closes the socket connection
*/		
networkClient.close = function() {
	if (networkClient.socket !== undefined){
		networkClient.socket.disconnect();
	}
}



//this is required for outside access after code is compiled in
//ADVANCED_COMPILATIONS mode
goog.exportSymbol('networkClient.start', networkClient.start);
goog.exportSymbol('networkClient.close', networkClient.close);
