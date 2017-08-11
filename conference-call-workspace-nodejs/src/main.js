const workspace = require('genesys-workspace-client-js');
const auth = require('genesys-authorization-client-js');
const url = require('url');
const cometDLib = require('cometd');
require('cometd-nodejs-client').adapt();

//Usage: <apiKey> <clientId> <clientSecret> <apiUrl> <agentUsername> <agentPassword> <consultAgentNumber>
const argv = process.argv.slice(2);
const apiKey = argv[0];
const clientId = argv[1];
const clientSecret = argv[2];
const apiUrl = argv[3];
const username = argv[4];
const password = argv[5];
const consultAgentNumber = argv[6];

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
		if(err.response.text) console.error(err.response.text);
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
	//In order to specify why certain CometD events are taking place it is necessary to store some information about what has happened.
	var hasActivatedChannels = false;
	var hasCalledInitiateConference = false;
	var hasCalledCompleteConference = false;
	
	var actionsCompleted = 0;
	
	var consultConnId = null;
	var parentConnId = null;
	
	cometD.subscribe("/workspace/v3/voice", (message) => {
		 
		 if(message.data.messageType == "CallStateChanged") {
			const callState = message.data.call.state;
			const callId = message.data.call.id;
			const capabilities = message.data.call.capabilities;
			
			if(callState == "Dialing") {
				//region Dialing
				//After the conference is initiated, we will get a dialing event for the new call
				console.log("Dialing");
				console.log("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
				
				if(hasCalledInitiateConference) {
					consultConnId = callId;
				}
				//endregion
				
			} if(callState == "Established") {
				//region Established
				//When the call state is 'Established' this means that the call is in progress.
				//Here we check if this event if from answering the consult call.
				if(hasActivatedChannels && parentConnId == null) {
					console.log("Found established call: " + callId);
					console.log("Initiating conference...");
					parentConnId = callId;
					initiateConference(voiceApi, callId, consultAgentNumber);
					hasCalledInitiateConference = true;
				}
				
				if(hasCalledInitiateConference && callId == consultConnId) {
					console.log("Answered");
					console.log("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
					actionsCompleted ++;
				}
				//endregion
				
			} else if(callState == "Held") {
				//region Held
				//The call state is changed to 'Held' when we hold the call. 
				
				if(hasCalledInitiateConference && callId == parentConnId) {
					console.log("Held");
					console.log("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
					actionsCompleted ++;
				}
				//endregion
			}
			
			if(callState == "Held" || callState == "Established") {
				if(actionsCompleted == 2) {
					console.log("Conference initiated");
					console.log("Completing conference...");
					completeConference(voiceApi, callId, parentConnId);
					hasCalledCompleteConference = true;
				}
			}
			
			if(callState == "Released") {
				//region Released
				//The call state is changed to 'Released' when the call is ended.
				if(hasCalledCompleteConference && callId == consultConnId) {
					console.log("Released");
					console.log("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
					actionsCompleted ++;
				}
				//endregion
				
				if(actionsCompleted == 3) {
					console.log("Conference complete");
					//region Finishing up
					//Now that the server is done transferring calls we can disconnect CometD and logout.
					console.log("done");
					disconnectAndLogout(cometD, sessionApi);
					//endregion
				}
				
			}
			
		} else if(message.data.messageType == "DnStateChanged") {
			const agentState = message.data.dn.agentState;
			if(!hasActivatedChannels) {
				if(agentState == "NotReady" || agentState == "Ready") {
					console.log("Channels activated");
					console.log("Looking for established call...");
					
					hasActivatedChannels = true;
				}
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

function initiateConference(voiceApi, callId, destination, errorCallback) {
	//region Initiating Conference
	//Initiate conference to a destination number using the voice api.
	voiceApi.initiateConference(callId, {
		data: {
			destination: destination
		}
	}).then((resp) => {
		
	}).catch ((err) => {
		console.error("Cannot initiate conference");
		if(err.response.text) console.error(err.response.text);
		errorCallback();
	});
	//endregion
}

function completeConference(voiceApi, callId, parentConnId) {
	//region Completing Conference
	//Complete the conference using the parent conn id and the voice api.
	voiceApi.completeConference(callId, {
		data: {
			parentConnId: parentConnId
		}
	}).then((resp) => {
		
	}).catch ((err) => {
		console.error("Cannot initiate conference");
		if(err.response.text) console.error(err.response.text);
		errorCallback();
	});
	//endregion
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