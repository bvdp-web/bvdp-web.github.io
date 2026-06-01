`/functions/api/file.js` only works when connected to CloudFlare or another backend.

CloudFlare changes everthing in `/functions/pathname.js` automatically in `pathname` as an api-request.

I need this because some radios (Christelijke Omroep) give a CORS error.
