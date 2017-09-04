const provisioning = require('genesys-provisioning-client-js');

const apiKey = "<apiKey>";
const username = "<username>";
const password = "<password>";
const apiUrl = "<apiUrl>";

const provisioningUrl = `${apiUrl}/provisioning/v3`;

//region Initialize API Client
//Create and setup ApiClient instance with your ApiKey and Provisioning API URL.
const provisioningClient = new provisioning.ApiClient();
provisioningClient.basePath = provisioningUrl;
provisioningClient.defaultHeaders = { 'x-api-key': apiKey };

//region Create SessionApi instance
//Creating instance of SessionApi using the ApiClient.
const sessionApi = new provisioning.SessionApi(provisioningClient);

//region Logging in Provisioning API
//Logging in using our username and password
sessionApi.login({
    domain_username: username,
    password: password
}).then(resp => {
    if(resp.status.code !== 0) {
        throw new Error('Cannot log in');
    }
    
    return resp.data;
}).then(resp => {
    //region Obtaining Provisioning API Session
    //Obtaining sessionId and setting PROVISIONING_SESSIONID cookie to the client
    const sessionId = resp.sessionId;
    provisioningClient.defaultHeaders.Cookie = `PROVISIONING_SESSIONID=${sessionId};`;

    //region Creating UsersApi instance
    //Creating instance of UsersApi using the ApiClient
    const usersApi = new provisioning.UsersApi(provisioningClient);

    //region Describing and creating a user
    //Creating a user using UsersApi instance
    const user = {
        userName: "<agentUsername>",
        firstName: "<agentFirstName>",
        lastName: "<agentLastName>",
        password: "<agentPassword>",
        accessGroup: [ "<agentAccessGroup>" ]
    };

    return usersApi.addUser(user);
}).then(resp => {
    if(resp.status.code !== 0) {
        throw new Error("Cannot create user");
    }
    
    return resp.data;
}).then(data => {
    //region Logging out
    //Ending our Provisioning API session
    sessionApi.logout();
}).catch(err => {
    console.error(err);
});