// Licensed under the MIT License.
const dotenv = require("dotenv");
const path = require("path");
const restify = require("restify");
const {
	BotFrameworkAdapter,
	MemoryStorage,
	ConversationState,
	UserState
} = require("botbuilder");

const { MyBot } = require("./bots/bot");
const { UserProfileDialog } = require("./dialogs/userProfileDialog");

// Import required bot configuration.
const ENV_FILE = path.join(__dirname, ".env");
dotenv.config({ path: ENV_FILE });

// Create HTTP server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
	console.log(`\n ${server.name} listening to ${server.url}`);
	console.log(
		"\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator"
	);
	console.log("\nTo talk to your bot, open the emulator select \"Open Bot\"");
	console.log("\nSee https://aka.ms/connect-to-bot for more information");
});

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about how bots work.
const adapter = new BotFrameworkAdapter({
	appId: process.env.MicrosoftAppId,
	appPassword: process.env.MicrosoftAppPassword
});

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
	// This check writes out errors to console log .vs. app insights.
	console.error(`\n [onTurnError]: ${error}`);
	// Send a message to the user
	await context.sendActivity("Oops. Something went wrong!");
};

// Bot requires memory structure to store ConversationState and UserState
const memoryStorage = new MemoryStorage();

const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

// Create the main dialog.
const myUserProfileDialog = new UserProfileDialog(userState);
const myBot = new MyBot(conversationState, userState, myUserProfileDialog);

// Listen for incoming requests.
server.post("/api/messages", (req, res) => {
	adapter.processActivity(req, res, async context => {
		// Route to main dialog.
		await myBot.run(context);
	});
});
