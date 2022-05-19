import { Z3KConfig, Z3KDeviceState } from "../../z3kConfig/z3kConfig";
import { OfflineDevice } from "./device-reducer";


// export type UpgradeOfflineDeviceActions =
//     | AddDeviceType
//     | UpdateDeviceType
//     | UpdateDeviceStateType
//     | UpdateDeviceZ3kConfigType
//     | AddDeviceDetectionType
//     | AddOnlineForDeviceDetectedType
//     | UpdOnlineForDeviceDetectedType;


export type UpgradeOfflineDeviceActions = ReturnType<
    | typeof update_device_z3kConfig_action
    | typeof update_device_state_action
    | typeof update_device_action
    | typeof addOnlineForDeviceDetectedAction
    | typeof add_device_action
    | typeof updOnlineForDeviceDetectedAction
>;

/** Actions*/
export const add_device_action = (device: OfflineDevice): AddDeviceType => {
    return {
        type: 'ADD_DEVICE',
        device,
    };
};
export const update_device_action = (
    setter: Partial<OfflineDevice>
): UpdateDeviceType => {
    return {
        type: 'UPDATE_DEVICE',
        setter,
    };
};
export const update_device_state_action = (
    id: number,
    state: Z3KDeviceState
): UpdateDeviceStateType => {
    return {
        type: 'UPDATE_DEVICE_STATE',
        id,
        state,
    };
};
export const update_device_z3kConfig_action = (
    id: number,
    config: Partial<Z3KConfig>
): UpdateDeviceZ3kConfigType => {
    return {
        type: 'UPDATE_DEVICE_Z3KCONFIG',
        id,
        config,
    };
};

export const addOnlineForDeviceDetectedAction = (
    online: boolean,
    serial: string
): AddOnlineForDeviceDetectedType => {
    return {
        type: 'ADD_ONLINE',
        online,
        serial,
    };
};

export const updOnlineForDeviceDetectedAction = (): UpdOnlineForDeviceDetectedType => {
    return {
        type: 'UPD_ONLINE',
    };
};

/** ActionsType */
type AddDeviceType = {
    type: 'ADD_DEVICE';
    device: OfflineDevice;
};
type UpdateDeviceType = {
    type: 'UPDATE_DEVICE';
    setter: Partial<OfflineDevice>;
};
type UpdateDeviceStateType = {
    type: 'UPDATE_DEVICE_STATE';
    id: number;
    state: Z3KDeviceState;
};
export type UpdateDeviceZ3kConfigType = {
    type: 'UPDATE_DEVICE_Z3KCONFIG';
    id: number;
    config: Partial<Z3KConfig>;
};
type AddOnlineForDeviceDetectedType = {
    type: 'ADD_ONLINE';
    online: boolean;
    serial: string;
};
type UpdOnlineForDeviceDetectedType = {
    type: 'UPD_ONLINE';
};
