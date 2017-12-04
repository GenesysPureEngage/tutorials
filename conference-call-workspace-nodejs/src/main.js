const workspace = require('genesys-workspace-client-js');
const authorization = require('genesys-authorization-client-js');

const apiKey = "<apiKey>";
const apiUrl = "<apiUrl>";
const destination = "<agentPhoneNumber3>";

//region Create an instance of WorkspaceApi
//First we need to create a new instance of the WorkspaceApi class with the following parameters: **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these parameters from your PureEngage Cloud representative.
let workspaceApi = new workspace(apiKey, apiUrl, false);
//endregion

let originalCallId = null;
let conferenceCallId = null;

//region Register event handlers
//Now we can register event handlers that will be called whenever the Workspace Client Library publishes a CallStateChanged or DnStateChanged message. This let's us act on changes to the call state or DN state. Here we set up an event handler to act when it receives a CallStateChanged message where the call state is either Ringing, Dialing, Established, Released.
workspaceApi.on('CallStateChanged', msg => {
    const call = msg.call;
    const callId = call.id;
    
    console.info(`${call.state}: ${callId}`);
    
    switch(call.state) {
        //region Established
        //If the Established call is for the originating call we used to trigger this tutorial, then `initiateConference()`. If it's from our consultation call, then we want to `completeConference()` to bring all parties together in the conference call.
        case "Established":
            if(!originalCallId) {
                originalCallId = callId;
                console.info('Initiate conference');
                workspaceApi.voice.initiateConference(callId, destination);
            }
            else if(conferenceCallId === callId) {
                console.info('Complete conference');
                workspaceApi.voice.completeConference(callId, originalCallId);
            }
            break;
        //endregion
        //region Dialing
        //After we `initiateConference()`, we'll get a Dialing event for the new call to the third party. We'll hold on to the ID of that consultation call so we can use it later to `completeConference()` once the call is Established.
        case 'Dialing':
            conferenceCallId = callId;
            break;
        //endregion
        //region Released
        //The call state is changed to 'Released' when the call is ended.    
        case 'Released':
            console.info('done');
            process.exit(0);
            break;
        //endregion
        //region Ringing
        //If the call state is Ringing, then answer the call.
        case 'Ringing':
            workspaceApi.voice.answerCall(callId);
            break;
        //endregion
    }
});
//endregion

const client = new authorization.ApiClient();
client.basePath = `${apiUrl}/auth/v3`;
client.defaultHeaders = {'x-api-key': apiKey};
client.enableCookies = true;
const authApi = new authorization.AuthenticationApi(client);

const agentUsername = "<agentUsername2>";
const agentPassword = "<agentPassword2>";
const clientId = "<clientId>";
const clientSecret = "<clientSecret>";

const opts = {
    authorization: "Basic " + new Buffer(`${clientId}:${clientSecret}`).toString("base64"),
    clientId: clientId,
    scope: '*',
    username: agentUsername,
    password: agentPassword
};
    
authApi.retrieveTokenWithHttpInfo("password", opts).then(resp => {
    const data = resp.response.body;
    const accessToken = data.access_token;
    if(!accessToken) {
        throw new Error('Cannot get access token');
    }
    
    return accessToken;
}).then(token => {
    //region Initialization
    //Initialize the Workspace API by calling `initialize()` and passing **token**, which is the access token provided by the Authentication Client Library when you follow the Resource Owner Password Credentials Grant flow. Finally, call `activateChannels()` to initialize the voice channel for the agent and DN.
    return workspaceApi.initialize({token: token}).then(() => {
        return workspaceApi.activateChannels(workspaceApi.user.employeeId, workspaceApi.user.agentLogin);
    });
    //endregion
})
.catch(console.error);

console.log('Waiting for completion');










