import com.genesys.provisioning.ProvisioningApi;
import com.genesys.provisioning.ProvisioningApiException;
import com.genesys.provisioning.models.ExportFilterParams;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Timer;
import java.util.TimerTask;

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
		
		//region Export File
		//Export the given file with the given fields and person DBIDs.
		final String exportId = provisioningApi.exports.exportFile(Arrays.asList("<fields>"), "<fileName>", Arrays.asList("<DBIDs>"),
			new ExportFilterParams()
			.sortBy(Arrays.asList("<sortBy>"))
			.order("Ascending")
		);
		//endregion
				
		System.out.println(exportId);
		
		//region Monitor Export
		//Using a timer the export can be monitored by calling getExportStatus each second and getting the export progress.
		Timer timer = new Timer();
		timer.schedule(new TimerTask() {
			
			@Override public void run() {
				try {
					//region Get Export Status
					//Get the status of the export given the export's ID.
					BigDecimal status = provisioningApi.exports.getExportStatus(exportId);
					//endregion
					
					System.out.println(Math.floor(status.doubleValue()*100)+"% done");
			
					if(status.doubleValue() == 1.0) {
						//region File URL
						//Once the export is done the download URL can be used to download the CSV file.
						System.out.println("Done exporting. Download URL: " + provisioningApi.exports.getDownloadUrl(exportId));
						//endregion
						
						//region Download File
						//We can use the ProvisioningApi to download the CSV file given its ID.
						String csvFileContents = provisioningApi.exports.downloadFile(exportId);
						//endregion
						
						//region Log out
						//Log out to end our Provisioning API session.
						provisioningApi.done();
						//endregion
						
						timer.cancel();
					}
				} catch(ProvisioningApiException e) {
					e.printStackTrace();
					System.out.println(e);
				}
			}
		}, 0, 1000);
		//endregion
        
    }
}













