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
	
	//region Making Voice Handler
	//Here we handle different cometD messages.
	//In order to specify why certain CometD events are taking place it is necessary to store some information about what has happened.
	var hasActivatedChannels = false;
	var hasCalledAlternate = false;
	
	var establishedCallConnId = null;
	var heldCallConnId = null;
	var actionsCompleted = 0;
	
	return async (message) => {
		 try {
			 if(message.data.messageType == "CallStateChanged") {
				const callState = message.data.call.state;
				const callId = message.data.call.id;
				const capabilities = message.data.call.capabilities;
			
				if(callState == "Established") {
					//region Established
					//When the call state is 'Established' this means that the call is in progress.
					//This event is used both to find established calls when the program starts and to signal that a call has been retrieved as a result of alternating. 
					if(establishedCallConnId == null) {
						console.log("Found established call: " + callId);
						establishedCallConnId = callId;
					}
			
					if(callId == heldCallConnId) {
						console.log("Retrieved");
						console.log("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
					}
		
					//endregion
				} else if(callState == "Held") {
					//region Held
					//This event is used both to find held calls when the program starts and signal that a call has been held as a result of alternating.
					if(heldCallConnId == null) {
						console.log("Found held call: " + callId);
						heldCallConnId = callId;
						if(heldCallConnId == establishedCallConnId) {
							establishedCallConnId = null;
							console.log("(Established call is now held, still waiting for established call)");
						}
					}
		
					if(callId == establishedCallConnId) { 
						console.log("Held");
						console.log("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
					}
					//endregion
				}  else if(callState == "Released") {
					//region Released
					//The call state is changed to 'Released' when the call is ended.
					console.log("Released");
					//endregion
				}
			
				//region Check for Held and Established Calls
				//Check if held and established calls have been found.
				//If so, alternate between them.
				if(establishedCallConnId != null && heldCallConnId != null && !hasCalledAlternate) {
					console.log("Alternating calls...");
					await alternateCalls(voiceApi, establishedCallConnId, heldCallConnId);
					hasCalledAlternate = true;
				}
			
				//region Check for Actions Completed
				//Check if this event corresponds to one of the two events that should be triggered by alternating.
				//If both actions are completed then finish the program.
				if(callState == "Established" && callId == heldCallConnId ||
				   callState == "Held" && callId == establishedCallConnId) {
			
					actionsCompleted ++;
			
					if(actionsCompleted == 2) {
						console.log("Alternated calls");
						//region Finishing up
						//Now that the server is done alternating calls we can disconnect CometD and logout.
						
						await disconnectAndLogout(cometD, sessionApi);
						console.log("done");
						//endregion
					}
				}
			
			} else if(message.data.messageType == "DnStateChanged") {
				const agentState = message.data.dn.agentState;
				if(!hasActivatedChannels) {
					if(agentState == "NotReady" || agentState == "Ready") {
						console.log("Channels activated");
						console.log("Looking for held and established calls...");
					
						hasActivatedChannels = true;
					}
				}
			}
		} catch(err) {
			if(err.response) console.error(err.response.text);
			else console.error(err);
			
			disconnectAndLogout(cometD, sessionApi);
		}
		
	};
}

function alternateCalls(voiceApi, callId, heldConnId) {
	//region Alternating Calls
	//Switch fron a the current call to a held call using the voice api.
	return voiceApi.alternate(callId, {
		data: {
			heldConnId: heldConnId
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