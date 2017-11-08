import com.genesys.internal.authentication.api.AuthenticationApi;
import com.genesys.internal.authentication.model.DefaultOAuth2AccessToken;
import com.genesys.internal.common.ApiClient;
import com.genesys.internal.statistics.model.StatisticData;
import com.genesys.internal.statistics.model.StatisticValue;
import com.genesys.statistics.ServiceState;
import com.genesys.statistics.StatisticDesc;
import com.genesys.statistics.Statistics;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Base64;
import java.util.Collection;
import java.util.HashMap;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public class Main
{
	private static final Logger logger = LoggerFactory.getLogger(Main.class);

	public static void main(String[] args) throws Exception
	{
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

		logger.info("Retrieving token");
		AuthenticationApi authApi = new AuthenticationApi(authClient);

		String agentUsername = "<agentUsername>";
		String agentPassword = "<agentPassword>";
		String clientId = "<clientId>";
		String clientSecret = "<clientSecret>";

		String clientAuth = "Basic " + new String(Base64.getEncoder().encode(String.format("%s:%s", clientId, clientSecret).getBytes()));
		DefaultOAuth2AccessToken resp = authApi.retrieveToken("password", clientAuth, "application/json", "*", clientId, null, agentUsername, agentPassword);

		String token = resp.getAccessToken();
		logger.info("Initializing (token: {})", token);
		//endregion

		//region Registering notifications handlers
		//Here we register handlers for Service State (onServiceChange) and Statistics Update (onValues) notifications.
		api.addListener(new Statistics.StatisticsListener()
		{
			@Override
			public void onServiceChange(ServiceState state)
			{
				logger.info("State: {}", state);
			}

			@Override
			public void onValues(Collection<StatisticValue> list)
			{
				logger.info("Stats: {}", list);
			}
		});

		//region Initializing Statistics
		//Initializing Statistics with a obtained earlier authentication token
		CompletableFuture<Void> future = api.initialize(token);

		try
		{
			future.get(30, TimeUnit.SECONDS);
			//endregion

			//region Creating subscriptions
			//There we use agent's username as objectId. The objectId for agent is employeeId. Usually it's equal to username, but it can be configured (in config server) to have different value.

			//Creating statistic to report current agent state
			HashMap<String, Object> agentStateDefinition = new HashMap<>();
			agentStateDefinition.put("notificationMode", "Immediate");
			agentStateDefinition.put("category", "CurrentState");
			agentStateDefinition.put("subject", "DNStatus");
			agentStateDefinition.put("mainMask", "*");
			StatisticDesc currentAgentStateStat = new StatisticDesc(UUID.randomUUID().toString(), agentUsername, "Agent", agentStateDefinition);

			//Creating statistic to report time in current State
			HashMap<String, Object> timeInCurrentStateDefinition = new HashMap<>();
			timeInCurrentStateDefinition.put("category", "CurrentTime");
			timeInCurrentStateDefinition.put("mainMask", "*");
			//please note that we use 5 (seconds) as notificationFrequency. This is done for tutorial purpose only.
			//In production applications it's recommended to use higher values (60 or more) to avoid unnecessary notifications.
			timeInCurrentStateDefinition.put("notificationFrequency", 5);
			//please note, here we use 0 as value for insensitivity to ensure retrieving values of statistic even in case when
			//agent is not logged in on any dn and there is no activity with agent.
			//In production applications it's recommended to use insensitivity 1 or more, to avoid unnecessary notifications
			timeInCurrentStateDefinition.put("insensitivity", 0);
			timeInCurrentStateDefinition.put("notificationMode", "Periodical");
			timeInCurrentStateDefinition.put("subject", "DNStatus");

			//Creating subscription
			StatisticDesc timeInCurrentStateStat = new StatisticDesc(UUID.randomUUID().toString(), agentUsername, "Agent", timeInCurrentStateDefinition);
			StatisticDesc[] statistics = new StatisticDesc[] {
				currentAgentStateStat,
				timeInCurrentStateStat
			};

			logger.info("Creating subscription");
			StatisticData subscription = api.createSubscription(UUID.randomUUID().toString(), statistics);
			//endregion

			logger.info("{}", subscription.getStatistics());

			//region Statistics notifications
			//Waiting for statistics update, if agent state is changed we will receive notifications, also we will receive
			//periodical notifications of value of timeInCurrentState
			Thread.sleep(60000);
			//endregion

			//region Subscription cleanup
			api.deleteSubscription(subscription.getSubscriptionId());
			//endregion

			logger.info("done");
		}
		catch (TimeoutException ex)
		{
			logger.error("Initialization timeout", ex);
		}
		catch (Exception ex)
		{
			logger.error("", ex);
		}

		//region Cleanup
		//Closing our sessions
		api.destroy();
		final String userAuth = String.format("Bearer %s", token);
		authApi.signOut(userAuth, true);
		//endregion
	}
}













