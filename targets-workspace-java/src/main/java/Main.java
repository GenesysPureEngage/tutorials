import com.genesys.internal.authentication.api.AuthenticationApi;
import com.genesys.internal.authentication.model.DefaultOAuth2AccessToken;
import com.genesys.internal.common.ApiClient;
import com.genesys.workspace.WorkspaceApi;
import com.genesys.workspace.models.User;
import com.genesys.workspace.models.targets.SearchResult;
import com.genesys.workspace.models.targets.Target;
import java.util.Base64;

public class Main {
        
	public static void main(String[] args) throws Exception {
            String apiKey = "<apiKey>";
            String apiUrl = "<apiUrl>";

            //region Create an instance of WorkspaceApi
            //First we need to create a new instance of the WorkspaceApi class with the following parameters: **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these parameters from your PureEngage Cloud representative.
            WorkspaceApi api = new WorkspaceApi(apiKey, apiUrl);
            //endregion

            String authUrl = String.format("%s/auth/v3", apiUrl);
            ApiClient authClient = new ApiClient();
            authClient.setBasePath(authUrl);
            authClient.addDefaultHeader("x-api-key", apiKey);
            authClient.getHttpClient().setFollowRedirects(false);

            AuthenticationApi authApi = new AuthenticationApi(authClient); 
			
            String agentUsername = "<agentUsername>";
            String agentPassword = "<agentPassword>";
            String clientId = "<clientId>";
            String clientSecret = "<clientSecret>";

            String authorization = "Basic " + new String(Base64.getEncoder().encode(String.format("%s:%s", clientId, clientSecret).getBytes()));
            DefaultOAuth2AccessToken resp = authApi.retrieveToken("password", authorization, "application/json", "*", clientId, null, agentUsername, agentPassword);

            //region Initialization
            //Initialize the Workspace API by calling `initialize()` and passing **token**, which is the access token provided by the Authentication Client Library when you follow the Resource Owner Password Credentials Grant flow. Finally, call `activateChannels()` to initialize the voice channel for the agent and DN.
            User user = api.initialize(resp.getAccessToken()).get();
            api.activateChannels(user.getAgentId(), user.getAgentId());
            api.voice().setAgentReady();
            
            //region Search for targets
            //Now we can use `targets.search()` to find targets that match our search term.
            System.out.println("Searching for targets");
            SearchResult<Target> result = api.targets().search("<searchTerm>");

            //region Print targets
            //If our search returned any results, let's include them with the name and phone number in the console log.
            if(result.getTotal() > 0) {
                result.getTargets().forEach(target -> {
                    System.out.println("Name: " + target.getName());
                    System.out.println("PhoneNumber: " + target.getNumber());
                });
            }
            else {
                    System.out.println("Search came up empty");
            }

            System.out.println("done");
            api.destroy();
	}
}













