import { mount } from 'svelte';
// Fonts of the AGESCI visual identity manual, bundled with the PWA (no third-party requests).
import '@fontsource-variable/roboto';
import '@fontsource-variable/roboto-slab';
import './app.css';
import App from './App.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('missing #app element');

export default mount(App, { target });
