(async function() {
    const Authorization = require('genesys-authorization-client-js');
    const Statistics = require('genesys-statistics-client-js');
    const uuid = require('uuid/v4');
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

    //region Create an instance of Statistics
    //First we need to create a new instance of the Statistics class and set properties using the **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these from your PureEngage Cloud representative.
    const api = new Statistics(apiKey, apiUrl);
    //endregion

    //region Authentication
	//Use the Authentication Client Library to get an authentication token.
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
        
        
        //region Register notifications handlers
		//Here we register handlers for ServiceState (`onServiceChange`) and StatisticValueNotification (`onValues`) notifications.
        api.on(api.SERVICE_CHANGE_EVENT, data => {
            logger.info(data);
        });
        api.on(api.UPDATES_EVENT, data => {
            logger.info(data);
        });
        //endregion

        //region Initialize Statistics
		//Initialize Statistics with the authentication token we received earlier.
         await api.initialize(token);
        //endregion

        //region Create a subscription
		//Now we use the agent's username as the objectId. The objectId for an agent is the employeeId, which is usually also the agent' username. However, you can configure the employeeId in Configuration Server to have a different value.
        let descriptors = [
            { name: "CurrentAgentState", objectId: agentUsername, objectType: "Agent", statisticId: uuid() },
            { name: "TimeInCurrentState", objectId: agentUsername, objectType: "Agent", statisticId: uuid() }
        ];

        resp = await api.createSubscription(uuid(), descriptors);
        logger.info(resp);
        //endregion

        //region Statistics notifications
		//Wait for a statistics update. If the agent state is changed, we'll receive a notification. We'll also get periodic notifications about the value of timeInCurrentState. Thread.sleep is used for tutorial purposes only.
        await new Promise((resolve, reject) => setTimeout(resolve, 60000));
        //endregion

        //region Subscription cleanup
		//Delete the subscription.
        if(resp.data) {
            await api.deleteSubscription(resp.data.subscriptionId);
        }
        //endregion

        //region Cleanup
		//Close our sessions.
        authApi.signOut(token);
        //endregion
    }
    catch(err) {
        logger.error(err);
    }
    
    api.destroy();

})();
