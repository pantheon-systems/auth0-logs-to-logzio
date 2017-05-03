# Auth0 - Logs to Logz.io

[![Auth0 Extensions](http://cdn.auth0.com/extensions/assets/badge.svg)](https://sandbox.it.auth0.com/api/run/auth0-extensions/extensions-badge?webtask_no_cache=1)

This extension will take all of your Auth0 logs and export them to [Logz.io](https://logz.io).
This repository is a detached fork based on original work by Auth0 and their [auth0-logs-to-logstash](https://github.com/auth0/auth0-logs-to-logstash) extension.

## Installation and Configuration
There are a couple of methods you can use to install this extension:

1. Semi-Automatic Option
   1. Click the [Install in Auth0] button above to install and configure the extension in your current Auth0 domain.
   1. Enter your Logz.io [authorization token](https://app.logz.io/#/dashboard/account/) as `LOGZIO_TOKEN` 
   1. Configure extension settings, described below.
1. Semi-Manual Option
   1. Visit the [Extensions](https://manage.auth0.com/#/extensions) tab in your Auth0 dashboard and find the [Create Extension] link:
   1. Enter the location of this repo `https://github.com/pantheon-systems/auth0-logs-to-logzio` in the GitHub Url field.
   1. Enter your Logz.io [authorization token](https://app.logz.io/#/dashboard/account/) as `LOGZIO_TOKEN` 
   1. Configure extension settings, described below.

The options for this extension are pretty straight forward:

- `Schedule` - Log shipping cron interval.
  Logs don't stream direct to Logz.io but rather run on a cron based schedule. Pick an interval appropriate for your needs.
  You can actually tweak this later in the Scheduled Task configuration later if you like.
  `Default: 5m`

- `BATCH_SIZE` - Log shipping batch size.
  Pick a number appropriate for your log volume and schedule interval. Maximum is 100.
  `Default: 100`

- `LOGZIO_URL` - The URL for Logz.io [Bulk HTTP/S](https://app.logz.io/#/dashboard/data-sources/Bulk-HTTPS) listener.
  `Default: https://listener.logz.io:8071/ (HTTPS)`
  - HTTP: `http://listener.logz.io:8070/`
  - HTTPS: `https://listener.logz.io:8071/`

- `LOGZIO_TOKEN` - Your Logz.io Authorization Token
  Find this in on your [Logz.io User Settings](https://app.logz.io/#/dashboard/account/) page.

- `LOGZIO_TYPE` - Identifies the type of log data we're sending to Logz.io
  Logz.io doesn't have a special log format parser for Auth0 but it is a required parameter and also handy to filter on (i.e. `type:"auth0"`).
  `Default: auth0`

- `LOG_LEVEL` - Auth0 log level filter.
  Values: `0 - Debug`, `1 - Info`, `2 - Warning`, `3 - Error`, `4 - Critical`
  `Default: 0`


- `LOG_TYPES` - Auth0 log type filter.
  Use a comma-separated string of [Auth0 log event types](https://auth0.com/docs/logs).
  `Default: []`

## Usage

Install the extension, and search your logz.io data using the LOGZIO_TYPE key (i.e. type:"auth0").


## Filters

The `LOG_LEVEL` can be set to (setting it to a value will also send logs of a higher value):

 - `1`: Debug messages
 - `2`: Info messages
 - `3`: Errors
 - `4`: Critical errors

The `LOG_TYPES` filter can be set to:

- `s`: Success Login (level: 1)
- `seacft`: Success Exchange (level: 1)
- `feacft`: Failed Exchange (level: 3)
- `f`: Failed Login (level: 3)
- `w`: Warnings During Login (level: 2)
- `du`: Deleted User (level: 1)
- `fu`: Failed Login (invalid email/username) (level: 3)
- `fp`: Failed Login (wrong password) (level: 3)
- `fc`: Failed by Connector (level: 3)
- `fco`: Failed by CORS (level: 3)
- `con`: Connector Online (level: 1)
- `coff`: Connector Offline (level: 3)
- `fcpro`: Failed Connector Provisioning (level: 4)
- `ss`: Success Signup (level: 1)
- `fs`: Failed Signup (level: 3)
- `cs`: Code Sent (level: 0)
- `cls`: Code/Link Sent (level: 0)
- `sv`: Success Verification Email (level: 0)
- `fv`: Failed Verification Email (level: 0)
- `scp`: Success Change Password (level: 1)
- `fcp`: Failed Change Password (level: 3)
- `sce`: Success Change Email (level: 1)
- `fce`: Failed Change Email (level: 3)
- `scu`: Success Change Username (level: 1)
- `fcu`: Failed Change Username (level: 3)
- `scpn`: Success Change Phone Number (level: 1)
- `fcpn`: Failed Change Phone Number (level: 3)
- `svr`: Success Verification Email Request (level: 0)
- `fvr`: Failed Verification Email Request (level: 3)
- `scpr`: Success Change Password Request (level: 0)
- `fcpr`: Failed Change Password Request (level: 3)
- `fn`: Failed Sending Notification (level: 3)
- `limit_wc`: Blocked Account (level: 4)
- `limit_ui`: Too Many Calls to /userinfo (level: 4)
- `api_limit`: Rate Limit On API (level: 4)
- `sdu`: Successful User Deletion (level: 1)
- `fdu`: Failed User Deletion (level: 3)

So for example, if you want to filter on a subset of events, set the `LOG_TYPES` filter to: `sce,fce,scu,fcu`.


## Developing
1. Clone the repo:

   ```
   git clone git@github.com:pantheon-systems/auth0-logs-to-logzio.git
   cd auth0-logs-to-logzio
   ```

1. Ensure dependencies are installed:

   ```
   npm install
   ```

1. Build runtime artifact (bundle.js):

   ```
   npm run build
   ```


## Issue Reporting

If you have found a bug or if you have a feature request, please report them at this repository issues section. Please do not report security vulnerabilities on the public GitHub issue tracker. The [Responsible Disclosure Program](https://auth0.com/whitehat) details the procedure for disclosing security issues.


## Author

[Pantheon Systems](https://pantheon.io)


## What is Auth0?

Auth0 helps you to:

* Add authentication with [multiple authentication sources](https://docs.auth0.com/identityproviders), either social like **Google, Facebook, Microsoft Account, LinkedIn, GitHub, Twitter, Box, Salesforce, amont others**, or enterprise identity systems like **Windows Azure AD, Google Apps, Active Directory, ADFS or any SAML Identity Provider**.
* Add authentication through more traditional **[username/password databases](https://docs.auth0.com/mysql-connection-tutorial)**.
* Add support for **[linking different user accounts](https://docs.auth0.com/link-accounts)** with the same user.
* Support for generating signed [Json Web Tokens](https://docs.auth0.com/jwt) to call your APIs and **flow the user identity** securely.
* Analytics of how, when and where users are logging in.
* Pull data from other sources and add it to the user profile, through [JavaScript rules](https://docs.auth0.com/rules).


## Create a free Auth0 Account

1. Go to [Auth0](https://auth0.com) and click Sign Up.
2. Use Google, GitHub or Microsoft Account to login.


## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.
