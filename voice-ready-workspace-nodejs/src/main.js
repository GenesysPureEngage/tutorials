const WorkspaceApi = require('genesys-workspace-client-js');
const argv = require('yargs').argv;

//region Create the api object
//Create the api object passing the parsed command line arguments.
let api = new WorkspaceApi(argv.apiKey, argv.baseUrl, argv.debugEnabled);
//endregion

async function main() {
	try {
		//region Register event handlers
   	    //Register event handlers to get notifications of call and dn state changes and implement the automated sequence
		api.on('DnStateChanged', async msg => {
			
			let dn = msg.dn;
			switch (dn.agentState) {
				//region 'Ready'
				//If the agent state is ready then the program is done.
				case 'Ready':
					console.log("Agent state is 'Ready'");
					console.log('done');
					await api.destroy();
					break;
				//endregion
				//region 'NotReady'
				//If the agent state is 'NotReady' then we set it to 'Ready'.
				case 'NotReady':
					console.log("Setting agent state to 'Ready'...");
					await api.voice.ready();
				//endregion
			}
		});
		//endregion
		const code = await getAuthCode();
        //region Initiaize the API and activate channels
        //Initialize the API and activate channels
        console.log('Initializing API...');
        await api.initialize({code: code, redirectUri: 'http://localhost'});
		console.log('Activating channels...');
		await api.activateChannels(api.user.employeeId, api.user.agentLogin);
		//endregion
	} catch(err) {
		await api.destroy();
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