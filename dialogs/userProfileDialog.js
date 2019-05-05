const {
	ComponentDialog,
	WaterfallDialog,
	DialogSet,
	DialogTurnStatus,
	TextPrompt
} = require("botbuilder-dialogs");

const { UserProfile } = require("../models/userProfile");
// const { DialogValidators } = require("./dialogValidators");
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
const CONFIRM_PROFILE_PROMPT = "CONFIRM_PROFILE_PROMPT";
const CONFIRM_PRESCRIPTIONS_PROMPT = "CONFIRM_PRESCRIPTIONS_PROMPT";

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

		// Create FormValidator class with its own LUIS model to simplify code here
		// to save userprofile info here need two separate validators
		this.nameValidate = async (step) => {
			let result = await this.luisRecognizer.recognize(step.context);
			if (result.entities.Name !== undefined) {
				return true;
			} else {
				await step.context.sendActivity("Sorry, I didn't understand that. Can you please spell it for me?");
				return false;
			}
		};

		this.addressValidate = async (step) => {
			let result = await this.luisRecognizer.recognize(step.context);
			if (result.entities.Address !== undefined) {
				return true;
			} else {
				await step.context.sendActivity("Sorry, I couldn't find that address. Please try again.");
				return false;
			}
		};

		this.phoneValidate = async (step) => {
			let result = await this.luisRecognizer.recognize(step.context);
			if (result.entities.PhoneLastFour) {
				return true;
			} else {
				await step.context.sendActivity("Could not identify valid last four digits of phone number. Please try again.");
			}
		};

		// Register individual prompts that make up our larger Dialog
		this.addDialog(new TextPrompt(INTENT_PROMPT));
		this.addDialog(new TextPrompt(LAST_NAME_PROMPT, this.nameValidate));
		this.addDialog(new TextPrompt(FIRST_NAME_PROMPT, this.nameValidate));
		this.addDialog(new TextPrompt(ADDRESS_PROMPT, this.addressValidate));
		this.addDialog(new TextPrompt(PHONE_PROMPT, this.phoneValidate));
		this.addDialog(new TextPrompt(CONFIRM_PRESCRIPTIONS_PROMPT));

		this.addDialog(new WaterfallDialog(GET_USER_INTENT, [
			this.getIntent.bind(this),
			this.processIntent.bind(this)
		]));

		// Register WaterfallDialog that will send the registered prompts
		this.addDialog(new WaterfallDialog(GET_USER_PROFILE, [
			this.getLastName.bind(this),
			this.getFirstName.bind(this),
			this.getAddress.bind(this),
			this.getPhone.bind(this),
			this.summarizeTransaction.bind(this),
			this.confirmPrescriptions.bind(this),
			this.checkout.bind(this)
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

	// Info on prompt retry and validation
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
			// Won't actually ever restart at this point in the conversation flow, but add a check in each step
			// case "Restart":
			// 	await step.context.sendActivity("Sure, let's try that again.");
			// 	await step.endDialog();
			// 	await step.beginDialog(GET_USER_INTENT);
			// 	break;
			default:
				await step.context.sendActivity("Sorry, I didn't understand that.");
				break;
		}
		return await step.endDialog();
	}

	async getLastName(step) {
		return await step.prompt(LAST_NAME_PROMPT, "What is your last name?");
	}

	// Reach out to LUIS twice??
	// if we make LUIS global we can't properly instantiate model (process env hasn't loaded yet)
	async getFirstName(step) {
		// Doesn't get here until validator passes, so we know entities exist.
		let result = await this.luisRecognizer.recognize(step.context);
		let lastName = result.entities.Name[0];
		// Capitalize first letter, as LUIS sends to lower case.
		this.userProfile.lastName = lastName.charAt(0).toUpperCase() + lastName.slice(1);
		return await step.prompt(FIRST_NAME_PROMPT, "What is your first name?");
	}

	async getAddress(step) {
		// LUIS
		this.userProfile.firstName = step.result;
		return await step.prompt(ADDRESS_PROMPT, "What is the address on the account?");
	}

	async getPhone(step) {
		this.userProfile.address = step.result;
		return await step.prompt(PHONE_PROMPT, "Please provide the last 4 digits of the phone number on the account.");
	}

	async summarizeTransaction(step) {
		await step.context.sendActivity("Thank you. I have the following information.");
		await step.context.sendActivity("Full Name: " + this.userProfile.firstName + " " + this.userProfile.lastName + "\nHome Address: " + this.userProfile.address + "\nPhone Number: (XXX) XXX-" + this.userProfile.phone);
	}

	async confirmPrescriptions(step) {
		this.userProfile.phone = step.result;
		return await step.prompt(CONFIRM_PRESCRIPTIONS_PROMPT, "I have three prescriptions for pick up. Are you aware there is a large copay on the naratriptan of $195?");
	}

	async checkout(step) {
		await step.context.sendActivity("Great. I see you have three prescriptions ready for pickup:\nVicodin\t$50\nCodeine\t$29\nTylenol 3\t$19");
		await step.context.sendActivity("A pharmacist will be right with you to give you your order, please have your payment ready.");
		return await step.endDialog();
	}
}

module.exports.UserProfileDialog = UserProfileDialog;
