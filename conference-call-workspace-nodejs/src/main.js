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
	
	//region Making Event Handler
	//Here we handle different cometD messages.
	//In order to specify why certain CometD events are taking place it is necessary to store some information about what has happened.
	var hasActivatedChannels = false;
	var hasCalledInitiateConference = false;
	var hasCalledCompleteConference = false;
	
	var actionsCompleted = 0;
	
	var consultConnId = null;
	var parentConnId = null;
	
	return async (message) => {
		 try {
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
						await initiateConference(voiceApi, callId, consultAgentNumber);
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
						await completeConference(voiceApi, callId, parentConnId);
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
						console.log("Looking for established call...");
					
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
	
	//endregion
}

function initiateConference(voiceApi, callId, destination) {
	//region Initiating Conference
	//Initiate conference to a destination number using the voice api.
	return voiceApi.initiateConference(callId, {
		data: {
			destination: destination
		}
	});
	//endregion
}

function completeConference(voiceApi, callId, parentConnId) {
	//region Completing Conference
	//Complete the conference using the parent conn id and the voice api.
	return voiceApi.completeConference(callId, {
		data: {
			parentConnId: parentConnId
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