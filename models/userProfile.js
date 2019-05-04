class UserProfile {
	constructor(uid, intent, first, last, age, address, phone) {
		this.uid = uid;
		this.intent = intent;
		this.firstName = first;
		this.lastName = last;
		this.age = age;
		this.address = address;
		this.phone = phone;
	}
}

module.exports.UserProfile = UserProfile;
