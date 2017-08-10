import com.genesys.common.ApiClient;
import com.genesys.common.ApiResponse;
import com.genesys.workspace.api.SessionApi;
import com.genesys.workspace.model.ApiSuccessResponse;
import com.genesys.workspace.model.CurrentSession;

import com.genesys.authorization.api.AuthenticationApi;
import com.genesys.authorization.model.DefaultOAuth2AccessToken;
import java.net.CookieHandler;
import java.net.CookieManager;

import java.util.Optional;
import java.util.Base64;

public class Main {
    
    //Usage: <apiKey> <apiUrl> <agentUsername> <agentPassword>
    public static void main(String[] args) {
        final String apiKey = args[0];
        final String apiUrl = args[1];
        final String username = args[2];
        final String password = args[3];

        final String workspaceUrl = String.format("%s/workspace/v3", apiUrl);
        final String authUrl = apiUrl;

        CookieManager cookieManager = new CookieManager();
        
        //region Initialize Workspace Client
        //Create and setup an ApiClient instance with your ApiKey and Workspace API URL.
        final ApiClient client = new ApiClient();
        client.setBasePath(workspaceUrl);
        client.addDefaultHeader("x-api-key", apiKey);
        client.getHttpClient().setCookieHandler(cookieManager);
        
        //region Initialize Authorization Client
        //Create and setup an ApiClient instance with your ApiKey and Authorization API URL.
        final ApiClient authClient = new ApiClient();
        authClient.setBasePath(authUrl);
        authClient.addDefaultHeader("x-api-key", apiKey);
        authClient.getHttpClient().setCookieHandler(cookieManager);
        
        try {
        	
            //region Create SessionApi instances
            //Creating instances of SessionApi using the workspace ApiClient which will be used to make api calls.
            final SessionApi sessionApi = new SessionApi(client);
            
            //region Create AuthenticationApi instance
            //Create instance of AuthenticationApi using the authorization ApiClient which will be used to retrieve access token.
            final AuthenticationApi authApi = new AuthenticationApi(authClient); 
			
            //region Oauth2 Authentication
            //Performing Oauth 2.0 authentication.
            System.out.println("Retrieving access token...");
            final String authorization = "Basic " + new String(Base64.getEncoder().encode("external_api_client:secret".getBytes()));
            final DefaultOAuth2AccessToken accessToken = authApi.retrieveToken("password", "scope",  authorization, "application/json", "external_api_client", username, password);
            if(accessToken == null || accessToken.getAccessToken() == null) {
                throw new Exception("Could not retrieve token");
            }
            
            System.out.println("Initializing workspace...");
            final ApiSuccessResponse response = sessionApi.initializeWorkspace("", "", "Bearer " + accessToken.getAccessToken());
            if(response.getStatus().getCode() != 0 && response.getStatus().getCode() != 1) {
                throw new Exception("Cannot initialize workspace");
            }
            
            //region Current session information
            //Obtaining current session information using SessionApi
            CurrentSession currentSession = sessionApi.getCurrentSession();
            System.out.println(currentSession);

            //region Logging out
            //Ending our Workspace API session
            sessionApi.logout();
        }
        catch(Exception ex) {
                System.err.println(ex);
        }
    }
}





