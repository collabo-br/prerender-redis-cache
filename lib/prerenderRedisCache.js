/**
 * @authors Rafael Fernandes (basask@collabo.com.br)
 * @date    2016-02-10 15:03:28
 */

var redis = require('redis');
var _ = require('lodash');

var cache = exports = module.exports = {};

var defaults = {
    "port": 6379,
    "hostname": "127.0.0.1",
    "database": 0,
    "page_ttl": 86400,
    "user": "",
    "password": ""
};

function redis_client_error(err) {
    if(cache.last_error === err.toString()) {
      // Swallow the error for now
    } else {
      cache.last_error = err.toString();
      console.warn("Redis Cache Error: " + err);
    }
}

function redis_client_ready() {
    cache.redis_online = true;
    console.log("Redis Cache Connected");
}

function redis_client_end(err) {
  if(err) {
    err = err.toString();
    if(cache.last_end_message == err) {
      // Swallow the error for now
    } else {
      cache.last_end_message = err;
      cache.redis_online = false;
      console.warn("Redis Cache Conncetion Closed. Will now bypass redis until it's back.");
    }
  }
}

cache.init = function(options){
    this.opt = _.extend(defaults, options);
    this.redis_online = false;
    this.last_error = "";
    this.last_end_message = "";

    this.client = redis.createClient(this.opt.port, this.opt.hostname);
    this.client.select(this.opt.database);

    if (this.opt.password)
        this.client.auth(this.opt.password);

    this.client.on('error', redis_client_error);
    this.client.on('ready', redis_client_ready);
    this.client.on('end', redis_client_end);

    return this;
};

cache.beforePhantomRequest = function (req, res, next) {

    if (req.method !== 'GET' || this.redis_online !== true) {
        return next();
    }

    this.client.get(req.prerender.url, function (err, result) {

        if (!err && result) {
            res.send(200, result);
        } else {
            next();
        }
    });
};

cache.afterPhantomRequest = function (req, res, next) {

    var instance = this;
    if (instance.redis_online !== true) {
        return next();
    }
    if (req.prerender.statusCode === 200) {
        instance.client.set(req.prerender.url, req.prerender.documentHTML, function (err, reply) {
            if (!err && reply && instance.opt.page_ttl && instance.opt.page_ttl !== 0) {
                instance.client.expire(req.prerender.url, instance.opt.page_ttl, function (err, didSetExpiry) {
                    if (err){
                        console.warn(err.toString());
                    } else {
                        console.log("CACHED(" + instance.opt.page_ttl + "s): " + req.prerender.url);
                    }
                });
            }
        });
    }
    next();
};
