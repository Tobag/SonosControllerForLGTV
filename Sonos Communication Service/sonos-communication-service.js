require("babel-polyfill");

process.on('uncaughtException', function(err) {
  console.log('Caught exception: ' + err);
});

var pkgInfo = require('./package.json');
var Service = require('webos-service');

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var async = require('async');
var SonosDiscovery = require('sonos-discovery');

var service = new Service(pkgInfo.name);
service.activityManager.idleTimeout = 1500;


var initialized = false;
var queues = [];
var discovery = null;

service.register("messageService", function (evt) {
    try {
    	var data = evt.payload.payload;
    	switch(evt.payload.message) {
            case "transport-state":
                clientEventHandler.handleTransportState(data);
                break;
            case "group-volume":
                clientEventHandler.handleGroupVolume(data);
                break;
            case "group-management":
                clientEventHandler.handleGroupManagement(data);
                break;
            case "group-mute":
                clientEventHandler.handleGroupMute(data);
                break;
            case "mute":
                clientEventHandler.handleMute(data);
                break;
            case "play-favorite":
                clientEventHandler.handlePlayFavorite(data);
                break;
            case "queue":
                clientEventHandler.handleQueue(data);
                break;
            case "seek":
                clientEventHandler.handleSeek(data);
                break;
            case "playmode":
                clientEventHandler.handlePlaymode(data);
                break;
            case "volume":
                clientEventHandler.handleVolume(data);
                break;
            case "track-seek":
                clientEventHandler.handleTrackSeek(data);
                break;
            case "search":
                clientEventHandler.handleSearch(data);
                break;
            case "error":
                clientEventHandler.handleError(data);
                break;
        }
    } catch (whatever) {
        console.log(whatever);
    }
});


var clientEventHandler = {
    handleTransportState: function (data) {
        // find player based on uuid
        var player = discovery.getPlayerByUUID(data.uuid);

        if (!player) return;

        // invoke action
        //console.log(data)
        player[data.state]();
    },

	handleGroupVolume: function (data) {
		// find player based on uuid
		var player = discovery.getPlayerByUUID(data.uuid);
		if (!player) return;

		// invoke action
		player.setGroupVolume(data.volume);
	},

	handleGroupManagement: function (data) {
		// find player based on uuid
		console.log(data);
		var player = discovery.getPlayerByUUID(data.player);
		if (!player) return;

		if (data.group == null) {
			player.becomeCoordinatorOfStandaloneGroup();
			return;
		}

		player.setAVTransport('x-rincon:${data.group}');
	},

	handlePlayFavorite: function (data) {
		var player = discovery.getPlayerByUUID(data.uuid);
		if (!player) return;

		player.replaceWithFavorite(data.favorite).then(function () {
			player.play();
		});
	},

	handleQueue: function (data) {
		loadQueue(data.uuid).then(function (queue) {
			socket.emit('queue', { uuid: data.uuid, queue: queue });
		});
	},

	handleSeek: function (data) {
		var player = discovery.getPlayerByUUID(data.uuid);
		if (player.avTransportUri.startsWith('x-rincon-queue')) {
			player.trackSeek(data.trackNo);
			return;
		}

		// Player is not using queue, so start queue first
		player.setAVTransport('x-rincon-queue:' + player.uuid + '#0').then(function () {
			player.trackSeek(data.trackNo);
		}).then(function () {
			player.play();
		});
	},

	handlePlaymode: function (data) {
		var player = discovery.getPlayerByUUID(data.uuid);
		for (var action in data.state) {
			player[action](data.state[action]);
		}
	},

	handleVolume: function (data) {
		var player = discovery.getPlayerByUUID(data.uuid);
		player.setVolume(data.volume);
	},

	handleGroupMute: function (data) {
		console.log(data);
		var player = discovery.getPlayerByUUID(data.uuid);
		if (data.mute) player.muteGroup();else player.unMuteGroup();
	},

	handleMute: function (data) {
		var player = discovery.getPlayerByUUID(data.uuid);
		if (data.mute) player.mute();else player.unMute();
	},

	handleTrackSeek: function (data) {
		var player = discovery.getPlayerByUUID(data.uuid);
		player.timeSeek(data.elapsed);
	},

	handleSearch: function (data) {
		search(data.term, socket);
	},

	handleError: function (e) {
		console.error(e);
	}
};



