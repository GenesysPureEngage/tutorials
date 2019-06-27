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
	
	//region Export File
	//Export the given file with the given fields and person DBIDs.
	const exportId = await provisioningApi.export.exportFile({
		fields:["<fields>"],
		fileName: "<fileName>",
		personDBIDs: ["<DBIDs>"],
		filterParameters: {
		subResources: "<subResources>",
		agentGroupFilter: ["<agentGroups>"],
		sortBy: ["<sortBy>"],
		order: "Ascending"
		}
	});
	//endregion
		
	//region Monitor Export
	//The export can be monitored by calling getExportStatus each second and getting the export progress.
	let progress = 0.0;
	while(progress < 1.0) {
		await new Promise((resolve, reject) => setTimeout(resolve, 1000));
		
		let status = await provisioningApi.export.getStatus(exportId);
		progress = status.progress;
		console.log(status);
	}
	//endregion
	
	//region File URL
	//Once the export is done the download URL can be used to download the CSV file.
	console.log("Done exporting. Download URL: " + provisioningApi.export.getDownloadUrl(exportId));
	//endregion
	
	//region Download File
	//Or we can use the ProvisioningApi to download the CSV file given its ID.
	const csvFileContents = await provisioningApi.export.downloadExport(exportId);
	//endregion
	
	//region Log Out
	//Log out of your Provisioning API session.
	await provisioningApi.destroy();
	//endregion
}

main().catch((e) => console.error(e));