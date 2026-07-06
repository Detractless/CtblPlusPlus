/**
 * @file extensionTypes.js
 * @description Table of CTBL++ "extension" lock types — addon behaviors
 * layered on top of a native Cold Turkey lock type via a sentinel password,
 * because Cold Turkey's CLI can only auto-unlock `password`-type locks
 * (see CtblCliClient.StopBlock).
 */

export const EXTENSION_TYPES = [
  { ctblTypeId: "queuedDelay", hostLockType: "password", sentinel: "CTBL_QUEUED_DELAY" }
];

export function isExtensionLock(blockData, ctblTypeId) {
  if (!blockData || !blockData.lock) return false;
  var ext = null;
  for (var i = 0; i < EXTENSION_TYPES.length; i++) {
    if (EXTENSION_TYPES[i].ctblTypeId === ctblTypeId) {
      ext = EXTENSION_TYPES[i];
      break;
    }
  }
  if (!ext) return false;
  return blockData.lock.indexOf(ext.hostLockType) === 0 && blockData.password === ext.sentinel;
}

export function getExtensionTypeForBlock(blockData) {
  if (!blockData || !blockData.lock) return null;
  for (var i = 0; i < EXTENSION_TYPES.length; i++) {
    var ext = EXTENSION_TYPES[i];
    if (blockData.lock.indexOf(ext.hostLockType) === 0 && blockData.password === ext.sentinel) {
      return ext;
    }
  }
  return null;
}
