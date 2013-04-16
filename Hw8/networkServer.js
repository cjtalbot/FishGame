/**
 * @fileoverview This file provides a limeJS implementation of a "game" using
 *   box2D physics engine and finite state machines
 * @author Christine Talbot & Todd Dobbs
 */
//var net = require('net');
var server = require('./server');
var Box2D = require('./Box2dWeb-2.1.a.3node'); // obtained from https://github.com/jadell/box2dnode to work with node.js

// global variables for window & location of sprite - just default them
var WIDTH = 1024;
var HEIGHT = 768;
var MAX_HEALTH = 1000;


var CUR_BUBBLE_COUNT = 0;
var GLOBAL_STOP = false;
var FROG_STATE = 'Roaming'; // current state value
var TURTLE_STATE = 'Sleeping'; // current state value
// so only change health level due to time once every 60 cycles
var TIME_COUNT = 0; 
var INTERVAL_ID = null;
var KEY_DOWN = null; // which key is down

var WORLD_SCALE = 30; // scale for the box2d world
var shootTime = 2; // used to slow down shooting -prevent bubble collisions
var GLOBAL_TIME = 0;

var FROG_STATE_CHG_TIME = -1;
var TURTLE_STATE_CHG_TIME = -1;
var FROG_LAST_STATE = 'Roaming';
var TURTLE_LAST_STATE = 'Sleeping';
var FROG_LAST_TURN = -1;
var TURTLE_LAST_TURN = -1;

var rockNearFrog = null;
var rockNearTurtle = null;
var world = null;
var rockString = '';
var FISH_NUM = 0; // which fish is close to the frog/turtle
var bodyArray = []; // items to be deleted due to collision during worldsteps


// from http://box2d-javascript-fun.appspot.com/00/index.html 
// to simplify references later in doc
var   b2Vec2 = Box2D.b2Vec2
        , b2BodyDef = Box2D.b2BodyDef
        , b2Body = Box2D.b2Body
        , b2FixtureDef = Box2D.b2FixtureDef
        , b2Fixture = Box2D.b2Fixture
        , b2World = Box2D.b2World
        , b2PolygonShape = Box2D.b2PolygonShape
        , b2CircleShape = Box2D.b2CircleShape
        , b2CircleDef = Box2D.b2CircleDef
        , b2DebugDraw = Box2D.b2DebugDraw
        , b2AABB = Box2D.b2AABB;
 	
 	


/**
 * This is the starting point from the program and is called in the html page.
 *   It creates the scene, adds the background layers, sprite, and listens
 *   for events.
 */
function start(num) {

	init();
	// create box2d world
	world = new b2World(new b2Vec2(0,0), true);
	createSprites(num);

}; // end start function

/**
 * Maps the color given to which player it is
 * @param {String} color Single character color to be translated
 * @return {Number} Player # that uses that color sprite
 */
function getPersFromColor(color) {

	var num = -1;
	switch(color) {
		case 'P':
			num = 0;
			break;
		case 'G':
			num = 1;
			break;
		case 'R':
			num = 2;
			break;
		case 'O':
			num = 3;
			break;
	}
	return num;
}

/**
 * This updates the fish's health bar based on events in the world
 * @param {Number} pers Player Number to update the health for
 * @param {Number} amt Amount to change the health by (positive or negative)
 */
function updateHealth(pers, amt) {

	var fish = getFish(pers);
	if (fish) {
		if (fish.GetUserData().health+amt > MAX_HEALTH) {
			fish.GetUserData().health = MAX_HEALTH
		} else {
			if (fish.GetUserData().health+amt < 0) {
				fish.GetUserData().health = 0;
			} else {
				fish.GetUserData().health = fish.GetUserData().health+amt;
			}
		}
	}
}

/**
 * This updates the fish's max speed based on events in the world
 * @param {Number} pers Player Number to update speed for
 * @param {Number} amt Amount to change the speed by (positive or negative)
 */
function updateSpeed(pers, amt) {
	//console.log('updateSpeed');
	var fish = getFish(pers);
	if (fish) {
		if (fish.GetUserData().speed+amt > 100) {
			fish.GetUserData().speed = 100;
		} else {
			if (fish.GetUserData().speed+amt < 1) {
				fish.GetUserData().speed = 1;
			} else {
				fish.GetUserData().speed = fish.GetUserData().speed+amt;
			}
		}
	}
}

/**
 * This updates the current state for the frog & turtle
 * @param {String} newState This is the state to set the frog/turtle to
 * @param {String} which This holds 'frog' or 'turtle' for which to update
 */
function updateState(newState, which) {

	// here we'll update the state on the screen for the right guy
	var priorState;
	if (which === 'turtle') {
		priorState = TURTLE_STATE;
		TURTLE_LAST_STATE = TURTLE_STATE;
		TURTLE_STATE = newState;
		var turtle = getTurtle();
		turtle.GetUserData().state = newState;

		TURTLE_STATE_CHG_TIME = (new Date()).getTime();

	} else {
		priorState = FROG_STATE;
		FROG_LAST_STATE = FROG_STATE;
		FROG_STATE = newState;
		var frog = getFrog();
		frog.GetUserData().state = newState;

		FROG_STATE_CHG_TIME = (new Date()).getTime();
		//frogAct(priorState, newState);
	}

}

/**
 * This does the work each update of the world for the Turtle using FSM
 */
