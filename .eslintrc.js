module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "extends": ["eslint:recommended", "hapi"],
    "parserOptions": {
        "ecmaVersion": 2017
    },
    "rules": {
        "no-unreachable": "error"
    }
};