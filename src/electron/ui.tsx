import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Action ,combineReducers,createStore,Dispatch, Store} from 'redux';
import { AppElectron } from './appElectron';
import { DeviceServer } from './udp/device-server';
import { DoubleSocket } from './udp/udp-socket';


interface OfflineDevicesState {}




document.addEventListener('DOMContentLoaded', async () => {

    function lateDispatch(action: Action): Action {
        return store.dispatch(action);
    }

    const sockets = new DoubleSocket();
    await sockets.init();
    const deviceServer = new DeviceServer(sockets, lateDispatch);

    const store: Store<OfflineDevicesState> = createStore(
        combineReducers({
          
        })
    );
    window.store = store as any;
    
    ReactDOM.render(
                <AppElectron />
        window.document.getElementById('root')
    );
});
