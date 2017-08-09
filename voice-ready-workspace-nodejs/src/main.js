const workspace = require('genesys-workspace-client-js');
const auth = require('genesys-authorization-client-js');
const url = require('url');
const cometDLib = require('cometd');
require('cometd-nodejs-client').adapt();


const apiKey = "qalvWPemcr4Gg9xB9470n7n9UraG1IFN7hgxNjd1";
const workspaceUrl = "https://api-usw1.genhtcc.com/workspace/v3";
const authUrl = "https://gws-usw1.genhtcc.com/auth/v3";

const clientId = "external_api_client";
const clientSecret = "secret";

const username = "agent-6504772888";
const password = "Agent123";


function main() {
	
	//region Initialize API Client
	//Create and setup ApiClient instance with your ApiKey and Workspace API URL.
	const workspaceClient = new workspace.ApiClient();
	workspaceClient.basePath = workspaceUrl;
	workspaceClient.defaultHeaders = { 'x-api-key': apiKey };

	const authClient = new auth.ApiClient();
	authClient.basePath = authUrl;
	authClient.defaultHeaders = { 'x-api-key': apiKey };

	//region Create SessionApi instance
	//Creating instance of SessionApi using the ApiClient.
	const sessionApi = new workspace.SessionApi(workspaceClient);

	//region Create AuthenticationApi instance
	//Create instance of AuthenticationApi using the authorization ApiClient which will be used to retrieve access token.
	const authApi = new auth.AuthenticationApi(authClient); 


	//region Oauth2 Authentication
	//Performing Oauth 2.0 authentication.
	console.log("Retrieving access token...");

	const authorization = "Basic " + new String(new Buffer(clientId + ":" + clientSecret).toString("base64"));
	authApi.retrieveToken("password", clientId, username, password, {"authorization": authorization}).then((accessToken) => {
	
		if(!accessToken["access_token"]) {
			console.error("No access token");
		
		} else {
		
			console.log("Retrieved access token");
			console.log("Initializing workspace...");
	
			sessionApi.initializeWorkspaceWithHttpInfo({"authorization": "Bearer " + accessToken["access_token"]}).then((resp) => {
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
							startHandlingVoiceEvents(cometD, sessionApi, callbck) {
								
							}
						});
					});
					//endregion
				
				} else {
					console.error("Error initializing workspace");
					console.error("Code: " + resp.data.status.code);
				}
			
			}).catch((err) => {
				console.error("Cannot initialize workspace");
				console.error(err);
			});
		}
	
	}).catch((err) => {
		console.error("Cannot get access token");
		console.error(err);
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
			console.error(err);
			process.exit(1);
		}
	
	});
		
}

function startHandlingVoiceEvents(cometD, sessionApi, callback) {
	console.log("Subscribing to Voice channel...");
	
	//region Handling Voice Events
	//Here we subscribe to voice channel and handle voice events.
	
	
	cometD.subscribe("/workspace/v3/voice", (message) => {
		
		if(message.data.messageType = "DnStateChanged") {
			console.log(message.data.dn.agentState);
		}
		
		
	}, (reply) => {
		if(reply.successful) {
			console.log("Voice subscription succesful");
			callback();
		} else {
			console.error("Subscription unsuccessful");
			console.error(err);
			process.exit(1);
		}
	
	});
}

function disconnectAndLogout(cometD, sessionApi) {
	//region Disconnect CometD and Logout Workspace
	//Disconnecting cometD and ending out workspace session.
	cometD.disconnect((reply) => {
		if(reply.successful) {
			sessionApi.logout().then((resp) => {
				console.log("done");
			}).catch((err) => {
				console.error("Cannot log out");
				console.error(err);
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

