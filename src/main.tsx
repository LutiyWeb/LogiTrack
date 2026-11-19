import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/labels.scss';
import './index.scss';
import App from './App.tsx';
import { store } from './store/store';
import { connectWorkspace } from './store/workspaceSync';

void connectWorkspace(store).then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
);
