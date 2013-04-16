/**
 * @fileoverview This file provides a client/server message for the game
 * @author Christine Talbot & Todd Dobbs
 */

gameMessage.PNO_PLAYER_DATA_OFFSET = 3;
gameMessage.PNO_ROCK_COUNT_OFFSET = 2;
gameMessage.UPD_PLAYER_DATA_OFFSET = 1;
gameMessage.ROCK_ATTRIBUTE_COUNT = 3;
gameMessage.BUBBLE_ATTRIBUTE_COUNT = 4;
gameMessage.PLAYER_COUNT = 4;
gameMessage.PLAYER_ATTRIBUTE_COUNT = 6;
gameMessage.FROG_COUNT = 1;
gameMessage.FROG_ATTRIBUTE_COUNT = 5;
gameMessage.TURTLE_COUNT = 1;
gameMessage.TURTLE_ATTRIBUTE_COUNT = 5;
gameMessage.PLAYER_COLORS = ['purple', 'green', 'red', 'orange'];

/**
 * This method is the gameMessage constructor
 * @param {String} message A comma delimited string of gameMessage attributes
 * @param {Array} message An array of gameMessage attributes
 */
function gameMessage(message){
    var messageAttributes;
    
    if (Object.prototype.toString.call(message) === '[object Array]'){
            messageAttributes = message;
    }else if (typeof(message) === 'string'){
        messageAttributes = message.split(',');
    }
    else{
        throw 'The gameMessage constructor only accepts arrays and strings';
    }
    this._createProperties(messageAttributes);
}

/**
 * This method creates gameMessage attributes
 * @param {Array} messageAttributes An array of gameMessage attributes
 */
gameMessage.prototype._createProperties = function(messageAttributes){
	var offset;
	
	//based on the message type, setup attributes from the message attribute array
    this.messageType = messageAttributes[0];
    switch(this.messageType){
        case 'PNO':
			this.playerNumber = messageAttributes[1];
			if (!this.isGameFull()){
				this.playerColor = gameMessage.PLAYER_COLORS[this.playerNumber];
				offset = gameMessage.PNO_PLAYER_DATA_OFFSET;
				offset = this._setRockAttributes(offset, messageAttributes);
				offset = this._setPlayerAttributes(offset, messageAttributes);
				offset = this._setFrogAttributes(offset, messageAttributes);
				offset = this._setTurtleAttributes(offset, messageAttributes);
				offset = this._setBubbleAttributes(offset, messageAttributes);
			}else{
				offset = 2;
			}
			this.timeStamp = messageAttributes[offset];
            break;
        case 'KEY':
			this.key = messageAttributes[1];
			this.keyState = messageAttributes[2];
            break;
        case 'UPD':
			offset = gameMessage.UPD_PLAYER_DATA_OFFSET;
			offset = this._setPlayerAttributes(offset, messageAttributes);
			offset = this._setFrogAttributes(offset, messageAttributes);
			offset = this._setTurtleAttributes(offset, messageAttributes);
			offset = this._setBubbleAttributes(offset, messageAttributes);
			this.timeStamp = messageAttributes[offset];
            break;
		case 'PING':
			this.id = messageAttributes[1];
			this.timeStamp = messageAttributes[2];
			break;
		case 'CONFIRMED':
			this.timeStamp = messageAttributes[1];
			break;
        default:
            throw 'The gameMessage [' + messageAttributes.toString() + '] has an invalid mesageType.';
            break;
    }
}


/**
 * This method generates new rock attributes
 * @param {Number} rockCount number of rocks attributes to create
 */
gameMessage.prototype.setRockCount = function(rockCount){
    var _rocks = [];
    
    for(var i = 0; i < rockCount; i++){
        this._rocks[i] = {position: {x:undefined,y:undefined}};
    }    
    this.rocks = _rocks;
}

/**
 * This method creates PNO gameMessage rock attributes
 * @param {Array} messageAttributes An array of gameMessage attributes
 */
