const workspace = require('genesys-workspace-client-js');
const authorization = require('genesys-authorization-client-js');

const apiKey = "<apiKey>";
const apiUrl = "<apiUrl>";

//region Create the api object
//Create the api object passing the parsed command line arguments.
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
    //region Initiaize the API and activate channels
    //Initialize the API and activate channels
    return workspaceApi.initialize({token: token}).then(() => {
        return workspaceApi.activateChannels(workspaceApi.user.employeeId, workspaceApi.user.agentLogin)
    });
}).then(() => {
    
    //region Searching for Targets
    //Getting targets with the specified searchTerm using the API.
    return workspaceApi.targets.search("<searchTerm>");
    //endregion
})
.then(targets => {
    if(targets.length === 0) {
        throw 'Search came up empty';
    } 
    else {
        //region Printing targets
        //Printing details of the targets found
        targets.forEach(target => {
            console.log(target);
            console.log(`Name: ${target.name}`);
            console.log(`PhoneNumber: ${target.number}`);
        });
    }
}).catch(console.error).then(() => {
    workspaceApi.destroy();
});
