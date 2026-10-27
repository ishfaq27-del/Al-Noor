/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createRoot } from 'react-dom/client';
import App from './App.tsx';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
