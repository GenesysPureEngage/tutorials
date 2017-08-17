import com.genesys.workspace.WorkspaceApi;
import com.genesys.workspace.common.WorkspaceApiException;
import com.genesys.workspace.events.CallStateChanged;
import com.genesys.workspace.events.DnStateChanged;
import com.genesys.workspace.models.Call;
import com.genesys.workspace.models.Dn;
import com.genesys.workspace.models.User;

import java.util.concurrent.CompletableFuture;

public class BasicCallControlSample {
    private Options options;
    private WorkspaceApi api;
    private boolean hasCallBeenHeld = false;
    private CompletableFuture future;

    public BasicCallControlSample(Options options) {
        this.options = options;
        this.future = new CompletableFuture();
    }

    private void log(String msg) {
        System.out.println(msg);
    }

    public void onCallStateChanged(CallStateChanged msg) {
        try {
            Call call = msg.getCall();
            String id = call.getId();

            switch (call.getState()) {
                case "Ringing":
                    this.log("Answering call...");
                    this.api.answerCall(call.getId());
                    break;

                case "Established":
                    if (!this.hasCallBeenHeld) {
                        this.log("Putting call on hold...");
                        api.holdCall(id);
                        this.hasCallBeenHeld = true;
                    } else {
                        this.log("Releasing call...");
                        this.api.releaseCall(id);
                    }
                    break;

                case "Held":
                    this.log("Retrieving call...");
                    this.api.retrieveCall(id);
                    break;

                case "Released":
                    this.log("Setting ACW...");
                    this.api.setAgentNotReady("AfterCallWork", null);
                    break;
            }
        } catch (WorkspaceApiException e) {
            log("Exception: " + e);
            this.future.completeExceptionally(e);
        }
    }

    public void onDnStateChanged(DnStateChanged msg) {
        Dn dn = msg.getDn();

        if (this.hasCallBeenHeld && "AfterCallWork".equals(dn.getWorkMode())) {
            this.future.complete(null);
        }
    }

    public void run() {
        try {
            this.api = new WorkspaceApi(
                    this.options.getApiKey(),
                    this.options.getClientId(),
                    this.options.getClientSecret(),
                    this.options.getBaseUrl(),
                    this.options.getUsername(),
                    this.options.getPassword(),
                    this.options.isDebugEnabled());

            this.api.addCallEventListener(this::onCallStateChanged);
            this.api.addDnEventListener(this::onDnStateChanged);

            this.log("Initializing API...");
            CompletableFuture<User> initFuture = this.api.initialize();
            User user = initFuture.get();

            this.log("Activating channels...");
            this.api.activateChannels(user.getAgentId(), user.getAgentId());
            this.api.setAgentReady();

            this.log("Waiting for an inbound call...");
            this.future.get();

            this.log("Cleaning up...");
            this.api.destroy();

        } catch (Exception e) {
            System.out.println("Error!:\n" + e);
            this.future.completeExceptionally(e);
        }
    }
}
