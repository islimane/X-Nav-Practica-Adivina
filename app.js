// map vars
var map;
var marker;
// Ctrl pictures vars
var numOfPictures = 0;
var imgArr = null;
var imgIndex = 0; // this is the current index of the imgs json returned from flickr
var imgInterval = null;
// Game vars
var mapClicked = false;
var exitGame = false;
var game = null;
var score = 0;
var levelDict = {
	Dummy: 5,
	Amateur: 4,
	Pro: 2,
	Insane: 1
};
var level = parseInt(levelDict["Pro"]);
// GeoJSON data vars
var gameData = null;
var currentLocation = null;
var featuresIndex = 0; // this is the current index of the features array
// Hist
var currentState = 0;



jQuery(document).ready(function() {
	$.ajaxSetup({ cache: false });
	// LEAFLET
	map = L.map('map').locate({setView: true, maxZoom: 16});
	L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 18
	}).addTo(map);

	console.log("get: " + level);
	
	$(document).on('click', "#start", function(){
		if(game==null)
			document.getElementById("img").innerHTML = 'First, select a game in the "New Game" tab';
		else
			beginGame(game);
	});

	$(document).on('click', "#stop", function(){
		console.log("STOP CLICKED");
		finishGame();
		console.log("arfter finishGame");
	});

	// Change the element menu class to active
	// if the mouse is over it and remove it
	// if the mouse go out
	$( ".din-menu" )
		.mouseover(function() {
			$( this ).addClass("active");
		})
		.mouseout(function() {
			$( this ).removeClass("active");
		});

	// Change the selected game
	$(".game").on('click', function(){
		var id = $(this).attr('id');
		game = id;
		document.getElementById("game").innerHTML = game;
		document.getElementById("score").innerHTML = 0;
		console.log("game: " + id);
		return false;
	});

	// Change the level
	$(".level").on('click', function(){
		var id = $(this).attr('id');
		level = parseInt(levelDict[id]);
		document.getElementById("level").innerHTML = id;
		console.log("level: " + level);
		return false;
	});

	window.onpopstate= function(event) {
		console.log("popState Event");

        replaceHist(event.state);
    };
});

function beginGame(game){
	exitGame = false;
	$("#buttons").empty();
	$("#img").empty();
	$("<button class='display btn'>Stop</button>").appendTo("#buttons").attr("id", "stop");
	document.getElementById("text").innerHTML = "This place is...";
	document.getElementById("score").innerHTML = 0;
	console.log("INCREASE: currentState: " + currentState);
	currentState++;
	runPictures(game);
	// Click on map event
	map.on('click', onMapClick);
	console.log("arfter map.on");
};

/*
*
*
* GeoJSON functions
*
*
*/

function runPictures(game) {
	console.log("Game: " + game);
	$.getJSON("juegos/" + game + ".json", function(data){
		gameData = data;
		console.log("exitGame: " + exitGame);
		console.log("runPictures(game)");
		// run the first location's pictures
		if(!exitGame) nextLocationPictures();
	});
};

function nextLocationPictures(){
	// get a location from the geoJSON's features
	currentLocation = getLocation(gameData);
	if(currentLocation){
		// run pictures of the location
		runFeature(currentLocation);
	}
}

function getLocation(jsonData){
	if(featuresIndex==gameData.features.length){
		console.log("reset");
		finishGame();
		return null;
	}
	var feature = gameData.features[featuresIndex]
	console.log("index = " + featuresIndex);
	featuresIndex++;
	return feature;
}

function runFeature(currentLocation){
	var tag = currentLocation.properties.Name;
	showPictures(tag);
}

/*
*
*
* MAP functions
*
*
*/

