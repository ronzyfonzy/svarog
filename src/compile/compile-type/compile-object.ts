import {
  JSONSchema7,
  JSONSchema7Definition,
} from 'json-schema';

import cel from '../cel';
import compile from './';

export default function(schema: JSONSchema7, ref: string, strictRef: string): string {
  const properties = schema.properties || {};
  const requiredProperties = new Set(schema.required || []);
  const allProperties = Object.keys(properties);

  let guard = cel.calc(ref, 'is', cel.ref('map'));

  if (allProperties.length > 0) {
    const expectedKeys = cel.val(allProperties);
    const actualKeys = cel.ref(cel.call(cel.ref(ref, 'keys')));

    guard = cel.calc(guard, '&&', cel.call(cel.ref(actualKeys, 'hasOnly'), expectedKeys));
  }

  allProperties.forEach(key => {
    const value = properties[key];
    const valueRef = cel.ref(ref, key);

    if (typeof value === 'boolean') {
      guard = cel.calc(guard, '&&', valueRef);
    } else if (typeof value === 'object') {
      let valueGuard = compile(value, valueRef, strictRef);

      if (requiredProperties.has(key)) {
        const definedOrStrict = cel.calc(strictRef, '||', valueRef);
        valueGuard = cel.calc(definedOrStrict, '&&', valueGuard);
      } else {
        valueGuard = cel.calc(valueRef, '&&', valueGuard);
      }

      guard = cel.calc(guard, '&&', valueGuard);
    }
  });

  // TODO: minProperties
  // TODO: maxProperties
  // TODO: propertyNames
  // TODO: dependencies
  // TODO: patternProperties

  return guard;
}
