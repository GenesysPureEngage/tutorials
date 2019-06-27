import com.genesys.provisioning.ProvisioningApi;
import com.genesys.provisioning.ProvisioningApiException;
import com.genesys.provisioning.models.UserSearchParams;
import com.genesys.provisioning.models.User;
import java.util.concurrent.CompletableFuture;

import java.util.Map;

public class Main {
	static final CompletableFuture<Void> done = new CompletableFuture<>();
	
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
        final ProvisioningApi provisioningApi = new ProvisioningApi(provisioningUrl, apiKey);
        //endregion
        
        //region Initialize ProvisioningApi
        //The ProvisioningApi needs to be initialized with either an authorization token or an authorization code retrieved from the auth service.
        provisioningApi.initializeWithToken(authorizationToken);
		//endregion
		
		//region Get Users Async
		//Get a list of users with the specified parameters.
		provisioningApi.operations.getUsersAsync(new UserSearchParams()
			.filterName("<filterName>")
			.filterParameters("<filterParameters>")
			.limit(5)
		, (Map<String, Object> users) -> {
			System.out.println(users);
			//Do something with users here.
			
			done.complete(null);
		});
		//endregion
		done.get();
        //region Log out
		//Log out to end our Provisioning API session.
		provisioningApi.done();
		//endregion
    }
}