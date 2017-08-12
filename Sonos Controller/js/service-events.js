"use strict";

var serviceEventHandler = {
		
	handleMessage: function(message, payload){
		switch(message){
			case "topology-change":
				this.handleTopologyChange(payload);
				break;
			case "transport-state":
				this.handleTransportState(payload);
				break;
			case "group-volume":
				this.handleGroupVolume(payload);
				break;
			case "volume":
				this.handleVolume(payload);
				break;
			case "group-mute":
				this.handleGroupMute(payload);
				break;
			case "mute":
				this.handleMute(payload);
				break;
			case "favorites":
				this.handleFavorites(payload);
				break;
			case "queue":
				this.handleQueue(payload);
				break;
			case "search-result":
				this.handleSearchResult(payload);
				break;
		}
	},
	
	handleTopologyChange: function (data) {
		Sonos.grouping = {};
		var stateTime = new Date().valueOf();
		var shouldRenderVolumes = false;
		data.forEach(function (player) {
			player.stateTime = stateTime;
			Sonos.players[player.uuid] = player;
			if (!Sonos.grouping[player.coordinator]) Sonos.grouping[player.coordinator] = [];
			Sonos.grouping[player.coordinator].push(player.uuid);
		});
	
		// If the selected group dissappeared, select a new one.
		if (!Sonos.grouping[Sonos.currentState.selectedZone]) {
			// just get first zone available
			for (var uuid in Sonos.grouping) {
				Sonos.currentState.selectedZone = uuid;
				break;
			}
			// we need queue as well!
			EventActions.sendToSonosService('queue', {uuid:Sonos.currentState.selectedZone});
			shouldRenderVolumes = true;
		}
	
		if (EventActions.topologyChanged instanceof Function) EventActions.topologyChanged(shouldRenderVolumes);
	},
	
	handleTransportState: function (player) {
		player.stateTime = new Date().valueOf();
		Sonos.players[player.uuid] = player;
	
		if (EventActions.transportStateChanged instanceof Function) EventActions.transportStateChanged(player);
	
	},
	
	handleGroupVolume: function (data) {
		if (EventActions.groupVolumeChanged instanceof Function) EventActions.groupVolumeChanged(data);
	},
	
	handleVolume: function (data) {
		if (EventActions.volumeChanged instanceof Function) EventActions.volumeChanged(data);
	},
	
	handleGroupMute: function (data) {
		Sonos.players[data.uuid].groupState.mute = data.newMute;
		if (EventActions.groupMuteChanged instanceof Function) EventActions.groupMuteChanged(data);
	},
	
	handleMute: function (data) {
		if (EventActions.muteChanged instanceof Function) EventActions.muteChanged(data);
	},
	
	handleFavorites: function (data) {
		if (EventActions.favoritesChanged instanceof Function) EventActions.favoritesChanged(data);
	},
	
	handleQueue: function (data) {
		if (EventActions.queueChanged instanceof Function) EventActions.queueChanged(data);
	},
	
	handleSearchResult: function (data) {
		if (EventActions.searchResultReceived instanceof Function) EventActions.searchResultReceived(data);
	}
};
