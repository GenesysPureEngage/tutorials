import com.genesys.internal.authentication.api.AuthenticationApi;
import com.genesys.internal.authentication.model.DefaultOAuth2AccessToken;
import com.genesys.internal.common.ApiClient;
import com.genesys.internal.statistics.model.PeekedStatisticValue;
import com.genesys.statistics.StatisticInfo;
import com.genesys.statistics.Statistics;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Main {
    private static final Logger logger = LoggerFactory.getLogger(Main.class);
        
	public static void main(String[] args) throws Exception {
            //region creating Statistics
            //Creating a Statistics object with the apiKey, apiUrl
            String apiKey = "<apiKey>";
            String apiUrl = "<apiUrl>";
            Statistics api = new Statistics(apiKey, apiUrl);
            //endregion

            //region Authentication
            //Obtaining authentication token
            String authUrl = String.format("%s/auth/v3", apiUrl);
            ApiClient authClient = new ApiClient();
            authClient.setBasePath(authUrl);
            authClient.addDefaultHeader("x-api-key", apiKey);
            authClient.getHttpClient().setFollowRedirects(false);
            
            logger.info("Retreiving token");
            AuthenticationApi authApi = new AuthenticationApi(authClient); 
			
            String agentUsername = "<agentUsername>";
            String agentPassword = "<agentPassword>";
            String clientId = "<clientId>";
            String clientSecret = "<clientSecret>";

            String authorization = "Basic " + new String(Base64.getEncoder().encode(String.format("%s:%s", clientId, clientSecret).getBytes()));
            DefaultOAuth2AccessToken resp = authApi.retrieveToken("password", authorization, "application/json", "*", clientId, null, agentUsername, agentPassword);
            
            String token = resp.getAccessToken();
            logger.info("Initializing (token: {})", token);
            //endregion
            
            //region Initializing Statistics
            //Initializing Statistics with a obtained earlier authentication token
            CompletableFuture<Void> future = api.initialize(token);
            
            try {
                future.get(30, TimeUnit.SECONDS);
                //endregion
                
                
                //region Retrieving current values of existing agent statistics
                StatisticInfo[] statistics = new StatisticInfo[] { 
                    new StatisticInfo(agentUsername, "Agent", "CurrentAgentState"),
                    new StatisticInfo(agentUsername, "Agent", "TimeInCurrentState")
                };
                
                List<PeekedStatisticValue> values = api.getStatValues(statistics);
                logger.info(values.stream().map(v -> v.toString()).collect(Collectors.joining("\n")));
                //endregion

                //region Statistics notifications
                //Waiting for statistics update
                Thread.sleep(10000);
                //endregion
                
                values = api.getStatValues(statistics);
                logger.info(values.stream().map(v -> v.toString()).collect(Collectors.joining("\n")));
                
                logger.info("done");
            }
            catch(TimeoutException ex) {
                logger.error("Initialization timeout", ex);
            }
            catch(Exception ex) {
                logger.error("", ex);
            }

            //region Cleanup
            //Closing our sessions
            api.destroy();
            authApi.signOut(authorization, true);
            //endregion
	}
}













