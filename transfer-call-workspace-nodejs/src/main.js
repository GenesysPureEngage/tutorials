const workspace = require('genesys-workspace-client-js');

const apiKey = "<apiKey>";
const apiUrl = "<apiUrl>";
const destination = "<agentPhoneNumber3>";

//region Create an instance of WorkspaceApi
//First we need to create a new instance of the WorkspaceApi class with the following parameters: **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these parameters from your PureEngage Cloud representative.
let workspaceApi = new workspace(apiKey, apiUrl, false);
//endregion

let originalCallId;
let transferedCallId;

//region Register event handlers
//Now we can register event handlers that will be called whenever the Workspace Client Library publishes a CallStateChanged or DnStateChanged message. This lets us act on changes to the call state or DN state. Here we set up an event handler to act when it receives a CallStateChanged message where the call state is either Ringing, Dialing, Established, Released.
workspaceApi.on('CallStateChanged', msg => {
    const call = msg.call;
    const callId = call.id;
    
    console.info(`${call.state}: ${callId}`);
    
    switch(call.state) {
        //region Established
        //If the Established call is for the originating call we used to trigger this tutorial, then `initiateTransfer()`. If it's from our consultation call, then we want to `completeTransfer()` to transfer the original call to the third party.
        case "Established":
            if(!originalCallId) {
                originalCallId = callId;
                workspaceApi.voice.initiateTransfer(callId, destination);
            }
            else if(transferedCallId === callId) {
                workspaceApi.voice.completeTransfer(transferedCallId, originalCallId);
            }
            break;
        //endregion
        //region Dialing
        //After we `initiateTransfer()`, we'll get a Dialing event for the new call to the third party. We'll hold on to the ID of that consultation call so we can use it later to `completeTransfer()` once the call is Established.
        case 'Dialing':
            transferedCallId = callId;
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
	
//region Authorization code grant
//You'll need to use the Authentication API to get an authorization token. See https://github.com/GenesysPureEngage/authorization-code-grant-sample-app for an example of how to do this.
const authorizationToken = "<authorizationToken2>";
//endregion

//region Initialization
//Initialize the Workspace API with the authorization token from the previous step. Finally, call `activateChannels()` to initialize the voice channel for the agent and DN.
workspaceApi.initialize({token: authorizationToken}).then(() => {
    return workspaceApi.activateChannels(workspaceApi.user.employeeId, workspaceApi.user.agentLogin);
}).catch(console.error);
//endregion

console.log('Waiting for completion');
