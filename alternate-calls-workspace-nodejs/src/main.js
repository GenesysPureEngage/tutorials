const workspace = require('genesys-workspace-client-js');
const authorization = require('genesys-authorization-client-js');

const apiKey = "<apiKey>";
const apiUrl = "<apiUrl>";

//region Create an instance of WorkspaceApi
//First we need to create a new instance of the WorkspaceApi class with the following parameters: **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these parameters from your PureEngage Cloud representative.
const workspaceApi = new workspace(apiKey, apiUrl);
//endregion

//region Register event handler
//Now we can register an event handler that will be called whenever the Workspace Client Library publishes a CallStateChanged message. This let's us act on changes to the call state. Here we set up an event handler to act when it receives a CallStateChanged message where the call state is either Ringing, Established, or Held. We've added logic here to alternate between the calls based on the call state.
let heldCallId = null;
let establishedCallId = null;
let alternated = false;
let busy = false;

const calls = [];
workspaceApi.on('CallStateChanged', msg => {
    const call = msg.call;
    const callId = call.id;
    
    console.log(`${call.state}: ${callId}`);
    
    switch (call.state) {
    //region Ringing
    //If the call state is Ringing, then answer the call.
    case 'Ringing':
        if(busy) {
            calls.push(callId);
        }
        else {
            busy = true;
            console.info('Answering call');
            workspaceApi.voice.answerCall(callId);            
        }
        break;
    //endregion
                    
    //region Established
    //The first time we see an Established call, place it on hold. The second time, call `alternateCalls` with the **establishedCallId** and **heldCallId** as parameters.
    case 'Established':
        establishedCallId = callId;
        
        if(!heldCallId) {
            workspaceApi.voice.holdCall(callId);
        }
        else if(!alternated) {
            alternated = true;
            console.log('Alternating calls');
            workspaceApi.voice.alternateCalls(establishedCallId, heldCallId);
        }
        else if(alternated) {
            console.log('done');
            process.exit(0);
        }
        break;
    //endregion  

    //region Held
    //If the call state is Held, answer the other call.
    case 'Held': 
        heldCallId = callId;
        busy = false;
        const anotherCallId = calls.pop();
        if(anotherCallId) {
            busy = true;
            console.info('Answering call');
            workspaceApi.voice.answerCall(anotherCallId);
        }
        
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

const agentUsername = "<agentUsername3>";
const agentPassword = "<agentPassword3>";
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
    console.info('Initializing workspace');
    return workspaceApi.initialize({token: token}).then(() => {
        console.info('Activating channels');
        return workspaceApi.activateChannels(workspaceApi.user.agentLogin, workspaceApi.user.agentLogin);
    });
    //endregion
})
.catch(console.error);

setInterval(() => {
    
    
}, 1000);

console.log('Waiting for completion');
