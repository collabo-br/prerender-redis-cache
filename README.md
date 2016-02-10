prerender-redis-cache
=======================

Forked from https://github.com/JonathanBennett/prerender-redis-cache.
Like its base plugin it is designed to be used with the prerender node application from https://github.com/prerender/prerender.

How it works
------------

This plugin stores pages returned through prerender in a redis instance.

How to use
----------

In your local prerender project run:

```bash
    $ npm install git+https://github.com/collabo-br/prerender-redis-cache.git --save
```

Then in the server.js that initializes the prerender:

```javascript
    var prerender_cache = require('prerender-redis-cache');
    var redis_settings = {
        "port": 6380,
        "database": 3,
        "page_ttl": 300
    };
    server.use(prerender_cache.init(redis_settings));
    server.use(require('prerender-redis-cache'));
```
A better approach however is to load the entire redis settings from a file eg.: cache_settings.json

Configuration
-------------

Supported configurations are:

+ **port:** 6379

+ **hostname:** 127.0.0.1

+ **database:** 0

+ **page_ttl:** 86400

    + Time, in seconds, whose redis will caches the pre-rendered page. Default values is one day(86400).

+ **user:** ""

+ **password:** ""
