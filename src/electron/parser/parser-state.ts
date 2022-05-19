import { DeepWritable } from 'ts-essentials';
import { Z3KConfigArray_Key_Types } from '../../react/z3kConfig/auxiliary';
import {
    AnalogDut,
    AnalogInput,
    AnalogOutput,
    AnalogTemperatureSensor,
    AnyObjectId,
    DeviceInfo,
    DigitalDut,
    GuardZone,
    HeatingCircuit,
    HeatingMode,
    PortRS485,
    Pump,
    RadioModule,
    RadioSensor,
    RadioSensor433,
    RelayControl,
    ServiceContact,
    ThreewayTap,
    WebElement,
    WiFi,
    WiredTemperatureSensor,
    Z3KConfig,
    Z3KObjectStateById,
} from '../../react/z3kConfig/z3kConfig';


export type ObjectPrimitive = number | string | readonly number[];
export function decodeArguments(s: string): ObjectPrimitive[] {
    const cleaned = s
        .replace(/\\'/g, '\u030A')
        .replace(/"/g, '\\"')
        .replace(/'/g, '"')
        .replace(/\u030A/g, "'");
    return JSON.parse('[' + cleaned + ']');
}

export function parseState(config: Z3KConfig, data: string): any {
    const re = /^#Y(\d+)\$(.*[^!])$/;
    const result_reg = data.match(re);
    if (!result_reg) {
        return null;
    }

    const id = Number(result_reg[1]);
    const content = decodeArguments(result_reg[2]);

    return (
        decodeAnalogInputs(id, content as string[], config) ??
        decodeWiredTemperatureSensor(id, content as string[], config) ??
        decodeGuardZones(id, content as string[], config) ??
        decodeRadiomodules(id, content as string[], config) ??
        decodeRadioSensors(id, content as string[], config) ??
        decodeWebElements(id, content as string[], config) ??
        decodeRelayControls(id, content as string[], config) ??
        decodeThreewayTaps(id, content as string[], config) ??
        decodeHeatingCircuits(id, content as string[], config) ??
        decodePumps(id, content as string[], config) ??
        decodeAnalogTemperatureSensors(id, content as string[], config) ??
        decodeRadioSensors433(id, content as string[], config) ??
        decodeAnalogDuts(id, content as string[], config) ??
        decodeDigitalDuts(id, content as string[], config) ??
        decodeAnalogOutputs(id, content as string[], config)
    );
}


function decodeAnalogInputs(
    id: number,
    content: ObjectPrimitive[],
    config: Z3KConfig
): AnalogInput.State | null {
    const analogInput = AnalogInput.get.byId(config, id as AnalogInput.Id);
    if (!analogInput) {
        return null;
    }
    // const komVoltMul = AnalogInput.voltFromSettingRegister(analogInput);
    return {
        // voltage: Number((+content[0] / komVoltMul).toFixed(1)),
        value: +content[0],
        flag: +content[3],
    };
}

function decodeAnalogOutputs(
    id: number,
    content: ObjectPrimitive[],
    config: Z3KConfig
): AnalogOutput.State | null {
    if (!AnalogOutput.get.byId(config, id as AnalogOutput.Id)) {
        return null;
    }
    return {
        value: Number(content[0]),
        flags: Number(content[1]),
    };
}



function decodeWiredTemperatureSensor(
    id: number,
    content: ObjectPrimitive[],
    config: Z3KConfig
): WiredTemperatureSensor.State | null {
    if (!WiredTemperatureSensor.get.byId(config, id as WiredTemperatureSensor.Id)) {
        return null;
    }
    const sensor_ok = Number(content[0]) < 65535;
    const curr_temp = +content[0] / 10 - 273;
    const prev_temp = +content[1] / 10 - 273;

    return {
        curr_temp,
        prev_temp,
        flag: +content[3],
        sensor_ok,
    };
}

function decodeAnalogTemperatureSensors(
    id: number,
    content: ObjectPrimitive[],
    config: Z3KConfig
): AnalogTemperatureSensor.State | null {
    if (!AnalogTemperatureSensor.get.byId(config, id as AnalogOutput.Id)) {
        return null;
    }
    const sensorOk = +content[0] < 65535;
    const currTemp = +content[0] / 10 - 273;
    const prevTemp = +content[1] / 10 - 273;

    return {
        curr_temp: currTemp,
        prev_temp: prevTemp,
        flag: +content[3],
        sensor_ok: sensorOk,
    };
}

function decodeGuardZones(
    id: number,
    content: ObjectPrimitive[],
    config: Z3KConfig
): GuardZone.State | null {
    if (!GuardZone.get.byId(config, id as GuardZone.Id)) {
        return null;
    }
    return {
        onguard: +content[2],
    };
}

function decodeRadioSensors(
    id: number,
    content: ObjectPrimitive[],
    config: Z3KConfig
): RadioSensor.State | null {
    if (!RadioSensor.get.byId(config, id as RadioSensor.Id)) {
        return null;
    }
    const sensorOk = +content[0] < 65535;
    const rssi = RadioSensor.getRSSI(+content[3]);
    return {
        temperature: Number((+content[0] / 10 - 273).toFixed(1)),
        humidity: +content[1],
        battery: +content[2] / 10,
        rssi: rssi,
        state_time: +content[4],
        state_flags: +content[5],
        sensor_ok: sensorOk,
    };
}

function decodeRadioSensors433(
    id: number,
    content: ObjectPrimitive[],
    config: Z3KConfig
): RadioSensor433.State | null {
    if (!RadioSensor433.get.byId(config, id as RadioSensor433.Id)) {
        return null;
    }
    return {
        status: +content[0],
    };
}

export function nonZero(
    array: readonly ObjectPrimitive[],
    index: number,
    dflt: ObjectPrimitive = 0
): ObjectPrimitive | null {
    const value = getValue(array, index, dflt);
    return value === 0 ? null : value;
}

function decodeHeatingCircuits(
    id: number,
    content: ObjectPrimitive[],
    config: Z3KConfig
): HeatingCircuit.State | null {
    if (!HeatingCircuit.get.byId(config, id as HeatingCircuit.Id)) {
        return null;
    }
    return {
        setpoint_temp:
            content[0] !== 0 && content[0] !== 65535 ? +content[0] / 10 - 273 : null,
        target_temp:
            content[1] !== 0 && content[1] !== 65535 ? +content[1] / 10 - 273 : null,
        mode_id: nonZero(content, 5) as HeatingMode.Id,
        target_sensor_id:
            content.length > 6 ? (+content[6] as HeatingCircuit.TargetSensorId) : null,
        worktime: 0,
        status: content.length > 7 ? +content[7] : null,
    };
}




function decodeWebElements(
    id: number,
    content: ObjectPrimitive[],
    config: Z3KConfig
): WebElement.State | null {
    if (!WebElement.get.byId(config, id as WebElement.Id)) {
        return null;
    }
    return {
        state: +content[0],
    };
}

function decodeAnalogDuts(
    id: number,
    content: ObjectPrimitive[],
    config: Z3KConfig
): AnalogDut.State | null {
    if (!AnalogDut.get.byId(config, id as AnalogDut.Id)) {
        return null;
    }
    return {
        fuel_level: Number((+content[0] / 100).toFixed(1)),
        raw_acp: Number((+content[1] / 100).toFixed(1)),
        status: +content[3],
        fuel_level_ok: +content[0] < 65535,
        raw_acp_ok: +content[1] < 65535,
    };
}

function decodeDigitalDuts(
    id: number,
    content: ObjectPrimitive[],
    config: Z3KConfig
): DigitalDut.State | null {
    if (!DigitalDut.get.byId(config, id as DigitalDut.Id)) {
        return null;
    }
    return {
        fuel_level: Number((+content[0] / 100).toFixed(1)),
        raw_acp: +content[1],
        status: +content[4],
    };
}

function boolFromOP<ID extends AnyObjectId, T extends Partial<Z3KObjectStateById<ID>>>(
    spec: Record<keyof T, number>,
    status: number
): T {
    return (Object.fromEntries(
        Object.entries(spec).map(([name, i]) => [
            name,
            (status & (1 << (i as number))) != 0,
        ])
    ) as unknown) as T;
}

const relay_controls: Record<keyof RelayControl.State, number> = {
    active: 0,
    set_failed: 1,
    test_mode: 2,
    test_pending: 3,
};

function decodeRelayControls(
    id: number,
    content: ObjectPrimitive[],
    config: Z3KConfig
): RelayControl.State | null {
    if (!RelayControl.get.byId(config, id as RelayControl.Id)) {
        return null;
    }
    return boolFromOP<RelayControl.Id, RelayControl.State>(relay_controls, +content[0]);
}

const three_way_taps: Record<keyof Omit<ThreewayTap.State, 'direction'>, number> = {
    fully_open: 0,
    fully_closed: 1,
    full_turn: 2,
    open_direction: 3,
    period_ready: 4,
    sensor_fault: 5,
    set_output_fault: 6,
    set_failed: 7,
    test_mode: 8,
    test_calibration: 9,
};


export function getValue(
    array: readonly ObjectPrimitive[],
    index: number,
    dflt: ObjectPrimitive
): ObjectPrimitive {
    return array[index] ?? dflt;
}


function decodeThreewayTaps(
    id: number,
    content: ObjectPrimitive[],
    config: Z3KConfig
): ThreewayTap.State | null {
    if (!ThreewayTap.get.byId(config, id as ThreewayTap.Id)) {
        return null;
    }
    const status = getValue(content, 1, 0) as number;
    return ({
        direction: +content[0],
        ...boolFromOP<ThreewayTap.Id, Omit<ThreewayTap.State, 'direction'>>(
            three_way_taps,
            status
        ),
    } as unknown) as ThreewayTap.State;
}

const pump_state_flag_names: Record<keyof Pump.State, number> = {
    run: 0,
    turn_on: 1,
    turn_off: 2,
    request: 3,
    lock: 4,
    state_switched: 5,
    summer_mode: 6,
    summer_turnover: 7,
    test_mode: 8,
};

function decodePumps(
    id: number,
    content: ObjectPrimitive[],
    config: Z3KConfig
): Pump.State | null {
    if (!Pump.get.byId(config, id as Pump.Id)) {
        return null;
    }
    return boolFromOP<Pump.Id, Pump.State>(pump_state_flag_names, +content[0]);
}

const radiomodules_state_flag_names: Record<
    keyof Omit<RadioModule.State, 'sensor_ids' | 'last_connect'>,
    number
> = {
    no_connection: 2,
    add_enable: 3,
    no_connect_event: 4,
};

function decodeRadiomodules(
    id: number,
    content: ObjectPrimitive[],
    config: Z3KConfig
): RadioModule.State | null {
    if (!RadioModule.get.byId(config, id as RadioModule.Id)) {
        return null;
    }
    return {
        ...boolFromOP<
            RadioModule.Id,
            Omit<RadioModule.State, 'sensor_ids' | 'last_connect'>
        >(radiomodules_state_flag_names, +content[0]),
        sensor_ids: content[1] as RadioSensor.Id[],
        last_connect: content[2] as number,
    };
}

export function str2Config(text: string): Z3KConfig {
    const config: DeepWritable<Partial<Z3KConfig>> = {};
    const unknown = [];

    const setting_by_id: Record<number, SettingLine | undefined> = {};
    const counters: Record<number, number> = {};
    for (const value of parseConfig(text)) {
        if (value.parsed instanceof SettingLine) {
            const setting_id: Z3KConfigSettingNumber = value.parsed.settingId;
            if (!Z3KConfigSettingTypesNumber.includes(setting_id)) {
                unknown.push(value.line);
            }
            setting_by_id[setting_id] = value.parsed;
        } else if (value.parsed instanceof ObjectLine) {
            const setting_name = z3k_object_id_by_field[
                value.parsed.subtype
            ] as Z3KConfigArray_Key_Types;
            const serializer = Z3KAnyObjectSpec[setting_name] || null;
            if (serializer !== null) {
                const obj = serializer.fromStr(
                    value.parsed.objectId as AnyObjectId,
                    value.parsed.args
                );
                const arr = config[setting_name];
                if (arr == null) {
                    //@ts-ignore
                    config[setting_name] = [obj];
                } else {
                    //@ts-ignore
                    arr.push(obj);
                }
            } else {
                unknown.push(value.line);
            }
        } else if (value.parsed instanceof CounterLine) {
            counters[value.parsed.author] = value.parsed.value;
        } else if (value.parsed instanceof UnknownLine) {
            unknown.push(value.parsed.content);
        }
    }

    Object.entries(config).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.sort((a: any, b: any) => {
                const ap = a?.position ?? 0,
                    bp = b?.position ?? 0;
                if (ap === 0 && bp === 0) return 0;
                if (ap === 0) return 1;
                if (bp === 0) return -1;
                return ap - bp;
            });
        }
    });

    return {
        ...config,
        counters: counters,
        device: decodeS7(setting_by_id[Z3KConfigSettingNumber.device]),
        gsm_settings: decodeGSM(
            setting_by_id[Z3KConfigSettingNumber.gsm_settings],
            setting_by_id[Z3KConfigSettingNumber.gsm_settings_notification]
        ),
        timezone: decodeTimeZone(setting_by_id[Z3KConfigSettingNumber.timezone]),
        port_rs485: decodePort485(setting_by_id[Z3KConfigSettingNumber.port_rs485]),
        servers: decodeServers(setting_by_id[Z3KConfigSettingNumber.servers]),
        port: decodePort(setting_by_id[Z3KConfigSettingNumber.port]),
        login: decodeLogin(setting_by_id[Z3KConfigSettingNumber.login]),
        password: decodePassword(setting_by_id[Z3KConfigSettingNumber.login]),
        apn: decodeAPN(setting_by_id[Z3KConfigSettingNumber.apn]),
        usbpassword: decodeUsbPassword(
            setting_by_id[Z3KConfigSettingNumber.usb_password]
        ),
        service_contact: decodeServiceContact(
            setting_by_id[Z3KConfigSettingNumber.service_contact]
        ),
        wifi_settings: decodeWiFi(setting_by_id[Z3KConfigSettingNumber.wifi_settings]),
        use_reserve_battery: decodeUseReserveBattery(
            setting_by_id[Z3KConfigSettingNumber.use_reserve_battery]
        ),
        a300_diag_interface: decodeA300Interface(
            setting_by_id[Z3KConfigSettingNumber.a300_diag_interface]
        ),
        a300_diag_available_params: decodeA300Params(
            setting_by_id[Z3KConfigSettingNumber.a300_diag_available_params]
        ),
        stockconfig: decodeStockConfig(
            setting_by_id[Z3KConfigSettingNumber.stock_config]
        ),
        server_settings: decodeServerSetting(
            setting_by_id[Z3KConfigSettingNumber.server_settings]
        ),
        unknown: unknown,
    };
}
export abstract class ConfigLine {
    abstract toString(): string;
}

