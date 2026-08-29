/**
 * Deep equality check for message object props and complex data structures.
 * Performs recursive comparison across objects, arrays, and primitive fields
 * to prevent unnecessary React re-renders during message streaming.
 */
export function isDeepEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;

  if (a === null || typeof a !== 'object' || b === null || typeof b !== 'object') {
    return false;
  }

  // Handle Date instances
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Handle RegExp instances
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }

  // Handle Arrays
  const isArrA = Array.isArray(a);
  const isArrB = Array.isArray(b);
  if (isArrA !== isArrB) return false;
  if (isArrA && isArrB) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Handle plain objects
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!isDeepEqual(a[key], b[key])) return false;
  }

  return true;
}
