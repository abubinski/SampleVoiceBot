const {
	ComponentDialog,
	WaterfallDialog,
	DialogSet,
	DialogTurnStatus,
	TextPrompt
} = require("botbuilder-dialogs");

const { UserProfile } = require("../models/userProfile");
const { LuisRecognizer } = require("botbuilder-ai");

// Dialog IDs
const GET_USER_PROFILE = "GET_USER_PROFILE";
const GET_USER_INTENT = "GET_USER_INTENT";

// Prompt IDs
const INTENT_PROMPT = "INTENT_PROMPT";
const LAST_NAME_PROMPT = "LAST_NAME_PROMPT";
const FIRST_NAME_PROMPT = "FIRST_NAME_PROMPT";
const ADDRESS_PROMPT = "ADDRESS_PROMPT";
const PHONE_PROMPT = "PHONE_PROMPT";

class UserProfileDialog extends ComponentDialog {
	constructor(userState) {
		// Set Dialog ID, otherwise dialogSet.add(this); errors.
		super("userProfileDialog");

		this.userProfile = new UserProfile();

		this.luisRecognizer = new LuisRecognizer({
			applicationId: process.env.LuisAppId,
			endpointKey: process.env.LuisKey,
			endpoint: "https://westus.api.cognitive.microsoft.com"
		});

		// Register individual prompts that make up our larger Dialog
		this.addDialog(new TextPrompt(INTENT_PROMPT));
		this.addDialog(new TextPrompt(LAST_NAME_PROMPT));
		this.addDialog(new TextPrompt(FIRST_NAME_PROMPT));
		this.addDialog(new TextPrompt(ADDRESS_PROMPT));
		this.addDialog(new TextPrompt(PHONE_PROMPT));

		this.addDialog(new WaterfallDialog(GET_USER_INTENT, [
			this.getIntent.bind(this),
			this.processIntent.bind(this)
		]));

		// Register WaterfallDialog that will send the registered prompts
		this.addDialog(new WaterfallDialog(GET_USER_PROFILE, [
			this.getLastName.bind(this),
			this.getFirstName.bind(this),
			this.collectAndDisplayName.bind(this)
		]));

		// See https://docs.microsoft.com/en-us/javascript/api/botbuilder-dialogs/componentdialog?view=botbuilder-ts-latest#method-details
		this.initialDialogId = GET_USER_INTENT;
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

	async getIntent(step) {
		return await step.prompt(INTENT_PROMPT, "How can I help you?");
	}

	async processIntent(step) {
		let result = await this.luisRecognizer.recognize(step.context);
		let intent = LuisRecognizer.topIntent(result);

		switch (intent) {
			case "OrderPickup":
				await step.context.sendActivity("Sure thing, we'll just need you to answer a few questions first.");
				return await step.beginDialog(GET_USER_PROFILE);
			case "SpeakToPharmacist":
				await step.context.sendActivity("Got it, someone will be with you right away.");
				break;
			default:
				await step.context.sendActivity("Sorry, I didn't understand that.");
				break;
		}
		return await step.endDialog();
	}

	async getLastName(step) {
		return await step.prompt(LAST_NAME_PROMPT, "What is your last name?");
	}

	async getFirstName(step) {
		this.userProfile.lastName = step.result;
		return await step.prompt(FIRST_NAME_PROMPT, "What is your first name?");
	}

	async collectAndDisplayName(step) {
		this.userProfile.firstName = step.result;
		await step.context.sendActivity("Hi there, " + this.userProfile.firstName + " " + this.userProfile.lastName + "!");
		return await step.endDialog();
	}
}

module.exports.UserProfileDialog = UserProfileDialog;