function loadQueue(uuid) {
		if (queues[uuid]) {
				return Promise.resolve(queues[uuid]);
		}

		var player = discovery.getPlayerByUUID(uuid);
		return player.getQueue().then(function (queue) {
				queues[uuid] = queue;
				return queue;
		});
}

function search(term, socket) {
		console.log('search for', term);
		var playerCycle = 0;
		var players = [];

		for (var i in discovery.players) {
				players.push(discovery.players[i]);
		}

		function getPlayer() {
				var player = players[playerCycle++ % players.length];
				return player;
		}

		var response = {};

		async.parallelLimit([function (callback) {
				var player = getPlayer();
				console.log('fetching from', player.address);
				player.browse('A:ARTIST:' + term, 0, 600, function (success, result) {
						console.log(success, result);
						response.byArtist = result;
						callback(null, 'artist');
				});
		}, function (callback) {
				var player = getPlayer();
				console.log('fetching from', player.address);
				player.browse('A:TRACKS:' + term, 0, 600, function (success, result) {
						response.byTrack = result;
						callback(null, 'track');
				});
		}, function (callback) {
				var player = getPlayer();
				console.log('fetching from', player.address);
				player.browse('A:ALBUM:' + term, 0, 600, function (success, result) {
						response.byAlbum = result;
						callback(null, 'album');
				});
		}], players.length, function (err, result) {

				socket.emit('search-result', response);
		});
}

// a method that always returns the same value
function initSonosService () {
	try {
		var settings = {
				port: 8080,
				cacheDir: './cache'
		};

		discovery = new SonosDiscovery(settings);

		var cacheDir = path.resolve(__dirname, settings.cacheDir);
		var missingAlbumArt = path.resolve(__dirname, './lib/browse_missing_album_art.png');

		var queues = {};

		fs.mkdir(cacheDir, function (e) {
				if (e && e.code != 'EEXIST') console.log('creating cache dir failed!', e);
		});
		

		discovery.on('topology-change', function (data) {
				sendMessageToClient('topology-change', discovery.players);
		});

		discovery.on('transport-state', function (data) {
				sendMessageToClient('transport-state', data);
		});

		discovery.on('group-volume', function (data) {
				sendMessageToClient('group-volume', data);
		});

		discovery.on('volume-change', function (data) {
				sendMessageToClient('volume', data);
		});

		discovery.on('group-mute', function (data) {
				sendMessageToClient('group-mute', data);
		});

		discovery.on('mute-change', function (data) {
				sendMessageToClient('mute', data);
		});

		discovery.on('favorites', function (data) {
				sendMessageToClient('favorites', data);
		});

		discovery.on('queue-change', function (player) {
				handleQueueChange(player);
		});


	} catch (whatever) {
			console.log(whatever);
	}

}

function handleQueueChange(player){
    console.log('queue-changed', player.roomName);
    delete queues[player.uuid];
    loadQueue(player.uuid).then(function (queue) {
        sendMessageToClient('queue', { uuid: player.uuid, queue: queue });
    });
}

function sendMessageToClient(message, payload){
	var i=0;
	for (i=0; i<messageTokens.length; i++){
		var evt = {"message": message, "payload": payload};
		subscriptions[messageTokens[i]].respond(evt);
	}
}

var subscriptions = {};
var messageTokens = [];

var sonosService = service.register("sonosService");
sonosService.on("request", function(message) {
    message.respond({event: "Subscribed!"}); 
    if (message.isSubscription) { 
    	messageTokens.push(message.uniqueToken);
        subscriptions[message.uniqueToken] = message; //add message to "subscriptions" 
        if (!initialized) {
            var players = discovery.players;

            if (players.length == 0) return;

            sendMessageToClient('topology-change', players);
            discovery.getFavorites().then(function (favorites) {
                sendMessageToClient('favorites', favorites);
            });
        } 
    } 
}); 
sonosService.on("cancel", function(message) { 
    delete subscriptions[message.uniqueToken]; // remove message from "subscriptions" 
    var keys = Object.keys(subscriptions); 
    if (keys.length === 0) { // count the remaining subscriptions 
        console.log("no more subscriptions, canceling interval"); 
        clearInterval(interval); // don't do work in the background when there are no subscriptions 
        interval = undefined; 
    } 
});

initSonosService();
