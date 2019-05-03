const {
	ComponentDialog,
	WaterfallDialog,
	DialogSet,
	DialogTurnStatus,
	TextPrompt
} = require("botbuilder-dialogs");

const GET_USER_PROFILE = "GET_USER_PROFILE";

const USER_INTENT_PROP = "USER_INTENT_PROP";
const USER_NAME_PROP = "USER_NAME_PROP";

// User profile property prompt IDs
const NAME_PROMPT = "NAME_PROMPT";
const PURPOSE_PROMPT = "PURPOSE_PROMPT";

class UserProfileDialog extends ComponentDialog {
	constructor(userState) {
		// Set Dialog ID, otherwise dialogSet.add(this); errors.
		super("userProfileDialog");

		// Create userState properties
		this.userIntent = userState.createProperty(USER_INTENT_PROP);
		this.userName = userState.createProperty(USER_NAME_PROP);

		// Register individual prompts that make up our larger Dialog
		this.addDialog(new TextPrompt(NAME_PROMPT));
		this.addDialog(new TextPrompt(PURPOSE_PROMPT));

		// Register WaterfallDialog that will send the registered prompts
		this.addDialog(new WaterfallDialog(GET_USER_PROFILE, [
			this.askForPurpose.bind(this),
			this.askForFirstName.bind(this),
			this.collectAndDisplayName.bind(this)
		]));

		// See https://docs.microsoft.com/en-us/javascript/api/botbuilder-dialogs/componentdialog?view=botbuilder-ts-latest#method-details
		this.initialDialogId = GET_USER_PROFILE;
	}

	async run(turnContext, dialogState) {
		const dialogSet = new DialogSet(dialogState);
		dialogSet.add(this);

		const dialogContext = await dialogSet.createContext(turnContext);
		const results = await dialogContext.continueDialog();

		if (results.status === DialogTurnStatus.empty) {
			await dialogContext.beginDialog(this.id);
		}
	}

	async askForPurpose(step) {
		return await step.prompt(PURPOSE_PROMPT, "How can I help you?");
	}

	async askForFirstName(step) {
		await this.userIntent.set(step.context, step.result);
		await step.context.sendActivity("Great, let's get your " + step.result + " started.");
		return await step.prompt(NAME_PROMPT, "What is your first name?");
	}

	async collectAndDisplayName(step) {
		await this.userName.set(step.context, step.result);
		await step.context.sendActivity("Hi there, " + step.result + "!");
		return await step.endDialog();
	}
}

module.exports.UserProfileDialog = UserProfileDialog;
