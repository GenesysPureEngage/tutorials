import com.genesys.provisioning.ProvisioningApi;

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

		//region Get Options
		//Get the options as a Map<String, Object>.
		Map<String, Object> options = provisioningApi.options.getOptions("<personDBID>","<agentGroupDBID>").getOptions();
		//endregion
		
		options.put("<property>", "<value>");
		
		
		//region Modify Options
		//After the options object has been changed, update them using the API.
		//provisioningApi.options.modifyOptions(options);
		//endregion
		
        //region Log out
        //Log out to end our Provisioning API session.
        provisioningApi.done();
        //endregion
    }
}