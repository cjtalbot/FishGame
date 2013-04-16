README
======

To Run:
-------
Log onto playground.uncc.edu, go to /ctalbot1/public_html/iGDD/Hw8 directory.  Start / run the server (if not already running) by:
NODE_ENV=production node server.js 2>&1 > logfile.txt &

This will run it in the background and push the default outputs to logfile.txt.  By setting the NODE_ENV, it will prevent the debug messages from being spooled to the logfile.txt file.

Once the server is running, you can go to:
http://playground.uncc.edu/~ctalbot1/iGDD/Hw8/

This will enable you to enter the game and provide the scoring information.  Only up to 4 players can be in at a time & if all players leave, the next person in will be starting a new game with a new layout.

Keyboard input in the game is:

W-move fish forward
A-rotate fish left
S-move fish backwards
D-rotate fish right
Space-shoot bubble


To Deploy/Migrate:
------------------
For portability, can copy just these files:

index.html => index.html
compiled/networkClient.js => compiled/networkClient.js
networkServer.js => networkServer.js
server.js => server.js
gameMessage.js => gameMessage.js
node_modules/* => node_modules/*
Box2dWeb-2.1.a.3node.js => Box2dWeb-2.1.a.3node.js

Copy these into the assets/ folder as well:
assets/bubblegreen.png
assets/bubbleorange.png
assets/bubblepurple.png
assets/bubblered.png
assets/fishgreenneg.png
assets/fishgreen.png
assets/fishorangeneg.png
assets/fishorange.png
assets/fishpurpleneg.png
assets/fishpurple.png
assets/fishredneg.png
assets/fishred.png
assets/frog.png
assets/frogneg.png
assets/turtle.png
assets/turtleneg.png
assets/water.png
assets/rock.png

For reviewing code, use the networkClient.js from the root directory as it is not
compiled or compressed and is formatted using the Javascript coding
guidelines.

Image Source(s):
----------------
Fish & Fish Negative (all colors) - 
http://xkites.com/gallery3/var/albums/Xkites/Plastic-Kites/MicroKite/TropicalFish_81256-01.jpg?m=1294262727

Frog & Frog Negative - 
http://xkites.com/gallery3/var/resizes/Xkites/Feature-Nylon-kites/Mini-Nylon-Kites/Frog_80321.jpg?m=1294789143

Turtle & Turtle Negative - 
http://xkites.com/gallery3/var/resizes/Xkites/Feature-Nylon-kites/Mini-Nylon-Kites/Turtle_80324.jpg?m=1294789366

Water - trimmed from
http://www.stsgroups.com/admin/uploads/water%20treatment%20plant.jpg

Rock - trimmed from
http://pet.imageg.net/graphics/product_images/pPETS-3758302t400.jpg


Compiled code using:
../My_Homework-5/Talbot-Christine-ITCS5230-Hwk5/bin/lime.py update
../My_Homework-5/Talbot-Christine-ITCS5230-Hwk5/bin/lime.py build networkClient -o 
	compiled/networkClient.js
