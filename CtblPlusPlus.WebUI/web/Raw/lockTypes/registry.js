/**
 * @file registry.js
 * @description Lock-type registry. Lock-type descriptors register
 * themselves here; touch points call findLockType() and delegate to the
 * returned descriptor when it matches, falling back to their existing
 * inline logic when it returns null.
 */

var registeredLockTypes = [];

export function registerLockType(descriptor) {
  registeredLockTypes.push(descriptor);
}

export function findLockType(blockName, blockData) {
  for (var i = 0; i < registeredLockTypes.length; i++) {
    if (registeredLockTypes[i].matches(blockName, blockData)) {
      return registeredLockTypes[i];
    }
  }
  return null;
}