function turtleAct() {

	var turtle = getTurtle();
	// to clear out the prior forces so doesn't go too fast
	turtle.SetLinearVelocity(new b2Vec2(0,0)); 
	
	switch(TURTLE_STATE) {
		case 'Sleeping':
			// set my velocity to nothing & sit on rock - do for 5 timecycles
			turtle.SetLinearVelocity(new b2Vec2(0,0));
			if (Math.abs((new Date()).getTime() - 
				TURTLE_STATE_CHG_TIME ) > 3000) {
					// update direction to PI + current
					turtle.SetAngle(getRadians(
						fixAngle(getDegrees(
							turtle.GetAngle()+Math.PI))));
					TURTLE_LAST_TURN = (new Date()).getTime();
					updateState('Roaming', 'turtle');
			}
			break;
		case 'Roaming':
			// choose a pair of random numbers to apply force
			if (TURTLE_STATE_CHG_TIME +3000 < (new Date()).getTime()) {
				// only let him turn about 45 degrees
				var angle = Math.random()*Math.PI/4; 
				if (Math.random() < .5) {
					angle = -1*angle;
				}
				turtle.SetAngle(getRadians(fixAngle(
					getDegrees(angle+turtle.GetAngle()))));
				TURTLE_STATE_CHG_TIME = (new Date()).getTime();
				TURTLE_LAST_TURN = (new Date()).getTime();
			}
			turtle.ApplyForce(turtle.GetWorldVector(new b2Vec2(0,300)), 
				turtle.GetWorldCenter());
			break;
		case 'Stunned':
			// set my velocity to nothing & stay
			turtle.SetLinearVelocity(new b2Vec2(0,0));
			if (Math.abs(TURTLE_STATE_CHG_TIME - 
				(new Date()).getTime()) > 2000) {
					updateState('Roaming', 'turtle');
			}
			break;
		case 'Playing':
			// go towards frog
			if (Math.abs(TURTLE_STATE_CHG_TIME - 
				(new Date()).getTime()) > 10000) {
					updateState('Roaming', 'turtle');
			} else {
				if (TURTLE_STATE_CHG_TIME + 500 > (new Date()).getTime()) {
					var frog = getFrog();
					var vector = {x:frog.GetPosition().x - 
						turtle.GetPosition().x, 
						y:frog.GetPosition().y - turtle.GetPosition().y};
					var angle = getDegrees(
						Math.atan2(vector.y, vector.x)) - Math.atan2(turtle.GetPosition().y, turtle.GetPosition().x) + (Math.random()*10);
					turtle.SetAngle(getRadians(
						fixAngle(angle)));
					TURTLE_LAST_TURN = (new Date()).getTime();
				}
			}
			turtle.ApplyForce(turtle.GetWorldVector(new b2Vec2(0,300)), 
				turtle.GetWorldCenter());
			break;
		case 'Hungry':
			// go towards fish
			if (Math.abs(TURTLE_STATE_CHG_TIME - 
				(new Date()).getTime()) > 10000) {
					updateState('Roaming', 'turtle');
			} else {

					if (FISH_NUM === -1) {
						// do nothing - reset to Roaming
						updateState('Roaming', 'turtle');
					} else {
						var fish = getFish(FISH_NUM);
						var vector = {x:fish.GetPosition().x - 
							turtle.GetPosition().x, 
							y:fish.GetPosition().y - turtle.GetPosition().y};
						var angle = getDegrees(
							Math.atan2(vector.y, vector.x) - Math.atan2(turtle.GetPosition().y, turtle.GetPosition().x)) + (Math.random()*10);
						turtle.SetAngle(getRadians(
							fixAngle(angle)));
						TURTLE_LAST_TURN = (new Date()).getTime();
					}

			}
			turtle.ApplyForce(turtle.GetWorldVector(new b2Vec2(0,300)), 
				turtle.GetWorldCenter());
			
			break;
		case 'Eating':
			// collide with fish
			turtle.SetLinearVelocity(new b2Vec2(0,0));
			if (Math.abs(TURTLE_STATE_CHG_TIME - 
				(new Date()).getTime()) > 1000) {
					updateState('Sleeping', 'turtle');
			}
			break;
		default:
			// do nothing
			break;
	}
}

/**
 * This does the work each update of the world for the Frog using FSM
 */
function frogAct() {

	// make sure he moves faster (30) than fish average (20) & turtle (10)
	var frog = getFrog();
	// to clear out the prior forces so doesn't go too fast
	frog.SetLinearVelocity(new b2Vec2(0,0)); 
	
	switch(FROG_STATE) {
		case 'Avoiding Fish':
			if (FISH_NUM === -1) {
				// do nothing, switch to roaming
				updateState('Roaming', 'frog');
			} else {
				var fish = getFish(FISH_NUM);
				// go opposite direction of fish
				var vector = {x:fish.GetPosition().x - frog.GetPosition().x, 
					y:fish.GetPosition().y - frog.GetPosition().y};
	
				if (Math.sqrt((vector.x*vector.x) + (vector.y*vector.y)) > 
					160/WORLD_SCALE) {
						updateState('Roaming', 'frog');
				} else {
					// get direction to fish
					if (FROG_STATE_CHG_TIME +500 > (new Date()).getTime()) {
						var angle = 180 - getDegrees(
							Math.atan2(vector.y, vector.x))- Math.atan2(frog.GetPosition().y, frog.GetPosition().x) + (Math.random()*10)-180;
						// set rotation
						frog.SetAngle(getRadians(fixAngle(angle)));
						FROG_LAST_TURN = (new Date()).getTime();
					}
				}
			}
			// apply force
			frog.ApplyForce(frog.GetWorldVector(new b2Vec2(0,300)), 
				frog.GetWorldCenter() );
			
			break;
		case 'Avoiding Turtle':
			// go opposite direction of turtle
			var turtle = getTurtle();
			var vector = {x:turtle.GetPosition().x - frog.GetPosition().x, 
				y:turtle.GetPosition().y - frog.GetPosition().y};
			if (Math.sqrt((vector.x*vector.x) + (vector.y*vector.y)) > 
				160/WORLD_SCALE) {
					updateState('Roaming', 'frog');
			} else {
				if (FROG_STATE_CHG_TIME +500 < (new Date()).getTime()) {
					// get direction to fish
					var angle = getDegrees(
						Math.atan2(vector.y, vector.x)- Math.atan2(frog.GetPosition().y, frog.GetPosition().x)) + (Math.random()*10);
					// set rotation
					frog.SetAngle(getRadians(fixAngle(angle)));
					FROG_LAST_TURN = (new Date()).getTime();
				}
			}
			// apply force
			frog.ApplyForce(frog.GetWorldVector(new b2Vec2(0,300)), 
				frog.GetWorldCenter() );
		
			break;
		case 'Stunned':
			// set my velocity to nothing & stay
			frog.SetLinearVelocity(new b2Vec2(0,0));
			if (Math.abs(FROG_STATE_CHG_TIME - (new Date()).getTime()) > 
				2000) {
					updateState('Roaming', 'frog');
			}
			break;
		case 'Looking for Shallow Water':
			// go towards rock
			if (Math.abs(FROG_STATE_CHG_TIME - (new Date()).getTime()) > 
				10000) {
					updateState('Roaming', 'frog');
			} else {
				if (FROG_STATE_CHG_TIME +500 > (new Date()).getTime()) {
					var rock = rockNearFrog;
					var vector = {x:rock.GetPosition().x - frog.GetPosition().x, 
						y:rock.GetPosition().y - frog.GetPosition().y};
					var angle = getDegrees(
						Math.atan2(vector.y, vector.x)- Math.atan2(frog.GetPosition().y, frog.GetPosition().x)) + (Math.random()*10) -180;
					frog.SetAngle(getRadians(fixAngle(angle)));
					FROG_LAST_TURN = (new Date()).getTime();
				}
			}
			frog.ApplyForce(frog.GetWorldVector(new b2Vec2(0,300)), 
				frog.GetWorldCenter());
			break;
		case 'Sunning':
			// set velocity to nothing & sit on rock
			frog.SetLinearVelocity(new b2Vec2(0,0));
			if (Math.abs(FROG_STATE_CHG_TIME - (new Date()).getTime()) > 
				3000) {
				// update direction to PI + current	
				frog.SetAngle(getRadians(fixAngle(
					getDegrees(frog.GetAngle() +
					(Math.random()*Math.PI/8)+Math.PI))));
				FROG_LAST_TURN = (new Date()).getTime();
				updateState('Roaming', 'frog');
			}
			
			break;
		case 'Roaming':
			// choose a random direction to apply force
			// need to only change direction sometimes
			if ((new Date()).getDate() - FROG_LAST_TURN > 200) {
				// only let him turn about 45 degrees
				var angle = Math.random()*Math.PI/4; 
				if (Math.random() < .5) {
					angle = -1*angle;
				}
				frog.SetAngle(getRadians(fixAngle(
					getDegrees(angle+frog.GetAngle()))));
				FROG_LAST_TURN = (new Date()).getTime();
			}

			frog.ApplyForce(frog.GetWorldVector(new b2Vec2(0,300)), 
				frog.GetWorldCenter());
			break;
		default:
			// do nothing
			break;
	}
}

