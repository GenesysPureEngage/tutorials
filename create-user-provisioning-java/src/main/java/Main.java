import com.genesys.common.ApiClient;
import com.genesys.common.ApiResponse;
import com.genesys.provisioning.api.SessionApi;
import com.genesys.provisioning.api.UsersApi;
import com.genesys.provisioning.model.AddUserData;
import com.genesys.provisioning.model.ApiSuccessResponse;
import com.genesys.provisioning.model.LoginData;
import com.genesys.provisioning.model.LoginSuccessResponse;

import java.net.CookieManager;
import java.util.Arrays;

public class Main {
    //Usage: <apiKey> <username> <password> <apiUrl>
    public static void main(String[] args) {
        final String apiKey = args[0];
        final String username = args[1];
        final String password = args[2];
        final String apiUrl = args[3];
        
        final String provisioningUrl = String.format("%s/provisioning/v3", apiUrl);
        
        //region Initialize API Client
        //Create and setup ApiClient instance with your ApiKey and Provisioning API URL.
        
        final ApiClient client = new ApiClient();
        client.setBasePath(provisioningUrl);
        client.addDefaultHeader("x-api-key", apiKey);
        client.getHttpClient().setCookieHandler(new CookieManager());
        client.setDebugging(true);
        //endregion

        try {
            //region Create SessionApi instance
            //Creating instance of SessionApi using the ApiClient.
            final SessionApi sessionApi = new SessionApi(client);
            //endregion

            //region Logging in Provisioning API
            //Logging in using our username and password
            LoginData loginData = new LoginData();
            loginData.setDomainUsername(username);
            loginData.setPassword(password);
            LoginSuccessResponse loginResp = sessionApi.login(loginData);
            if (loginResp.getStatus().getCode() != 0) {
                throw new Exception("Cannot log in");
            }
            //endregion
			
            //region Creating UsersApi instance
            //Creating instance of UsersApi using the ApiClient
            final UsersApi usersApi = new UsersApi(client);
            //endregion

            //region Describing and creating a user
            //Filling necessary information and creating a user using UsersApi instance
            AddUserData usersData = new AddUserData();
            usersData.setUserName("Username");
            usersData.setPassword("Password123");
            usersData.setFirstName("FirstName");
            usersData.setLastName("LastName");
            usersData.setAccessGroups(Arrays.asList("Users"));
            usersData.setAgentGroups(Arrays.asList("tutorials"));
            ApiSuccessResponse resp = usersApi.addUser(usersData);
            if (resp.getStatus().getCode().equals(0)) {
                System.out.println("user created");
            } 
            else {
                System.err.println(resp);
                System.err.println("Cannot create user");
            }
            //endregion

            //region Logging out
            //Ending our Provisioning API session
            sessionApi.logout();
            //endregion
        } 
        catch (Exception ex) {
        	ex.printStackTrace();
            System.err.println(ex);
        }
    }
}


