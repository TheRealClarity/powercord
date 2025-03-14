/**
 * Copyright (c) 2018-2020 aetheryx & Bowser65
 * All Rights Reserved. Licensed under the Porkord License
 * https://powercord.dev/porkord-license
 */

const { webFrame } = require('electron');
const { getModule } = require('powercord/webpack');

async function inject () {
  window.__$$DoNotTrackCache = {};
  const Analytics = await window.$PowercordWebpack.getModule([ 'getSuperPropertiesBase64' ]);
  const Reporter = await window.$PowercordWebpack.getModule([ 'submitLiveCrashReport' ]);
  const AnalyticsMaker = await window.$PowercordWebpack.getModule([ 'analyticsTrackingStoreMaker' ]);

  window.__$$DoNotTrackCache.oldTrack = Analytics.track;
  window.__$$DoNotTrackCache.oldSubmitLiveCrashReport = Reporter.submitLiveCrashReport;
  window.__$$DoNotTrackCache.oldAddBreadcrumb = window.__SENTRY__.hub.addBreadcrumb;
  window.__$$DoNotTrackCache.oldHandleTrack = AnalyticsMaker.AnalyticsActionHandlers.handleTrack;

  Analytics.track = () => void 0;
  Reporter.submitLiveCrashReport = () => void 0;
  AnalyticsMaker.AnalyticsActionHandlers.handleTrack = () => void 0;
  window.__SENTRY__.hub.addBreadcrumb = () => void 0;

  window.__SENTRY__.hub.getClient().close();
  window.__SENTRY__.hub.getScope().clear();

  // a bit unrelated but shut up flux
  window.__$$DoNotTrackCache.oldConsoleLog = console.log;
  console.log = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('[Flux]')) {
      return;
    }

    window.__$$DoNotTrackCache.oldConsoleLog.call(console, ...args);
  };
}

function uninject () {
  const Analytics = window.$PowercordWebpack.getModule([ 'getSuperPropertiesBase64' ], false);
  const Reporter = window.$PowercordWebpack.getModule([ 'submitLiveCrashReport' ], false);
  const AnalyticsMaker = window.$PowercordWebpack.getModule([ 'analyticsTrackingStoreMaker' ], false);

  Analytics.track = window.__$$DoNotTrackCache.oldTrack;
  Reporter.submitLiveCrashReport = window.__$$DoNotTrackCache.oldSubmitLiveCrashReport;
  window.__SENTRY__.hub.addBreadcrumb = window.__$$DoNotTrackCache.oldAddBreadcrumb;
  AnalyticsMaker.AnalyticsActionHandlers.handleTrack = window.__$$DoNotTrackCache.oldHandleTrack;
  console.log = window.__$$DoNotTrackCache.oldConsoleLog;

  delete window.__$$DoNotTrackCache;
}

async function oldBackend () {
  const Analytics = await getModule([ 'getSuperPropertiesBase64' ]);
  const Reporter = await getModule([ 'submitLiveCrashReport' ]);
  const AnalyticsMaker = await getModule([ 'analyticsTrackingStoreMaker' ]);

  const oldTrack = Analytics.track;
  const oldSubmitLiveCrashReport = Reporter.submitLiveCrashReport;
  const oldAddBreadcrumb = window.__SENTRY__.hub.addBreadcrumb;
  const oldHandleTrack = AnalyticsMaker.AnalyticsActionHandlers.handleTrack;

  Analytics.track = () => void 0;
  Reporter.submitLiveCrashReport = () => void 0;
  AnalyticsMaker.AnalyticsActionHandlers.handleTrack = () => void 0;
  window.__SENTRY__.hub.addBreadcrumb = () => void 0;

  window.__SENTRY__.hub.getClient().close();
  window.__SENTRY__.hub.getScope().clear();

  return () => {
    Analytics.track = oldTrack;
    Reporter.submitLiveCrashReport = oldSubmitLiveCrashReport;
    window.__SENTRY__.hub.addBreadcrumb = oldAddBreadcrumb;
    AnalyticsMaker.AnalyticsActionHandlers.handleTrack = oldHandleTrack;
  };
}

module.exports = async function () {
  if (!global.NEW_BACKEND) {
    return oldBackend();
  }

  webFrame.executeJavaScript(`(() => { ${inject.toString()} inject(); })();`);

  return () => {
    webFrame.executeJavaScript(`(() => { ${uninject.toString()} uninject(); })();`);
  };
};
