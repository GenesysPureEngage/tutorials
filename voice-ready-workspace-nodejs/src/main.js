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
workspaceApi.on('DnStateChanged', async msg => {
    let dn = msg.dn;
    switch (dn.agentState) {
        //region 'Ready'
        //If the agent state is ready then the program is done.
        case 'Ready':
            console.log("Agent state is 'Ready'");
            console.log('done');
            workspaceApi.destroy();
            break;
        //endregion
        //region 'NotReady'
        //If the agent state is 'NotReady' then we set it to 'Ready'.
        case 'NotReady':
            console.log("Setting agent state to 'Ready'...");
            workspaceApi.voice.ready();
        //endregion
    }
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
    return workspaceApi.initialize({token: token}).then(() => {
        return workspaceApi.activateChannels(workspaceApi.user.employeeId, workspaceApi.user.agentLogin);
    });
    //endregion
}).catch(console.error);

console.log('Waiting for completion...');












