import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

const destinazione = document.getElementById('app');
if (!destinazione) throw new Error('Elemento #app mancante');

export default mount(App, { target: destinazione });
