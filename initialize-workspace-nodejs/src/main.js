const workspace = require('genesys-workspace-client-js');
const authorization = require('genesys-authorization-client-js');

const apiKey = "<apiKey>";
const apiUrl = "<apiUrl>";

//region Create an instance of WorkspaceApi
//First we need to create a new instance of the WorkspaceApi class with the following parameters: **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these parameters from your PureEngage Cloud representative.
const workspaceApi = new workspace(apiKey, apiUrl);
//endregion

const client = new authorization.ApiClient();
client.basePath = `${apiUrl}/auth/v3`;
client.defaultHeaders = {'x-api-key': apiKey};
client.enableCookies = true;

const agentUsername = "<agentUsername>";
const agentPassword = "<agentPassword>";
const clientId = "<clientId>";
const clientSecret = "<clientSecret>";

//region Authentication
//Now we can authenticate using the Authentication Client Library. We're following the Resource Owner Password Credentials Grant flow in this tutorial, but you would typically use Authorization Code Grant for a web-based agent application.
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
    //Initialize the Workspace API by calling `initialize()` and passing **token**, which we received from the Authentication API. After initialization, get the current user.
    workspaceApi.initialize({token: token}).then(data => {
        console.log(workspaceApi.user);
        console.log('done');
        workspaceApi.destroy();
    });
    //endregion
}).catch(console.error);













