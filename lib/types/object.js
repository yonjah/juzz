'use strict';

const debug       = require('debug')('joiExample:Object');
const _           = require('lodash');
const Tools       = require('../tools.js');
const DescHelpers = require('../descHelpers.js');

const { chance, RandExp } = Tools;

Tools.setDebugColor(debug);
Tools.debug.object = debug;

const ObjectExample = {
    joiObjectExample(desc, rules) {

        let { length, min, max } = rules;

        let res = {};
        const emptyRes = {}; // extra keys that contain empty values
        const dependencies = desc.dependencies;
        const children = desc.children ? Object.assign({}, desc.children) : null;
        const patterns = desc.patterns || [{ schema: { type: 'string', rules: [{ name: 'length', arg: 10 }] }, rule: { type: 'string', rules: [{ name: 'length', arg: 10 }] } }];
        const ignoreKeys = [];
        const defRequired = (desc.options && desc.options.presence) ?
            desc.options.presence === 'required' :
            this.context && this.context.defRequired || false;

        const origContext = this.context;

        if (desc.flags && desc.flags.func) {
            res = this.joiFuncExample(desc, rules);
            if (length === undefined) {
                if (min === undefined && max === undefined) {
                    min = 0;
                    max = 0;
                    length = 0;
                }
                else {
                    min = min || 0;
                    max = max || min;
                }
            }
        }

        if (rules.type) {
            res = new rules.type.ctor();
        }

        if (rules.schema) {
            return this.options.joi.any();
        }

        this.context = { children, res, defRequired };

        if (children && desc.renames) {
            desc.renames.forEach((rename) => {

                if (children[rename.to]) {
                    let key;
                    if (rename.from instanceof RegExp) {
                        key = Object.keys(children).find((chKey) => rename.from.test(chKey));
                        if (!key) {
                            key = new RandExp(rename.from).gen();
                        }
                    }
                    else {
                        key = rename.from;
                    }

                    children[key] = children[rename.to];
                    delete children[rename.to];
                }

                debug('children', rename, children);
            });
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
                        ignoreKeys.push(...dep.peers);
                        break;
                    case 'with':
                        if (children[dep.key] && (children[dep.key].flags && children[dep.key].flags.presence === 'required' || chance.bool())) {
                            res[dep.key] = this.genExample(children[dep.key]);
                            dep.peers.forEach((peerKey) => {

                                res[peerKey] = this.genExample(children[peerKey]);
                            });
                        }
                        else {
                            ignoreKeys.push(dep.key);
                        }

                        break;
                    case 'without':
                        if (chance.bool()) {
                            key = dep.key;
                            ignoreKeys.push(...dep.peers);
                        }
                        else {
                            key = chance.pickone(dep.peers);
                            if (children[key]) {
                                ignoreKeys.push(dep.key);
                            }
                            else {
                                key = dep.key;
                                ignoreKeys.push(...dep.peers);
                            }
                        }

                        res[key] = this.genExample(children[key]);
                        break;
                    case 'and':
                        if (chance.bool()) {
                            dep.peers.forEach((peerKey) => {

                                res[peerKey] = this.genExample(children[peerKey]);
                            });
                        }
                        else {
                            ignoreKeys.push(...dep.peers);
                        }

                        break;
                    case 'nand':
                        if (chance.bool()) {
                            key = chance.pickone(dep.peers);
                            res[key] = this.genExample(children[key]);
                        }

                        ignoreKeys.push(...dep.peers);

                        break;
                    default:
                        if (this.options.strict) {
                            throw new Error(`unknown dependency type ${dep.type} ${JSON.stringify(dep)}`);
                        }
                }
            });
        }

        if (!children) {
            if (length === undefined) {
                length = chance.integer({ min: min || this.options.objectMin, max: max || this.options.objectMax });
            }

            for (let i = 0; i < length; i += 1) {
                const pattern = chance.pickone(patterns);
                let key;
                if (pattern.schema) {
                    key = this.genExample(pattern.schema);
                }
                else {
                    key = new RandExp(pattern.regex).gen();
                }

                res[key] = this.genExample(pattern.rule);
            }
        }
        else {
            const childKeys = Object.keys(children);

            min = min || length;
            max = max || length;

            childKeys.forEach((key, i) => {

                const child = children[key];
                if (child.type === 'alternatives') {
                    const { refs } = DescHelpers.parseAlternatives(child.alternatives);
                    if (refs.length) {
                        debug(`found alternative with ref ${key}`);
                        this.addChildToResult(key); //we always parse and add alternatives who has references to other keys
                    }
                }
            });

            childKeys.forEach((key, i) => {

                let flags; let include;
                const child = children[key];
                const count = Object.keys(res).length;

                flags = child.flags || {};

                if (child.type === 'alternatives') {
                    flags = Object.assign({}, flags, child.base && child.base.flags || {});
                }

                if (res[key] !== undefined || ignoreKeys.indexOf(key) >= 0) {
                    include = false;
                }
                else if (flags.presence === 'forbidden') {
                    include = false;
                }
                else if (flags.presence === 'required') {
                    include = true;
                }
                else if (defRequired && (!child.flags || child.flags.presence !== 'optional')) {
                    include = true;
                }
                else if (min && min - count >= childKeys.length - i) {
                    include = true;
                }
                else if (max && count >= max) {
                    include = false;
                }
                else {
                    include = chance.bool({ likelihood: 80 });
                }

                if (include) {
                    this.addChildToResult(key);
                }
                else {
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
        });
        return res;
    },

    addChildToResult(key) {

        const { children, res } = this.context;
        const desc = children[key];

        if (desc.flags && desc.flags.presence && ['required', 'forbidden', 'optional', 'ignore'].indexOf(desc.flags.presence)  === -1) {
            debug('CHILD_DESC', desc);
            if (this.options.strict) {
                throw new Error(`unknown flag presence value ${desc.flags.presence}`);
            }
        }

        if (desc.type === 'alternatives') {
            res[key] = this.getAlternativeVal(desc);
            debug('ADDED alternative', key, res[key]);
        }
        else {
            res[key] = this.genExample(desc);
            debug('ADDED', key, res[key]);
        }

        return res[key];
    },

    addChildRef(refKey, ruleKey, desc, refDesc = {}) {

        const { children, res } = this.context;
        if (refKey.indexOf('.') > 0) {
            const keys = refKey.split('.');
            let missingRef = false;
            keys.reduce((innerChildren, key, i) => {

                const childDesc = Object.assign({ flags: {} }, innerChildren[key]);
                if (!childDesc.flags.ref || childDesc.flags.presence !== 'required') {
                    if (i === keys.length - 1) {
                        Object.assign(childDesc, refDesc);
                    }

                    childDesc.flags = Object.assign({}, childDesc.flags, { presence: 'required' });
                    innerChildren[key] = childDesc;
                    missingRef = true;
                }

                return childDesc.children;
            }, children);
            missingRef && Tools.debug.ref(refKey, 'adding child', keys[0]);
            missingRef && this.addChildToResult(keys[0]);
            return _.get(res, refKey);
        }

        const childDesc = Object.assign({ flags: {} }, children[refKey]);
        if (!childDesc.flags.ref) {
            Object.assign(childDesc, refDesc);
            childDesc.flags = Object.assign({}, childDesc.flags, { ref: [desc.type, ruleKey] });
            children[refKey] = childDesc;
            Tools.debug.ref(refKey, 'adding child');
            return this.addChildToResult(refKey);
        }

        return res[refKey];
    }
};


module.exports = ObjectExample;
