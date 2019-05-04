// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler } = require("botbuilder");

class MyBot extends ActivityHandler {
	constructor(conversationState, userState, dialog) {
		super();
		this.conversationState = conversationState;
		this.userState = userState;
		this.dialog = dialog;

		this.dialogState = this.conversationState.createProperty("DialogState");

		// Message events describe incoming content, usually text (but not always)
		this.onMessage(async (context, next) => {
			await this.dialog.run(context, this.dialogState); // Make sure you await here
			await next();
		});

		this.onDialog(async (context, next) => {
			await this.conversationState.saveChanges(context);
			await this.userState.saveChanges(context);
			await next();
		});

		// ConversationUpdate events describe a change in conversation members
		this.onConversationUpdate(async (context, next) => {
			if (context.activity.type.membersAdded !== 0) {
				for (let i in context.activity.membersAdded) {
					// Send greeting when bot enters the converesation instead of waiting for user.
					if (context.activity.membersAdded[i].id !== context.activity.recipient.id) {
						await context.sendActivity("Hi, Welcome to Contoso Drive-Thru!");

						// Begin prompting for information.
						await this.dialog.run(context, this.dialogState);
					}
				}
				await next();
			}
		});
	}
}

module.exports.MyBot = MyBot;
