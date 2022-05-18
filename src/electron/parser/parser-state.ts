import {
    AnalogDut,
    AnalogInput,
    AnalogOutput,
    AnalogTemperatureSensor,
    AnyObjectId,
    DigitalDut,
    GuardZone,
    HeatingCircuit,
    HeatingMode,
    Pump,
    RadioModule,
    RadioSensor,
    RadioSensor433,
    RelayControl,
    ThreewayTap,
    WebElement,
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