function onMapClick(e) {
	if(!exitGame){
		if(marker) map.removeLayer(marker);
		marker = new L.Marker(e.latlng, {draggable:true});
		map.addLayer(marker);
		if(!mapClicked)
			score += parseInt(numOfPictures * distanceTo(e.latlng)/1000);
		document.getElementById("score").innerHTML = score;
		document.getElementById("distance").innerHTML = "Distance (last try): " + parseInt(distanceTo(e.latlng)/1000) + " km";
		mapClicked = true;
	}
}

function distanceTo(point){
	if(currentLocation!=null){
		var latlng = L.latLng(currentLocation.geometry.coordinates[0], currentLocation.geometry.coordinates[1]);
		return latlng.distanceTo(point);
	}
	return null;
}

/*
*
*
* Other functions
*
*
*/

/**
* This function shows, one by one,
* the pictures contained on a json
* file returned by the flickr API
* for a given tag.
*/
function showPictures(tag){
	var about = tag;
	var tags = tag;
	var flickerAPI = "http://api.flickr.com/services/feeds/photos_public.gne?tags=" + about + "&tagmode=any&format=json&jsoncallback=?";
	console.log("showPictures(" + tag + ")");
	$.getJSON( flickerAPI, {
		tags: tags,
		tagmode: "any",
		format: "json"
	})
	.done(function( data ) {
		console.log("tag: " + tag);
		console.log("speed = " + level * 1000);
		if(!exitGame){
			imgInterval = setInterval(function(){switchPicture()}, level * 1000);
			function switchPicture(){
				if(mapClicked){
					clearInterval(imgInterval);
					resetLocationVars();
					nextLocationPictures();
					console.log("exit");
				}else{
					numOfPictures++;
					if(data.items.length==imgIndex)
						imgIndex = 0;
					document.getElementById("img").innerHTML = "<img class='picture' src=" + data.items[imgIndex].media.m  + ">";
					imgIndex++;
				}
			}
		}
		return false;
	});
};

/**
* Returns a random integer between min (inclusive) and max (inclusive)
* Using Math.round() will give you a non-uniform distribution!
*/
function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// This function called when a location was
// selected on the map
function resetLocationVars(){
	mapClicked = false;
	numOfPictures = 0;
	imgIndex = 0;
	console.log("resetLocationVars");
}

// This function called when a game was
// finished
function resetGameVars(){
	// turn off the click map event
	map.off('click', onMapClick);
	score = 0;
	gameData = null;
	currentLocation = null;
	featuresIndex = 0;
	numOfPictures = 0;
	imgIndex = 0;
}

function finishGame(){
	exitGame = true;
	pushHist();
	if(imgInterval!=null)
		clearInterval(imgInterval);
	$("#scoreBoard").empty();
	document.getElementById("buttons").innerHTML = "<button id='start' class='display btn'>Start</button>";
	document.getElementById("text").innerHTML = "Try another game";
	document.getElementById("img").innerHTML = "Your score was: " + score;
	resetGameVars();
}

/*
*
*
* Hist functions
*
*
*/

function pushHist(){
	data = {
		gameName: game,
		date: new Date(),
		score: score,
		currentState: currentState,
	}

	console.log("window.location.href  + game: " + window.location.href.split("#")[0]  + "#" + game);
	history.pushState(data, game, window.location.href.split("#")[0]  + "#" + game);

	html = '<li class="histData"><a id=' + data.gameName + ' href="javascript:go(' + currentState + ')" ><div class="histText"><p> Game: ' + 
			data.gameName + '</p><p>Score: ' + data.score + '</p><p>Date: ' + data.date + '</p></div></a></li>';
	$(html).appendTo("#hist");
}

function go(to){
	console.log("to: " + to + "\ncurrentState: " + currentState);
	aux = to - currentState;
	if(aux!=0){
		currentState = to;
		history.go(aux)
	}
}

function replaceHist(state){
	if(state){
		document.getElementById("score").innerHTML = state.score;
		document.getElementById("game").innerHTML = state.gameName;
		currentState = state.currentState;
		game = state.gameName;
		document.getElementById("img").innerHTML = "Your score was: " + state.score;
	}
}