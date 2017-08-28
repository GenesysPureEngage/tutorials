const WorkspaceApi = require('genesys-workspace-client-js');
const argv = require('yargs').argv;

//region Create the api object
//Create the api object passing the parsed command line arguments.
let api = new WorkspaceApi(argv.baseUrl, argv.apiKey, argv.debugEnabled);
let callHasBeenHeld = false;
//endregion

async function main() {
    try {
    	
        //region Register event handlers
        //Register event handlers to get notifications of call and dn state changes and implement the automated sequence
        api.on('CallStateChanged', async msg => {
            let call = msg.call;
            
            switch (call.state) {
                //region Answer call
                //When a ringing call is detected, answer it.
                case 'Ringing':
                    console.log('Answering call...');
                    await api.voice.answerCall(call.id);
                    break;
                //endregion
                //region Handle established state
                //The first time we see an established call it will be placed on hold. The second time, it is released.
                case 'Established':
                    if (!callHasBeenHeld) {
                        console.log('Placing call on hold...');
                        await api.voice.holdCall(call.id);
                        callHasBeenHeld = true;
                    } else {
                        console.log('Releasing call...');
                        await api.voice.releaseCall(call.id);
                    }
                    break;
                //endregion
                //region Handle held call
                //When we see a held call, retrieve it
                case 'Held':
                    console.log('Retrieving call...');
                    await api.voice.retrieveCall(call.id);
                    break;
                //endregion
                //region Handle released
                //When we see a released call, set the agent state to ACW
                case 'Released':
                    console.log('Setting agent notReady w/ ACW...');
                    await api.voice.notReady('AfterCallWork');
                    break;
                //endregion
            }
        });
		
        api.on('DnStateChanged', async msg => {
            let dn = msg.dn;
            //region Handle DN state change
            //When the DN workMode changes to AfterCallWork the sequence is over and we can exit.
            console.log(`Dn updated - number [${dn.number}] state [${dn.agentState}] workMode [${dn.agentWorkMode}]...`);
            if (dn.agentWorkMode === 'AfterCallWork') {
            	console.log('done');
                await api.destroy();
            }
            //endregion
        });
        //endregion
		const code = await getAuthCode();
        //region Initiaize the API and activate channels
        //Initialize the API and activate channels
        console.log('Initializing API...');
        await api.initialize({code: code, redirectUri: 'http://localhost'});
        console.log('Activating channels...');
        await api.activateChannels(api.user.employeeId, api.user.agentLogin);
	
        //region Wait for an inbound call
        //The tutorial waits and reacts to an inbound call to perform the automated sequence.
        console.log('Waiting for an inbound call...');
        //endregion
    } catch (e) {
    	console.error(e);
        await api.destroy();
    }
}

async function getAuthCode() {
	console.log('getting auth code');
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