/**
 * This converts degrees to radians
 * @param {Number} degrees The degrees to be converted
 * @return {Number} The radian equivalent of degrees
 */
function getRadians(degrees) {

	var rad = degrees * Math.PI / 180;
	return rad;
}

/**
 * This converts radians to degrees
 * @param {Number} rad The radians to be converted
 * @return {Number} The degree equivalent of rad
 */
function getDegrees(rad) {

	var degrees = rad * 180 / Math.PI;
	return degrees;
}

/**
 * This creates a bubble and shoots it into the world
 * @param {Number} pers Player Number that is shooting this bubble
 */
function shootBubble(pers) {

	if (getFish(pers)) {
		// create a new sprite & box2D
		var moveAmt = getMoveDistance(pers, 0);
	
		var bubbleFixDef = new b2FixtureDef;
		var bubbleBodyDef = new b2BodyDef;
		
		var color;
		switch(pers) {
			case 0:
				color = 'P';
				break;
			case 1:
				color = 'G';
				break;
			case 2:
				color = 'R';
				break;
			case 3:
				color = 'O';
				break;
		}
	
		bubbleFixDef.density = 1.0;
		bubbleFixDef.friction = .5;
		bubbleBodyDef.type = b2Body.b2_dynamicBody;
		bubbleBodyDef.userData = {type:'bubble', num:CUR_BUBBLE_COUNT, color:color};
		CUR_BUBBLE_COUNT++;
		bubbleFixDef.shape = new b2CircleShape(15/30/2);
		bubbleBodyDef.position.x = (getFish(pers).GetPosition().x)+((40*moveAmt.x/30));
		bubbleBodyDef.position.y = (getFish(pers).GetPosition().y)+((40*moveAmt.y/30));
		//bubbleBodyDef.type = b2Body.b2_dynamicBody;
		
		var bubbleBody = world.CreateBody(bubbleBodyDef);
		bubbleBody.CreateFixture(bubbleFixDef);
	
	
		bubbleBody.ApplyForce(bubbleBody.GetWorldVector(new b2Vec2(100*moveAmt.x, 
			100*moveAmt.y)), 
			bubbleBody.GetWorldCenter() );
	}
}

/**
 * This checks what is near the frog and turtle for each world update.  It is
 *   inspired by code found at 
 *   http://www.box2d.org/forum/viewtopic.php?f=3&t=4766
 */
function findNearby() {

	var frog = getFrog();
	
	var frogAnchor = new b2AABB( );
	frogAnchor.lowerBound.Set( frog.GetPosition().x - 160 / 
		WORLD_SCALE, 
		frog.GetPosition().y - 160 / WORLD_SCALE );
	frogAnchor.upperBound.Set( frog.GetPosition().x + 160 / 
		WORLD_SCALE, 
		frog.GetPosition().y + 160 / WORLD_SCALE );

	/**
	 * This is called for each object within "sight" of the frog
	 * @param {Fixture} fixture Fixture within the specified range
	 * @return {Boolean} Always true
	 */
	function frogCallback( fixture ) {
		var type = fixture.GetBody( ).GetUserData().type;
		switch (type) {
	      	case 'fish':
	      		if (FROG_STATE === 'Roaming' || 
	      			FROG_STATE === 'Looking for Shallow Water' || 
	      			FROG_STATE === 'Avoiding Turtle') {
		      			if (Math.random() < .75) {
			      			updateState('Avoiding Fish', 'frog');
			      			FISH_NUM = fixture.GetBody().GetUserData().num;
			      		}
	      		}
	      		break;
	      	case 'turtle':
	      		if (FROG_STATE === 'Roaming' || 
	      			FROG_STATE === 'Looking for Shallow Water') {
		      			if (Math.random() < .5) {
			      			updateState('Avoiding Turtle', 'frog');
			      		}
	      		}
	      		break;
	      	case 'rock':
	      		if (FROG_STATE === 'Roaming'  && 
	      			(FROG_LAST_STATE !== 'Sunning' || 
	      			(FROG_LAST_STATE === 'Sunning' && 
	      			FROG_STATE_CHG_TIME + 5000 < (new Date()).getTime())) 
	      			&& (FROG_LAST_STATE !=='Looking for Shallow Water' 
	      			|| (FROG_LAST_STATE === 'Looking for Shallow Water' 
	      			&& FROG_STATE_CHG_TIME + 5000 < 
	      			(new Date()).getTime()))) {
		      			updateState('Looking for Shallow Water',
		      				'frog');
		      			rockNearFrog = fixture.GetBody();
	      		}
	      		break;
	      	default:
	      		//nothing
	      		break;
		}
		return true;
	}
   	// query the world using above callback
	world.QueryAABB( frogCallback, frogAnchor );
   
	var turtle = getTurtle();
   
	var turtleAnchor = new b2AABB( );
	turtleAnchor.lowerBound.Set( turtle.GetPosition().x - 160 / 
	WORLD_SCALE, turtle.GetPosition().y - 160 / WORLD_SCALE );
	turtleAnchor.upperBound.Set( turtle.GetPosition().x + 160 / 
		WORLD_SCALE, 
		turtle.GetPosition().y + 160 / WORLD_SCALE );
	
	/**
	 * This is called for each object within "sight" of the turtle
	 * @param {Fixture} fixture Fixture within the specified range
	 * @return {Boolean} Always true
	 */
	function turtleCallback( fixture ) {
		var type = fixture.GetBody( ).GetUserData().type;
		switch (type) {
	      	case 'fish':
	      		if (TURTLE_STATE === 'Roaming' || 
	      			TURTLE_STATE === 'Playing' ) {
	      				updateState('Hungry', 'turtle');
	      				FISH_NUM = fixture.GetBody().GetUserData().num;
	      		}
	      		break;
	      	case 'frog':
	      		if (TURTLE_STATE === 'Roaming' ) {
	      			updateState('Playing', 'turtle');
	      		}
	      		break;
	      	default:
	      		//nothing
	      		break;
		}
		return true;
	}
   // check what is near the turtle
   world.QueryAABB( turtleCallback, turtleAnchor );
}


