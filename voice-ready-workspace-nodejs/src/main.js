const workspace = require('genesys-workspace-client-js');
const cometdLib = require('cometd');
const util = require('util');
const url = require('url');
require('cometd-nodejs-client').adapt();

//region Initialize API Client
//Create and setup ApiClient instance with your ApiKey and Workspace API URL.
const apiKey = "your API key";
const workspaceUrl = "workspace url";

const workspaceClient = new workspace.ApiClient();
workspaceClient.basePath = workspaceUrl;
workspaceClient.defaultHeaders = { 'x-api-key': apiKey };

//region Create SessionApi instance
//Creating instance of SessionApi using the ApiClient.
const sessionApi = new workspace.SessionApi(workspaceClient);


//region Logging in Workspace API
//Logging in using username and password
sessionApi.login({
    username: "username",
    password: "password"
}, (err, data, resp) => {
    var body = resp? resp.body: {};
    if(err || (body.status && body.status.code !== 0)) {
        console.error("Cannot log in Workspace");
        console.error(body);
    }
    else {
        //region Obtaining Workspace API Session
        //Obtaining session cookie and setting the cookie to the client
        const session = resp.headers['set-cookie'].find(v => v.startsWith('WORKSPACE_SESSIONID'));
        workspaceClient.defaultHeaders.Cookie = session;
		
		const cometd = new cometdLib.CometD();
		
		const hostname = url.parse(workspaceUrl).hostname;
		const transport = cometd.findTransport('long-polling');
		transport.context = {
			cookieStore: {
				[hostname]: [session]
			}
		};
		
		cometd.configure({
			url: workspaceUrl + "/notifications",
			requestHeaders: {
				"x-api-key": apiKey,
				"Cookie": session
			}
		});
		
		cometd.handshake((reply) => {
			if(reply.successful) {
				
				
				cometd.subscribe("/workspace/v3/voice", (message) => {
					
					
					if(message.data.messageType == "DnStateChanged")
					if(message.data.dn.agentState == "NotReady") {
						//region Create VoiceApi instance
						//Creating instance of VoiceApi using the ApiClient.
						const voiceApi = new workspace.VoiceApi(workspaceClient);
		
						//region Change agent state
						//Changing agent state to ready
						voiceApi.setAgentStateReady((err, data, resp) => {
							const body = resp? resp.body: {};
							if(err || (body.status && body.status.code !== 0)) {
								console.error("Cannot change agent state");
								console.error(body);
							}
							
						});
					} else if(message.data.dn.agentState == "Ready") {
						
						sessionApi.logout((err, data, resp) => {
							cometd.disconnect();
							console.info("done");
						});
						
					}
					
					
				}, (reply) => {
					
					if(reply.successful) {
					
						sessionApi.getCurrentUser((err, data, resp) => {
							var body = resp? resp.body: {};
							if(err || (body.status && body.status.code !== 0)) {
								console.error("Cannot get current user");
								console.error(body);
							}
							else {
								var user = body.data.user;
								//region Activate Channels
								//Activating channels for the user
								sessionApi.activateChannels({
									data: {
										agentId: user.employeeId,
										dn: user.agentLogin
									}
								}, (err, data, resp) => {
									const body = resp? resp.body: {};
									if(err || (body.status && body.status.code !== 0)) {
										console.error("Cannot activate channels");
										console.error(body);
									}
									
								});
					
							}
						});
						
					} else {
						console.error("Subscription failed");
						sessionApi.logout((err, data, resp) => {
							cometd.disconnect();
						});
					}
					
				});
				
				
			} else {
				console.error("Handshake failed");
				sessionApi.logout();
			}
		})
		
        
    }
});
