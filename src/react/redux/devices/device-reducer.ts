import { Reducer } from "redux";
import { Capability } from "../../capability/device-capability";
import { object2id } from "../../z3kConfig/z3kConfig";

interface DeviceType {
  code: string;
  name: string;
}

type Device = {
  id: number;
  serial: string;
  device_type: DeviceType;
  temperature: [];
  fix_hw205_amr_state: [];
  fuel_consumption: {
    enabled: false;
    idle: null;
    km100: null;
    price: null;
  };
  last_guard_event: { time: number; event: string };
  filetransfers: [];
  access: [];
  capabilities: Capability[];
  ip: string;
  is_active: boolean;
  online: boolean;
  owner_username: string;
  user_id: number;
  name: string;
  color: string;
  notes: null;
  visible_device_type: null;
  timezone: number;
  suggest_firmware_upgrade: boolean;
  graphs_config: {
    blocks: [
      {
        sources: [{ class: string; params: { object_id: number } }];
        height: null;
        height_mobile: null;
      }
    ];
  };
  server_notifications: {
    events: {enabled: boolean},
    offline: {enabled: boolean, timeout: number},
},
};

export type OfflineDevice = Pick<
Device,
  | "id"
  | "serial"
  | "device_type"
  | "hardware_type"
  | "firmware_version"
  | "z3k_config"
  | "z3k_state"
  | "capabilities"
  | "online"
  | "tempstep"
  | "autoscan_settings"
  | "sim_in_device"
  | "user_id"
  | "filetransfers"
  // | 'server_notifications'
  // | 'access'
  // | 'name'
  // | 'stationary_location'
>;

/** Reducer */
export const electronDeviceReducer: Reducer<
  OfflineDevice[],
  UpgradeOfflineDeviceActions
> = (
  state: OfflineDevice[] = [],
  action: UpgradeOfflineDeviceActions
): OfflineDevice[] => {
  switch (action.type) {
    case "ADD_DEVICE":
      return [...state, action.device];
    case "UPDATE_DEVICE": {
      return state.map((dev) => {
        if (dev.id == action.setter.id) return { ...dev, ...action.setter };
        else return dev;
      });
    }
    case "UPDATE_DEVICE_STATE":
      return state.map((dev) => {
        if (dev.id == action.id) return { ...dev, z3k_state: action.state };
        else return dev;
      });
    case "UPDATE_DEVICE_Z3KCONFIG":
      return state.map((dev) => {
        if (dev.id == action.id) {
          return { ...dev, z3k_config: action.config };
        }
        return dev;
      });
    // return state.map((dev) => {
    //     if (dev.id == action.id) return {...dev, z3k_state: action.config};
    //     else return dev;
    // });
    // case ACTION_TYPE_DEVICE_DETECTION.ADD_DEVICE_DETECTION:
    //     return state.map((dev) => {
    //         return {...dev, online: true};
    //     });
    // case 'ADD_ONLINE':
    //     return state.map((dev) => {
    //         return {...dev, online: true};
    //     });
    case "UPD_ONLINE":
      return state.map((dev) => {
        return { ...dev, online: false };
        return dev;
      });
    default:
      return state;
  }
};
