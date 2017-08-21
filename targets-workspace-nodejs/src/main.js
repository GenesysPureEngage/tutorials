const WorkspaceApi = require('genesys-workspace-client-js');
const argv = require('yargs').argv;

if(!argv.searchTerm) {
	console.log("This tutorial requires input param: 'searchTerm'");
	process.exit();
}

//region Create the api object
//Create the api object passing the parsed command line arguments.
let api = new WorkspaceApi(argv);
//endregion

async function main() {
	try {
    	
    	//region Initiaize the API and activate channels
		//Initialize the API and activate channels
		console.log('Initializing API...');
		await api.initialize();
		console.log('Activating channels...');
		await api.activateChannels(api.user.employeeId, api.user.agentLogin);
    	//endregion
    	
    	//region Searching for Targets
    	//Getting targets using the API.
    	const targets = await api.targets.search(argv.searchTerm);
    	//endregion
    	
    	if(targets.length == 0) {
    		throw 'Search came up empty';
    		
    	} else {
    		//region Calling Target
    		//Calling the first targets in the search if it has a phone number.
    		console.log(`Found targets: [${targets.map(t => t.userName).join()}]`);
    		console.log(`Calling target: ${targets[0].userName}`);
    		
    		let phoneNumber;
    		try {
    			phoneNumber = targets[0].availability.channels[0].phoneNumber;
    		} catch(err) {
    			throw 'No Phone Number';
    		}
    		
    		
    		console.log(`Calling number: [${phoneNumber}]...`);
    		
    		await api.voice.makeCall(phoneNumber);
    		
    		console.log('done');
    		api.destroy();
    		//endregion
    	}
    	
    	
	} catch(err) {
		console.error(err);
		api.destroy();
	}
}

main();