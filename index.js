const async = require('async');
const moment = require('moment');
const useragent = require('useragent');
const express = require('express');
const Webtask = require('webtask-tools');
const app = express();
const Request = require('request');
const memoizer = require('lru-memoizer');
const httpRequest = require('request');


function lastLogCheckpoint(req, res) {
  let ctx = req.webtaskContext;
  let required_settings = ['AUTH0_DOMAIN', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET', 'LOGZIO_URL', 'LOGZIO_TOKEN', 'LOGZIO_TYPE'];
  let missing_settings = required_settings.filter((setting) => !ctx.data[setting]);

  if (missing_settings.length) {
    return res.status(400).send({ message: 'Missing settings: ' + missing_settings.join(', ') });
  }

  // If this is a scheduled task, we'll get the last log checkpoint from the previous run and continue from there.
  req.webtaskContext.storage.get((err, data) => {
    let startFromId = ctx.data.START_FROM ? ctx.data.START_FROM : null;
    let startCheckpointId = typeof data === 'undefined' ? startFromId : data.checkpointId;

    /*
      this primes the http request with the eventual message
      and necessary HTTP info
     */
    let optionsFactory = function (body) {
      return {
        method:  'POST',
        url:     `${ctx.data.LOGZIO_URL}?token=${ctx.data.LOGZIO_TOKEN}&type=${ctx.data.LOGZIO_TYPE}`,
        headers: {
          'cache-control': 'no-cache',
          'content-type':  'application/json'
        },
        body:    body,
        json:    true
      };
    };

    // Start the process.
    async.waterfall([
      (callback) => {
        const getLogs = (context) => {
          console.log(`Logs from: ${context.checkpointId || 'Start'}.`);

          let take = Number.parseInt(ctx.data.BATCH_SIZE);

          take = take > 100 ? 100 : take;

          context.logs = context.logs || [];

          getLogsFromAuth0(req.webtaskContext.data.AUTH0_DOMAIN, req.access_token, take, context.checkpointId, (logs, err) => {
            if (err) {
              return callback({ error: err, message: 'Error getting logs from Auth0' });
            }

            let batch_size = ctx.data.MAX_BATCH_SIZE || 3000;

            if (logs && logs.length && context.logs.length <= batch_size) {
              logs.forEach((l) => context.logs.push(l));
              context.checkpointId = context.logs[context.logs.length - 1]._id;
              return setImmediate(() => getLogs(context));
            }

            console.log(`Total logs: ${context.logs.length}.`);
            return callback(null, context);
          });
        };

        getLogs({ checkpointId: startCheckpointId });
      },
      (context, callback) => {
        const min_log_level = parseInt(ctx.data.LOG_LEVEL) || 0;
        const log_matches_level = (log) => {
          if (logTypes[log.type]) {
            return logTypes[log.type].level >= min_log_level;
          }
          return true;
        };

        const types_filter = (ctx.data.LOG_TYPES && ctx.data.LOG_TYPES.split(',')) || [];
        const log_matches_types = (log) => {
          if (!types_filter || !types_filter.length) return true;
          return log.type && types_filter.indexOf(log.type) >= 0;
        };

        console.log(`Filtering ${context.logs.length} logs matching LOG_LEVEL:${min_log_level} and LOG_TYPES:[${types_filter.join(',')}]`);
        context.logs = context.logs
          .filter(l => l.type !== 'sapi' && l.type !== 'fapi')
          .filter(log_matches_level)
          .filter(log_matches_types);

        console.log(`${context.logs.length} remain post filtering.`);
        callback(null, context);
      },
      (context, callback) => {
        console.log('Shipping log data...');

        if (context.logs.length > 0) {
          let body = context.logs.map(function (entry /*, index, arr */) {
            return JSON.stringify(entry);
          });
          console.log(body.join('\n'));
          httpRequest(optionsFactory(body.join('\n')), function (error /*, response, body */) {
            if (error) {
              return callback(error);
            }
            return callback();
          });
        }

        console.log(`Sent ${context.logs.length} log entries. Upload complete.`);
        return callback(null, context);
      }
    ], function (err, context) {
      if (err) {
        console.log('Job failed.', err);

        return req.webtaskContext.storage.set({ checkpointId: startCheckpointId }, { force: 1 }, (error) => {
          if (error) {
            return res.status(500).send({ error: error, message: 'Error storing startCheckpoint' });
          }

          res.status(500).send(err);
        });
      }

      console.log('Job complete.');

      return req.webtaskContext.storage.set({
        checkpointId: context.checkpointId,
        totalLogsProcessed: context.logs.length
      }, { force: 1 }, (error) => {
        if (error) {
          return res.status(500).send({error: error, message: 'Error storing checkpoint' });
        }

        res.sendStatus(200);
      });
    });

  });
}

const logTypes = {
  's': {
    event: 'Success Login',
    level: 1 // Info
  },
  'seacft': {
    event: 'Success Exchange',
    level: 1 // Info
  },
  'seccft': {
    event: 'Success Exchange (Client Credentials)',
    level: 1 // Info
  },
  'feacft': {
    event: 'Failed Exchange',
    level: 3 // Error
  },
  'feccft': {
    event: 'Failed Exchange (Client Credentials)',
    level: 3 // Error
  },
  'f': {
    event: 'Failed Login',
    level: 3 // Error
  },
  'w': {
    event: 'Warnings During Login',
    level: 2 // Warning
  },
  'du': {
    event: 'Deleted User',
    level: 1 // Info
  },
  'fu': {
    event: 'Failed Login (invalid email/username)',
    level: 3 // Error
  },
  'fp': {
    event: 'Failed Login (wrong password)',
    level: 3 // Error
  },
  'fc': {
    event: 'Failed by Connector',
    level: 3 // Error
  },
  'fco': {
    event: 'Failed by CORS',
    level: 3 // Error
  },
  'con': {
    event: 'Connector Online',
    level: 1 // Info
  },
  'coff': {
    event: 'Connector Offline',
    level: 3 // Error
  },
  'fcpro': {
    event: 'Failed Connector Provisioning',
    level: 4 // Critical
  },
  'ss': {
    event: 'Success Signup',
    level: 1 // Info
  },
  'fs': {
    event: 'Failed Signup',
    level: 3 // Error
  },
  'cs': {
    event: 'Code Sent',
    level: 0 // Debug
  },
  'cls': {
    event: 'Code/Link Sent',
    level: 0 // Debug
  },
  'sv': {
    event: 'Success Verification Email',
    level: 0 // Debug
  },
  'fv': {
    event: 'Failed Verification Email',
    level: 0 // Debug
  },
  'scp': {
    event: 'Success Change Password',
    level: 1 // Info
  },
  'fcp': {
    event: 'Failed Change Password',
    level: 3 // Error
  },
  'sce': {
    event: 'Success Change Email',
    level: 1 // Info
  },
  'fce': {
    event: 'Failed Change Email',
    level: 3 // Error
  },
  'scu': {
    event: 'Success Change Username',
    level: 1 // Info
  },
  'fcu': {
    event: 'Failed Change Username',
    level: 3 // Error
  },
  'scpn': {
    event: 'Success Change Phone Number',
    level: 1 // Info
  },
  'fcpn': {
    event: 'Failed Change Phone Number',
    level: 3 // Error
  },
  'svr': {
    event: 'Success Verification Email Request',
    level: 0 // Debug
  },
  'fvr': {
    event: 'Failed Verification Email Request',
    level: 3 // Error
  },
  'scpr': {
    event: 'Success Change Password Request',
    level: 0 // Debug
  },
  'fcpr': {
    event: 'Failed Change Password Request',
    level: 3 // Error
  },
  'fn': {
    event: 'Failed Sending Notification',
    level: 3 // Error
  },
  'sapi': {
    event: 'API Operation'
  },
  'fapi': {
    event: 'Failed API Operation'
  },
  'limit_wc': {
    event: 'Blocked Account',
    level: 4 // Critical
  },
  'limit_ui': {
    event: 'Too Many Calls to /userinfo',
    level: 4 // Critical
  },
  'api_limit': {
    event: 'Rate Limit On API',
    level: 4 // Critical
  },
  'sdu': {
    event: 'Successful User Deletion',
    level: 1 // Info
  },
  'fdu': {
    event: 'Failed User Deletion',
    level: 3 // Error
  },
  'fapi': {
    event: 'Failed API Operation',
    level: 3 // Error
  },
  'limit_wc': {
    event: 'Blocked Account',
    level: 3 // Error
  },
  'limit_mu': {
    event: 'Blocked IP Address',
    level: 3 // Error
  },
  'slo': {
    event: 'Success Logout',
    level: 1 // Info
  },
  'flo': {
    event: ' Failed Logout',
    level: 3 // Error
  },
  'sd': {
    event: 'Success Delegation',
    level: 1 // Info
  },
  'fd': {
    event: 'Failed Delegation',
    level: 3 // Error
  }
};

function getLogsFromAuth0 (domain, token, take, from, cb) {
  var url = `https://${domain}/api/v2/logs`;

  Request({
    method: 'GET',
    url: url,
    json: true,
    qs: {
      take: take,
      from: from,
      sort: 'date:1',
      per_page: take
    },
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  }, (err, res, body) => {
    if (err) {
      console.log('Error getting logs', err);
      cb(null, err);
    } else {
      cb(body);
    }
  });
}

const getTokenCached = memoizer({
  load: (apiUrl, audience, clientId, clientSecret, cb) => {
    Request({
      method: 'POST',
      url: apiUrl,
      json: true,
      body: {
        audience: audience,
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      }
    }, (err, res, body) => {
      if (err) {
        cb(null, err);
      } else {
        cb(body.access_token);
      }
    });
  },
  hash: (apiUrl) => apiUrl,
  max: 100,
  maxAge: 1000 * 60 * 60
});

app.use(function (req, res, next) {
  var apiUrl       = `https://${req.webtaskContext.data.AUTH0_DOMAIN}/oauth/token`;
  var audience     = `https://${req.webtaskContext.data.AUTH0_DOMAIN}/api/v2/`;
  var clientId     = req.webtaskContext.data.AUTH0_CLIENT_ID;
  var clientSecret = req.webtaskContext.data.AUTH0_CLIENT_SECRET;

  getTokenCached(apiUrl, audience, clientId, clientSecret, function (access_token, err) {
    if (err) {
      console.log('Error getting access_token', err);
      return next(err);
    }

    req.access_token = access_token;
    next();
  });
});

app.get('/', lastLogCheckpoint);
app.post('/', lastLogCheckpoint);

module.exports = Webtask.fromExpress(app);
