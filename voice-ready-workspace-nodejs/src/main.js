const authorization = require('genesys-authorization-client-js');
const workspace = require('genesys-workspace-client-js');
const cometdLib = require('cometd');
const util = require('util');
const url = require('url');
require('cometd-nodejs-client').adapt();

//Usage: <apiKey> <clientId> <clietnSecret> <apiUrl> <agentUsername> <agentPassword>
const argv = process.argv.slice(2);
const apiKey = argv[0];
const clientId = argv[1];
const clientSecret = argv[2];
const apiUrl = argv[3];
const agentUsername = argv[4];
const agentPassword = argv[5];

const workspaceUrl = `${apiUrl}/workspace/v3`;
const authenticationUrl = `${apiUrl}/auth/v3`;

//region Initialize API Client
//Create and setup ApiClient instance with your ApiKey and Workspace API URL.
const workspaceClient = new workspace.ApiClient();
workspaceClient.basePath = workspaceUrl;
workspaceClient.defaultHeaders = { 'x-api-key': apiKey };

//region Initialize Authorization Client
//Create and setup an ApiClient instance with your ApiKey and Authorization API URL.
const authenticationClient = new authorization.ApiClient(authenticationUrl);
authenticationClient.basePath = authenticationUrl;
authenticationClient.defaultHeaders = { 'x-api-key': apiKey };

//region Create SessionApi instances
//Creating instances of SessionApi using the workspace ApiClient which will be used to make api calls.
const sessionApi = new workspace.SessionApi(workspaceClient);

//region Create AuthenticationApi instance
//Create instance of AuthenticationApi using the authorization ApiClient which will be used to retrieve access token.
const authorizationApi = new authorization.AuthenticationApi(authenticationClient);

//region Oauth2 Authentication
//Performing Oauth 2.0 authentication.
console.info("Retrieving access token");
authorizationApi.retrieveToken("password", clientId, agentUsername, agentPassword, 
    {authorization: "Basic " + new Buffer(`${clientId}:${clientSecret}`).toString("base64")},
    (err, data, resp) => {
        const body = resp? resp.body: {};
        if (err || !body.access_token) {
            console.error("Error getting access token");
            console.error(body);
        }
        else {
            console.info("Initializing workspace");
            sessionApi.initializeWorkspace({authorization : "Bearer " + body.access_token}, (err, data, resp) => {
                const body = resp? resp.body: {};
                if(err || (body.status && body.status.code !== 0)) {
                    console.error("Cannot log in Workspace");
                    console.error(body);
                }
                else {
                    //region Obtaining Workspace API Session
                    //Obtaining session cookie and setting the cookie to the client
                    const session = resp.headers['set-cookie'].find(v => v.startsWith('WORKSPACE_SESSIONID'));
                    workspaceClient.defaultHeaders.Cookie = session;


                    //region Notifications
                    //Initializing instance of cometd to subscribe for workspace notifications
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
                                //region Handle Different State changes
                                //When the server is done activating channels, it will send a 'DnStateChanged' message with the agent state being 'NotReady'.
                                //Then once it is done changing the state to ready it will send another message with the agent state being 'Ready'.
                                const data = message.data;
                                if(data) {
                                    const messageType = data.messageType;
                                    if(messageType === "DnStateChanged") {
                                        
                                        if(data.dn.agentState === "NotReady") {
                                            const voiceApi = new workspace.VoiceApi(workspaceClient);
                                            voiceApi.setAgentStateReady((err, data, resp) => {
                                                const body = resp? resp.body: {};
                                                if(err || (body.status && body.status.code !== 0)) {
                                                    console.error("Cannot change agent state");
                                                    console.error(body);
                                                }
                                            });
                                        }
                                        else if(message.data.dn.agentState === "Ready") {
                                            sessionApi.logout((err, data, resp) => {
                                                cometd.disconnect();
                                                console.info("done");
                                            });
                                        }
                                    }
                                }
                                //endregion
                            },  (reply) => {
                                //region Subscription Success
                                //Make sure that the event handler has been successfully subscribed before activating channels.
                                if(reply.successful) {
                                    sessionApi.getCurrentSession((err, data, resp) => {
                                        var body = resp? resp.body: {};
                                        if(err || (body.status && body.status.code !== 0)) {
                                            console.error("Cannot get current session");
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
			} 
                        else {
                            console.error("Handshake failed");
                            sessionApi.logout();
                        }
                    }
		);
            }
        });
    }
});
