import com.genesys.workspace.WorkspaceApi;
import com.genesys.workspace.models.User;
import com.genesys.workspace.models.targets.TargetSearchResult;


import com.genesys.internal.authentication.api.AuthenticationApi;
import com.genesys.internal.authentication.model.DefaultOAuth2AccessToken;
import com.genesys.internal.common.ApiClient;

import java.util.Base64;

public class Main {
        
	public static void main(String[] args) throws Exception {
            //region creating WorkspaceApi
            //Creating a WorkspaceApi object with the apiKey, baseUrl and 'debugEnabled' preference.
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
            DefaultOAuth2AccessToken resp = authApi.retrieveToken("password", authorization, "application/json", "*", clientId, null, agentUsername, agentPassword);

            User user = api.initialize(resp.getAccessToken()).get();
            api.activateChannels(user.getAgentId(), user.getAgentId());
            api.voice().setAgentReady();
			
            System.out.println("Searching for targets");
            TargetSearchResult result = api.targets().search("<searchTerm>");
            if(result.getTotalMatches() > 0) {
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













