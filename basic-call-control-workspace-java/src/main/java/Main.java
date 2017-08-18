public class Main {
	public static void main(String[] args) {
		Options options = Options.parseOptions(args);
		if (options == null) {
			return;
		}

		BasicCallControlSample sample = new BasicCallControlSample(options);
		sample.run();
	}
}
