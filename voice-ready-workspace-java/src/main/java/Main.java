import com.genesys.common.ApiClient;
import com.genesys.common.ApiResponse;
import com.genesys.common.ApiException;
import com.genesys.workspace.api.SessionApi;
import com.genesys.workspace.api.VoiceApi;
import com.genesys.workspace.model.ActivatechannelsData;
import com.genesys.workspace.model.ApiSuccessResponse;
import com.genesys.workspace.model.ChannelsData;
import com.genesys.workspace.model.CurrentUser;
import com.genesys.workspace.model.LoginData;

import org.cometd.bayeux.Message;
import org.cometd.bayeux.client.ClientSessionChannel;
import org.cometd.client.BayeuxClient;
import org.cometd.client.transport.ClientTransport;
import org.cometd.client.transport.LongPollingTransport;
import org.eclipse.jetty.client.HttpClient;
import org.eclipse.jetty.client.api.Request;
import org.eclipse.jetty.http.HttpMethod;
import org.eclipse.jetty.util.ssl.SslContextFactory;

import java.util.Optional;
import java.util.HashMap;
import java.util.Map;
import java.net.URI;
import java.net.HttpCookie;
import java.net.CookieManager;

public class Main {
    public static void main(String[] args) {
        //region Initialize API Client
        //Create and setup ApiClient instance with your ApiKey and Workspace API URL.
        final String apiKey = "your API key";
        final String workspaceUrl = "workspace url";
		
        final ApiClient client = new ApiClient();
        client.setBasePath(workspaceUrl);
        client.addDefaultHeader("x-api-key", apiKey);

        try {
        	
            //region Create SessionApi instance
            //Creating instance of SessionApi using the ApiClient.
            final SessionApi sessionApi = new SessionApi(client);

            //region Logging in Workspace API
            //Logging in using username and password
            LoginData loginData = new LoginData();
            loginData.setUsername("username");
            loginData.setPassword("password");
            ApiResponse<ApiSuccessResponse> responseWithHttpInfo = sessionApi.loginWithHttpInfo(loginData);
            ApiSuccessResponse body = responseWithHttpInfo.getData();
            if(body.getStatus().getCode() != 0) {
                throw new Exception("Cannot log in");
            }

            //region Obtaining Workspace API Session
            //Obtaining session cookie and setting the cookie to the ApiCient.
            Optional<String> session = responseWithHttpInfo.getHeaders().get("set-cookie").stream().filter( v -> v.startsWith("WORKSPACE_SESSIONID")).findFirst();
            if(session.isPresent()) {
                client.addDefaultHeader("Cookie", session.get());
            }
            else {
                throw new Exception("Session not found");
            }
            
            //region Creating HttpClient
            //Conifuring a Jetty HttpClient which will be used for CometD.
            final SslContextFactory sslContextFactory = new SslContextFactory();
		
			final HttpClient httpClient = new HttpClient(sslContextFactory);
			httpClient.start();
			
			
			CookieManager manager = new CookieManager();
			httpClient.setCookieStore(manager.getCookieStore());
			httpClient.getCookieStore().add(new URI(workspaceUrl), new HttpCookie("WORKSPACE_SESSIONID", session.get().split(";")[0].split("=")[1]));
			
			
			//region Creating BayeuxClient (CometD Client) and Making CometD handshake
			//Configuring CometD with long polling transport making sure the api key is included in headers. An instance of BayeuxClient is created and used to make the CometD handshake.
			ClientTransport transport = new LongPollingTransport(new HashMap(), httpClient) {
				@Override protected void customize(Request request) {
					request.header("x-api-key", apiKey);
				}
			};
			
			final BayeuxClient bayeuxClient = new BayeuxClient(workspaceUrl + "/notifications", transport);
			
			
			bayeuxClient.handshake((ClientSessionChannel handshakeChannel, Message handshakeMessage) -> {
					
				if(handshakeMessage.isSuccessful()) {
					//region Subscribing to Channel
					//Once the handshake is successful you may subscribe to a CometD channel to get events. 	
					bayeuxClient.getChannel("/workspace/v3/voice").subscribe((ClientSessionChannel channel, Message message) -> {
						//region Receiving Events
						//Here CometD events are handled. The Message object contains data that is stored as a map. Getting the 'messageType' will tell you the type of message.
						Map<String, Object> messageData = (Map<String, Object>) message.getDataAsMap();
						
						if(messageData.get("messageType").equals("DnStateChanged")) {
							
							Map<String, Object> dn = (Map<String, Object>) messageData.get("dn");
							//region Create VoiceApi instance
							//When the server is done activating channels, it will send a 'DnStateChanged' message with the agent state being 'NotReady'.
							if(dn.get("agentState").equals("NotReady")) {
								System.out.println("Channels activated");
								System.out.println("Changing agent state...");
								//region Change agent state
								//Changing agent state to ready
								final VoiceApi voiceApi = new VoiceApi(client);
								try {
									ApiSuccessResponse response = voiceApi.setAgentStateReady();
									if(response.getStatus().getCode() != 0) {
										System.err.println("Cannot change agent state");
									}
								} catch(ApiException ex) {
									System.err.println(ex);
								}
								
							} else if(dn.get("agentState").equals("Ready")) {
								System.out.println("Agent state changed to Ready");
								//region Logging out and Disconnecting
								//Now that the agent state is changed to 'Ready' to program is done so you can disconnect CometD and logout.
								bayeuxClient.disconnect();
								
								try {
									sessionApi.logout();
								} catch(ApiException ex) {
									System.err.println("Cannot log out");
									System.err.println(ex);
								}
								
								System.out.println("done");
								System.exit(0);
							}
						}
						
					}, (ClientSessionChannel channel, Message message) -> {
						//region Subscription Success
						//Make sure event handler has been successfully subscribed before activating channels.
						if(message.isSuccessful()) {
							try {
								//region Current user information
								//Obtaining current user information such as the employee ID using SessionApi.
								CurrentUser user = sessionApi.getCurrentUser();
								
								System.out.println("Activating channels...");
								//region Activate Channels
								//Activating channels for the user using employee ID and agent login.
								ActivatechannelsData data = new ActivatechannelsData();
								data.setAgentId(user.getData().getUser().getEmployeeId());
								data.setDn(user.getData().getUser().getAgentLogin());
								ChannelsData channelsData = new ChannelsData();
								channelsData.data(data);
								ApiSuccessResponse response = sessionApi.activateChannels(channelsData);
								if(response.getStatus().getCode() != 0) {
									System.err.println("Cannot activate channels");
								}
							} catch(ApiException ex) {
								System.err.println("Cannot activate channels");
								System.err.println(ex);
							}
						} else {
							System.err.println("Channel subscription failed");
						}
					});
					
					
					
				} else {
					System.err.println("Handshake failed");
				}
			});
            
            
        } catch(Exception ex) {
            System.err.println(ex);
        }
    }
}
