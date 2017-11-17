const workspace = require('genesys-workspace-client-js');
const authorization = require('genesys-authorization-client-js');

const apiKey = "<apiKey>";
const apiUrl = "<apiUrl>";

//region Create an instance of WorkspaceApi
//First we need to create a new instance of the WorkspaceApi class with the following parameters: **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these parameters from your PureEngage Cloud representative.
const workspaceApi = new workspace(apiKey, apiUrl);
//endregion

//region Register event handlers
//Now we can register an event handler that will be called whenever the Workspace Client Library publishes a DnStateChanged message. This let's us act on changes to the call state or DN state. Here we set up an event handler to act when it receives a DnStateChanged message where the agent state is either Ready or NotReady.
workspaceApi.on('DnStateChanged', async msg => {
    let dn = msg.dn;
    switch (dn.agentState) {
        //region Ready
        //If the agent state is Ready, we've completed our task and can clean up the API.
        case 'Ready':
            console.log("Agent state is 'Ready'");
            console.log('done');
            workspaceApi.destroy();
            break;
        //endregion
        //region NotReady
        //If the agent state is NotReady, we call `setAgentReady()`.
        case 'NotReady':
            console.log("Setting agent state to 'Ready'...");
            workspaceApi.voice.ready();
        //endregion
    }
});
//endregion

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
    //region Initialization
    //Initialize the Workspace API by calling `initialize()` and passing **token**, which is the access token provided by the [Authentication Client Library](https://developer.genhtcc.com/api/client-libraries/authentication/index.html) when you follow the [Resource Owner Password Credentials Grant](https://tools.ietf.org/html/rfc6749#section-4.3) flow. Finally, call `activateChannels()` to initialize the voice channel for the agent and DN.
    return workspaceApi.initialize({token: token}).then(() => {
        return workspaceApi.activateChannels(workspaceApi.user.employeeId, workspaceApi.user.agentLogin);
    });
    //endregion
}).catch(console.error);

console.log('Waiting for completion...');












