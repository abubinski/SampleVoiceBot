class DialogValidators {
	constructor(luisRecognizer) {
		this.luisRecognizer = luisRecognizer;

		this.validateName = async (step) => {
			let result = await this.luisRecognizer.recognize(step.context);
			if (result.entities.Name !== undefined) {
				return true;
			} else {
				await step.context.sendActivity("Sorry, I didn't understand that. Can you please spell it for me?");
				return false;
			}
		};

		this.validateAddress = async (step) => {
			let result = await this.luisRecognizer.recognize(step.context);
			if (result.entities.Address !== undefined) {
				return true;
			} else {
				await step.context.sendActivity("Sorry, I couldn't find that address. Please try again.");
				return false;
			}
		};

		this.validatePhone = async (step) => {
			let result = await this.luisRecognizer.recognize(step.context);
			if (result.entities.PhoneLastFour) {
				return true;
			} else {
				await step.context.sendActivity("Could not identify valid last four digits of phone number. Please try again.");
			}
		};

		this.validateConfirmation = async (step) => {
			if (step.recognized.value.value.toLowerCase() === "yes") {
				return true;
			} else {
				step.context.sendActivity("Got it, just a moment while we connect you with an employee who can help.");
				step.endDialog();
			}
		};
	}
}

module.exports.DialogValidators = DialogValidators;
