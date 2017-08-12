'use strict';

var sonosService = {
    start: function(){
        webOS.service.request("luna://de.haagwebsites.lgsonoscontroller.sonoscommunicationservice/", {
            method:"sonosService",
            parameters: {},
            onSuccess: function(inResponse) {
                console.log("Success: "+JSON.stringify(inResponse));
                serviceEventHandler.handleMessage(inResponse.message, inResponse.payload);
            },
            onResponse: function(inResponse) {
                console.log("Response: "+inResponse);
            },
            onFailure: function(inError) {
                console.log("Failure2: "+inError.errorText);
            },
            onComplete: function(inResponse) {
                console.log("Complete: "+JSON.stringify(inResponse));
            },
            subscribe: true,
            resubscribe: true
        });
    },

    sendMessage: function(message, payload){
        webOS.service.request("luna://de.haagwebsites.lgsonoscontroller.sonoscommunicationservice/", {
            method:"messageService",
            parameters: {"message": message, "payload": payload},
            onSuccess: function(inResponse) {
                console.log("Success: "+JSON.stringify(inResponse));
            },
            onResponse: function(inResponse) {
                console.log("Response: "+inResponse);
            },
            onFailure: function(inError) {
                console.log("Failure: "+inError.errorText);
            },
            onComplete: function(inResponse) {
                console.log("Complete: "+JSON.stringify(inResponse));
            },
            subscribe: false,
            resubscribe: false
        });
    }
};

sonosService.start();