/**
 * This is called on each "tick" to update UI with the physics from box2D
 *   inspired from http://ongamestart-2011-box2d.appspot.com/#24
 */
function worldUpdate() {

	// update current state of each object
	var pers = [-1,-1,-1,-1];
	var toDelete = [false, false, false, false];
	var updMsg = createUpdMsg();
	server.sendMsg(updMsg);
	for (var i=0; i < bodyArray.length; i++) {
		var body = bodyArray[i];
		//bodyArray.splice(i,1);
		world.DestroyBody(body);
	}
	bodyArray = [];
	for (var b=world.GetBodyList(); b; b = b.GetNext()) {

		if (b.GetUserData()) {
	
			if (b.GetUserData().type === 'bubble' && checkBorders(b)) {
				//console.log('Destroyed body 596 - type='+b.GetUserData().type);
				world.DestroyBody(b);
		
			}
			if ( b.GetUserData().type === 'fish' || b.GetUserData().type === 'frog' || 
				b.GetUserData().type === 'turtle') {
					checkBorders(b);
			}
			if (TIME_COUNT === 60 && b.GetUserData().type === 'fish') {

				updateHealth(b.GetUserData().num, -5);

			}
			if (b.GetUserData().type === 'fish' && b.GetUserData().health === 0) {
				// destroy fish

				// if last fish, stop game (no more request updates)
				toDelete[b.GetUserData().num] = true;
				//console.log('Destroyed body 614 - type='+b.GetUserData().type);
				world.DestroyBody(b);
			} else {
				if (b.GetUserData().type === 'fish') {
					pers[b.GetUserData().num] = 1;
					b.GetUserData().time =(new Date()).getTime() - b.GetUserData().start;
					handleKeyboard2(b.GetUserData().num);
				}
			}
		}
	}
	
	for (var i=0; i < 4; i++) {
		if (toDelete[i]) {
			server.closeSocket(i);
		}
	}
	
	if (TIME_COUNT === 60) {
		TIME_COUNT = 0;
	}else {
		TIME_COUNT = TIME_COUNT+1;
	}
	if (doSum(pers) !== -4) {
		// do my per tick checks:
		
		// check current state for frog/turtle
		// see what is in front (if state cares)
		// gather info for turtle & frog & update state
		findNearby();
		// do act for current state
		turtleAct();
		frogAct();
		FISH_NUM = -1;
		// check collisions
		// done during event listener, so won't put here

		// check timer (if state cares)
		world.Step(1 / 60, 10, 10);

		world.ClearForces();

	}
}



/**
 * This keeps the angles within 0-360 and adjusts due to box2D rotating opposite
 *   of limejs
 * @param {Number} angle Angle to be adjusted (in degrees)
 * @return {Number} Angle converted
 */
function fixAngle(angle) {

	var result = angle;
	while (result > 360) {
		result = result-360;
	}
	while (result < 0) {
		result = result+360;
	}
	result = 360-result; // lime rotates opposite box2d
	return result;
}


/**
 * This is called for each tick to update the ui.  Based on sample from:
 *   http://ongamestart-2011-box2d.appspot.com/#10
 * @return {Boolean} callback function
 */
function requestAnimFrame() {

	if (!GLOBAL_STOP) {
      	worldUpdate();
     }
};

/**
 * This finds the fish object in the world
 * @param {Number} num Player Number to find
 * @return {b2Body} Fish body object from box2D world
 */
function getFish(num) {

	for(var b=world.GetBodyList(); b; b=b.GetNext()) {
		if (b.GetUserData()) {
			if (b.GetUserData().type === 'fish' && b.GetUserData().num === num) {

				return b;
				break;
			}
		}
	}

	return null;
	
}

/**
 * This finds the frog object in the world
 * @return {b2Body} Frog body object from box2D world
 */
function getFrog() {

	for(var b=world.GetBodyList(); b; b=b.GetNext()) {
		if (b.GetUserData()) {
			if (b.GetUserData().type === 'frog') {
				return b;
				break;
			}
		}
	}
}

/**
 * This finds the turtle object in the world
 * @return {b2Body} Turtle body object from box2D world
 */
function getTurtle() {

	for(var b=world.GetBodyList(); b; b=b.GetNext()) {
		if (b.GetUserData()) {
			if (b.GetUserData().type === 'turtle') {
				return b;
				break;
			}
		}
	}
}

/**
 * This does the work for any keypress for each tick of the world
 * @param {Number} num Which player pressed the key
 */
