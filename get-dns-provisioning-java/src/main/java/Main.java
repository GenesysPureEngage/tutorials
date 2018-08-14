import com.genesys.provisioning.ProvisioningApi;
import com.genesys.provisioning.models.Results;
import com.genesys.provisioning.models.Dn;

import java.util.List;
import java.util.Arrays;

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
		
		List<String> dnDBIDs = Arrays.asList("<dnDBIDs>");
		//region Get Dns (Directory Numbers)
		//Search for agent groups given the specified search parameters. 
		//Extract the list of Dn objects from the Results object returned by the API.
        Results<Dn> searchResults = provisioningApi.objects.getDnsByDBIDs(dnDBIDs);
        List<Dn> dns = searchResults.getResults();
		//endregion
		
        //region Log out
        //Log out to end our Provisioning API session.
        provisioningApi.done();
        //endregion
    }
}