gameMessage.prototype._setRockAttributes = function(offset, messageAttributes){
    var rockCount = messageAttributes[gameMessage.PNO_ROCK_COUNT_OFFSET];
    var _rocks = [];
    
	for(var i = 0; i < rockCount; i++){
		_rocks[i] = {position: {x:messageAttributes[offset],y:messageAttributes[offset+1]}, scale:messageAttributes[offset+2]};
		offset+=gameMessage.ROCK_ATTRIBUTE_COUNT;
	}
    this.rocks = _rocks;
	return offset;
}

/**
 * This method adds PNO gameMessage rock attributes to an array
 * @param {Array} messageAttributes An array of gameMessage attributes
 */
gameMessage.prototype._addRockAttributes = function(attributeArray){
	attributeArray.push(this.rocks.length);
	for(var i = 0; i < this.rocks.length; i++){
		attributeArray.push(this.rocks[i].position.x);
		attributeArray.push(this.rocks[i].position.y);
		attributeArray.push(this.rocks[i].scale);
	}
}

/**
 * This method creates PNO gameMessage player attributes
 * @param {Array} messageAttributes An array of gameMessage attributes
 */
gameMessage.prototype._setPlayerAttributes = function(offset, messageAttributes){
    var _players = [];

	for(var i = 0; i < gameMessage.PLAYER_COUNT; i++){
		_players[i] = {position: {x:messageAttributes[offset],y:messageAttributes[offset+1]}, rotation:messageAttributes[offset+2], coloring:messageAttributes[offset+3].toLowerCase(), health:messageAttributes[offset+4], time:messageAttributes[offset+5]};
		offset+=gameMessage.PLAYER_ATTRIBUTE_COUNT;
	}
    this.players = _players;
	return offset;
}

/**
 * This method adds PNO gameMessage player attributes to an array
 * @param {Array} messageAttributes An array of gameMessage attributes
 */
gameMessage.prototype._addPlayerAttributes = function(attributeArray){
	for(var i = 0; i < gameMessage.PLAYER_COUNT; i++){
		attributeArray.push(this.players[i].position.x);
		attributeArray.push(this.players[i].position.y);
		attributeArray.push(this.players[i].rotation);
		attributeArray.push(this.players[i].coloring);
		attributeArray.push(this.players[i].health);
		attributeArray.push(this.players[i].time);
	}
}

/**
 * This method creates PNO gameMessage frog attributes
 * @param {Array} messageAttributes An array of gameMessage attributes
 */
gameMessage.prototype._setFrogAttributes = function(offset, messageAttributes){
	this.frog = {position: {x:messageAttributes[offset],y:messageAttributes[offset+1]}, rotation:messageAttributes[offset+2], coloring:messageAttributes[offset+3].toLowerCase(), state:messageAttributes[offset+4]};
	return offset + gameMessage.FROG_ATTRIBUTE_COUNT;
}

/**
 * This method adds PNO gameMessage frog attributes to an array
 * @param {Array} messageAttributes An array of gameMessage attributes
 */
gameMessage.prototype._addFrogAttributes = function(attributeArray){
	attributeArray.push(this.frog.position.x);
	attributeArray.push(this.frog.position.y);
	attributeArray.push(this.frog.rotation);
	attributeArray.push(this.frog.coloring);
	attributeArray.push(this.frog.state);
}

/**
 * This method creates PNO gameMessage turtle attributes
 * @param {Array} messageAttributes An array of gameMessage attributes
 */
gameMessage.prototype._setTurtleAttributes = function(offset, messageAttributes){		
	this.turtle = {position: {x:messageAttributes[offset],y:messageAttributes[offset+1]}, rotation:messageAttributes[offset+2], coloring:messageAttributes[offset+3].toLowerCase(), state:messageAttributes[offset+4]};
	return offset + gameMessage.TURTLE_ATTRIBUTE_COUNT;
}

/**
 * This method adds PNO gameMessage turtle attributes to an array
 * @param {Array} messageAttributes An array of gameMessage attributes
 */
gameMessage.prototype._addTurtleAttributes = function(attributeArray){
	attributeArray.push(this.turtle.position.x);
	attributeArray.push(this.turtle.position.y);
	attributeArray.push(this.turtle.rotation);
	attributeArray.push(this.turtle.coloring);
	attributeArray.push(this.turtle.state);
}

/**
 * This method generates new bubble attributes
 * @param {Number} bubbleCount number of bubble attributes to create
 */
