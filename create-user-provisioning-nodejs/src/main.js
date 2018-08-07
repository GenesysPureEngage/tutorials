const ProvisioningApi = require('genesys-provisioning-client-js').ProvisioningApi;

const apiKey = "<apiKey>";
const apiUrl = "<apiUrl>";

const provisioningUrl = `${apiUrl}/provisioning/v3`;

//region Authorization code grant
//You'll need to use the Authentication API to get an authorization token.
const authorizationToken = "<authorizationToken>";
//endregion

//region Create an instance of ProvisioningApi
//Here we create out ProvisioningApi object using the **apiKey** (required to submit API requests) and **provisioningUrl** (base URL that provides access to the PureEngage Cloud APIs). 
//You can get the values for both of these from your PureEngage Cloud representative.
const provisioningApi = new ProvisioningApi(apiKey, provisioningUrl);
//endregion

async function main() {
	//region Initialize API
	//Initialize the API using the authorization token (or authorization code)
	await provisioningApi.initialize({token: authorizationToken});
	//endregion

	//region Create a new user
	//Create a new user with the specified values.
	const user = {
		userName: "Agent-6",
		firstName: "Agent",
		lastName: "Agent",
		password: "Agent123"
		//accessGroup: ['<agentAccessGroups>']
	};
	await provisioningApi.users.addUser(user);
	//endregion
	
	//region Log Out
	//Log out of your Provisioning API session.
	await provisioningApi.done();
	//endregion
}

main().catch((e) => console.error(e));