const workspace = require('genesys-workspace-client-js');
const authorization = require('genesys-authorization-client-js');

const apiKey = "<apiKey>";
const apiUrl = "<apiUrl>";

//region Create the api object
//Create the api object passing the parsed command line arguments.
const workspaceApi = new workspace(apiKey, apiUrl);
//endregion

//region Register event handler
//Register event handler to get notifications of call state changes and find held and established calls.
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
    //region Initiaize the API and activate channels
    //Initialize the API and activate channels
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