export enum Z3KConfigSettingNumber {
    device = 7,
    gsm_settings = 12,
    timezone = 36,
    port_rs485 = 124,
    a300_diag_interface = 180,
    a300_diag_available_params = 181,
    servers = 200,
    port = 201,
    login = 202,
    apn = 203,
    usb_password = 204,
    gsm_settings_notification = 206,
    service_contact = 207,
    wifi_settings = 208,
    use_reserve_battery = 209,
    stock_config = 211,
    server_settings = 212,
}


export type StockConfig =
    | {readonly id: null; readonly title?: null; readonly version?: null}
    | {readonly id: number; readonly title: string; readonly version: string}
    | {readonly id: undefined; readonly title: undefined; readonly version: undefined};

export class SettingLine extends ConfigLine {
    constructor(
        public readonly settingId: Z3KConfigSettingNumber,
        public readonly value: string
    ) {
        super();
    }

    toString(): string {
        return `#S${this.settingId}=${this.value}`;
    }
}


export function decodeA300Interface(line: SettingLine | undefined): number | undefined {
    if (line == undefined) {
        return undefined;
    }
    return Number(line.value);
}

export function decodeStockConfig(
    line: SettingLine | undefined
): StockConfig | undefined {
    if (line == undefined) return undefined;
    const params = decodeArguments(line.value);
    if (params.length >= 3) {
        return {
            id: (params[0] as number) ?? null,
            title: (params[1] as string) ?? null,
            version: (params[2] as string) ?? null,
        };
    }
    return undefined;
}


