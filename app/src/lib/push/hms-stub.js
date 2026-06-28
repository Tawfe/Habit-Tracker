/**
 * Stub for the optional Huawei-only module `@hmscore/react-native-hms-push`.
 *
 * Metro statically resolves every require(), but HMS Push is only installed in
 * the Huawei flavor (see docs/DEPLOY-HUAWEI.md). When it's NOT installed, the
 * Metro resolver in metro.config.js points the require here so the bundle
 * builds. This code path never runs unless HMS Core is actually present on the
 * device (ecosystem detection won't return 'hms' otherwise).
 */
module.exports = {};
