const workspace = require('genesys-workspace-client-js');
const auth = require('genesys-authorization-client-js');
const url = require('url');
const cometDLib = require('cometd');
require('cometd-nodejs-client').adapt();

//Usage: <apiKey> <clientId> <clientSecret> <apiUrl> <agentUsername> <agentPassword>
const argv = process.argv.slice(2);
const apiKey = argv[0];
const clientId = argv[1];
const clientSecret = argv[2];
const apiUrl = argv[3];
const username = argv[4];
const password = argv[5];

const workspaceUrl = `${apiUrl}/workspace/v3`;
const authUrl = `${apiUrl}`;


async function main() {
	
	//region Initialize API Client
	//Create and setup ApiClient instance with your ApiKey and Workspace API URL.
	const workspaceClient = new workspace.ApiClient();
	workspaceClient.basePath = workspaceUrl;
	workspaceClient.defaultHeaders = { 'x-api-key': apiKey };
	workspaceClient.enableCookies = true;

	const authClient = new auth.ApiClient();
	authClient.basePath = authUrl;
	authClient.defaultHeaders = { 'x-api-key': apiKey };

	//region Create SessionApi and VoiceApi instances
	//Creating instances of SessionApi and VoiceApi using the ApiClient.
	const sessionApi = new workspace.SessionApi(workspaceClient);
	const voiceApi = new workspace.VoiceApi(workspaceClient);

	//region Create AuthenticationApi instance
	//Create instance of AuthenticationApi using the authorization ApiClient which will be used to retrieve access token.
	const authApi = new auth.AuthenticationApi(authClient); 
	
	let cometD;
	let loggedIn = false;
	
	try {
		//region Oauth2 Authentication
		//Performing Oauth 2.0 authentication.
		console.log("Retrieving access token...");
		const authorization = "Basic " + new String(new Buffer(clientId + ":" + clientSecret).toString("base64"));
		
		let resp = await authApi.retrieveToken("password", "openid", {
			clientId: clientId,
			username: username,
			password: password,
			authorization: authorization
		});
		
		if(!resp["access_token"]) {
			console.error("No access token");
		
		} else {
		
			console.log("Retrieved access token");
			console.log("Initializing workspace...");
	
			resp = await sessionApi.initializeWorkspaceWithHttpInfo({"authorization": "Bearer " + resp["access_token"]});
			
			//region Getting Session ID
			//If the initialize-workspace call is successful, the it will return the workspace session ID as a cookie.
			//We still must wait for 'InitializeWorkspaceComplete' cometD event in order to get user data for the user we are loggin in.
			if(resp.data.status.code == 1) {
				const sessionCookie = resp.response.header["set-cookie"].find(v => v.startsWith("WORKSPACE_SESSIONID"));
				workspaceClient.defaultHeaders["Cookie"] = sessionCookie;
				console.log("Got workspace session id");
				loggedIn = true;
				//region CometD
				//Now that we have our workspace session ID we can start cometD and get initialization event.
				cometD = await startCometD(workspaceUrl, apiKey, sessionCookie);
				
				const user = await waitForInitializeWorkspaceComplete(cometD);
				
				await startHandlingVoiceEvents(cometD, sessionApi, voiceApi);
				//region Activating Channels
				//Once we have subscribed to voice events we can activate channels.
				
				console.log("Activating channels...");
				await sessionApi.activateChannels({
					data: {
						agentId: user.employeeId,
						dn: user.agentLogin
					}
				});
				//endregion
				
			} else {
				console.error("Error initializing workspace");
				console.error("Code: " + resp.data.status.code);
			}
			
		}
		
	} catch(err) {
		if(err.response) console.log(err.response.text);
		else console.log(err);
		
		if(loggedIn) {
			await disconnectAndLogout(cometD, sessionApi);
		}
	}
}

function startCometD(workspaceUrl, apiKey, sessionCookie) {
	return new Promise((resolve, reject) => {
		//region Setting up CometD
		//Setting up cometD making sure api key and session cookie are included in requests.
		const cometD = new cometDLib.CometD();
	
		const hostname = url.parse(workspaceUrl).hostname;
		const transport = cometD.findTransport('long-polling');
		transport.context = {
			cookieStore: {
				[hostname]: [sessionCookie]
			}
		};
	
		cometD.configure({
			url: workspaceUrl + "/notifications",
			requestHeaders: {
				"x-api-key": apiKey,
				"Cookie": sessionCookie
			}
		});
		//region CometD Handshake
		//Perform handshek to start cometD. Once the handshake is successful we can subscribe to channels.
		console.log("CometD Handshake...");
		cometD.handshake((reply) => {
			if(reply.successful) {
				console.log("Handshake successful");
				resolve(cometD);
			
			} else {
				console.error("Handshake unsuccessful");
				reject();
			}
		});
		//endregion
	});
}

function waitForInitializeWorkspaceComplete(cometD, callback) {
	return new Promise((resolve, reject) => {
		console.log("Subscribing to Initilaization channel...");
		//region Subscribe to Initialization Channel
		//Once the handshake is successful we can subscribe to a CometD channels to get events. 
		//Here we subscribe to initialization channel to get 'WorkspaceInitializationComplete' event.
		cometD.subscribe("/workspace/v3/initialization", (message) => {
			if(message.data.state == "Complete") {
				resolve(message.data.data.user);
			}
		}, (reply) => {
			if(reply.successful) {
				console.log("Initialization subscription succesful");
			} else {
				console.error("Subscription unsuccessful");
				reject();
			}
	
		});
	});
}