export function decodeUseReserveBattery(
    line: SettingLine | undefined
): boolean | undefined {
    if (line == undefined) {
        return undefined;
    }
    const params = decodeArguments(line.value);
    return params[0] === 1;
}


export interface ServerSettings {
    readonly show_control_devices_state: boolean;
}

export function decodeServerSetting(
    line: SettingLine | undefined
): ServerSettings | undefined {
    if (line == undefined) {
        return undefined;
    }
    const params = decodeArguments(line.value);
    const flags = getValue(params, 0, 0) as number;

    return {
        show_control_devices_state: (flags & 0x01) != 0,
    };
}

export const authorBits = (author_id: number): number => author_id << 12;

export class CounterLine extends ConfigLine {
    constructor(public readonly author: number, public readonly value: number) {
        super();
    }

    toString(): string {
        return `#Z${authorBits(this.author) | this.value}=*`;
    }
}

export class UnknownLine extends ConfigLine {
    constructor(public readonly content: string) {
        super();
    }

    toString(): string {
        return `${this.content}`;
    }
}

export class Z3KConfigParserError extends Error {}

function getParams(line: SettingLine): string[] {
    return line.value.split(' ');
}
export function decodeS7(line: SettingLine | undefined): DeviceInfo {
    if (line == null) {
        throw new Z3KConfigParserError('Device Info Undefined');
    }
    const params = getParams(line);
    return {
        name: params[0],
        hardware: params[1],
        firmware: params[2],
    };
}

