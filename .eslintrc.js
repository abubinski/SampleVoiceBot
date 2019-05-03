module.exports = {
	extends: "standard",
	rules: {
		semi: [2, "always"],
		indent: [2, "tab"],
		"no-return-await": 0,
		"no-tabs": 0,
		quotes: ["error", "double"],
		"no-template-curly-in-string": 0,
		"space-before-function-paren": [
			2,
			{
				named: "never",
				anonymous: "always",
				asyncArrow: "always"
			}
		],
		"template-curly-spacing": [2, "never"]
	}
};
