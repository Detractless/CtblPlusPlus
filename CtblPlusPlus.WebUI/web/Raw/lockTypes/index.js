/**
 * @file index.js
 * @description Entry point for the lock-type registry. Importing this
 * module ensures all built-in lock-type descriptors are registered before
 * findLockType() is used.
 */

export { registerLockType, findLockType } from './registry';
import './queuedDelay';
