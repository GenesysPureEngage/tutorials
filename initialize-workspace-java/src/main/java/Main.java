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
        
        //region creating WorkspaceApi
        //Creating a WorkspaceApi object with the apiKey, baseUrl and 'debugEnabled' preference.
        WorkspaceApi api = new WorkspaceApi(apiKey, apiUrl, false);
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
        DefaultOAuth2AccessToken resp = authApi.retrieveToken("password", authorization, "application/json", "*", clientId, agentUsername, agentPassword);

        User user = api.initialize(resp.getAccessToken()).get();
        System.out.println("The workspace api is now successfully initialized");
        System.out.println("User data: " + user); 


        api.destroy();
   }
}













