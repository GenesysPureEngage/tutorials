const WorkspaceApi = require('genesys-workspace-client-js');
const argv = require('yargs').argv;

if(!argv.destination) {
	console.log("This tutorial requires input param: 'destination'");
	process.exit();
}

//region Create the api object
//Create the api object passing the parsed command line arguments.
let api = new WorkspaceApi(argv);
//endregion

async function main() {
	try {
    	var parentCall;
    	var consultCall;
    	var initiatingTransfer = false;
    	var completingTransfer = false;
    	var actionsCompleted = 0;
    	//region Register event handler
    	//Register event handler to get notifications of call state changes.
    	api.on('CallStateChanged', async msg => {
    		
    		try {
    			let call = msg.call;
    			if(!initiatingTransfer) {
					if(!parentCall && call.state == 'Established') {
						parentCall = call;
						console.log(`Found established call: [${call.id}]`);
						console.log('Initiating Transfer...');
						initiatingTransfer = true;
						const response = await api.voice.initiateTransfer(call.id, argv.destination + '');
					}
    			} else {
					if(call.state == 'Held' && call.id == parentCall.id) {
						console.log(`Held call: [${call.id}]`);
					}
					if(call.state == 'Dialing') {
						console.log(`Calling consultant: [${call.id}]`);
						consultCall = call;
					}
					if(consultCall) 
						if(call.state == 'Established' && call.id == consultCall.id) {
							console.log(`Consult call answered: [${call.id}]]`);
							console.log('Completing transfer...');
							completingTransfer = true;
							await api.voice.completeTransfer(consultCall.id, parentCall.id);
						}
    			}
    			
    			if(completingTransfer) {
    				if(call.state == 'Released' && call.id == consultCall.id) {
    					console.log(`Consult call released: [${call.id}]`);
    					
    					actionsCompleted ++;
    				}
    				if(call.state == 'Released' && call.id == parentCall.id) {
    					console.log(`Parent call released: [${call.id}]`);
    					
    					actionsCompleted ++;
    				}
    				if(actionsCompleted == 2) {
    					console.log('Transfer complete');
    					console.log('done');
    					await api.destroy();
    				}
    			}
    			
    		} catch(err) {
    			console.error(err);
    			api.destroy();
    		}
    	});
    	//endregion
    	
    	//region Initiaize the API and activate channels
		//Initialize the API and activate channels
		console.log('Initializing API...');
		await api.initialize();
		console.log('Activating channels...');
		await api.activateChannels(api.user.employeeId, api.user.agentLogin);
		
		//region Wait for an established call
		//The tutorial waits for an established call so it can initiate transfer
		console.log('Waiting for an established call...');
		
	} catch(err) {
		console.error(err);
		api.destroy();
	}
	
	
	
}

main();