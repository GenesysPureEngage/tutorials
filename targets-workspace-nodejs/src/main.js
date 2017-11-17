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
        return workspaceApi.activateChannels(workspaceApi.user.employeeId, workspaceApi.user.agentLogin)
    });
}).then(() => {
    
    //region Search for targets
    //Now we can use `targets.search()` to find targets that match our search term.
    return workspaceApi.targets.search("<searchTerm>");
    //endregion
})
.then(targets => {
    if(targets.length === 0) {
        throw 'Search came up empty';
    } 
    else {
        //region Print targets
        //If our search returned any results, let's include them with the name and phone number in the console log.
        targets.forEach(target => {
            console.log(target);
            console.log(`Name: ${target.name}`);
            console.log(`PhoneNumber: ${target.number}`);
        });
    }
}).catch(console.error).then(() => {
    workspaceApi.destroy();
});













