const ProvisioningApi = require('genesys-provisioning-client-js').ProvisioningApi;

const apiKey = "<apiKey>";
const apiUrl = "<apiUrl>";

const provisioningUrl = `${apiUrl}/provisioning/v3`;

//region Authorization code grant
//You'll need to use the Authentication API to get an authorization token. See https://github.com/GenesysPureEngage/authorization-code-grant-sample-app for an example of how to do this.
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

	//region Search for Dns
	//Search for Dns given the specified search parameters (See https://developer.genhtcc.com/reference/provisioning/objects/ for a full list of parameters).
	//Extract the list of DNs and the total results count from the Results object returned by the API.
	const dnResults = await provisioningApi.objects.searchDns({
		dnType : '<dnType>',
		dnGroups : ['<dnGroups>'],
		limit : 5,
		searchTerm : '<searchTerm>',
		searchKey : '<searchKey>'
	});
	const dns = dnResults.dns;
	const totalDnCount = dnResults.totalCount;
	//endregion
	
	//region Search for Agent Groups
	//Search for agent groups given the specified search parameters (See https://developer.genhtcc.com/reference/provisioning/objects/ for a full list of parameters). 
	//Extract the list of AgentGroups and the total results count from the Results object returned by the API.
    const agentGroupResults = await provisioningApi.objects.searchAgentGroups({
		groupType : '<groupType>',
		limit : 5,
		searchTerm : '<searchTerm>',
		searchKey : '<searchKey>'
	});
	const agentGroups = agentGroupsResults.agentGroups;
	const totalAgentGroupCount = agentGroupResults.totalCount;
	//endregion
	
	//region Search for Dn Groups
	//Search for dn groups given the specified search parameters (See https://developer.genhtcc.com/reference/provisioning/objects/ for a full list of parameters). 
	//Extract the list of DnGroups and the total results count from the Results object returned by the API.
	const dnGroupResults = await provisioningApi.objects.searchDnGroups({
		limit : 5,
		searchTerm : '<searchTerm>',
		searchKey : '<searchKey>'
	});
	const dnGroups = dnGroupsResults.dnGroups;
	const totalDnGroupCount = dnGroupResults.totalCount;
	//endregion

	//region Log Out
	//Log out of your Provisioning API session.
	await provisioningApi.done();
	//endregion
}

main().catch((e) => console.error(e));