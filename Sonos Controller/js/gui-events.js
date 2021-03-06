"use strict";

///
/// GUI events
///

document.getElementById('zone-container').addEventListener('click', function (e) {
	// Find the actual UL
	function findZoneNode(currentNode) {
		// If we are at top level, abort.
		if (currentNode == this) return;
		if (currentNode.tagName == "UL") return currentNode;
		return findZoneNode(currentNode.parentNode);
	}

	var zone = findZoneNode(e.target);

	if (!zone) return;

	var previousZone = document.getElementById(Sonos.currentState.selectedZone);
	if (previousZone) previousZone.classList.remove('selected');

	Sonos.currentState.selectedZone = zone.id;
	zone.classList.add('selected');
	// Update controls with status
	updateControllerState();
	updateCurrentStatus();

	// fetch queue
	EventActions.sendToSonosService('queue', {uuid: Sonos.currentState.selectedZone});

}, true);

document.getElementById('master-mute').addEventListener('click', function () {

	var action;
	// Find state of current player
	var player = Sonos.currentZoneCoordinator();

	// current state
	var mute = player.groupState.mute;
	EventActions.sendToSonosService('group-mute', {uuid: player.uuid, mute: !mute});

	// update
	if (mute)
		this.src = this.src.replace(/_on\.svg/, '_off.svg');
	else
		this.src = this.src.replace(/_off\.svg/, '_on.svg');

});

document.getElementById('play').addEventListener('click', function () {

	var buttonControl = document.getElementById('play-pause');
	if (buttonControl.className === 'play'){
		buttonControl.className = 'pause';
	}
	else{
		buttonControl.className = 'play';
	}
	// var action;
	// Find state of current player
	// var player = Sonos.currentZoneCoordinator();
	// if (player.state.zoneState == "PLAYING" ) {
	// 	action = 'pause';
	// } else {
	// 	action = 'play';
	// }

	try{
		EventActions.sendToSonosService('transport-state', { uuid: Sonos.currentState.selectedZone, state: 'play' });
	}
	catch(error){
		console.log(error);
	}
});

document.getElementById('pause').addEventListener('click', function () {

	// var action;
	// Find state of current player
	// var player = Sonos.currentZoneCoordinator();
	// if (player.state.zoneState == "PLAYING" ) {
	// 	action = 'pause';
	// } else {
	// 	action = 'play';
	// }

	EventActions.sendToSonosService('transport-state', { uuid: Sonos.currentState.selectedZone, state: 'pause' });
});

document.getElementById('next').addEventListener('click', function () {
	var action = "nextTrack";
	EventActions.sendToSonosService('transport-state', { uuid: Sonos.currentState.selectedZone, state: action });
});
document.getElementById('prev').addEventListener('click', function () {
	var action = "previousTrack";
	EventActions.sendToSonosService('transport-state', { uuid: Sonos.currentState.selectedZone, state: action });
});

document.getElementById('music-sources-container').addEventListener('dblclick', function (e) {
	function findFavoriteNode(currentNode) {
		// If we are at top level, abort.
		if (currentNode == this) return;
		if (currentNode.tagName == "LI") return currentNode;
		return findFavoriteNode(currentNode.parentNode);
	}
	var li = findFavoriteNode(e.target);
	EventActions.sendToSonosService('play-favorite', {uuid: Sonos.currentState.selectedZone, favorite: li.dataset.title});
});

document.getElementById('status-container').addEventListener('dblclick', function (e) {
	function findQueueNode(currentNode) {
		// If we are at top level, abort.
		if (currentNode == this) return;
		if (currentNode.tagName == "LI") return currentNode;
		return findQueueNode(currentNode.parentNode);
	}
	var li = findQueueNode(e.target);
	if (!li) return;
	EventActions.sendToSonosService('seek', {uuid: Sonos.currentState.selectedZone, trackNo: li.dataset.trackNo});
});

document.getElementById('position-info').addEventListener('click', function (e) {
	function findActionNode(currentNode) {
		if (currentNode == this) return;
		if (currentNode.className == "playback-mode") return currentNode;
		return findActionNode(currentNode.parentNode);
	}

	var actionNode = findActionNode(e.target);
	if (!actionNode) return;

	var action = actionNode.id;
	var data = {};
	var state = /off/.test(actionNode.src) ? true : false;
	data[action] = state;

	var selectedZone = Sonos.currentZoneCoordinator();
	// set this directly for instant feedback
	selectedZone.state.playMode[action] = state;
	// updateCurrentStatus();
	EventActions.sendToSonosService('playmode', {uuid: Sonos.currentState.selectedZone, state: data});

});

document.getElementById('player-volumes-container').addEventListener('click', function (e) {
	var muteButton = e.target;
	if (!muteButton.classList.contains('mute-button')) return;



	// this is a mute button, go.
	var player = Sonos.players[muteButton.dataset.id];
	var state = !player.state.mute;
	EventActions.sendToSonosService('mute', {uuid: player.uuid, mute: state});

	// update GUI
		// update
	if (state)
		muteButton.src = muteButton.src.replace(/_off\.svg/, '_on.svg');
	else
		muteButton.src = muteButton.src.replace(/_on\.svg/, '_off.svg');

});

document.getElementById("current-track-art").addEventListener('load', function (e) {
	// new image loaded. update favicon
	// This prevents duplicate requests!
	var oldFavicon = document.getElementById("favicon");
	var newFavicon = oldFavicon.cloneNode();
	newFavicon.href = this.src;
	newFavicon.type = "image/png";
	oldFavicon.parentNode.replaceChild(newFavicon, oldFavicon);

});

var searchTimer = null;
// document.getElementById('searchfield').addEventListener('keyup', function (e) {
// 	if (searchTimer) clearTimeout(searchTimer);
// 	var searchTerm = this.value;
// 	searchTimer = setTimeout(function () {
// 		EventActions.sendToSonosService('search', { type: 'localIndex', term: searchTerm });
// 	}, 500);
// });