const provisioning = require('genesys-provisioning-client-js');

const apiKey = "<apiKey>";
const username = "<username>";
const password = "<password>";
const apiUrl = "<apiUrl>";

const provisioningUrl = `${apiUrl}/provisioning/v3`;

//region Create an instance of ApiClient
//First we need to create a new instance of the ApiClient class and set properties using the **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these from your PureEngage Cloud representative.
const provisioningClient = new provisioning.ApiClient();
provisioningClient.basePath = provisioningUrl;
provisioningClient.defaultHeaders = { 'x-api-key': apiKey };
//endregion

//region Create an instance of SessionApi
//Create an instance of SessionApi using the **client** you created in the previous step.
const sessionApi = new provisioning.SessionApi(provisioningClient);
//endregion

//region Login to the Provisioning API
//Logging in using our username and password.
sessionApi.login({
    domain_username: username,
    password: password
}).then(resp => {
    if(resp.status.code !== 0) {
        throw new Error('Cannot log in');
    }
    
    return resp.data;
//endregion
}).then(resp => {
    //region Obtaining Provisioning API Session
    //Obtaining sessionId and setting PROVISIONING_SESSIONID cookie to the client
    const sessionId = resp.sessionId;
    provisioningClient.defaultHeaders.Cookie = `PROVISIONING_SESSIONID=${sessionId};`;
    //endregion

    //region Create an instance of UsersApi
    //Create an instance of UsersApi using the **client** you created previously.
    const usersApi = new provisioning.UsersApi(provisioningClient);
    //endregion

    //region Create a new user
    //Create a new user with the specified values.
    const user = {
        userName: "<agentUsername>",
        firstName: "<agentFirstName>",
        lastName: "<agentLastName>",
        password: "<agentPassword>",
        accessGroup: [ "<agentAccessGroup>" ]
    };
    //endregion

    return usersApi.addUser(user);
}).then(resp => {
    if(resp.status.code !== 0) {
        throw new Error("Cannot create user");
    }
    
    return resp.data;
}).then(data => {
    //region Log out
    //Log out to end our Provisioning API session.
    sessionApi.logout();
    //endregion
}).catch(err => {
    console.error(err);
});