function handleKeyboard2(num) {

	var fish = getFish(num);
	if (fish) {
		// move sprite
		var amtToMove = 0;
		switch (fish.GetUserData().keydown) {
			case 'W':
				amtToMove = getMoveDistance(num, 1);
				fish.ApplyForce(fish.GetWorldVector(new b2Vec2(0,
					-1*fish.GetUserData().speed)), fish.GetWorldCenter() );
				fish.SetAwake(true);
				break;
			case 'S':
				amtToMove = getMoveDistance(num, 0);
				fish.ApplyForce(fish.GetWorldVector(new b2Vec2(0,
					fish.GetUserData().speed)), fish.GetWorldCenter() );
				fish.SetAwake(true);
				break;
			case 'A':
				fish.SetAngle(fish.GetAngle() - .05);
				break;
			case 'D':
				fish.SetAngle(fish.GetAngle() + .05);
				break;
			
		}
	}

}; // end handleKeyboard2 function

/**
 * This checks if the key down is valid and should be handled
 * @param {Event.KeyCode} key Key which is down/to be handled
 * @return {Boolean} Whether the key pressed is to be handled or not
 */
function validKey(key) {

	var result = false;
	switch (key) {
		case 'W':
		case 'A':
		case 'S':
		case 'D':
		case 'SPACE':
			result = true;
			break;
		default:
			result = false;
			break;
	}
	return result;
}

/**
 * This determines the direction to place & push the bubble in the world based
 *   on which way the fish is pointing
 * @param {Number} dir 0 to move backwards, 1 to move forwards
 * @return {Object} Amount to move for 1 unit - {x, y}
 */
function getMoveDistance(pers, dir) {
	var amtToMove = {x:0, y:0};
	if (getFish(pers)) {
		
		// plus 90 is because 0 is actually the left of the sprite, not front
		var curDir = fixAngle(getDegrees(
			getFish(pers).GetAngle())+90); 
		// let's only get sin/cos of the 0-90 degree angle we're facing
		if (curDir > 360) {
			curDir = curDir - 360;
		} else {
			if (curDir < 0) {
				curDir = curDir + 360;
			}
		}
		var adjDir = curDir % 90;
		var quadrant = Math.floor(curDir / 90);
		// then lets translate the x & y based on which quadrant we're in
		var y = Math.sin(curDir*Math.PI/180);
		var x = Math.cos(curDir*Math.PI/180);
		
		switch (quadrant) {
			case 0:
			case 4:
				amtToMove.x = x;
				amtToMove.y = -1*y;
				break;
			case 1:
				amtToMove.x = x;
				amtToMove.y = -1*y;
				break;
			case 2:
				amtToMove.x = x;
				amtToMove.y = -1*y;
				break;
			case 3:
				amtToMove.x = x;
				amtToMove.y = -1*y;
				break;
		}
		
		if (dir === 0) {
			amtToMove.x = amtToMove.x * -1;
			amtToMove.y = amtToMove.y * -1;
		}
	}
	return amtToMove;
}

/**
 * This checks the borders of the world with the body's current position and
 *   updates it (for fish, frog, turtle), and/or returns whether it has hit the
 *   border
 * @param {b2Body} body The object to be tested
 * @return {Boolean} True if object has hit a border, else false
 */
function checkBorders(body) {

	// check my position, and if at/beyond border, wrap to opposite border

	var isBubble =( body.GetUserData().type === 'bubble');
	var test = false;
	var curPostn = body.GetPosition();
	//console.log('Checking borders - isBubble='+isBubble+', curPostn.x='+curPostn.x+',y='+curPostn.y);
	if (curPostn.x >= WIDTH/WORLD_SCALE) {
		test = true;
		if (!isBubble) {
			body.SetPosition(new b2Vec2(0, body.GetPosition().y));
		}
	} else {
		if (curPostn.x < 0) {
			test = true;
			if (!isBubble) {
				body.SetPosition(new b2Vec2(WIDTH/WORLD_SCALE, 
					body.GetPosition().y));
			}
		}
	}
	if (curPostn.y >= HEIGHT/WORLD_SCALE) {
		test = true;
		if (!isBubble) {
			body.SetPosition(new b2Vec2(body.GetPosition().x, 0));
		}
	} else {
		if (curPostn.y < 0) {
			test = true;
			if (!isBubble) {
				body.SetPosition(new b2Vec2(body.GetPosition().x, 
					HEIGHT/WORLD_SCALE));
			}
		}
	}
	//console.log('Returning test as = '+test);
	return test;
}

/**
 * This initializes the variables so can restart the game when completed
 */
function init() {
// global variables for window & location of sprite - just default them
var WIDTH = 1024;
var HEIGHT = 768;
var MAX_HEALTH = 1000;


var CUR_BUBBLE_COUNT = 0;
var GLOBAL_STOP = false;
var FROG_STATE = 'Roaming'; // current state value
var TURTLE_STATE = 'Sleeping'; // current state value
// so only change health level due to time once every 60 cycles
var TIME_COUNT = 0; 
var INTERVAL_ID = null;
var KEY_DOWN = null; // which key is down

var WORLD_SCALE = 30; // scale for the box2d world
var shootTime = 2; // used to slow down shooting -prevent bubble collisions
var GLOBAL_TIME = 0;

var FROG_STATE_CHG_TIME = -1;
var TURTLE_STATE_CHG_TIME = -1;
var FROG_LAST_STATE = 'Roaming';
var TURTLE_LAST_STATE = 'Sleeping';
var FROG_LAST_TURN = -1;
var TURTLE_LAST_TURN = -1;

var rockNearFrog = null;
var rockNearTurtle = null;
var world = null;
var rockString = '';
var FISH_NUM = 0; // which fish is close to the frog/turtle

}

/**
 * This creates the rocks (random number & placement), as well as the frog,
 *   turtle, and fish objects in the world
 * @param {Number} num Which Player # to create
 */
