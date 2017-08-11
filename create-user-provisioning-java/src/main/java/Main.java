import com.genesys.common.ApiClient;
import com.genesys.common.ApiResponse;
import com.genesys.provisioning.api.SessionApi;
import com.genesys.provisioning.api.UsersApi;
import com.genesys.provisioning.model.AddUserData;
import com.genesys.provisioning.model.ApiSuccessResponse;
import com.genesys.provisioning.model.LoginData;
import com.genesys.provisioning.model.LoginSuccessResponse;

import java.util.Arrays;
import java.util.Optional;

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
            ApiResponse<LoginSuccessResponse> loginResp = sessionApi.loginWithHttpInfo(loginData);
            if (loginResp.getData().getStatus().getCode() != 0) {
                throw new Exception("Cannot log in");
            }
            //endregion

            //region Obtaining Provisioning API Session
            //Obtaining sessionId and setting PROVISIONING_SESSIONID cookie to the client
            Optional<String> sessionCookie = loginResp.getHeaders().get("Set-Cookie").stream().filter(v -> v.startsWith("PROVISIONING_SESSIONID")).findFirst();
            if (sessionCookie.isPresent()) {
                client.addDefaultHeader("Cookie", sessionCookie.get());
            } else {
                throw new Exception("Session not found");
            }
            //endregion

            //region Creating UsersApi instance
            //Creating instance of UsersApi using the ApiClient
            final UsersApi usersApi = new UsersApi(client);
            //endregion

            //region Describing and creating a user
            //Filling necessary information and creating a user using UsersApi instance
            AddUserData usersData = new AddUserData();
            usersData.setUserName("username");
            usersData.setPassword("password");
            usersData.setFirstName("FirstName");
            usersData.setLastName("LastName");
            usersData.setAccessGroups(Arrays.asList("accessGroup"));
            ApiSuccessResponse resp = usersApi.addUser(usersData);
            if (resp.getStatus().getCode().equals(0)) {
                System.out.println("user created");
            } 
            else {
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


