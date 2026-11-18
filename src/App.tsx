import { Provider } from 'react-redux';
import { BrowserRouter, MemoryRouter } from 'react-router';
import AppShell from './components/AppShell/AppShell';
import { store, type AppStore } from './store/store';

type AppProps = {
  /** Tests pass their own store; they also get an in-memory address that starts at "/". */
  customStore?: AppStore;
};

function App({ customStore }: AppProps) {
  const Router = customStore ? MemoryRouter : BrowserRouter;
  return (
    <Provider store={customStore ?? store}>
      <Router>
        <AppShell />
      </Router>
    </Provider>
  );
}

export default App;
