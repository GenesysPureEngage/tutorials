(async function() {
    const Authorization = require('genesys-authorization-client-js');
    const Statistics = require('genesys-statistics-client-js');
    const logger = require('winston');

    const apiKey = "<apiKey>";
    const apiUrl = "<apiUrl>";

    const client = new Authorization.ApiClient();
    client.basePath = `${apiUrl}/auth/v3`;
    client.defaultHeaders = {'x-api-key': apiKey};
    client.enableCookies = true;

    const agentUsername = "<agentUsername>";
    const agentPassword = "<agentPassword>";
    const clientId = "<clientId>";
    const clientSecret = "<clientSecret>";

    //region Instantiating Statistics
    //Creating a Statistics object with the apiKey, apiUrl
    const api = new Statistics(apiKey, apiUrl);
    //endregion

    //region Authentication
    //Obtaining authentication token
    const authApi = new Authorization.AuthenticationApi(client);
    const opts = {
        authorization: "Basic " + new Buffer(`${clientId}:${clientSecret}`).toString("base64"),
        clientId: clientId,
        scope: '*',
        username: agentUsername,
        password: agentPassword
    };
    
    try {    
        let resp = await authApi.retrieveTokenWithHttpInfo("password", opts);
        const data = resp.response.body;
        const token = data.access_token;
        if(!token) {
            throw new Error('Cannot get access token');
        }

        logger.info(`token: ${token}`);
        //endregion

        //region Initializing Statistics
        //Initializing Statistics with a obtained earlier authentication token
         await api.initialize(token);
        //endregion

        //region Retrieving current values of existing agent statistics
        //There we use agent's username as objectId. The objectId for agent is employeeId. Usually it's equal to username, but it can be configured (in config server) to have different value. 
        let statistics = [
            { name: "CurrentAgentState", objectId: agentUsername, objectType: "Agent" },
            { name: "TimeInCurrentState", objectId: agentUsername, objectType: "Agent" }
        ];

        resp = await api.getStatValues(statistics);
        logger.info(resp);    

        await new Promise((resolve, reject) => setTimeout(resolve, 10000));

        resp = await api.getStatValues(statistics);
        logger.info(resp);        
        //endregion
        
        authApi.signOut(token);
    }
    catch(err) {
        logger.error(err);
    }
    
    api.destroy();

})();