gameMessage.prototype.setBubbleCount = function(bubbleCount){
    var _bubbles = [];
    
    for(var i = 0; i < bubbleCount; i++){
        _bubbles[i] = {position: {x:undefined,y:undefined}, color:undefined};
    }    
    this.bubbles = _bubbles;
}

/**
 * This method creates PNO gameMessage bubble attributes
 * @param {Array} messageAttributes An array of gameMessage attributes
 */
gameMessage.prototype._setBubbleAttributes = function(offset, messageAttributes){
    var bubbleCount = messageAttributes[offset];
	var _bubbles = [];

	for(var i = 0; i < bubbleCount; i++){
		_bubbles[i] = {id:messageAttributes[offset+1], position: {x:messageAttributes[offset+2],y:messageAttributes[offset+3]}, color:gameMessage.getBubbleColor(messageAttributes[offset+4].toLowerCase()), moved:false};
		offset+=gameMessage.BUBBLE_ATTRIBUTE_COUNT;
	}
	++offset;
    this.bubbles = _bubbles;
	return offset;
}

/**
 * This method provides the name of a color based on its code
 * @param {String} colorCode first digit of color
 */
gameMessage.getBubbleColor = function(colorCode){
	switch(colorCode){
		case 'p':
			return 'purple';
		case 'o':
			return 'orange';
		case 'r':
			return 'red';
		case 'g':
			return 'green';
	}
}

/**
 * This method adds PNO gameMessage bubble attributes to an array
 * @param {Array} messageAttributes An array of gameMessage attributes
 */
gameMessage.prototype._addBubbleAttributes = function(attributeArray){
	attributeArray.push(this.bubbles.length);
	for(var i = 0; i < this.bubbles.length; i++){
		attributeArray.push(this.bubbles[i].id);
		attributeArray.push(this.bubbles[i].position.x);
		attributeArray.push(this.bubbles[i].position.y);
		attributeArray.push(this.bubbles[i].color.charAt(0));
	}
}

/**
 * This method determines if this is a PNO gameMessage
 */
gameMessage.prototype.isPNOMessage = function(){
    return (this.messageType === 'PNO');
}

/**
 * This method determines if this is a KEY gameMessage
 */
gameMessage.prototype.isKEYMessage = function(){
    return (this.messageType === 'KEY');
}

/**
 * This method determines if this is a UPD gameMessage
 */
gameMessage.prototype.isUPDMessage = function(){
    return (this.messageType === 'UPD');
}

/**
 * This method determines if this is a PING gameMessage
 */
gameMessage.prototype.isPINGMessage = function(){
    return (this.messageType === 'PING');
}

/**
 * This method determines if a player has data to refresh
 */
gameMessage.prototype.hasPlayerData = function(playerNumber){
	return ((this.players !== undefined) && (this.players[playerNumber].rotation != -1));
}

/**
 * This method determines if the game is full
 */
gameMessage.prototype.isGameFull = function(){
	return !((this.playerNumber >= 0) && (this.playerNumber <= 4))
}

/**
 * This method creates a gameMessage string
 */
gameMessage.prototype.toString = function(){
	var messageArray = [this.messageType];
	
    switch(this.messageType){
    case 'PNO':
        messageArray.push(this.playerNumber);
		if (!this.isGameFull()){
			this._addRockAttributes(messageArray);
			this._addPlayerAttributes(messageArray);
			this._addFrogAttributes(messageArray);
			this._addTurtleAttributes(messageArray);
			this._addBubbleAttributes(messageArray);
		}
		messageArray.push(this.timeStamp);
        break;
    case 'KEY':
        messageArray.push(this.key,this.keyState);
        break;
    case 'UPD':
        this._addPlayerAttributes(messageArray);
		this._addFrogAttributes(messageArray);
		this._addTurtleAttributes(messageArray);
		this._addBubbleAttributes(messageArray);
		messageArray.push(this.timeStamp);
		break;
    case 'PING':
		messageArray.push(this.id);
		messageArray.push(this.timeStamp);
        break;		
	case 'CONFIRMED':
		messageArray.push(this.timeStamp);s
		break;		
    }
	return messageArray.toString();
}