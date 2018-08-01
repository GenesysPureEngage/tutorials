const provisioning = require('genesys-provisioning-client-js');

const apiKey = "<apiKey>";
const username = "<username>";
const password = "<password>";
const apiUrl = "<apiUrl>";

const provisioningUrl = `${apiUrl}/provisioning/v3`;

//region Authorization code grant
//You'll need to use the Authentication API to get an authorization token.
const authorizationToken = "<authorizationToken>";
//endregion

//region Create an instance of ApiClient
//First we need to create a new instance of the ApiClient class and set properties using the **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). 
//You can get the values for both of these from your PureEngage Cloud representative.
//Don't forget to provide the authorization token from the previous step.  
const provisioningClient = new provisioning.ApiClient();
provisioningClient.basePath = provisioningUrl;
provisioningClient.defaultHeaders = { 
    'x-api-key': apiKey,
    Authorization: `Bearer ${authorizationToken}`
};
//endregion

//region Create an instance of UsersApi
//Create an instance of UsersApi using the **client** you created previously.
const usersApi = new provisioning.UsersApi(provisioningClient);
//endregion

//region Create a new user
//Create a new user with the specified values.
const user = {
    data: {
        userName: "<agentUsername>",
        firstName: "<agentFirstName>",
        lastName: "<agentLastName>",
        password: "<agentPassword>",
        accessGroup: ["<agentAccessGroup>"]
    }
};
//endregion

usersApi.addUser(user).then(resp => {
    if(resp.status.code !== 0) {
        throw new Error("Cannot create user");
    }
    
    return resp.data;
}).then(data => {
    console.log(data);
}).catch(console.error);