function createSprites(num) {

	// create new layer 
 	
	rockString = '';
	numrocks = Math.ceil(Math.random()*10) +5;
	rockString = numrocks;
	
	var rockFixDef = new b2FixtureDef;
	var rockBodyDef = new b2BodyDef;
	
	rockFixDef.density = 1.0;
	rockFixDef.restitution = 0;
	rockBodyDef.type = b2Body.b2_staticBody;
	
	for (var i=0; i < numrocks;i++) {
		
		var tempScale = Math.random() +.25;		
		
		rockFixDef.shape = new b2CircleShape(tempScale*135/
			WORLD_SCALE/2);
		
		rockBodyDef.position.x = ( (Math.random()*
			((WIDTH/30)-(280/30)))+(140/30));
		rockBodyDef.position.y = ((Math.random()*((HEIGHT/30)-
			(280/30)))+(140/30));
		
		rockBodyDef.userData = {type:'rock'};
		var curRock = world.CreateBody(rockBodyDef);	
		curRock.CreateFixture(rockFixDef);	
			rockString = rockString+','+curRock.GetPosition().x*WORLD_SCALE+','+curRock.GetPosition().y*WORLD_SCALE+','+ tempScale;
	
	}
	
	


	var fishFixDef = new b2FixtureDef;
	var fishBodyDef = new b2BodyDef;
	
	fishFixDef.density = 1.0;
	fishFixDef.friction = .5;
	fishFixDef.restitution = .5; // make him bouncy when hits rocks
	fishBodyDef.type = b2Body.b2_dynamicBody;
	fishBodyDef.linearDamping = 1;
	fishBodyDef.angularDamping = 1;
	fishBodyDef.userData = {type:'fish', num:num, color:'', health:1000, start:(new Date()).getTime(), time:0, speed:10, keydown:null};
	
	fishFixDef.shape = new b2CircleShape(60/30/2);
	
	fishBodyDef.position.x = (Math.random() * ((WIDTH/30)-
		(120/30)))+(60/30);
	fishBodyDef.position.y = (Math.random() * ((HEIGHT/30)-
		(120/30)))+(60/30);
	
	
	var fishBody = world.CreateBody(fishBodyDef);
	fishBody.CreateFixture(fishFixDef);
	fishBody.SetBullet(true);
	
	
	
	
	var frogFixDef = new b2FixtureDef;
	var frogBodyDef = new b2BodyDef;
	
	frogFixDef.density = 1.0;
	frogFixDef.friction = .5;
	frogBodyDef.linearDamping = 1;
	frogBodyDef.angularDamping = 1;
	frogFixDef.restitution = 0;
	frogBodyDef.type = b2Body.b2_dynamicBody;
	frogBodyDef.userData = {type:'frog', color:''};
	frogBodyDef.fixedRotation = true;
	frogFixDef.shape = new b2CircleShape(38/30/2);
	
	frogBodyDef.position.x = (Math.random() * ((WIDTH/30)-
		(80/30)))+(40/30);
	frogBodyDef.position.y = (Math.random() * ((HEIGHT/30)-
		(80/30)))+(40/30);
	

	
	var frog = world.CreateBody(frogBodyDef);
	frog.CreateFixture(frogFixDef);
	frog.SetBullet(true);
	
	

	var turtleFixDef = new b2FixtureDef;
	var turtleBodyDef = new b2BodyDef;
	
	turtleFixDef.density = 1.0;
	turtleFixDef.friction = .5;
	turtleBodyDef.linearDamping = 1;
	turtleBodyDef.angularDamping = 1;
	turtleFixDef.restitution = 0; // don't bounce on rocks
	turtleBodyDef.type = b2Body.b2_dynamicBody;
	turtleBodyDef.userData = {type:'turtle', color:''};
	turtleBodyDef.fixedRotation = true; // don't rotate when hit rocks
	turtleFixDef.shape = new b2CircleShape(92/30/2);

	turtleBodyDef.position.x = (Math.random() * ((WIDTH/30)-
		(184/30)))+(92/30);
	turtleBodyDef.position.y = (Math.random() * ((HEIGHT/30)-
		(184/30)))+(92/30);
	
	var turtle = world.CreateBody(turtleBodyDef);
	turtle.CreateFixture(turtleFixDef);
	turtle.SetBullet(true);
	

	
}


/**
 * This stops the game simulation because no one is playing anymore
 */
function endSimulation() {

	// end the simulation so can start new
	GLOBAL_STOP = true;
	clearInterval(INTERVAL_ID);
}

/**
 * This returns the placement information for the rocks in the current world
 * @return {String} String of rock information for the world
 */
function getRocks() {

	return rockString;
}

/**
 * This saves the key that is currently up/down for the particular player
 * @param {String} key Which key is pressed
 * @param {String} state Whether the key is down or up
 * @param {String} pers Which player pressed/unpressed the key
 */
function handleKeyboard(key, state, pers) {

	var fish = getFish(pers);
	if (fish !== null) {
		var keyDown = fish.GetUserData().keydown;
		if (state === 'DOWN') {
			if (keyDown === key && 
					key !== 'SPACE') {
					// do nothing - key is already down & being handled
				} else {
					// stop whatever was doing, and start handling the keyboard event
					if(validKey(key)) {
						if (keyDown === null && 
							key === 'SPACE') {
								shootTime = 2;
						}
						fish.GetUserData().keydown = key;
						if(key === 'SPACE') {
							// shoot a bubble every second fire if held
							if (shootTime === 2) {
								shootBubble(pers);
								shootTime =1;
							} else {
								shootTime++;
							}
						} else {
							handleKeyboard2(pers);
						}
					}
				}
		} else {
			if (key === keyDown) {
				// stops the mvmt for the keyboard when the current key is released
				fish.GetUserData().keydown = null;
				shootTime = 2;
			} 
		}
	}
}

/**
 * This gathers all the information from all entities in the world into a string.
 * @return {String} Placement information for all entities in the world
 */
