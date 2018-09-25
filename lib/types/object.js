const _        = require('lodash');
const tools    = require('../tools.js');
const {chance, RandExp} = tools;
const debug    = require('debug')('joiExample:Object');
tools.setDebugColor(debug);
tools.debug.object = debug;

const ObjectExample = {
	joiObjectExample (desc, rules) {
		let {length, min, max} = rules;

		let res = {};
		const emptyRes = {}; // extra keys that contain empty values
		const dependencies = desc.dependencies;
		const children = desc.children ? Object.assign({}, desc.children) : null;
		const patterns = desc.patterns || [{schema: {type: 'string', rules: [{name: 'length', arg: 10}]}, rule: {type: 'string', rules: [{name: 'length', arg: 10}]}}];
		const ignoreKeys = [];
		const defRequired = (desc.options && desc.options.presence) ?
			desc.options.presence === 'required' :
			this.context && this.context.defRequired || false;

		const origContext = this.context;

		if (desc.flags && desc.flags.func) {
			res = this.joiFuncExample(desc, rules);
			let {rlength, rmin, rmax } = this.joiDescRulesObject(desc, false);
			if (rlength === undefined) {
				if (rmin === undefined && rmax === undefined) {
					min = 0;
					max = 0;
					length = 0;
				} else {
					min = rmin || 0;
					max = rmax || rmin;
				}
			}
		}

		if (rules.type) {
			res = new rules.type.ctor();
		}

		if (rules.schema) {
			return this.options.joi.any()
		}

		this.context = {desc, children, res, defRequired};

		if (length === undefined) {
			length = chance.integer({min, max});
		}

		if (dependencies && children) {
			dependencies.forEach((dep) => {
				let key;
				switch (dep.type) {
					case 'or':
						key = chance.pickone(dep.peers);
						res[key] = this.genExample(children[key]);
						break;
					case 'xor':
						key = chance.pickone(dep.peers);
						res[key] = this.genExample(children[key]);
						ignoreKeys.push.apply(ignoreKeys, dep.peers);
						break;
					case 'with':
						if (children[dep.key] && (children[dep.key].flags && children[dep.key].flags.presence === 'required' || chance.bool())) {
							res[dep.key] = this.genExample(children[dep.key]);
							dep.peers.forEach((key) => {
								res[key] = this.genExample(children[key]);
							});
						} else {
							ignoreKeys.push(dep.key);
						}
						break;
					case 'without':
						if (chance.bool()) {
							key = dep.key;
							ignoreKeys.push.apply(ignoreKeys, dep.peers);
						} else {
							key = chance.pickone(dep.peers);
							ignoreKeys.push(dep.key);
						}
						res[key] = this.genExample(children[key]);
						break;
					default:
						if (this.options.strict) {
							throw new Error(`unknown dependency type ${dep.type} ${JSON.stringify(dep)}`);
						}
				}
			});
		}

		if (!children) {
			for (let i = 0; i < length; i += 1) {
				const pattern = chance.pickone(patterns);
				let key;
				if (pattern.schema) {
					key = this.genExample(pattern.schema);
				} else {
					key = new RandExp(pattern.regex).gen();
				}
				res[key] = this.genExample(pattern.rule);
			}
		} else {
			const childKeys = Object.keys(children);
			childKeys.forEach((key, i) => {
				let include, flags;
				const child = children[key];
				const count = Object.keys(res).length;

				flags = child.flags || {};

				if (child.type === 'alternatives') {
					flags = Object.assign({}, flags, child.base && child.base.flags || {});
				}

				if (res[key] || ignoreKeys.indexOf(key) >= 0) {
					include = false;
				} else if (flags.presence === 'forbidden') {
					include = false;
				} else if (flags.presence === 'required') {
					include = true;
				} else if (defRequired && (!child.flags || child.flags.presence !== 'optional')) {
					include = true;
				} else if (length && length - count >= childKeys.length - i) {
					include = true;
				} else if (length && count >= length) {
					include = false;
				} else {
					include = chance.bool({likelihood: 80});
				}

				if (include) {
					this.addChildToResult(key);
				} else {
					this.debugDesc(child);
					this.testStrict(child);
					if (child.flags && child.flags.empty && chance.bool()) { // use empty schema if available
						emptyRes[key] = this.genExample(child.flags.empty);
					}
				}
			});
		}
		this.context = origContext;
		Object.keys(emptyRes).forEach((key) => {
			res[key] = res[key] || emptyRes[key];
		})
		return res;
	},

	addChildToResult (key) {
		const {children, res} = this.context;
		const desc = children[key];

		if (desc.flags && desc.flags.presence && ['required', 'forbidden', 'optional', 'ignore'].indexOf(desc.flags.presence)  === -1) {
			debug('CHILD_DESC', desc);
			if (this.options.strict) {
				throw new Error(`unknown flag presence value ${desc.flags.presence}`);
			}
		}

		if (desc.type === 'alternatives') {
			res[key] = this.getAlternativeVal(desc);
		} else {
			res[key] = this.genExample(desc);
		}

		return res[key];
	},

	addChildRef (refKey, ruleKey, desc, refDesc = {}) {
		const {children, res} = this.context;
		if (refKey.indexOf('.') > 0) {
			const keys = refKey.split('.');
			let missingRef = false;
			keys.reduce((children, key, i) => {
				const childDesc = Object.assign({flags: {}}, children[key]);
				if (!childDesc.flags.ref || childDesc.flags.presence !== 'required') {
					if (i === keys.length - 1) {
						Object.assign(childDesc, refDesc);
					}
					childDesc.flags = Object.assign({}, childDesc.flags, {presence: 'required'});
					children[key] = childDesc
					missingRef = true;
				}
				return childDesc.children;
			}, children);
			missingRef && tools.debug.ref(refKey, 'adding child', keys[0]);
			missingRef && this.addChildToResult(keys[0]);
			return _.get(res, refKey);
		}
		const childDesc = Object.assign({flags: {}}, children[refKey]);
		if (!childDesc.flags.ref) {
			Object.assign(childDesc, refDesc);
			childDesc.flags = Object.assign({}, childDesc.flags, { ref: [desc.type, ruleKey] });
			children[refKey] = childDesc
			tools.debug.ref(refKey, 'adding child');
			return this.addChildToResult(refKey);
		}
		return res[refKey];
	}
}


module.exports = ObjectExample