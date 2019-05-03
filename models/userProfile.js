class UserProfile {
	constructor(uid, first, last, age, address, phone) {
		this.uid = uid;
		this.first = first;
		this.last = last;
		this.age = age;
		this.address = address;
		this.phone = phone;
	}
}

module.exports.UserProfile = UserProfile;
