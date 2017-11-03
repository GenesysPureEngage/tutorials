import com.genesys.internal.authentication.api.AuthenticationApi;
import com.genesys.internal.authentication.model.DefaultOAuth2AccessToken;
import com.genesys.internal.common.ApiClient;
import com.genesys.internal.statistics.model.StatisticData;
import com.genesys.internal.statistics.model.StatisticValue;
import com.genesys.statistics.ServiceState;
import com.genesys.statistics.StatisticDesc;
import com.genesys.statistics.Statistics;
import java.util.Base64;
import java.util.Collection;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
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
            
            //region Registering notifications handlers
            //Here we register handlers for Service State (onServiceChange) and Statistics Update (onValues) notifications.
            api.addListener(new Statistics.StatisticsListener() {
                @Override
                public void onServiceChange(ServiceState state) {
                    logger.info("State: {}", state);
                }

                @Override
                public void onValues(Collection<StatisticValue> list) {
                    logger.info("Stats: {}", list);
                }
            });
            
            //region Initializing Statistics
            //Initializing Statistics with a obtained earlier authentication token
            CompletableFuture<Void> future = api.initialize(token);
            
            try {
                future.get(30, TimeUnit.SECONDS);
                //endregion
                
                
                //region Creating subscriptions to existing agent statistics
                //There we use agent's username as objectId. The objectId for agent is employeeId. Usually it's equal to username, but it can be configured (in config server) to have different value. 
                StatisticDesc[] statistics = new StatisticDesc[] { 
                    new StatisticDesc(UUID.randomUUID().toString(), agentUsername, "Agent", "CurrentAgentState"),
                    new StatisticDesc(UUID.randomUUID().toString(), agentUsername, "Agent", "TimeInCurrentState")
                };

                logger.info("Creating subscription");
                StatisticData subscription = api.createSubscription(UUID.randomUUID().toString(), statistics);
                //endregion
                
                logger.info("{}", subscription.getStatistics());

                //region Statistics notifications
                //Waiting for statistics update, if agent state is changed we will recieve notifications
                Thread.sleep(60000);
                //endregion
                
                api.deleteSubscription(subscription.getSubscriptionId());
                
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













