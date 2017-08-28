const WorkspaceApi = require('genesys-workspace-client-js');
const argv = require('yargs').argv;

if(!argv.searchTerm) {
	console.log("This tutorial requires argument: 'searchTerm'");
	process.exit();
}

//region Create the api object
//Create the api object passing the parsed command line arguments.
let api = new WorkspaceApi(argv.apiKey, argv.baseUrl, argv.debugEnabled);
//endregion

async function main() {
	try {
    	
		const code = await getAuthCode();
        //region Initiaize the API and activate channels
        //Initialize the API and activate channels
        console.log('Initializing API...');
        await api.initialize({code: code, redirectUri: 'http://localhost'});
		console.log('Activating channels...');
		await api.activateChannels(api.user.employeeId, api.user.agentLogin);
    	//endregion
    	
    	//region Searching for Targets
    	//Getting targets with the specified searchTerm using the API.
    	const targets = await api.targets.search(argv.searchTerm);
    	//endregion
    	
    	if(targets.length == 0) {
    		throw 'Search came up empty';
    		
    	} else {
    		//region Printing the userNames.
    		//Printing the userNames of the targets found and then printing the userName of the first target.
    		console.log(`Found targets: [${targets.map(t => t.userName).join()}]`);
    		console.log(`Calling target: ${targets[0].userName}`);
    		//endregion
    		
    		//region Getting phone number
    		//Getting the phone number of the first target if it exists, if not we throw an error.
    		let phoneNumber;
    		try {
    			phoneNumber = targets[0].availability.channels[0].phoneNumber;
    		} catch(err) {
    			throw 'No Phone Number';
    		}
    		//endregion
    		
    		//region Calling Number
    		//Printing the phone number found and them using the API to call that number
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

async function getAuthCode() {
	
	let requestOptions = {
	  url: `${argv.baseUrl}/auth/v3/oauth/authorize?response_type=code&client_id=${argv.clientId}&redirect_uri=http://localhost`,
	  headers: {
		'authorization':  'Basic ' + new Buffer(`${argv.username}:${argv.password}`).toString('base64'),
		'x-api-key': argv.apiKey
	  },
	  resolveWithFullResponse: true,
	  simple: false,
	  followRedirect: false
	}

	let response = await require('request-promise-native')(requestOptions);
	if (!response.headers['location']) {
	  throw {error: 'No Location Header', response: response};
	}

	const location = require('url').parse(response.headers['location'], true);
	let code = location.query.code;
	if(argv.debugEnabled == 'true') console.log(`Auth code is [${code}]...`);

	return code;
}

main();