function createUpdMsg() {

	var msg = 'UPD';
	var p0 = null;
	var p1 = null;
	var p2 = null;
	var p3 = null;
	var frog;
	var turtle;
	var bubbles = '';
	var numBubbles = 0;
	//console.log('=======================BUBBLES!!!====================');
	for (var b=world.GetBodyList(); b; b=b.GetNext()) {
		// get player info
		if (b.GetUserData()) {
		
			if (b.GetUserData().type === 'fish') {
				switch (b.GetUserData().num) {
					case 0:
						p0 = b.GetPosition().x*WORLD_SCALE+','+b.GetPosition().y*WORLD_SCALE+','+convertAngle(b.GetAngle())+','+b.GetUserData().color+','+b.GetUserData().health+','+b.GetUserData().time;
						break;
					case 1:
						p1 = b.GetPosition().x*WORLD_SCALE+','+b.GetPosition().y*WORLD_SCALE+','+convertAngle(b.GetAngle())+','+b.GetUserData().color+','+b.GetUserData().health+','+b.GetUserData().time;
						break;
					case 2:
						p2 = b.GetPosition().x*WORLD_SCALE+','+b.GetPosition().y*WORLD_SCALE+','+convertAngle(b.GetAngle())+','+b.GetUserData().color+','+b.GetUserData().health+','+b.GetUserData().time;
						break;
					case 3:
						p3 = b.GetPosition().x*WORLD_SCALE+','+b.GetPosition().y*WORLD_SCALE+','+convertAngle(b.GetAngle())+','+b.GetUserData().color+','+b.GetUserData().health+','+b.GetUserData().time;
						break;
					default:
						// do nothing
						break;
				}
			}
			// get frog
			if (b.GetUserData().type === 'frog') {
				frog = b.GetPosition().x*WORLD_SCALE+','+b.GetPosition().y*WORLD_SCALE+','+convertAngle(b.GetAngle())+','+b.GetUserData().color+','+ FROG_STATE;
			}
			// get turtle
			if (b.GetUserData().type === 'turtle') {
				turtle = b.GetPosition().x*WORLD_SCALE+','+b.GetPosition().y*WORLD_SCALE+','+convertAngle(b.GetAngle())+','+b.GetUserData().color+','+ TURTLE_STATE;
			}
			// get bubbles -- how keep proper order?  add a number when create them?
//console.log('Type='+b.GetUserData().type);
			if (b.GetUserData().type === 'bubble') {
				//console.log('Found bubble! Num bubbles before ='+numBubbles);
				bubbles = bubbles + ','+ b.GetUserData().num+','+b.GetPosition().x*WORLD_SCALE + ','+b.GetPosition().y*WORLD_SCALE+','+b.GetUserData().color;
				numBubbles++;
				//console.log('Bubble Info='+bubbles);
			}
		} else {
			//console.log('No Type');
		}
	}
	if (p0 === null) {
		p0 = '-1,-1,-1,,0,0';
	}
	if (p1 === null) {
		p1 = '-1,-1,-1,,0,0';
	}
	if (p2 === null) {
		p2 = '-1,-1,-1,,0,0';
	}
	if (p3 === null) {
		p3 = '-1,-1,-1,,0,0';
	}
	msg = msg + ',' + p0 + ','+p1+','+p2+','+p3+','+frog+','+turtle+','+numBubbles+((numBubbles !== 0)?(bubbles):(''));
//console.log('===================END BUBBLES!!!====================');
	return msg;
}

/**
 * This adds a new player to the gamescene that is already running
 * @param {Number} num Player Number to add
 */
function addPlayer(num) {

	// add one more sprite to the world
	
	var fishFixDef = new b2FixtureDef;
	var fishBodyDef = new b2BodyDef;
	
	fishFixDef.density = 1.0;
	fishFixDef.friction = .5;
	fishFixDef.restitution = .5; // make him bouncy when hits rocks
	fishBodyDef.type = b2Body.b2_dynamicBody;
	fishBodyDef.linearDamping = 1;
	fishBodyDef.angularDamping = 1;
	fishBodyDef.userData = {type:'fish', num:num, color:'', health:1000, start:(new Date()).getTime(), time:0,  speed:10, keydown:null};
	
	fishFixDef.shape = new b2CircleShape(60/30/2);
	
	fishBodyDef.position.x = (Math.random() * ((WIDTH/30)-
		(120/30)))+(60/30);
	fishBodyDef.position.y = (Math.random() * ((HEIGHT/30)-
		(120/30)))+(60/30);
	
	
	var fishBody = world.CreateBody(fishBodyDef);
	fishBody.CreateFixture(fishFixDef);
	fishBody.SetBullet(true);
}

/**
 * This starts the listeners and gameloop
 */
