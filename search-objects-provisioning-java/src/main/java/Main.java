import com.genesys.provisioning.ProvisioningApi;
import com.genesys.provisioning.models.SearchParams;
import com.genesys.provisioning.models.Results;
import com.genesys.provisioning.models.Dn;
import com.genesys.provisioning.models.AgentGroup;
import com.genesys.provisioning.models.DnGroup;
import com.genesys.provisioning.models.Skill;

import java.util.List;
import java.util.Map;
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
        //The ProvisioningAPi object uses the base path for provisioning and your API key in its constructor.
        ProvisioningApi provisioningApi = new ProvisioningApi(provisioningUrl, apiKey);
        //endregion
        
        //region Initialize ProvisioningApi
        //The ProvisioningApi needs to be initialized with either an authorization token or an authorization code retrieved from the auth service.
        provisioningApi.initializeWithToken(authorizationToken);
		//endregion
		
		//region Search for Dns
		//Search for Dns given the specified search parameters.
		//Extract the list of Dn objects and the total results count from the Results object returned by the API.
        Results<Dn> dnSearchResults = provisioningApi.objects.searchDns("<dnType>", Arrays.asList("<dnGroups>"), new SearchParams()
        	.limit(5)
        	.searchTerm("<searchTerm>")
        	.searchKey("<searchKey>"));
        List<Dn> dns = dnSearchResults.getResults();
        int totalDnCount = dnSearchResults.getTotalCount();
		//endregion
		
		//region Search for Agent Groups
		//Search for agent groups given the specified search parameters. 
		//Extract the list of AgentGroup objects and the total results count from the Results object returned by the API.
        Results<AgentGroup> agentGroupSearchResults = provisioningApi.objects.searchAgentGroups("<groupType>", new SearchParams()
        	.limit(5)
        	.searchTerm("<searchTerm>")
        	.searchKey("<searchKey>"));
        List<AgentGroup> agentGroups = agentGroupSearchResults.getResults();
        int totalAgentGroupCount = agentGroupSearchResults.getTotalCount();
		//endregion
		
		//region Search for Dn Groups
		//Search for dn groups given the specified search parameters. 
		//Extract the list of DnGroup objects and the total results count from the Results object returned by the API.
        Results<DnGroup> dnGroupSearchResults = provisioningApi.objects.searchDnGroups(new SearchParams()
        	.limit(5)
        	.searchTerm("<searchTerm>")
        	.searchKey("<searchKey>"));
        List<DnGroup> dnGroups = dnGroupSearchResults.getResults();
        int totalDnGroupCount = dnGroupSearchResults.getTotalCount();
		//endregion
		
		// region Search for Skills
		//Search for skills given the specified search parameters. 
		//Extract the list of Skill objects and the total results count from the Results object returned by the API.
        Results<Skill> skillSearchResults = provisioningApi.objects.searchSkills(new SearchParams()
        	.limit(5)
        	.searchTerm("<searchTerm>")
        	.searchKey("<searchKey>"), false);
        List<Skill> skills = skillSearchResults.getResults();
        int totalSkillCount = skillSearchResults.getTotalCount();
		//endregion
		
        //region Log out
        //Log out to end our Provisioning API session.
        provisioningApi.done();
        //endregion
    }
}













