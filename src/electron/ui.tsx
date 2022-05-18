import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  Action,
  applyMiddleware,
  combineReducers,
  createStore,
  Dispatch,
  Store,
} from "redux";
import { AppElectron } from "./appElectron";
import { DeviceServer } from "./udp/device-server";
import { DoubleSocket } from "./udp/udp-socket";
import thunkMiddleware from "redux-thunk";
import { fakeState } from "./emulation-state";
import { Provider } from "react-redux";

interface OfflineDevicesState {}

interface IDevicesUIWindow extends Window {
  store: Store<OfflineDevicesState>;
}

declare const win: IDevicesUIWindow;

const billingReducer = (state = fakeState.billing) => state;
const accountReducer = (state = fakeState.account) => state;
const appSettingReducer = (state = fakeState.app_settings) => state;
const terminalReducer = (state = fakeState.terminal) => state;
const uiSettingsReducer = (state = fakeState.ui_settings) => state;
const isOfflineReducer = (state = { isOffline: true }) => state;

document.addEventListener("DOMContentLoaded", async () => {
  function lateDispatch(action: Action): Action {
    return store.dispatch(action);
  }

  const sockets = new DoubleSocket();
  await sockets.init();
  const deviceServer = new DeviceServer(sockets, lateDispatch);

  const store: Store<OfflineDevicesState> = createStore(
    combineReducers({
      account: accountReducer,
      terminal: terminalReducer,
      app_settings: appSettingReducer,
      ui_settings: uiSettingsReducer,
      isOffline: isOfflineReducer,
      billing: billingReducer,
    }),
    applyMiddleware(thunkMiddleware.withExtraArgument({ deviceServer }))
  );
  win.store = store as any;

  ReactDOM.render(
    <Provider store={store}>
      <AppElectron />
    </Provider>,
    window.document.getElementById("root")
  );
});
