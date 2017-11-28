import com.genesys.internal.common.ApiClient;
import com.genesys.internal.provisioning.api.SessionApi;
import com.genesys.internal.provisioning.api.UsersApi;
import com.genesys.internal.provisioning.model.AddUserData;
import com.genesys.internal.provisioning.model.ApiSuccessResponse;
import com.genesys.internal.provisioning.model.LoginData;
import com.genesys.internal.provisioning.model.LoginSuccessResponse;
import java.net.CookieManager;
import java.util.Arrays;

public class Main {
    public static void main(String[] args) throws Exception {
        final String apiKey = "<apiKey>";
        final String username = "<username>";
        final String password = "<password>";
        final String apiUrl = "<apiUrl>";
        
        final String provisioningUrl = String.format("%s/provisioning/v3", apiUrl);
        
        //region Create an instance of ApiClient
        //First we need to create a new instance of the ApiClient class and set properties using the **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these from your PureEngage Cloud representative.        
        final ApiClient client = new ApiClient();
        client.setBasePath(provisioningUrl);
        client.addDefaultHeader("x-api-key", apiKey);
        client.getHttpClient().setCookieHandler(new CookieManager());
        client.setDebugging(true);
        //endregion

        //region Create an instance of SessionApi
        //Create an instance of SessionApi using the **client** you created in the previous step.
        final SessionApi sessionApi = new SessionApi(client);
        //endregion

        //region Login to the Provisioning API
        //Logging in using our username and password.
        LoginData loginData = new LoginData();
        loginData.setDomainUsername(username);
        loginData.setPassword(password);
        LoginSuccessResponse loginResp = sessionApi.login(loginData);
        if (loginResp.getStatus().getCode() != 0) {
            throw new Exception("Cannot log in");
        }
        //endregion

        //region Create an instance of UsersApi
        //Create an instance of UsersApi using the **client** you created previously.
        final UsersApi usersApi = new UsersApi(client);
        //endregion

        //region Create a new user
        //Create a new user with the specified values.
        AddUserData usersData = new AddUserData();
        usersData.setUserName("<agentUsername>");
        usersData.setPassword("<agentPassword>");
        usersData.setFirstName("<agentFirstName>");
        usersData.setLastName("<agentLastName>");
        usersData.setAccessGroups(Arrays.asList("<agentAccessGroup>"));
        ApiSuccessResponse resp = usersApi.addUser(usersData);
        if (resp.getStatus().getCode().equals(0)) {
            System.out.println("user created");
        } 
        else {
            System.err.println(resp);
            System.err.println("Cannot create agent");
        }
        //endregion

        //region Log out
        //Log out to end our Provisioning API session.
        sessionApi.logout();
        //endregion
    }
}













