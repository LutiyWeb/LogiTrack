import { Provider } from 'react-redux';
import AppShell from './components/AppShell/AppShell';
import { store, type AppStore } from './store/store';

type AppProps = {
  customStore?: AppStore;
};

function App({ customStore }: AppProps) {
  return (
    <Provider store={customStore ?? store}>
      <AppShell />
    </Provider>
  );
}

export default App;
