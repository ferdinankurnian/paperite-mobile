const fs = require('node:fs');

const file = 'node_modules/expo-router/build/react-navigation/stack/views/Stack/Card.js';

if (!fs.existsSync(file)) {
  process.exit(0);
}

let source = fs.readFileSync(file, 'utf8');

const createCall = 'interactionHandleRef.current = react_native_1.InteractionManager.createInteractionHandle();';
const clearCall = 'react_native_1.InteractionManager.clearInteractionHandle(interactionHandleRef.current);';

if (source.includes(createCall)) {
  source = source.replace(createCall, 'interactionHandleRef.current = true;');
  source = source.replace(clearCall, 'interactionHandleRef.current = undefined;');
  fs.writeFileSync(file, source);
  console.log('[expo-router-interaction] patched');
} else if (source.includes('interactionHandleRef.current = true;')) {
  console.log('[expo-router-interaction] ok');
} else {
  console.warn('[expo-router-interaction] skip: source changed');
}
