import com.genesys.common.ApiClient;
import com.genesys.common.ApiResponse;
import com.genesys.workspace.api.SessionApi;
import com.genesys.workspace.model.ApiSuccessResponse;
import com.genesys.workspace.model.CurrentSession;

import com.genesys.authorization.api.AuthenticationApi;
import com.genesys.authorization.model.DefaultOAuth2AccessToken;

import java.util.Optional;
import java.util.Base64;

public class Main {
    public static void main() {
    	
        final String apiKey = "<api key>";
        
        final String clientId = "<client id>";
        final String clientSecret = "<client <client secret>>";
        
        final String workspaceUrl = "https://<api url>/workspace/v3";
        final String authUrl = "https://<api url>/auth/v3";
        
        final String username = "agent-<consult agent number>";
        final String password = "<agent password>";
		
		
		//region Initialize Workspace Client
        //Create and setup an ApiClient instance with your ApiKey and Workspace API URL.
        final ApiClient client = new ApiClient();
        client.setBasePath(workspaceUrl);
        client.addDefaultHeader("x-api-key", apiKey);
        
        //region Initialize Authorization Client
        //Create and setup an ApiClient instance with your ApiKey and Authorization API URL.
        final ApiClient authClient = new ApiClient();
        authClient.setBasePath(authUrl);
        authClient.addDefaultHeader("x-api-key", apiKey);
        
        
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
            
            final String authorization = "Basic " + new String(Base64.getEncoder().encode( (clientId + ":" + clientSecret).getBytes()));
            final DefaultOAuth2AccessToken accessToken = authApi.retrieveToken("password", clientId, username, password, authorization);
            
            System.out.println("Retrieved access token");
            System.out.println("Initializing workspace...");
            
            final ApiResponse<ApiSuccessResponse> response = sessionApi.initializeWorkspaceWithHttpInfo("", "", "Bearer " + accessToken.getAccessToken());
            
            Optional<String> session = response.getHeaders().get("set-cookie").stream().filter(v -> v.startsWith("WORKSPACE_SESSIONID")).findFirst();
            
            if(session.isPresent()) {
            	client.addDefaultHeader("Cookie", session.get());
            } else {
            	throw new Exception("Could not find session");
            }
            
            System.out.println("Got workspace session id");
            
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





