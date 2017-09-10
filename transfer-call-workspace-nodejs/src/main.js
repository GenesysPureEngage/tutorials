const workspace = require('genesys-workspace-client-js');
const authorization = require('genesys-authorization-client-js');

const apiKey = "<apiKey>";
const apiUrl = "<apiUrl>";
const destination = "<agentPhoneNumber3>";

//region Create the api object
//Create the api object passing the parsed command line arguments.
let workspaceApi = new workspace(apiKey, apiUrl, false);
//endregion

let originalCallId;
let transferedCallId;

//region Register event handler
//Register event handler to get notifications of call state changes.
workspaceApi.on('CallStateChanged', msg => {
    const call = msg.call;
    const callId = call.id;
    
    console.info(`${call.state}: ${callId}`);
    
    switch(call.state) {
        case "Established":
            if(!originalCallId) {
                originalCallId = callId;
                workspaceApi.voice.initiateTransfer(callId, destination);
            }
            else if(transferedCallId === callId) {
                workspaceApi.voice.completeTransfer(transferedCallId, originalCallId);
            }
            break;
        case 'Dialing':
            transferedCallId = callId;
            break;
        case 'Released':
            console.info('done');
            process.exit(0);
            break;
        case 'Ringing':
            workspaceApi.voice.answerCall(callId);
            break;
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
    //region Initiaize the API and activate channels
    //Initialize the API and activate channels
    return workspaceApi.initialize({token: token}).then(() => {
        return workspaceApi.activateChannels(workspaceApi.user.employeeId, workspaceApi.user.agentLogin);
    });
    //endregion
})
.catch(console.error);

console.log('Waiting for completion');
