const workspace = require('genesys-workspace-client-js');

const apiKey = "<apiKey>";
const apiUrl = "<apiUrl>";

//region Create an instance of WorkspaceApi
//First we need to create a new instance of the WorkspaceApi class with the following parameters: **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these parameters from your PureEngage Cloud representative.
const workspaceApi = new workspace(apiKey, apiUrl);
//endregion

//region Authorization code grant
//You'll need to use the Authentication API to get an authorization token. See https://github.com/GenesysPureEngage/authorization-code-grant-sample-app for an example of how to do this.
const authorizationToken = "<authorizationToken1>";
//endregion

//region Initialization
//Initialize the Workspace API with the authorization token from the previous step. Finally, call `activateChannels()` to initialize the voice channel for the agent and DN.
workspaceApi.initialize({token: authorizationToken}).then(() => {
    return workspaceApi.activateChannels(workspaceApi.user.employeeId, workspaceApi.user.agentLogin);
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













