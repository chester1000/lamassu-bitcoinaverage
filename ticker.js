'use strict';

var _       = require('lodash');
var Wreck   = require('wreck');
var async   = require('async');


exports.NAME = 'Bitcoinaverage';
exports.SUPPORTED_MODULES = ['ticker'];
var API_ENDPOINT = 'https://api.bitcoinaverage.com/';
var pluginConfig = {};


exports.config = function config(localConfig) {
  if (localConfig) _.merge(pluginConfig, localConfig);
};


function getTickerUrls(currencies) {
  var suffix = currencies.length === 1 ? currencies[0] + '/' : 'all';
  var urls = [
    API_ENDPOINT + 'ticker/global/' + suffix
  ];

  return urls;
}

function formatResponse(currencies, results, callback) {

  results = results[0]; // always only one request

  var out = {};

  function addCurrency(currency, result) {
    if (typeof result === 'undefined')
      return;

    out[currency] = {
      currency: currency,
      rates: {
        ask: result.ask,
        bid: result.bid
      }
    };
  }

  if (currencies.length === 1)
    addCurrency(currencies[0], results);

  else
    currencies.forEach(function(currency) {
      addCurrency(currency, results[currency]);
    });

  if (currencies.length !== Object.keys(out).length)
    return callback(new Error('Unsupported currency'));


  callback(null, out);
}


exports.ticker = function ticker(currencies, callback) {
  if (typeof currencies === 'string')
    currencies = [currencies];

  if(currencies.length === 0)
    return callback(new Error('Currency not specified'));

  var urls = getTickerUrls(currencies);

  // change each url on the list into a download job
  var downloadList = urls.map(function(url) {
    return function(cb) {
      Wreck.get(url, {json: true}, function(err, res, payload) {
        if (res.statusCode === 404)
          return cb(new Error('Unsupported currency'));

        cb(err, payload);
      });
    };
  });

  async.parallel(downloadList, function(err, results) {
    if (err) return callback(err);

    formatResponse(currencies, results, callback);
  });
};

