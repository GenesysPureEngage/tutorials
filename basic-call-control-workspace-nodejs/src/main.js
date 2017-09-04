const workspace = require('genesys-workspace-client-js');
const authorization = require('genesys-authorization-client-js');

const apiKey = "<apiKey>";
const apiUrl = "<apiUrl>";

//region Create the api object
//Create the api object passing the parsed command line arguments.
const workspaceApi = new workspace(apiKey, apiUrl);
//endregion

//region Register event handlers
//Register event handlers to get notifications of call and dn state changes and implement the automated sequence
workspaceApi.on('CallStateChanged', async msg => {
    let call = msg.call;

    switch (call.state) {
        //region Answer call
        //When a ringing call is detected, answer it.
        case 'Ringing':
            console.log('Answering call...');
            await workspaceApi.voice.answerCall(call.id);
            break;
        //endregion
        //region Handle established state
        //The first time we see an established call it will be placed on hold. The second time, it is released.
        case 'Established':
            if (!callHasBeenHeld) {
                console.log('Placing call on hold...');
                await workspaceApi.voice.holdCall(call.id);
                callHasBeenHeld = true;
            } else {
                console.log('Releasing call...');
                await workspaceApi.voice.releaseCall(call.id);
            }
            break;
        //endregion
        //region Handle held call
        //When we see a held call, retrieve it
        case 'Held':
            console.log('Retrieving call...');
            await workspaceApi.voice.retrieveCall(call.id);
            break;
        //endregion
        //region Handle released
        //When we see a released call, set the agent state to ACW
        case 'Released':
            console.log('Setting agent notReady w/ ACW...');
            await workspaceApi.voice.notReady('AfterCallWork');
            break;
        //endregion
    }
});
		
workspaceApi.on('DnStateChanged', async msg => {
    let dn = msg.dn;
    //region Handle DN state change
    //When the DN workMode changes to AfterCallWork the sequence is over and we can exit.
    console.log(`Dn updated - number [${dn.number}] state [${dn.agentState}] workMode [${dn.agentWorkMode}]...`);
    if (dn.agentWorkMode === 'AfterCallWork') {
        console.log('done');
        await workspaceApi.destroy();
    }
    //endregion
});

const client = new authorization.ApiClient();
client.basePath = `${apiUrl}/auth/v3`;
client.defaultHeaders = {'x-api-key': apiKey};
client.enableCookies = true;

const agentUsername = "<agentUsername>";
const agentPassword = "<agentPassword>";
const clientId = "<clientId>";
const clientSecret = "<clientSecret>";

const authApi = new authorization.AuthenticationApi(client);
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
    workspaceApi.initialize({token: token}).then(data => {
        console.log(data);
        workspaceApi.destroy();
    });
}).catch(console.error);

//region Wait for an inbound call
//The tutorial waits and reacts to an inbound call to perform the automated sequence.
console.log('Waiting for an inbound call...');
//endregion