function runGame() {
	// this starts the game loop
	
	// borrowed from http://code.google.com/p/box2dweb/source/browse/
	// wiki/BasicUsage.wiki?spec=svn23&r=23
	var myListener = new Box2D.b2ContactListener;
	
	
	/**
	 * This listens for the end of a collision in the world
	 * @param {Fixture} fixture This is the fixture which contains the two 
	 *   colliding bodies
	 */
	myListener.EndContact = function(fixture) {
		var bodyA = fixture.GetFixtureA().GetBody();
		var bodyB = fixture.GetFixtureB().GetBody();
		if (bodyA.GetUserData().type !== 'rock' && bodyA.GetUserData().type !== 'bubble') {
			// change image to positive if nothing else touching:

			bodyA.GetUserData().color = '';
		}
		if (bodyB.GetUserData().type !== 'rock' && bodyB.GetUserData().type !== 'bubble') {
			// change image to positive if nothing else touching:

			bodyB.GetUserData().color = '';
		}
	}

	/**
	 * This listens for the start of a collision in the world
	 * @param {Fixture} fixture This is the fixture which contains the two
	 *   colliding bodies
	 */
	myListener.BeginContact = function(fixture) {

		var bodyA = fixture.GetFixtureA().GetBody();
		var bodyB = fixture.GetFixtureB().GetBody();

		// two fish collided!
		if (bodyA.GetUserData().type === 'fish' && bodyB.GetUserData().type === 'fish') {
			updateHealth(bodyA.GetUserData().num, -10);

			updateHealth(bodyB.GetUserData().num, -10);

		}

		if (bodyA.GetUserData().type !== 'rock' && bodyA.GetUserData().type !== 'bubble') {
			// change image to negative

				bodyA.GetUserData().color = 'NEG';
		}
		if (bodyB.GetUserData().type !== 'rock' && bodyB.GetUserData().type !== 'bubble') {
			// change image to negative
			bodyB.GetUserData().color = 'NEG';
		}		
		if (bodyA.GetUserData().type === 'bubble') {
			var pers = getPersFromColor(bodyA.GetUserData().color);
			markForDestruction(bodyA);
//			world.DestroyBody(bodyA);
			if (pers === bodyB.GetUserData().num) {
				// do nothing
			} else {
				//console.log('Destroyed body 1293 - type='+bodyA.GetUserData().type);
				
				if (bodyB.GetUserData().type === 'frog' || 
					bodyB.GetUserData().type === 'turtle') {
						updateState('Stunned', bodyB.GetUserData().type);
 
							updateHealth(pers, 10);

				} else { // if bubble hit fish other than the one who created it
					if (bodyB.GetUserData().type === 'fish' && bodyB.GetUserData().num !== pers) {
						updateHealth(bodyB.GetUserData().num, -10);

							updateHealth(pers, 10); // gain 10 points for hitting an opponent

					}
				}
			}
		}
		if (bodyB.GetUserData().type === 'bubble') {
			var pers = getPersFromColor(bodyB.GetUserData().color);
			markForDestruction(bodyB);
//			world.DestroyBody(bodyB);
			if (pers === bodyA.GetUserData().num) {
				// do nothing
			} else {
				//console.log('Destroyed body 1312 - type='+bodyB.GetUserData().type);
				
				// if bubble hit turtle or frog, adjust
				if (bodyA.GetUserData().type === 'frog' || 
					bodyA.GetUserData().type === 'turtle') {
						updateState('Stunned', bodyB.GetUserData().type);
						updateHealth(pers, 10);
				} else { // if bubble hit fish other than the one who created it
					if (bodyA.GetUserData().type === 'fish' && bodyA.GetUserData().num !== pers) {
						updateHealth(bodyA.GetUserData().num, -10);
					}
				}
			}
		}
		// you've collided with something
		if (bodyA.GetUserData().type === 'fish' || bodyB.GetUserData().type === 'fish') {
			if (bodyA.GetUserData().type === 'frog' || 
				bodyB.GetUserData().type === 'frog') {
					// gain points for catching the frog & increase your speed
					if (bodyA.GetUserData().type === 'fish') {
						updateHealth(bodyA.GetUserData().num, 20);
						updateSpeed(bodyA.GetUserData().num, 1);
					} else {
						updateHealth(bodyB.GetUserData().num, 20);
						updateSpeed(bodyB.GetUserData().num, 1);
					}
			} else {
				if (bodyA.GetUserData().type === 'turtle' || 
					bodyB.GetUserData().type === 'turtle') {
						if(TURTLE_STATE !== 'Stunned' && 
							TURTLE_STATE !== 'Sleeping') {
								updateState('Eating', 'turtle');
						}
						if(TURTLE_STATE !== 'Stunned') {
							if(bodyA.GetUserData().type === 'fish') {
								updateHealth(bodyA.GetUserData().num, -20);
								updateSpeed(bodyA.GetUserData().num, -1);
							} else {
								updateHealth(bodyB.GetUserData().num, -20);
								updateSpeed(bodyB.GetUserData().num, -1);
							}
						} 
				} else { // hit a rock or a bubble
					if (bodyA.GetUserData().type === 'rock' || 
						bodyB.GetUserData().type === 'rock') {
							if(bodyA.GetUserData().type === 'fish') {
								updateHealth(bodyA.GetUserData().num, -10);
							} else {
								updateHealth(bodyB.GetUserData().num, -10);
							}
					} // else hit a bubble & don't care
				}
			}
		}
		if (bodyA.GetUserData().type === 'rock' || bodyB.GetUserData().type === 'rock') {
			if (bodyA.GetUserData().type === 'frog' || 
				bodyB.GetUserData().type === 'frog') {
					if (FROG_STATE === 'Looking for Shallow Water' || 
						(FROG_STATE === 'Roaming' && 
						FROG_LAST_STATE !== 'Sunning' && 
						((new Date()).getTime() - 
						FROG_STATE_CHG_TIME > 5000))) {
							updateState('Sunning', 'frog');
					} else {
						// turn away
						if (bodyA.GetUserData().type === 'frog') {
							bodyA.SetAngle(getRadians(
								fixAngle(
									getDegrees(
										bodyA.GetAngle() +
										(Math.random()*Math.PI/8)+Math.PI))));
							FROG_LAST_TURN = (new Date()).getTime();
						} else {
							bodyB.SetAngle(getRadians(
								fixAngle(
									getDegrees(
										bodyB.GetAngle() +
										(Math.random()*Math.PI/8)+Math.PI))));
							FROG_LAST_TURN = (new Date()).getTime();
						}
					}
			}
			if (bodyA.GetUserData().type === 'turtle' || 
				bodyB.GetUserData().type === 'turtle') {
				if (TURTLE_STATE === 'Roaming') {
					updateState('Sleeping', 'turtle');
				}
			}
		}

	
	}
	
	// add listener to the world & initialize time settings
	world.SetContactListener(myListener);
	world.SetDestructionListener(new Box2D.b2DestructionListener);
	GLOBAL_TIME = (new Date()).getTime();
	FROG_STATE_CHG_TIME = GLOBAL_TIME;
	TURTLE_STATE_CHG_TIME = GLOBAL_TIME;
	FROG_LAST_TURN = GLOBAL_TIME;
	TURTLE_LAST_TURN = GLOBAL_TIME;
	GLOBAL_STOP = false;

	// start game loop to check for collisions & updates
	
	INTERVAL_ID = setInterval(requestAnimFrame, 1000/60);
}

/**
 * This converts an angle & fixes it, from radians to degrees
 * @param {Number} rad Radians angle to convert
 * @return {Number} Degrees adjusted for limejs
 */
function convertAngle(rad) {
	var res = fixAngle(getDegrees(rad));
	return res;

}

/**
 * This sums up an array
 * @param {Array} arr Array of numbers to be summed
 * @param {Number} Sum of all elements in the array
 */
function doSum(arr) {
	//console.log('doSum');
	var val = 0;
	for(var i=0;i<arr.length;i++) {
		val = val+arr[i];
	}
	return val;
}

/**
 * This removes a player from the world when they disconnect or die
 * @param {Number} pnum Which player needs to be removed
 */
function removePlayer(pnum) {
	for (var b=world.GetBodyList(); b; b = b.GetNext()) {

		if (b.GetUserData()) {
	
			if (b.GetUserData().type === 'fish' && b.GetUserData().num == pnum) {
				//console.log('Destroyed body 1453 - type='+b.GetUserData().type);
				world.DestroyBody(b);
			}
		}
	}
}
// cannot destroy within contact listener, so mark for deletion later
function markForDestruction(body) {
	bodyArray[bodyArray.length] = body;
}
//this is required for outside access after code is compiled in
//ADVANCED_COMPILATIONS mode
exports.start = start;
exports.getRocks = getRocks;
exports.endSimulation = endSimulation;
exports.handleKeyboard = handleKeyboard;
exports.addPlayer = addPlayer;
exports.runGame = runGame;
exports.createUpdMsg = createUpdMsg;
exports.removePlayer = removePlayer;