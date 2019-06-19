const ProvisioningApi = require('genesys-provisioning-client-js').ProvisioningApi;

const apiKey = "<apiKey>";
const apiUrl = "<apiUrl>";

//region Authorization code grant
//You'll need to use the Authentication API to get an authorization token. See https://github.com/GenesysPureEngage/authorization-code-grant-sample-app for an example of how to do this.
const authorizationToken = "<authorizationToken>";
//endregion

//region Create an instance of ProvisioningApi
//Here we create out ProvisioningApi object using the **apiKey** (required to submit API requests) and **provisioningUrl** (base URL that provides access to the PureEngage Cloud APIs). 
//You can get the values for both of these from your PureEngage Cloud representative.
const provisioningApi = new ProvisioningApi(apiKey, apiUrl);
//endregion

async function main() {
	//region Initialize API
	//Initialize the API using the authorization token (or authorization code)
	await provisioningApi.initialize({token: authorizationToken});
	//endregion
	
	//region Get Users Async
	//Get a list of users with the specified parameters. The users will be returned asynchronously through the callback argument.
	await provisioningApi.operations.getUsers({
		filterName : "FirstNameOrLastNameMatches",
		filterParameters : "<agentFirstName>",
		limit : 5
	}, async (results) => {
		
		//Do something with users here
		const users = results.users;
		//region Log Out
		//Log out of your Provisioning API session.
		await provisioningApi.destroy();
		//endregion
	});
	//endregion
	
	
}

main().catch((e) => console.error(e));
