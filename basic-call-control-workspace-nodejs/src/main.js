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

function main() {
	//region Initialize API Client
	//Create and setup ApiClient instance with your ApiKey and Workspace API URL.
	const workspaceClient = new workspace.ApiClient();
	workspaceClient.basePath = workspaceUrl;
	workspaceClient.defaultHeaders = { 'x-api-key': apiKey };

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


	//region Oauth2 Authentication
	//Performing Oauth 2.0 authentication.
	console.log("Retrieving access token...");

	const authorization = "Basic " + new String(new Buffer(clientId + ":" + clientSecret).toString("base64"));
	authApi.retrieveToken("password", "openid", {
		clientId: clientId,
		username: username,
		password: password,
		authorization: authorization
	}).then((resp) => {		
		if(!resp["access_token"]) {
			console.error("No access token");
		
		} else {
		
			console.log("Retrieved access token");
			console.log("Initializing workspace...");
	
			sessionApi.initializeWorkspaceWithHttpInfo({"authorization": "Bearer " + resp["access_token"]}).then((resp) => {
				//region Getting Session ID
				//If the initialize-workspace call is successful, the it will return the workspace session ID as a cookie.
				//We still must wait for 'InitializeWorkspaceComplete' cometD event in order to get user data for the user we are loggin in.
				if(resp.data.status.code == 1) {
					const sessionCookie = resp.response.header["set-cookie"].find(v => v.startsWith("WORKSPACE_SESSIONID"));
					workspaceClient.defaultHeaders["Cookie"] = sessionCookie;
					console.log("Got workspace session id");
				
					//region CometD
					//Now that we have our workspace session ID we can start cometD and get initialization event.
					startCometD(workspaceUrl, apiKey, sessionCookie, (cometD) => {
						
						waitForInitializeWorkspaceComplete(cometD, (user) => {
							
							startHandlingVoiceEvents(cometD, sessionApi, voiceApi, () => {
								
								console.log("Activating channels...");
								sessionApi.activateChannels({
									data: {
										agentId: user.employeeId,
										dn: user.agentLogin
									}
								}).then((resp) => {
									
								}).catch((err) => {
									console.error("Cannot activate channels");
									if(err.response.text) console.error(err.response.text);
									process.exit(1);
								});
							});
							
						});
						
					});
					//endregion
				} else {
					console.error("Cannot initialize workspace");
					console.error("Code: " + resp.data.status.code);
				}
			
			}).catch((err) => {
				console.error("Cannot initialize workspace");
				if(err.response.text) console.error(err.response.text);
			});
		}
	
	}).catch((err) => {
		console.error("Cannot get access token");
		console.error(err.response.text);
	});
}

function startCometD(workspaceUrl, apiKey, sessionCookie, callback) {
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
	//Once the handshake is successful we can subscribe to channels.
	console.log("CometD Handshake...");
	cometD.handshake((reply) => {
		if(reply.successful) {
			console.log("Handshake successful");
			callback(cometD);
			
		} else {
			console.error("Handshake unsuccessful");
		}
	});
	
	//endregion
}

function waitForInitializeWorkspaceComplete(cometD, callback) {
	console.log("Subscribing to Initilaization channel...");
	
	//region Subscribe to Initialization Channel
	//Once the handshake is successful we can subscribe to a CometD channels to get events. 
	//Here we subscribe to initialization channel to get 'WorkspaceInitializationComplete' event.
	cometD.subscribe("/workspace/v3/initialization", (message) => {
		if(message.data.state == "Complete") {
			callback(message.data.data.user);
		}
	}, (reply) => {
		if(reply.successful) {
			console.log("Initialization subscription succesful");
		} else {
			console.error("Subscription unsuccessful");
			if(err.response.text) console.error(err.response.text);
			process.exit(1);
		}
	
	});
		
}

