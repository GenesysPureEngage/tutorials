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
    //Usage: <apiKey> <clientId> <clietnSecret> <apiUrl>
    public static void main(String[] args) {
        final String apiKey = args[0];
        final String clientId = args[1];
        final String clientSecret = args[2];
        final String apiUrl = args[3];

        final String provisionUrl = String.format("%s/provisioning/v3", apiUrl);
        
        //region Initialize API Client
        //Create and setup ApiClient instance with your ApiKey and Provisioning API URL.
        final ApiClient client = new ApiClient();
        client.setBasePath(provisionUrl);
        client.addDefaultHeader("x-api-key", apiKey);
        client.getHttpClient().setCookieHandler(new CookieManager());
        client.setDebugging(true);
        //endregion

        try {
            //region Create LoginApi instance
            //Creating instance of LoginApi using the ApiClient.
            final SessionApi loginApi = new SessionApi(client);
            //endregion
            
            //region 3 Logging in Provisioning API
            //Logging in using our username and password
            LoginData loginData = new LoginData();
            loginData.setDomainUsername(clientId);
            loginData.setPassword(clientSecret);
            ApiResponse<LoginSuccessResponse> loginResp = loginApi.loginWithHttpInfo(loginData);
            if (loginResp.getData().getStatus().getCode() != 0) {
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
            loginApi.logout();
            //endregion
        } 
        catch (Exception ex) {
                System.err.println(ex);
        }
    }
}