export function decodeA300Params(line: SettingLine | undefined): number | undefined {
    if (line == undefined) {
        return undefined;
    }
    return Number(line.value);
}

export function decodeWiFi(line: SettingLine | undefined): WiFi | undefined {
    if (line == undefined) {
        return undefined;
    }
    const params = decodeArguments(line.value);
    return {
        netname: params[0] as string,
        pass: params[1] as string,
        is_enabled: params[2] > 0,
    };
}

export function decodeServiceContact(
    line: SettingLine | undefined
): ServiceContact | undefined {
    if (line == undefined) {
        return undefined;
    }
    const params = getParams(line);
    const intDate = Number(params[1]);
    const date =
        intDate === 0
            ? null
            : {
                  year: 2000 + (intDate >> 9),
                  month: (intDate >> 5) & 0xf,
                  day: intDate & 0x1f,
              };
    return {
        phone: params[0],
        date: date,
    };
}

export function decodeUsbPassword(line: SettingLine | undefined): string | undefined {
    if (line == undefined) {
        return undefined;
    }
    return line.value;
}

export function decodeAPN(line: SettingLine | undefined): string | undefined {
    if (line == undefined) {
        return undefined;
    }
    return line.value;
}

export function decodePassword(line: SettingLine | undefined): string | undefined {
    if (line == undefined) {
        return undefined;
    }
    const params = getParams(line);
    return params[1];
}


