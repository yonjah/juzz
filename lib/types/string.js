'use strict';

const debug       = require('debug')('joiExample:String');
const _           = require('lodash');
const Moment      = require('moment');
const Tools       = require('../tools.js');

const { chance, RandExp } = Tools;

Tools.setDebugColor(debug);
Tools.debug.string = debug;


const StringExample = {
    joiStringExample(desc, rules) {

        let res;
        let { length, min, max, guid, alphanum, regex, ip, email, lowercase, uppercase, hex, trim, dataUri, base64, isoDate, uri, hostname, normalize, token } = rules;
        const { flags = {} } = desc;

        if (ip) {
            return this.genStringIp(ip);
        }

        if (dataUri) {
            return this.genStringDataUri(desc, rules);
        }

        if (base64) {
            return this.genStringBase64(desc, rules);
        }

        if (isoDate) {
            return this.genStringIsoDate(desc, rules);
        }

        if (guid) {
            res = this.genStringGuid(desc, rules);
        }
        else if (hostname) {
            res = chance.domain();
        }
        else if (uri) {
            if (uri.relativeOnly || (uri.allowRelative && chance.bool())) {
                const path = [];
                for (let i = chance.integer({ min: 1, max: 5 }); i > 0; i -= 1) {
                    path.push(encodeURI(chance.string({ min:1, max:10, pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@$%^&*()' })));
                    res = path.join('/');
                }
            }
            else {
                res = chance.url();
            }
        }
        else if (email) {
            debug('email', email);
            let keepStart = true;
            let tldWhitelist = email.tldWhitelist;
            let atoms = chance.integer({ min: email.minDomainAtoms || 0, max: email.minDomainAtoms ? email.minDomainAtoms + 3 : 3 });
            let domain;

            if (tldWhitelist && !Array.isArray(tldWhitelist)) {
                tldWhitelist = Object.keys(tldWhitelist).filter((key) => tldWhitelist[key]);
            }

            domain = tldWhitelist ? chance.pickone(tldWhitelist) : chance.tld();

            for (; atoms; atoms -= 1) {
                domain = chance.domain({ tld: domain });
            }

            if (regex && !regex.invert) {
                res = new RandExp(regex.pattern).gen();
                if (res.indexOf('@') === -1) {
                    const { exp } = this.getRegexDef(regex.pattern);
                    if (exp[exp.length - 1] !== '$') {
                        res = res + '@' + domain;
                    }
                    else {
                        keepStart = false;
                        res = chance.email({ domain: res });
                    }
                }
            }
            else {
                res = chance.email({ domain });
            }

            if (min && min > res.length) {
                const part = chance.string({ min: min - res.length, max: min - res.length, pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' });
                res = keepStart ? res + part : part + res;
            }

            if (max && res.length > max) {
                res  = keepStart ? res.substring(0, max) : res.substring(res.length - max);
                const atIndex = res.indexOf('@');
                if (atIndex === 0) {
                    res = res.substring(1, 2) + '@' + res.substring(2);
                }
                else if (atIndex === -1) {
                    res = res.substring(0, 1) + '@' + res.substring(2);
                }
                else if (atIndex === res.length - 1) {
                    res = res.substring(0, 1) + '@' + res.substring(1, res.length - 1);
                }

                if (res.indexOf('.') === 0) {
                    res = 'a' + res.substring(1);
                }

                if (res.lastIndexOf('.') === res.length - 1) {
                    res = res.substring(0, res.length - 1) + 'a';
                }
            }
        }
        else {
            if (!length) {
                length = chance.integer({ min: min || this.options.stringMin, max: max || this.options.stringMax });
                debug('Length', length, min || this.options.stringMin, max || this.options.stringMax);
            }

            if (alphanum) {
                regex = regex || { pattern: new RegExp(`^[a-z0-9]{${length}}$`, 'i') };
            }

            if (token) {
                regex = regex || { pattern: new RegExp(`^[a-z0-9_]{${length}}$`, 'i') };
            }

            if (regex && !regex.invert) {
                debug(regex);
                let pattern = regex.pattern;


                let truncEnd = true;
                debug(pattern.toString());
                if (min) {
                    let { exp, flags: regFlags } = this.getRegexDef(pattern);
                    const extendedPattern = token ? '[a-z0-9_]' : (alphanum ? '[a-z0-9]' : '.');
                    if (exp[0] !== '^') {
                        exp = `${extendedPattern}${min}${exp}`;
                        truncEnd = false;
                    }
                    else if (exp[exp.length - 1] !== '$') {
                        exp = `${exp}${extendedPattern}${min}`;
                    }

                    pattern = new RegExp(exp, regFlags);
                }

                res = new RandExp(pattern).gen();
                if (trim && _.trim(res) !== res) {
                    res = new RandExp(pattern).gen();
                }

                if (max && res.length > max) {
                    res = res.substring(truncEnd ? 0 : res.length - max, truncEnd ? max : res.length);
                }
            }
            else if (hex) {
                res = chance.string({ length, pool: 'abcdefABCDEF0123456789' });
                if (flags.byteAligned && length % 2 ) {
                    res = '0' + res;
                }
            }
            else {
                res = chance.string({ length });
            }

            if (regex && regex.invert) {
                res = res.replace(new RegExp(regex.pattern, 'g'), '');
            }
        }

        if (lowercase || flags.case === 'lower') {
            res = res.toLowerCase();
        }
        else if (uppercase || flags.case === 'upper') {
            res = res.toUpperCase();
        }

        if (normalize || flags.normalize) {
            res = res.normalize(normalize || flags.normalize);
        }

        return res;
    },

    genStringIp(ip) {

        debug('ip', ip);
        const version =  chance.pickone(ip.version ? ip.version : ['ipv4', 'ipv6']);
        const cidr    =  ip.cidr === 'required' || (ip.cidr === 'optional' && chance.bool());
        let res;
        if (version !== 'ipv4') {
            res = chance.ipv6();
            if (version === 'ipvfuture') {
                const zoneId = chance.string({ min:3, max: 10, pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,:=;' });
                res = `v1.${res}+${zoneId})`;
            }

            if (cidr) {
                res = res.split(':', 3).splice(0, 2).join(':') + '::' + '/' + chance.integer({ min:21, max: 128 });
            }

            return res;
        }

        res = chance.ip();
        if (cidr) {
            res += '/' + chance.integer({ min:0, max: 32 });
        }

        return res;
    },

    genStringGuid(desc, rules) {

        const guidBrackets = { '{': '}', '[': ']', '(': ')', '': '' };
        const { guid, regex, min, max } = rules;

        let res;


        let version;
        if (guid.version) {
            version = parseInt(chance.pickone(guid.version).substring(5), 10);
        }

        res = chance.guid({ version });

        if (max && max <= res.length) {
            res = res.split('-').join('');
        }

        debug('guid', res);
        if (regex) {
            let regRes = new RandExp(regex.pattern).gen();
            const endBracket = guidBrackets[regRes[0]];
            if (min && min > regRes.length ) {
                const start = regRes[0];
                if (endBracket) {
                    regRes = regRes.substring(1);
                }

                res = regRes + res.substring(regRes.length - 1);
                if (endBracket) {
                    res = start + res;
                }
            }
            else {
                res = regRes;
            }

            if (max && max <= res.length) {
                res = res.substring(0, max);
                if (endBracket) {
                    res = res.substring(0, res.length - 1) + endBracket;
                }
            }
            else if (endBracket) {
                res = res + endBracket;
            }

            debug(regex.pattern.test(res), res);
        }

        return res;

    },

    genStringDataUri(desc, rules) {

        let res = 'data:';
        const binType = ['audio', 'video', 'application', 'image'];
        const binspec = ['mpeg', 'mpeg3', 'wav', 'avi', 'msvideo', 'postscript', 'msword', 'binhex', 'excel', 'zip', 'bmp', 'gif', 'jpeg', 'png', 'tiff'
            // removed since joi currently fails when using complex mime types
            // , 'vnd.dwg', 'vnd.vivo', 'x-liveaudio', 'x-mpeg', 'make.my.funk', 'x-motion-jpeg', 'x-mplayer2', 'x-magic-cap-package-1.0', 'vnd.ms-pki.pko'
        ];
        const textType = ['text'];
        const textSpec = ['html', 'plain', 'css', 'richtext', 'scriplet', 'xml'/*, 'vnd.fmi.flexstor', 'x-script.phyton'*/];

        if (chance.bool()) {
            res += chance.pickone(textType) + '/' + chance.pickone(textSpec) + ';' + 'charset=utf-8,' + chance.paragraph();
        }
        else {
            let { length, min, max } = rules;
            if (!length) {
                length = chance.integer({ min: min || this.options.stringMin, max: max || this.options.stringMax });
            }

            res += chance.pickone(binType) + '/' + chance.pickone(binspec) + ';' + 'base64,' + this.genStringBase64(desc, rules);
        }

        return res;
    },

    genStringBase64(desc, rules) {

        let { length, min, max } = rules;
        if (!length) {
            length = chance.integer({ min: min || this.options.stringMin, max: max || this.options.stringMax });
        }

        return Buffer.from(_.map(Array(length), () => chance.integer({ min: 0, max:255 }))).toString('base64');
    },

    genStringIsoDate(desc, rules) {

        const { length, max } = rules;
        let res = Moment(chance.date()).toISOString();
        if (length) {
            return res.substring(0, length);
        }

        if (max && res.length > max) {
            const steps = [19, 17, 16, 10, 7, 4];
            const isoMax = steps.find((step) => max >= step);
            if (!max) {
                throw new Error(`Could not find proper iso date length for max ${max}`);
            }

            res = res.substring(0, isoMax);
            if (max > isoMax && max > 16) {
                res += 'Z';
            }
        }

        return res;

    },

    getRegexDef(regex) {

        let exp = regex.toString().substring(1);


        const expEnd = exp.lastIndexOf('/');


        const flags = exp.substring(expEnd + 1, exp.length);
        exp = exp.substring(0, expEnd);
        return { exp, flags };
    }
};


module.exports = StringExample;
