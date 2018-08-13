/**
 * Basic Config Variables
 * redis_url (string) - Redis hostname (defaults to localhost)
 * ttl (int) - TTL on keys set in redis (defaults to 1 day)
 */

const url = require('url');
const _ = require('lodash');
const redis = require('redis');

var cache = exports = module.exports = {};

const defaults = {
    "port": 6379,
    "hostname": "127.0.0.1",
    "database": 0,
    "page_ttl": 86400,
    "user": "",
    "password": "",
};

const STATUS_CODES_TO_CACHE = {
    200: true,
    203: true,
    204: true,
    206: true,
    300: true,
    301: true,
    404: true,
    405: true,
    410: true,
    414: true,
    501: true
};

// Catch all error handler. If redis breaks for any reason it will be reported here.
function redisClientError(err) {
    if (cache.lastError === err.toString()) {
        return;
        // Swallow the error for now
    }

    cache.lastError = err.toString();
    console.warn('Redis Cache Error: ' + err);
}

function redisClientReady() {
    cache.redisOnline = true;
    console.log('Redis Cache Connected');
}

function redisClientEnd(err) {
    if (!err) {
        return;
    }

    err = err.toString();
    if (cache.lastEndMessage == err) {
        // Swallow the error for now
        return;
    }

    cache.lastEndMessage = err;
    cache.redisOnline = false;
    console.warn("Redis Cache Conncetion Closed. Will now bypass redis until it's back.");
}

cache.init = function (options) {
    this.opt = _.extend(defaults, options);
    this.redisOnline = false;
    this.lastError = '';
    this.lastEndMessage = '';

    this.client = redis.createClient(this.opt.port, this.opt.hostname);
    this.client.select(this.opt.database);

    if (this.opt.password)
        this.client.auth(this.opt.password);

    this.client.on('error', redisClientError);
    this.client.on('ready', redisClientReady);
    this.client.on('end', redisClientEnd);

    return this;
};


cache.requestReceived = function (req, res, next) {
    //
    if (req.method !== 'GET' || !this.redisOnline) {
        return next();
    }

    this.client.get(req.prerender.url, function (error, result) {
        if (!error && result) {
            var response = JSON.parse(result);
            var headers = response.headers;
            var key;

            for (key in headers) {
                if (headers.hasOwnProperty(key)) {
                    res.setHeader(key, headers[key]);
                }
            }
            res.send(response.statusCode, response.content);
        } else {
            next();
        }
    });
};

cache.pageLoaded = function (req, res, next) {
    if (!this.redisOnline || !STATUS_CODES_TO_CACHE[req.prerender.statusCode]) {
        return next();
    }

    const self = this;
    const key = req.prerender.url;
    const response = {
        statusCode: req.prerender.statusCode,
        content: req.prerender.content.toString(),
        headers: req.prerender.headers
    };

    this.client.set(key, JSON.stringify(response), function (error, reply) {
        // If library set to cache set an expiry on the key.
        if (!error && reply && self.opt.page_ttl) {
            self.client.expire(key, self.opt.page_ttl, function (error, didSetExpiry) {
                if (!error && !didSetExpiry) {
                    console.warn('Could not set expiry for "' + key + '"');
                }
            });
        }
    });

    next();
};