function startHandlingVoiceEvents(cometD, sessionApi, voiceApi) {
	return new Promise((resolve, reject) => {
		console.log("Subscribing to Voice channel...");
	
		//region Subscribing to Voice Channel
		//Here we subscribe to voice channel so we can handle voice events.
	
		cometD.subscribe("/workspace/v3/voice", makeVoiceEventHandler(cometD, sessionApi, voiceApi) , (reply) => {
			if(reply.successful) {
				console.log("Voice subscription succesful");
				resolve();
			} else {
				console.error("Subscription unsuccessful");
				reject(err);
			}
	
		});
		
		//endregion
	});
}

function makeVoiceEventHandler(cometD, sessionApi, voiceApi) {
	var hasActivatedChannels = false;
	var hasHeld = false;
	return async (message) => {
	 	try {
			if(message.data.messageType == "CallStateChanged") {
				const callState = message.data.call.state;
				const callId = message.data.call.id;
				const capabilities = message.data.call.capabilities;
	
				if(callState == "Ringing") {
					//region Ringing
					//If the call state is changed to 'Ringing' this means there is an incoming call and we can answer it.
					console.log("Received call");
					console.log("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
		
					console.log("Answering...");
					await answerCall(voiceApi, callId);
					//endregion
				} else if(callState == "Established") {
					//region Established
					//When the call state is 'Established' this means that the call is in progress. The state is set to 'Established' both when the call is first answered and when the call is retrieved after holding so we must specify which scenario is taking place by setting the 'hasHeld' variable to true after the call has been held.
					if(!hasHeld) {
						console.log("Answered");
						console.log("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
			
						console.log("Holding...");
						await holdCall(voiceApi, callId);
						hasHeld = true;
					} else {
						console.log("Retrieved");
						console.log("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
			
						console.log("Releasing...");
						await releaseCall(voiceApi, callId);
					}
					//endregion
		
				} else if(callState == "Held") {
					//region Held
					//The call state is changed to 'Held' when we hold the call. Now we can retrieve the call when we're ready.
					console.log("Held");
					console.log("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
		
					console.log("Retrieving...");
					await retrieveCall(voiceApi, callId);
					//endregion
		
				}  else if(callState == "Released") {
					//region Released
					//The call state is changed to 'Released' when the call is ended. Now we can make the agent 'NotReady' and change their work mode to 'AfterCallWork'.
					console.log("Released");
		
					console.log("Setting agent state to not ready...");
					await makeAgentNotReadyAfterCall(voiceApi);
					//endregion
				}
			} else if(message.data.messageType == "DnStateChanged") {
	
				if(!hasActivatedChannels) {
					if(message.data.dn.agentState == "NotReady" || message.data.dn.agentState == "Ready") {
						console.log("Channels activated");
						console.log("Waiting for incoming calls...");
			
						hasActivatedChannels = true;
					}
				} else if(message.data.dn.agentState == "NotReady" && message.data.dn.agentWorkMode == "AfterCallWork") {
					console.log("Agent state set to 'NotReady'");
					//region Finishing up
					//Now that the call has been handled to program is done so you can disconnect CometD and logout.
				
					await disconnectAndLogout(cometD, sessionApi);
					console.log("done");
					//endregion
				}
			}
		} catch(err) {
			if(err.response) console.error(err.response.text);
			else console.error(err);
			
			disconnectAndLogout(cometD, sessionApi);
		}
	};
		
}

function answerCall(voiceApi, callId) {
	//region Answering Call
    //Answering call using voice api and call id.
	return voiceApi.answer(callId);
	//endregion
}

function holdCall(voiceApi, callId) {
	//region Holding Call
    //Holding call using voice api and call id.
	return voiceApi.hold(callId);
	//endregion
}

function retrieveCall(voiceApi, callId) {
	//region Retrieving Call
    //Retrieving call using voice api and call id.
	return voiceApi.retrieve(callId);
	//endregion
}

function releaseCall(voiceApi, callId) {
	//region Releasing Call
    //Releasing call using voice api and call id.
	return voiceApi.release(callId);
	//endregion
}

function makeAgentNotReadyAfterCall(voiceApi, errorCallback) {
	//region Making Agent NotReady and Setting Agent Work Mode
	//Setting agent state to 'NotReady' using the voice api and specifying the agent's work mode using the agent work mode enum.
	return voiceApi.setAgentStateNotReady({
		notReadyData: {
			data: {
				agentWorkMode: workspace.VoicenotreadyData.AgentWorkModeEnum.AfterCallWork
			}
		}
	});
	//endregion
}

async function disconnectAndLogout(cometD, sessionApi) {
	//region Disconnect CometD and Logout Workspace
	//Disconnecting cometD and ending out workspace session.
	if(cometD) {
		await new Promise((resolve, reject) => {
			cometD.disconnect((reply) => {
				if(reply.successful) {
					resolve();
				} else {
					reject();
				}
			});
		});
	}
	
	try {
		await sessionApi.logout();
	} catch(err) {
		console.error("Could not log out");
		process.exit(1);
	}
	//endregion
}

main();