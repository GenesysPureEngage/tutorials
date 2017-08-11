const workspace = require('genesys-workspace-client-js');
const auth = require('genesys-authorization-client-js');
const url = require('url');
const cometDLib = require('cometd');
require('cometd-nodejs-client').adapt();

//Usage: <apiKey> <clientId> <clientSecret> <apiUrl> <agentUsername> <agentPassword> <searchTerm>
const argv = process.argv.slice(2);
const apiKey = argv[0];
const clientId = argv[1];
const clientSecret = argv[2];
const apiUrl = argv[3];
const username = argv[4];
const password = argv[5];
const searchTerm = argv[6];

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
	const targetsApi = new workspace.TargetsApi(workspaceClient);

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
							
							startHandlingVoiceEvents(cometD, sessionApi, voiceApi, targetsApi, () => {
								
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

function startHandlingVoiceEvents(cometD, sessionApi, voiceApi, targetsApi, callback) {
	console.log("Subscribing to Voice channel...");
	
	//region Handling Voice Events
	//Here we subscribe to voice channel and handle voice events.
	//In order to specify why certain CometD events are taking place it is necessary to store some information about what has happened.
	var hasActivatedChannels = false;
	var hasCalledInitiateTransfer = false;
	var hasCalledCompleteTransfer = false;
	
	var actionsCompleted = 0;
	
	var consultConnId = null;
	var parentConnId = null;
	
	cometD.subscribe("/workspace/v3/voice", (message) => {
		
		if(message.data.messageType == "DnStateChanged") {
			//region Handle Different State changes
			//When the server is done activating channels, it will send a 'DnStateChanged' message with the agent state being 'NotReady'.
			//Once the server is done changing the agent state to 'Ready' we will get another event.
			
			const agentState = message.data.dn.agentState;
			
			if(!hasActivatedChannels) {
				if(agentState == "NotReady" || agentState == "Ready") {
					console.log("Channels activated");
					hasActivatedChannels = true;
					
					console.log("Getting targets...");
					
					getTargets(targetsApi, searchTerm, (targets) => {
						//region Calling Target
						//Here we print the first10 targets returned from the search and call the first one if it exists.
						if(targets.length == 0) {
							console.error("Search came up empty");
							disconnectAndLogout(cometD, sessionApi);
						
						} else {
							
							console.log("Found targets: " + JSON.stringify(targets));
							console.log("Calling target: " + targets[0].userName);
							try {
								const phoneNumber = targets[0]["availability"]["channels"][0]["phoneNumber"];
								console.log("Phone number: " + phoneNumber);
								makeCall(voiceApi, phoneNumber, () => {
									//region Finishing up
									//Now that we have made a call to a target we can disconnect ant logout.
									console.log("done");
									disconnectAndLogout(cometD, sessionApi);
									//endregion
								}, () => {
									disconnectAndLogout(cometD, sessionApi);
								});
							} catch(e) {
								console.error("No phone number");
								disconnectAndLogout(cometD, sessionApi);
							}
						
							
						}
					}, () => {
						disconnectAndLogout(cometD, sessionApi);
					});
					
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

function getTargets(targetsApi, searchTerm, callback, errorCallback) {
	
	//region Get Targets
	//Getting target agents that match the specified search term using the targets api.
	targetsApi.get(searchTerm, {
		limit: 10
	}).then((resp) => {
		
		if(resp.status.code != 0) {
			console.error("Cannot get targets");
			errorCallback();
		} else {
			callback(resp.data.targets);
		}
	}).catch((err) => {
		console.error("Cannot get targets");
		if(err.response) console.error(err.response.text);
		errorCallback();
	});
	//endregion
}

function makeCall(voiceApi, destination, callback, errorCallback) {
	//region Making a Call
	//Using the voice api to make a call to the specified destination.
	voiceApi.makeCall({
		data: {
			destination: destination
		}
	}).then((resp) => {
		if(resp.status.code != 1) {
			console.error("Cannot make call");
			errorCallback();
		} else {
			callback();
		}
	}).catch((err) => {
		console.error("Cannot make call");
		if(err.response) console.error(err.response.text);
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