function startHandlingVoiceEvents(cometD, sessionApi, voiceApi, callback) {
	console.log("Subscribing to Voice channel...");
	
	//region Handling Voice Events
	//Here we subscribe to voice channel and handle voice events.
	var hasActivatedChannels = false;
	var hasHeld = false;
	
	cometD.subscribe("/workspace/v3/voice", (message) => {
		 
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
				answerCall(voiceApi, callId, () => {
					disconnectAndLogout(cometD, sessionApi);
				});
				//endregion
			} else if(callState == "Established") {
				//region Established
				//When the call state is 'Established' this means that the call is in progress. The state is set to 'Established' both when the call is first answered and when the call is retrieved after holding so we must specify which scenario is taking place by setting the 'hasHeld' variable to true after the call has been held.
				if(!hasHeld) {
					console.log("Answered");
					console.log("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
					
					console.log("Holding...");
					holdCall(voiceApi, callId, () => {
						disconnectAndLogout(cometD, sessionApi);
					});
					hasHeld = true;
				} else {
					console.log("Retrieved");
					console.log("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
					
					console.log("Releasing...");
					releaseCall(voiceApi, callId, () => {
						disconnectAndLogout(cometD, sessionApi);
					});
				}
				//endregion
				
			} else if(callState == "Held") {
				//region Held
				//The call state is changed to 'Held' when we hold the call. Now we can retrieve the call when we're ready.
				console.log("Held");
				console.log("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
				
				console.log("Retrieving...");
				retrieveCall(voiceApi, callId, () => {
					disconnectAndLogout(cometD, sessionApi);
				});
				//endregion
				
			}  else if(callState == "Released") {
				//region Released
				//The call state is changed to 'Released' when the call is ended. Now we can make the agent 'NotReady' and change their work mode to 'AfterCallWork'.
				console.log("Released");
				
				console.log("Setting agent state to not ready...");
				makeAgentNotReadyAfterCall(voiceApi, () => {
					disconnectAndLogout(cometD, sessionApi);
				});
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
				console.log("done");
				disconnectAndLogout(cometD, sessionApi);
				
				//endregion
			}
		}
		
		
	}, (reply) => {
		if(reply.successful) {
			console.log("Voice subscription succesful");
			callback();
		} else {
			console.error("Subscription unsuccessful");
			if(err.response.text) console.error(err.response.text);
			disconnectAndLogout(cometD, sessionApi);
		}
	
	});
}

function answerCall(voiceApi, callId, errorCallback) {
	//region Answering Call
    //Answering call using voice api and call id.
	voiceApi.answer(callId).then((resp) => {
		
	}).catch((err) => {
		console.error("Cannot answer call");
		if(err.response.text) console.log(err.response.text);
		errorCallback();
	});
	//endregion
}

function holdCall(voiceApi, callId, errorCallback) {
	//region Holding Call
    //Holding call using voice api and call id.
	voiceApi.hold(callId).then((resp) => {
		
	}).catch((err) => {
		console.error("Cannot hold call");
		if(err.response.text) console.log(err.response.text);
		errorCallback();
	});
	//endregion
}

function retrieveCall(voiceApi, callId, errorCallback) {
	//region Retrieving Call
    //Retrieving call using voice api and call id.
	voiceApi.retrieve(callId).then((resp) => {
		
	}).catch((err) => {
		console.error("Cannot retrieve call");
		if(err.response.text) console.log(err.response.text);
		errorCallback();
	});
	//endregion
}

function releaseCall(voiceApi, callId, errorCallback) {
	//region Releasing Call
    //Releasing call using voice api and call id.
	voiceApi.release(callId).then((resp) => {
		
	}).catch((err) => {
		console.error("Cannot release call");
		if(err.response.text) console.log(err.response.text);
		errorCallback();
	});
	//endregion
}

function makeAgentNotReadyAfterCall(voiceApi, errorCallback) {
	//region Making Agent NotReady and Setting Agent Work Mode
	//Setting agent state to 'NotReady' using the voice api and specifying the agent's work mode using the agent work mode enum.
	voiceApi.setAgentStateNotReady({
		notReadyData: {
			data: {
				agentWorkMode: workspace.VoicenotreadyData.AgentWorkModeEnum.AfterCallWork
			}
		}
	}).then((rep) => {
		
	}).catch((err) => {
		console.error("Cannot set state!");
		if(err.response.text) console.log(err.response.text);
		errorCallback();
    });
}

function disconnectAndLogout(cometD, sessionApi) {
	//region Disconnect CometD and Logout Workspace
	//Disconnecting cometD and ending out workspace session.
	cometD.disconnect((reply) => {
		if(reply.successful) {
			sessionApi.logout().then((resp) => {
				
			}).catch((err) => {
				console.error("Cannot log out");
				if(err.response.text) console.error(err.response.text);
				process.exit(1);
			});
		} else {
			console.error("Cannot Disconnect CometD");
			process.exit(1);
		}
	});
	//endregion
}



main();