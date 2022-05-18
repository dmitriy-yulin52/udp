import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Action ,applyMiddleware,combineReducers,createStore,Dispatch, Store} from 'redux';
import { AppElectron } from './appElectron';
import { DeviceServer } from './udp/device-server';
import { DoubleSocket } from './udp/udp-socket';
import thunkMiddleware from 'redux-thunk';


interface OfflineDevicesState {}

interface IDevicesUIWindow extends Window {
    store: Store<OfflineDevicesState>;
}

declare const win: IDevicesUIWindow;


document.addEventListener('DOMContentLoaded', async () => {

    function lateDispatch(action: Action): Action {
        return store.dispatch(action);
    }

    const sockets = new DoubleSocket();
    await sockets.init();
    const deviceServer = new DeviceServer(sockets, lateDispatch);

    const store: Store<OfflineDevicesState> = createStore(
        combineReducers({
          
        }),applyMiddleware(thunkMiddleware.withExtraArgument({deviceServer}))
    );
    win.store = store as any;
    
    ReactDOM.render(
                <AppElectron />,
        window.document.getElementById('root')
    );
});
