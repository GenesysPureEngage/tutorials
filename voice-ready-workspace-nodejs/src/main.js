const authorization = require('genesys-authorization-client-js');
const workspace = require('genesys-workspace-client-js');
const cometdLib = require('cometd');
const util = require('util');
const url = require('url');
require('cometd-nodejs-client').adapt();

//Usage: <apiKey> <apiUrl> <agentUsername> <agentPassword>
const argv = process.argv.slice(2);
const apiKey = argv[0];
const apiUrl = argv[1];
const agentUsername = argv[2];
const agentPassword = argv[3];

const workspaceUrl = `${apiUrl}/workspace/v3`;
const authenticationUrl = apiUrl;

//region Initialize API Client
//Create and setup ApiClient instance with your ApiKey and Workspace API URL.
const workspaceClient = new workspace.ApiClient();
workspaceClient.basePath = workspaceUrl;
workspaceClient.enableCookies = true;
workspaceClient.defaultHeaders = { 'x-api-key': apiKey };

//region Initialize Authorization Client
//Create and setup an ApiClient instance with your ApiKey and Authorization API URL.
const authenticationClient = new authorization.ApiClient(authenticationUrl);
authenticationClient.basePath = authenticationUrl;
authenticationClient.enableCookies = true;
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
const opts = {
    authorization: "Basic " + new Buffer("external_api_client:secret").toString("base64"),
    clientId: "external_api_client",
    username: agentUsername,
    password: agentPassword
};
authorizationApi.retrieveTokenWithHttpInfo("password", "scope", opts).then(resp => { 
        const data = resp.response.body;
        const accessToken = data.access_token;
        if (!accessToken) {
            console.error(data);
            throw new Error("Cannot get access token");
        }
            
        console.info("Initializing workspace");
        sessionApi.initializeWorkspaceWithHttpInfo({authorization : "Bearer " + accessToken}).then(resp => {
            const data = resp.response.body;
            if(data.status.code !== 1) {
                console.error(data);
                throw new Error("Cannot log in Workspace");
            }

            //region Obtaining Workspace API Session
            //Obtaining session cookie and setting the cookie to the client
            const session = resp.response.headers['set-cookie'].find(v => v.startsWith('WORKSPACE_SESSIONID'));
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
                                    console.info('Changing agent state to ready');
                                    voiceApi.setAgentStateReady().then(resp => {
                                        if(resp.status.code !== 1) {
                                            console.error(resp);
                                            throw new Error("Cannot change agent state");
                                        }
                                    }).catch(err => {
                                        console.error(err);
                                    });
                                }
                                else if(message.data.dn.agentState === "Ready") {
                                    console.info("done");
                                    
                                    sessionApi.logout().then().catch().then(() => {
                                        cometd.disconnect();                                        
                                    });
                                }
                            }
                        }
                        //endregion
                    },  (reply) => {
                        //region Subscription Success
                        //Make sure that the event handler has been successfully subscribed before activating channels.
                        if(reply.successful) {
                            sessionApi.getCurrentSession().then(resp => {
                                if(resp.status.code !== 0) {
                                    console.error(resp);
                                    throw new Error("Cannot get current session");
                                }
                                else {
                                    var user = resp.data.user;
                                    console.info('Activating channels');
                                    //region Activate Channels
                                    //Activating channels for the user
                                    sessionApi.activateChannels({
                                        data: {
                                            agentId: user.employeeId,
                                            dn: user.agentLogin
                                        }
                                    }).then(resp => {
                                        if(resp.status.code !== 0) {
                                            console.error(resp);
                                            throw new Error("Cannot activate channels");
                                        }
                                    }).catch(err => {
                                        console.error(err);
                                    });
                                }
                            }).catch(err => {
                                console.error(err);
                            });
                        } else {
                            console.error("Subscription failed");
                            sessionApi.logout().then().catch().then(() => {
                                cometd.disconnect();                                        
                            });
                        }
                    });
                } 
                else {
                    console.error("Handshake failed");
                    sessionApi.logout();
                }
            });
        }).catch(err => {
            console.error(err);
        });
}).catch(err => {
    console.error(err);
});
