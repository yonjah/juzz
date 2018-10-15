'use strict';

const chance       = new (require('chance'))();
const RandExp      = require('randexp');
const _            = require('lodash');
const debugColors  = require('debug').colors;
const debug        = require('debug')('Juzz');

debug.result       = require('debug')('Juzz:result');
debug.rules        = require('debug')('Juzz:rules');
debug.type         = require('debug')('Juzz:type');
debug.flags        = require('debug')('Juzz:flags');
debug.options      = require('debug')('Juzz:options');
debug.ref          = require('debug')('Juzz:ref');

let debugColor = 0;

const setDebugColor = function ( obj ) {

    obj.color = debugColors[debugColor];
    debugColor = (debugColor + 1) % debugColors.length;
};

const baseKeys = ['flags', 'type', 'label', 'rules', 'invalids', 'valids', 'options'];
const knownKeys = {
    type: ['object', 'array', 'alternatives', 'string', 'number', 'boolean', 'date', 'any', 'binary', 'symbol'],
    rules: ['min', 'greater', 'less', 'max', 'positive', 'negative', 'trim', 'integer', 'unique', 'length', 'regex', 'format',
        'ip', 'guid', 'email', 'uri', 'hostname', 'dataUri', 'base64', 'alphanum', 'token', 'multiple', 'port', 'type', 'schema',
        'lowercase', 'uppercase', 'hex', 'isoDate', 'normalize', 'precision', 'arity', 'minArity', 'maxArity', 'ref', 'class'],
    flags: ['allowOnly', 'presence', 'insensitive', 'default', 'trim', 'sparse', 'single', 'momentFormat', 'raw', 'empty', 'case', 'truncate',
        'normalize', 'ref', 'format', 'timestamp', 'multiplier', 'precision', 'func', 'byteAligned', 'allowUnknown', 'strip', 'error', 'encoding', 'unsafe'],
    options: ['language', 'convert', 'presence', 'stripUnknown', 'abortEarly', 'allowUnknown'],
    object: baseKeys.concat(['children', 'dependencies', 'patterns', 'renames']),
    array: baseKeys.concat(['items', 'orderedItems']),
    alternatives: baseKeys.concat(['alternatives', 'base']),
    string: baseKeys.concat([]),
    number: baseKeys.concat([]),
    boolean: baseKeys.concat(['truthy', 'falsy']),
    date: baseKeys.concat([]),
    any: baseKeys.concat([]),
    binary: baseKeys.concat([]),
    func: baseKeys.concat([])
};

module.exports = { debug, setDebugColor, knownKeys, chance, RandExp, _ };
