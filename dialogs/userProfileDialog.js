const {
	ComponentDialog,
	WaterfallDialog,
	DialogSet,
	DialogTurnStatus,
	TextPrompt,
	ChoicePrompt
} = require("botbuilder-dialogs");

const { UserProfile } = require("../models/userProfile");
const { DialogValidators } = require("./dialogValidators");
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
const CONFIRM_INFO_PROMPT = "CONFIRM_INFO_PROMPT";
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

		let validator = new DialogValidators(this.luisRecognizer);

		// Register individual prompts that make up our larger Dialog
		this.addDialog(new TextPrompt(INTENT_PROMPT)); // need validator here
		this.addDialog(new TextPrompt(LAST_NAME_PROMPT, validator.validateName));
		this.addDialog(new TextPrompt(FIRST_NAME_PROMPT, validator.validateName));
		this.addDialog(new TextPrompt(ADDRESS_PROMPT, validator.validateAddress));
		this.addDialog(new TextPrompt(PHONE_PROMPT, validator.validatePhone));
		this.addDialog(new ChoicePrompt(CONFIRM_INFO_PROMPT, validator.validateConfirmation));
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
			this.confirmAndCheckout.bind(this)
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
		// Doesn't get here until validator passes, so we know entities exist.
		let result = await this.luisRecognizer.recognize(step.context);
		let lastName = result.entities.Name[0];
		// Capitalize first letter, as LUIS sends to lower case.
		this.userProfile.lastName = lastName.charAt(0).toUpperCase() + lastName.slice(1);
		return await step.prompt(FIRST_NAME_PROMPT, "What is your first name?");
	}

	async getAddress(step) {
		// Check for "SpeakToPharmacist" at every step
		let result = await this.luisRecognizer.recognize(step.context);
		let firstName = result.entities.Name[0];
		this.userProfile.firstName = firstName;
		return await step.prompt(ADDRESS_PROMPT, "What is the address on the account?");
	}

	async getPhone(step) {
		let result = await this.luisRecognizer.recognize(step.context);
		let address = result.entities.Address[0];
		this.userProfile.address = address;
		return await step.prompt(PHONE_PROMPT, "Please provide the last 4 digits of the phone number on the account.");
	}

	async summarizeTransaction(step) {
		let result = await this.luisRecognizer.recognize(step.context);
		let phone = result.entities.PhoneLastFour[0];
		this.userProfile.phone = phone;
		await step.context.sendActivity("Thank you. I have the following information. ");
		await step.context.sendActivity("Full Name: " + this.userProfile.firstName + " " + this.userProfile.lastName + "\nHome Address: " + this.userProfile.address + "\nPhone Number: (XXX) XXX-" + this.userProfile.phone);

		return await step.prompt(CONFIRM_INFO_PROMPT, {
			prompt: "Is this right?",
			retryPrompt: "Please select \"Yes\" or \"No\"",
			choices: ["Yes", "No"]
		});
	}

	async confirmAndCheckout(step) {
		await step.context.sendActivity("Alright. just a moment while I look up your account...");

		let cartOutput = generateCart();
		await step.context.sendActivity(cartOutput);

		await step.context.sendActivity("A pharmacist will be right with you to give you your order, please have your payment ready.");
		return await step.endDialog();
	}
}

function generateCart() {
	let sampleItems = [
		["Insulin", "$32.23"],
		["Simvastatin", "$9.99"],
		["Metformin", "$11.99"],
		["Lisinopril", "$13.99"],
		["Hydrocodone Acetaminophen", "$207.99"],
		["Norvasc", "$593.99"],
		["Synthroid", "$96.99"],
		["Azithromycin", "$25.99"],
		["Amoxicillin", "$9.99"],
		["Hydrochlorothiazide", "$15.99"]
	];

	let numItems = Math.floor(Math.random() * 4) + 1;
	let cart = [];
	for (let i = 0; i < sampleItems.length; i++) {
		if (cart.length < numItems) {
			if (Math.random() < 0.5) {
				cart.push(sampleItems[i]);
			}
		}
	}
	let orderBuildout = "";
	for (let i = 0; i < cart.length; i++) {
		orderBuildout += `\n${cart[i][0]}\t\t${cart[i][1]}`; // would be better to use object with list prop
	}
	let plural = cart.length > 1 ? "s" : "";
	// Also consider a "no orders for you right now" scenario?
	return `Great. I see you have ${cart.length} item${plural} ready for pickup:` + orderBuildout;
}

module.exports.UserProfileDialog = UserProfileDialog;
