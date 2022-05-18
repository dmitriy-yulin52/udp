import { DeepRequired } from "ts-essentials";
import { getAuthorValue } from "./config-utils";
import { AbstractZ3KObject, AnyObjectId, Z3KConfig } from "./z3kConfig";


declare const ENABLE_SIM: boolean;
declare const Z3K_CONFIG_AUTHOR: number;
declare const Z3K_IS_USB_UTILITY: boolean;
declare const UI_VERSION: string;
declare const ENABLE_ASP_BILLING: boolean;

export type Z3KConfigArraysOnly = Omit<
    Z3KConfig,
    | 'counters'
    | 'login'
    | 'device'
    | 'usbpassword'
    | 'service_contact'
    | 'timezone'
    | 'use_reserve_battery'
    | 'gsm_settings'
    | 'wifi_settings'
    | 'port_rs485'
    | 'server_settings'
    | 'stockconfig'
    | 'unknown'
    | 'servers'
    | 'port'
    | 'password'
    | 'apn'
    | 'a300_diag_interface'
    | 'a300_diag_available_params'
>;

export type Z3KConfigArray_Key_Types = keyof Z3KConfigArraysOnly;
export type Z3KAnyArrayObject<K extends Z3KConfigArray_Key_Types> = Exclude<
    Z3KConfig[K],
    undefined
>;

export type Z3KAnyObject = Exclude<
    Z3KConfig[Z3KConfigArray_Key_Types],
    undefined
>[number];

export const dummyConfig: DeepRequired<Z3KConfigArraysOnly> = {
    //0
    analog_inputs: [],
    wired_temperature_sensors: [],
    guard_zones: [],
    notifications: [],
    users: [],
    //5
    output_actions: [],
    boiler_adapters: [],
    radiomodules: [],
    radiosensors: [],
    commands: [],
    //10
    web_elements: [],
    scenarios: [],
    buzzers: [],
    guard_indicators: [],
    relay_controls: [],
    //15
    threeway_taps: [],
    heating_circuits: [],
    pumps: [],
    tm_keys: [],
    user_roles: [],
    //20
    heating_modes: [],
    day_timetables: [],
    week_timetables: [],
    //radio_tags: [],
    io_extensions: [],
    //25
    pzas: [],
    boiler_groups: [],
    analog_temperature_sensors: [],
    ntc_temperature_curves: [],
    fobs: [],
    //30
    fob_buttons: [],
    radiosensors433: [],
    //outer_panels: [],
    time_intervals: [],
    interval_timetables: [],
    //35
    analog_duts: [],
    calibration_tables: [],
    digital_duts: [],
    radio_duts: [],
    graph_panels: [],
    //40
    boiler_cascades: [],
    //dut_settings: [],
    ui_groups: [],
    object_arrays: [],
    //accelerometrs: [],
    //45
    pauses: [],
    conditional_operators: [],
    comparators: [],
    logic_expressions: [],
    sensor_readings: [],
    //50
    time_comparators: [],
    modbus_devices: [],
    modbus_signals: [],
    analog_outputs: [],
    //signals: [],
    //55
    //slots: [],
    stop_scenarios: [],
};

export const object_types = Object.keys(dummyConfig) as Z3KConfigArray_Key_Types[];

export function getEntityById(
    config: Z3KConfig,
    object_id: AnyObjectId
): [Z3KConfigArray_Key_Types, AbstractZ3KObject] | [null, null] {
    for (let i = 0; i < object_types.length; ++i) {
        const partial_of_z3k_config = config[object_types[i]];
        if (partial_of_z3k_config != null)
            for (let j = 0; j < (partial_of_z3k_config || []).length; ++j) {
                const foundObj = partial_of_z3k_config[j];
                if (foundObj.id === object_id) {
                    return [object_types[i], foundObj];
                }
            }
    }
    return [null, null];
}

// global Z3K_CONFIG_AUTHOR
export function genIdAndIncCounter<ID extends AnyObjectId>(
    config: Z3KConfig
): [ID, Z3KConfig] {
    let counter = config.counters[Z3K_CONFIG_AUTHOR];
    const all_ids = Object.fromEntries(
        object_types.flatMap((type) =>
            (config[type] || []).map((obj: AbstractZ3KObject) => [obj.id, true])
        )
    );
    while (all_ids[getAuthorValue(Z3K_CONFIG_AUTHOR) | counter])
        counter = (counter + 1) & 0xfff;
    return [
        (getAuthorValue(Z3K_CONFIG_AUTHOR) | counter) as ID,
        {
            ...config,
            counters: {
                ...config.counters,
                [Z3K_CONFIG_AUTHOR]: (counter + 1) & 0xfff,
            },
        },
    ];
}


