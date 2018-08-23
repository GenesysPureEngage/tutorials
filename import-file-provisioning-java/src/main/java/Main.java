import com.genesys.provisioning.ProvisioningApi;
import com.genesys.provisioning.models.ImportStatus;

import java.io.File;
import java.util.Map;

public class Main {
    public static void main(String[] args) throws Exception {
    	
        final String apiKey = "<apiKey>";
        final String apiUrl = "<apiUrl>";
        
        final String provisioningUrl = String.format("%s/provisioning/v3", apiUrl);
        
        //region Authorization code grant
        //You'll need to use the Authentication API to get an authorization token. See https://github.com/GenesysPureEngage/authorization-code-grant-sample-app for an example of how to do this.
        String authorizationToken = "<authorizationToken>";
        //endregion
        
        //region Create an instance of ProvisioningApi
        //The ProvisioningAPi object uses the base path for provisioning and your API key in its constructor.
        ProvisioningApi provisioningApi = new ProvisioningApi(provisioningUrl, apiKey);
        //endregion
        
        //region Initialize ProvisioningApi
        //The ProvisioningApi needs to be initialized with either an authorization token or an authorization code retrieved from the auth service.
        provisioningApi.initializeWithToken(authorizationToken);
		//endregion
		
		//region CSV File
		//Get the contents of the CSV file as a String.
		String fileName = "<fileName>";
		String fileContents = "<fileContents>";
		//endregion
		
		//region Pre-validate Import
		//Validate the import before importing.
		provisioningApi.imports.validateFile(fileName, fileContents);
		//endregion
		
		//region Import File
		//Import the given file with validateBeforeImport set to false.
		provisioningApi.imports.importFile(fileName, fileContents, false);
		//endregion
		
		//region Check Import Status
		//Get the current status of the imports. The import status includes info on how many imports have succeeded and failed as well as information about the last successful import.
		ImportStatus status = provisioningApi.imports.getImportStatus("<adminName>", "<tenantName>");
		double succeedCount = status.getSucceedCount().doubleValue();
		double totalCount = status.getTotalCount().doubleValue();
		//endregion
		
		//region Terminate Import.
		//Terminate the current import.
		provisioningApi.imports.terminateImport();
		//endregion
		
        //region Log out
        //Log out to end our Provisioning API session.
        provisioningApi.done();
        //endregion
    }
}













