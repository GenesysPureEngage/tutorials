import com.genesys.internal.statistics.model.StatisticDataResponse;
import com.genesys.statistics.ServiceState;
import com.genesys.statistics.StatisticDesc;
import com.genesys.statistics.StatisticValueNotification;
import com.genesys.statistics.Statistics;
import java.util.Collection;
import java.util.HashMap;
import java.util.UUID;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Main
{
	private static final Logger logger = LoggerFactory.getLogger(Main.class);

	public static void main(String[] args) throws Exception
	{
		//region Create an instance of Statistics
		//First we need to create a new instance of the Statistics class and set properties using the **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these from your PureEngage Cloud representative.
		String apiKey = "<apiKey>";
		String apiUrl = "<apiUrl>";
		Statistics api = new Statistics(apiKey, apiUrl);
		//endregion
                
                String agentUsername = "<agentUsername>";

		//region Authorization code grant
                //Authorization code should be obtained before (See https://github.com/GenesysPureEngage/authorization-code-grant-sample-app)
                String authorizationToken = "<authorizationToken1>";
                //endregion

		//region Register notifications handlers
		//Here we register handlers for ServiceState (`onServiceChange`) and StatisticValueNotification (`onValues`) notifications.
		api.addListener(new Statistics.StatisticsListener()
		{
			@Override
			public void onServiceChange(ServiceState state)
			{
				logger.info("State: {}", state);
			}

			@Override
			public void onValues(Collection<StatisticValueNotification> list)
			{
				logger.info("Stats: {}", list);
			}
		});

		//region Initialize Statistics
		//Initialize Statistics with the authentication token we received earlier.
		Future<Void> future = api.initialize(authorizationToken);

		try
		{
			future.get(30, TimeUnit.SECONDS);
			//endregion

			//region Create a subscription
			//Now we use the agent's username as the objectId. The objectId for an agent is the employeeId, which is usually also the agent' username. However, you can configure the employeeId in Configuration Server to have a different value.

			//Create a statistic to report the current agent state
			HashMap<String, Object> agentStateDefinition = new HashMap<>();
			agentStateDefinition.put("notificationMode", "Immediate");
			agentStateDefinition.put("category", "CurrentState");
			agentStateDefinition.put("subject", "DNStatus");
			agentStateDefinition.put("mainMask", "*");
			StatisticDesc currentAgentStateStat = new StatisticDesc(UUID.randomUUID().toString(), agentUsername, "Agent", agentStateDefinition);

			//Create a statistic to report the amount of time the agent has spent in the current state
			HashMap<String, Object> timeInCurrentStateDefinition = new HashMap<>();
			timeInCurrentStateDefinition.put("category", "CurrentTime");
			timeInCurrentStateDefinition.put("mainMask", "*");
			//Note: We use 5 (seconds) as the notificationFrequency. This is done for tutorial purposes only.
			//In production applications, Genesys recommends using higher values (60 or more) to avoid unnecessary notifications.
			timeInCurrentStateDefinition.put("notificationFrequency", 5);
			//Note: Here we use 0 as the value for insensitivity to ensure values are returned for statistics even when the
			//agent is not logged in on any DN and there is no activity with the agent.
			//In production applications, Genesys recommends setting the insensitivity value to 1 or more to avoid unnecessary notifications.
			timeInCurrentStateDefinition.put("insensitivity", 0);
			timeInCurrentStateDefinition.put("notificationMode", "Periodical");
			timeInCurrentStateDefinition.put("subject", "DNStatus");

			//Create the subscription
			StatisticDesc timeInCurrentStateStat = new StatisticDesc(UUID.randomUUID().toString(), agentUsername, "Agent", timeInCurrentStateDefinition);
			StatisticDesc[] statistics = new StatisticDesc[] {
				currentAgentStateStat,
				timeInCurrentStateStat
			};

			logger.info("Creating subscription");
			final String subscriptionId = UUID.randomUUID().toString();
			StatisticDataResponse subscription = api.createSubscription(subscriptionId, statistics);
			//endregion

			logger.info("{}", subscription);

			//region Statistics notifications
			//Wait for a statistics update. If the agent state is changed, we'll receive a notification. We'll also get periodic notifications about the value of timeInCurrentState. Thread.sleep is used for tutorial purposes only.
			Thread.sleep(60000);
			//endregion

			//region Subscription cleanup
			//Delete the subscription.
			api.deleteSubscription(subscriptionId);
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
		//Close our sessions.
		api.destroy();
		//endregion
	}
}













