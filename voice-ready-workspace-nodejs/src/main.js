const WorkspaceApi = require('genesys-workspace-client-js');
const argv = require('yargs').argv;

//region Create the api object
//Create the api object passing the parsed command line arguments.
let api = new WorkspaceApi(argv);
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
		
		//region Initiaize the API and activate channels
		//Initialize the API and activate channels
		console.log('Initializing API...');
		await api.initialize();
		console.log('Activating channels...');
		await api.activateChannels(api.user.employeeId, api.user.agentLogin);
		//endregion
	} catch(err) {
		await api.destroy();
	}
}

main();