export function decodeLogin(line: SettingLine | undefined): string {
    if (line == null) {
        throw new Z3KConfigParserError('Login Undefined');
    }
    const params = getParams(line);
    return params[0];
}


export function decodeTimeZone(line: SettingLine | undefined): number {
    if (line == null) {
        throw new Z3KConfigParserError('Time Zone Undefined');
    }
    return Number(line.value);
}

export function decodeServers(line: SettingLine | undefined): string | undefined {
    if (line == undefined) {
        return undefined;
    }
    return line.value;
}

export function decodePort(line: SettingLine | undefined): number {
    if (line == undefined) {
        return 52200;
    }
    return Number(line.value);
}


export function decodePort485(line: SettingLine | undefined): PortRS485 | undefined {
    if (line == undefined) {
        return undefined;
    }
    const params = decodeArguments(line.value);
    return {
        setting_register: Number(params[0]),
        speed: Number(params[1]),
        stop_byte_count: Number(params[2]),
        parity_check: Number(params[3]),
    };
}


export function decodeGSM(
    line1: SettingLine | undefined,
    line2: SettingLine | undefined
): GSMSettings | undefined {
    if (line1 == undefined) {
        return undefined;
    }
    const params = getParams(line1);
    return {
        ussd: params[0],
        threshold: Number(params[1]),
        notification:
            Number(line2?.value) === 0 ? null : (Number(line2?.value) as ObjectId<3>),
    };
}

