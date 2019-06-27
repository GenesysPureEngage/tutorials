const ProvisioningApi = require('genesys-provisioning-client-js').ProvisioningApi;

const apiKey = "<apiKey>";
const apiUrl = "<apiUrl>";

//region Authorization code grant
//You'll need to use the Authentication API to get an authorization token. See https://github.com/GenesysPureEngage/authorization-code-grant-sample-app for an example of how to do this.
const authorizationToken = "<authorizationToken>";
//endregion

//region Create an instance of ProvisioningApi
//Here we create out ProvisioningApi object using the **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). 
//You can get the values for both of these from your PureEngage Cloud representative.
const provisioningApi = new ProvisioningApi(apiKey, apiUrl);
//endregion


async function main() {
	//region Initialize API
	//Initialize the API using the authorization token (or authorization code)
	await provisioningApi.initialize({token: authorizationToken});
	//endregion
	
	//region CSV File
	//Get the contents of the CSV file as a String.
	const fileName = "<fileName>";
	const fileContents = "<fileContents>";
	//endregion
	
	//region Pre-validate Import
	//Validate the import before importing.
	await provisioningApi.import.validateFile(fileName, fileContents);
	//endregion
	
	//region Import File
	//Import the given file with validateBeforeImport set to false.
	await provisioningApi.import.importFile(fileName, fileContents, false);
	//endregion
	
	//region Check Import Status
	//Get the current status of the imports. The import status includes info on how many imports have succeeded and failed as well as information about the last successful import.
	const status = await provisioningApi.import.getStatus("<adminName>", "<tenantName>");
	
	const succeedCount = status.succeedCount;
	const totalCount = status.totalCount;
	//endregion
	
	//region Terminate Import.
	//Terminate the current import.
	await provisioningApi.import.terminate();
	//endregion
	
	//region Log Out
	//Log out of your Provisioning API session.
	await provisioningApi.destroy();
	//endregion
}

main().catch((e) => console.error(e));