import com.genesys.provisioning.ProvisioningApi;
import com.genesys.provisioning.models.User;
import com.genesys.provisioning.models.Person;

import java.util.Arrays;

public class Main {
    public static void main(String[] args) throws Exception {
    	
        final String apiKey = "<apiKey>";
        final String apiUrl = "<apiUrl>";
        
        final String provisioningUrl = String.format("%s/provisioning/v3", apiUrl);
        
        //region Authorization code grant
        //You'll need to use the Authentication API to get an authorization token. See https://github.com/GenesysPureEngage/authorization-code-grant-sample-app for an example of how to do this.
        String authorizationToken = "<authorizationToken>";
        //endregion
        
        //region Create an instance of ProvisioningApi
        //The ProvisioningApi object uses the base path for provisioning and your API key in its constructor.
        ProvisioningApi provisioningApi = new ProvisioningApi(provisioningUrl, apiKey);
        //endregion
        
        //region Initialize ProvisioningApi
        //The ProvisioningApi needs to be initialized with either an authorization token or an authorization code retrieved from the auth service.
        provisioningApi.initializeWithToken(authorizationToken);
		//endregion
		
        //region Create a new user
        //Create a new user with the specified values. Then extract the user's DBID from the Person object returned.
        User user = new User()
        	.userName("<agentUserName>")
        	.password("<agentPassword>")
        	.firstName("<agentFirstName>")
        	.lastName("<agentLastName>")
       		.accessGroups(Arrays.asList("<agentAccessGroup>"));
       	
        Person personInfo = provisioningApi.users.addUser(user);
        String DBID = personInfo.getDBID();
        //endregion
        
        //region Update a user
        //Updates the attributes of the user with the given DBID.
        user.password("<newAgentPassword>")
        	.firstName("<newAgentFirstName>")
        	.lastName("<newAgentLastName>")
       		.accessGroups(Arrays.asList("<newAgentAccessGroup>"));
       	
        provisioningApi.users.updateUser(DBID, user);
        //endregion
        
        //region Delete a user
        //Deletes the user with the given DBID.
        provisioningApi.users.deleteUser(DBID, false);
        //endregion
		
        //region Log out
        //Log out to end our Provisioning API session.
        provisioningApi.done();
        //endregion
    }
}













