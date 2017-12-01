import com.genesys.internal.authentication.api.AuthenticationApi;
import com.genesys.internal.authentication.model.DefaultOAuth2AccessToken;
import com.genesys.internal.common.ApiClient;
import com.genesys.workspace.WorkspaceApi;
import com.genesys.workspace.models.User;
import java.util.Base64;

public class Main {
    public static void main(String[] args) throws Exception {
        String apiKey = "<apiKey>";
        String apiUrl = "<apiUrl>";
        
        //region Create an instance of WorkspaceApi
        //First we need to create a new instance of the WorkspaceApi class with the following parameters: **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these parameters from your PureEngage Cloud representative.
        WorkspaceApi api = new WorkspaceApi(apiKey, apiUrl);
        //endregion

        //region Authentication
        //Now we can authenticate using the Authentication Client Library. We're following the Resource Owner Password Credentials Grant flow in this tutorial, but you would typically use Authorization Code Grant for a web-based agent application.
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
        //Initialize the Workspace API by calling `initialize()` and passing **token**, which we received from the Authentication API. This returns the current user, which we then print.
        User user = api.initialize(resp.getAccessToken()).get();
        System.out.println("The workspace api is now successfully initialized");
        System.out.println("User data: " + user); 
        //endregion

        api.destroy();
   }
}













