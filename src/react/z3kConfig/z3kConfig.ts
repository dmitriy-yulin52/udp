import memoizeOne from "memoize-one";
import { genIdAndIncCounter } from "./auxiliary";
import { prettyFloat } from "./number-utils";
import { Predicate } from "./predicate";
import { Author } from "./config-utils";
import { removeNulls } from "../hook-utils/hook-utils";
import { WeekScheduleWithModes } from "./shedule-element";

export declare type MarkOptional<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

export type AnyObjectId = number & { readonly __z3k_object_id: number };

export type ObjectId<N extends number> = number & {
  readonly __z3k_object_id: N;
};

export type ObjectPrimitive = number | string | readonly number[];

export interface Z3KObject<N extends number> {
  readonly id: ObjectId<N>;
  rest?: readonly ObjectPrimitive[];
}

export namespace Z3KObject {
  export function cmp_by_id<N extends number>(
    a: Z3KObject<N>,
    b: Z3KObject<N>
  ): number {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return +1;
    return 0;
  }
}

export enum Z3KObjectId {
  AnalogInput = 0,
  WiredTemperatureSensor = 1,
  GuardZone = 2,
  Notification = 3,
  User = 4,
  OutputAction = 5,
  BoilerAdapter = 6,
  RadioModule = 7,
  RadioSensor = 8,
  Command = 9,
  WebElement = 10,
  Scenario = 11,
  Buzzer = 12,
  GuardIndicator = 13,
  RelayControl = 14,
  ThreewayTap = 15,
  HeatingCircuit = 16,
  Pump = 17,
  TMKey = 18,
  UserRole = 19,
  HeatingMode = 20,
  DayTimetable = 21,
  WeekTimetable = 22,
  RadioTag = 23, //TODO
  IOExtension = 24,
  Pza = 25,
  BoilerGroup = 26,
  AnalogTemperatureSensor = 27,
  NTCTemperatureCurve = 28,
  Fob = 29,
  FobButton = 30,
  RadioSensor433 = 31,
  OuterPanel = 32, //TODO
  TimeInterval = 33,
  IntervalTimetable = 34,
  AnalogDut = 35,
  CalibrationTable = 36,
  DigitalDut = 37,
  RadioDut = 38,
  GraphPanel = 39,
  BoilerCascade = 40,
  DutSettings = 41, //TODO
  UIGroup = 42,
  ObjectArrays = 43,
  Accelerometer = 44, //TODO
  Pause = 45,
  ConditionalOperator = 46,
  Comparator = 47,
  LogicExpression = 48,
  SensorReading = 49,
  TimeComparator = 50,
  ModBusDevice = 51,
  ModBusSignal = 52,
  AnalogOutput = 53,
  Signal = 54, //TODO
  Slot = 55, //TODO
  StopScenario = 56,
}

export type AbstractZ3KObject = {
  id: AnyObjectId;
};
export type IdOf<T> = T extends Z3KObject<infer N> ? ObjectId<N> : never;
export type TypeIdOf<T> = T extends Z3KObject<infer N> ? N : never;

export type Z3KObjectWithID<T> = T extends ObjectId<infer N>
  ? Z3KObject<N>
  : never;
export interface ObjectNamespace {
  get: {
    all: (config: Z3KConfig) => readonly AbstractZ3KObject[];
  };
}

export function object2id<K extends number>(object: Z3KObject<K>): ObjectId<K> {
  return object.id;
}
export function objects2ids<K extends number>(
  objects: readonly Z3KObject<K>[]
): ObjectId<K>[] {
  return objects.map((obj) => obj.id);
}
/**
 * @function
 * @param object_namespace: массив Z3K-типов
 * @return функция, которая вернёт IDs
 * Из конфига получаем все ID нужных типов
 */
export function idExtractor(
  object_namespace: ObjectNamespace[]
): (config: Z3KConfig) => AnyObjectId[] {
  return memoizeOne((config: Z3KConfig) =>
    objects2ids(object_namespace.flatMap((objType) => objType.get.all(config)))
  );
}

export function idIn(
  ids: readonly (AnyObjectId | null | undefined)[]
): Predicate<AbstractZ3KObject> {
  return (obj) => ids.includes(obj.id);
}

interface ObjWithSettingRegister {
  readonly setting_register: number;
}

function isFlagSet(
  obj: Readonly<ObjWithSettingRegister>,
  flag: number
): boolean {
  return (obj.setting_register & flag) != 0;
}

function setFlag<T extends ObjWithSettingRegister>(
  obj: Readonly<T>,
  flag: number,
  set: boolean
): T {
  return {
    ...obj,
    setting_register: (obj.setting_register & ~flag) | (set ? flag : 0),
  };
}

export type PhysicalInputOutput = number;

export type ExternalIOBlock =
  | IOExtension.Id
  | ModBusSignal.Id
  | RadioSensor.Id
  | AnalogOutput.Id;

interface ParsedPhysicalIO {
  readonly block_id: ExternalIOBlock | null;
  readonly input_number: number | null;
}

export function parsePhysicalIO(value: PhysicalInputOutput): ParsedPhysicalIO {
  if (value == -1) {
    return { block_id: null, input_number: null };
  }
  const raw_block_id = (value >> 4) & 0xffff;
  return {
    block_id: raw_block_id == 0 ? null : (raw_block_id as ExternalIOBlock),
    input_number: value & 0x0f,
  };
}

export function composePhysicalIO(
  block_id: ExternalIOBlock | null,
  input_number: number | null
): PhysicalInputOutput {
  if (input_number == null) return -1;
  return (
    ((block_id == null ? 0 : (block_id as number)) << 4) | (input_number & 0x0f)
  );
}

interface GetSet<C, T> {
  get(config: C): readonly T[] | undefined;
  set(config: C, new_value: readonly T[]): C;
}

function arrayGetSet<K extends keyof Z3KConfig>(key: K) {
  return {
    get(config: Z3KConfig): Z3KConfig[K] {
      return config[key];
    },
    set(config: Z3KConfig, new_value: Z3KConfig[K]): Z3KConfig {
      return { ...config, [key]: new_value };
    },
  };
}

type ArrayPredicate<T> = (
  obj: T,
  index: number,
  array: readonly T[]
) => boolean;
type Modifier<T> = (obj: T) => T;

export interface ObjectAccessor<N extends number, T extends Z3KObject<N>> {
  all(config: Z3KConfig | undefined): readonly T[];
  where(config: Z3KConfig | undefined, filter: ArrayPredicate<T>): T[];
  except(config: Z3KConfig | undefined, filter: ArrayPredicate<T>): T[];
  one(config: Z3KConfig | undefined, filter: ArrayPredicate<T>): T | undefined;
  some(config: Z3KConfig | undefined, filter: ArrayPredicate<T>): boolean;
  every(config: Z3KConfig | undefined, filter: ArrayPredicate<T>): boolean;
  dontExist(config: Z3KConfig | undefined, filter: ArrayPredicate<T>): boolean;
  byId(config: Z3KConfig | undefined, object_id: ObjectId<N>): T | undefined;
  idIn(config: Z3KConfig | undefined, object_ids: ObjectId<N>[]): T[];
  modify(
    config: Z3KConfig,
    filter: ArrayPredicate<T>,
    modifier: Modifier<T>
  ): Z3KConfig;
  modifyById(
    config: Z3KConfig,
    object_id: ObjectId<N>,
    modifier: Modifier<T>
  ): Z3KConfig;
  applySetterById(
    config: Z3KConfig,
    object_id: ObjectId<N>,
    setter: Partial<T>
  ): Z3KConfig;
  replaceById(
    config: Z3KConfig,
    object_id: ObjectId<N>,
    replacement: T
  ): Z3KConfig;
  remove(config: Z3KConfig, filter: ArrayPredicate<T>): Z3KConfig;
  removeById(config: Z3KConfig, object_id: ObjectId<N>): Z3KConfig;
  add(config: Z3KConfig, object: MarkOptional<T, "id">): [T["id"], Z3KConfig];
  addDefault(config: Z3KConfig): [T["id"], Z3KConfig];
  createIfNotExists(config: Z3KConfig, obj: T): Z3KConfig;
}

function createAccessors<N extends number, T extends Z3KObject<N>>(
  getset: GetSet<Z3KConfig, T>,
  defaultObject: Omit<T, "id">
): ObjectAccessor<N, T> {
  type ID = ObjectId<N>;
  type Predicate = (obj: T, index: number, array: readonly T[]) => boolean;
  type Modifier = (obj: T) => T;

  const empty_array: [] = [];

  const self = {
    all(config: Z3KConfig | undefined): readonly T[] {
      return config != null ? getset.get(config) ?? empty_array : empty_array;
    },

    where(config: Z3KConfig | undefined, filter: Predicate): T[] {
      return self.all(config).filter(filter);
    },

    except(config: Z3KConfig | undefined, except: Predicate): T[] {
      return self.where(config, (x, i, arr) => !except(x, i, arr));
    },

    one(config: Z3KConfig | undefined, filter: Predicate): T | undefined {
      return self.all(config).find(filter);
    },

    some(config: Z3KConfig | undefined, filter: Predicate): boolean {
      return self.where(config, filter).length > 0;
    },

    every(config: Z3KConfig | undefined, filter: Predicate): boolean {
      return self.except(config, filter).length == 0;
    },

    dontExist(config: Z3KConfig | undefined, filter: Predicate): boolean {
      return !self.some(config, filter);
    },

    byId(config: Z3KConfig | undefined, object_id: ID): T | undefined {
      return self.one(config, (item) => item.id == object_id);
    },

    idIn(config: Z3KConfig | undefined, object_ids: ID[]): T[] {
      return self.where(config, (obj) => object_ids.includes(obj.id));
    },

    modify(
      config: Z3KConfig,
      filter: Predicate,
      modifier: Modifier
    ): Z3KConfig {
      const old_array = self.all(config);
      let changed = false;
      const new_array = old_array.map((item, index, array) => {
        if (filter(item, index, array)) {
          const newItem = modifier(item);
          changed ||= newItem != item;
          return newItem;
        }
        return item;
      });
      if (!changed) return config;
      return getset.set(config, new_array);
    },

    modifyById(
      config: Z3KConfig,
      object_id: ID,
      modifier: Modifier
    ): Z3KConfig {
      return self.modify(config, (item) => item.id == object_id, modifier);
    },

    applySetterById(
      config: Z3KConfig,
      object_id: ID,
      setter: Partial<T>
    ): Z3KConfig {
      return self.modifyById(config, object_id, (item) => ({
        ...item,
        ...setter,
      }));
    },

    replaceById(config: Z3KConfig, object_id: ID, replacement: T): Z3KConfig {
      return self.modifyById(config, object_id, () => replacement);
    },

    remove(config: Z3KConfig, filter: Predicate): Z3KConfig {
      const old_array = self.all(config);
      const new_array = old_array.filter(
        (item, index, array) => !filter(item, index, array)
      );
      if (new_array.length == old_array.length) return config;
      return getset.set(config, new_array);
    },

    removeById(config: Z3KConfig, object_id: ID): Z3KConfig {
      return self.remove(config, (item) => item.id == object_id);
    },

    add(
      config: Z3KConfig,
      object: MarkOptional<T, "id">
    ): [T["id"], Z3KConfig] {
      if ("id" in object && object.id != null) {
        return [
          object.id,
          getset.set(config, [...self.all(config), object as T]),
        ];
      } else {
        const [new_id, new_config] = genIdAndIncCounter<ID>(config);
        return [
          new_id,
          getset.set(new_config, [
            ...self.all(config),
            { ...object, id: new_id },
          ] as T[]),
        ];
      }
    },
    addDefault(config: Z3KConfig): [T["id"], Z3KConfig] {
      const [new_id, new_config] = genIdAndIncCounter<ID>(config);
      return [
        new_id,
        getset.set(new_config, [
          ...self.all(config),
          { ...defaultObject, id: new_id },
        ] as T[]),
      ];
    },
    /**
     * @function
     * Нужно передать объект с ID
     * Хорошо подходит для master-setting
     * @param config - конфиг
     * @param obj - объект этого типа
     * @return Z3KConfig
     */
    createIfNotExists(config: Z3KConfig, obj: T): Z3KConfig {
      if (self.byId(config, obj.id)) {
        return config;
      }
      return self.add(config, obj)[1];
    },
    defaultObject,
  };

  return self;
}

export interface AnalogInput extends Z3KObject<Z3KObjectId.AnalogInput> {
  readonly physical_input_num: PhysicalInputOutput;
  readonly name: string;
  readonly upper_threshold: number | null;
  readonly lower_threshold: number | null;
  readonly active_level_timeout: number;
  readonly inactive_level_timeout: number;
  readonly setting_register: number;
  readonly notification_list: readonly ReactionId[];
  readonly sensor_type: AnalogInput.SensorType;
  readonly recovery_list: readonly ReactionId[];
  readonly upper_notification_list: readonly ReactionId[];
  readonly impulse_frequency: number;
  readonly calibration: CalibrationTable.Id | null;
  readonly position: number;
  readonly units?: AnalogInput.Units;

  is_new?: boolean; // client-only field for means of settings dialog
}

export namespace AnalogInput {
  export type Id = ObjectId<Z3KObjectId.AnalogInput>;

  export enum StatusFlags {
    GUARD_FLAG = 1 << 0,
    IS_TRIGGERED_FLAG1 = 1 << 1,
    IS_RESET_FLAG = 1 << 2,
    TRIGGERED_EVENT_FLAG = 1 << 3,
    MAIN_VOLTAGE_LOW_FLAG = 1 << 4,
    RESISTANCE_CTRL_FLAG = 1 << 5,
    PRESSURE_CTRL_FLAG = 1 << 6,
    DAMAGED_WIRE_CTRL_FLAG = 1 << 7,
    SENSOR_WORKED = 1 << 12,
  }

  export enum SensorType {
    ANALOG_INPUT = 0,
    PRESSURE_SENSOR_5 = 1,
    PRESSURE_SENSOR_12 = 2,
    MAGNET = 3,
    MOTION_CONTROLLED = 4,
    SMOKE = 5,
    LEAK = 6,
    MOTION_UNCONTROLLED = 7,
    THERMOSTAT = 8,
    BOILER_FAILURE_PLUS = 9,
    BOILER_FAILURE_MINUS = 10,
    IGNITION = 11,
    SPEED_SENSOR = 12,
    RPM_SENSOR = 13,
    DISCRETE = 14,
    ALARM_BUTTON = 15,
    FUEL_STAT_SENSOR = 16,
    HUMIDITY_SENSOR = 17,
    PRESSURE_SENSOR_MLD_6 = 18,
  }
  const FixedVoltageSensors: SensorType[] = [
    SensorType.PRESSURE_SENSOR_5,
    SensorType.PRESSURE_SENSOR_12,
    SensorType.PRESSURE_SENSOR_MLD_6,
    SensorType.MAGNET,
    SensorType.MOTION_CONTROLLED,
    SensorType.SMOKE,
    SensorType.LEAK,
    SensorType.MOTION_UNCONTROLLED,
    SensorType.THERMOSTAT,
    SensorType.BOILER_FAILURE_PLUS,
    SensorType.BOILER_FAILURE_MINUS,
    SensorType.DISCRETE,
    SensorType.ALARM_BUTTON,
  ];

  export function voltFromSettingRegister(input: AnalogInput): number {
    let komVoltMul = 1;
    if (input.sensor_type === SensorType.ANALOG_INPUT)
      (input.setting_register & 0x4) > 0
        ? (komVoltMul = 1000)
        : (komVoltMul = 10);
    if (FixedVoltageSensors.includes(input.sensor_type)) komVoltMul = 10;
    return komVoltMul;
  }

  export enum Units {
    VOLTAGE = 0,
    RESISTANCE = 1,
    PRESSURE = 2,
    SPEED = 3,
    RPM = 4,
    VOLUME = 5,
    FUEL_RATE = 6,
    PERCENT = 7,
    UNITLESS = 8,
    AMPER = 9,
    FREQUENCY = 10,
    TEMPERATURE = 11,
    STREAM = 12,
    PPM = 13,
    REACTIVE_POWER = 14,
    ACTIVE_POWER = 15,
    FULL_POWER = 16,
    ENERGY = 17,
    PHASE_SHIFT = 18,
  }

  export const a300FrequencySensorTypes = [
    SensorType.SPEED_SENSOR,
    SensorType.RPM_SENSOR,
    SensorType.FUEL_STAT_SENSOR,
  ];

  export const a300SensorTypes = [
    ...a300FrequencySensorTypes,
    SensorType.IGNITION,
    SensorType.DISCRETE,
    SensorType.ALARM_BUTTON,
  ];

  export const booleanSensorsTypes = [
    SensorType.MAGNET,
    SensorType.MOTION_CONTROLLED,
    SensorType.SMOKE,
    SensorType.LEAK,
    SensorType.MOTION_UNCONTROLLED,
    SensorType.THERMOSTAT,
    SensorType.BOILER_FAILURE_PLUS,
    SensorType.BOILER_FAILURE_MINUS,
    SensorType.IGNITION,
    SensorType.DISCRETE,
    SensorType.ALARM_BUTTON,
  ];

  export const typesWithThresholds = [
    SensorType.ANALOG_INPUT,
    SensorType.PRESSURE_SENSOR_5,
    SensorType.PRESSURE_SENSOR_12,
    SensorType.PRESSURE_SENSOR_MLD_6,
    SensorType.DISCRETE,
    SensorType.HUMIDITY_SENSOR,
  ];

  export const typesWithThresholdLimits = [
    SensorType.ANALOG_INPUT,
    SensorType.PRESSURE_SENSOR_5,
    SensorType.PRESSURE_SENSOR_12,
    SensorType.PRESSURE_SENSOR_MLD_6,
    SensorType.HUMIDITY_SENSOR,
  ];

  export const typesWithActivityTimeouts = [
    SensorType.ANALOG_INPUT,
    SensorType.HUMIDITY_SENSOR,
  ];

  const pressureTypes = [
    SensorType.PRESSURE_SENSOR_5,
    SensorType.PRESSURE_SENSOR_12,
    SensorType.PRESSURE_SENSOR_MLD_6,
  ];

  export enum Flags {
    NO_GUARD_CTRL_ENABLE = 1 << 0,
    NO_MAIN_SUPPLY_CTRL_ENABLE = 1 << 1,
    RESISTANCE_CTRL = 1 << 2,
    EVENT_TO_SERVER = 1 << 3,
    USE_CALIBRATION_TABLE = 1 << 4,
    USE_DATA_FROM_DIAGNOSTICS = 1 << 5,
  }

  export interface State {
    //LEGACY в котором перепутаны значения, использовать нельзя
    // readonly voltage: number;

    //Приходят сырые данные, которые надо обработать
    readonly value: number;
    readonly flag: number;
  }

  export const get = createAccessors(arrayGetSet("analog_inputs"), {
    name: "Датчик",
    notification_list: [],
    upper_notification_list: [],
    physical_input_num: -1,
    sensor_type: AnalogInput.SensorType.ANALOG_INPUT,
    recovery_list: [],
    upper_threshold: 0,
    lower_threshold: 0,
    active_level_timeout: 1,
    inactive_level_timeout: 2,
    setting_register: 0,
    is_new: true,
    impulse_frequency: 1,
    calibration: null,
    units: 0,
    position: 0,
  });

  export function statusFlagSet(state: State, flag: StatusFlags): boolean {
    return (state.flag & flag) !== 0;
  }

  export function getValue(ai: AnalogInput, state: State): number {
    const { value = 0 } = state;
    const type = getType(ai);

    if (isPressureInput(ai)) {
      return value * 0.1;
    }

    if (type === SensorType.HUMIDITY_SENSOR) {
      return value;
    }

    if (type === SensorType.ANALOG_INPUT) {
      if (isUseResistance(ai)) {
        return value * 0.001;
      }
    }

    if (AnalogInput.a300FrequencySensorTypes.includes(type)) {
      return [SensorType.RPM_SENSOR, SensorType.FUEL_STAT_SENSOR].includes(type)
        ? (value * 0.1) / ai.impulse_frequency
        : value / ai.impulse_frequency;
    }

    return value / getMultiplier(ai);
  }

  export function getValueHuman(ai: AnalogInput, state: State): string {
    return prettyFloat(getValue(ai, state), 1);
  }

  export function setNewType(
    analog_input: AnalogInput,
    type: SensorType
  ): AnalogInput {
    if (type === AnalogInput.SensorType.THERMOSTAT) {
      analog_input = setFlag(analog_input, Flags.NO_GUARD_CTRL_ENABLE, true);
    }
    analog_input = setFlag(analog_input, Flags.RESISTANCE_CTRL, false);

    return setUnit({ ...analog_input, sensor_type: type });
  }

  export function isTriggered(state: State): boolean {
    return statusFlagSet(state, StatusFlags.IS_TRIGGERED_FLAG1);
  }

  export function isWorked(state: State): boolean {
    return statusFlagSet(state, StatusFlags.SENSOR_WORKED);
  }

  export function isUseCalibrationTable(
    analogInput: Pick<AnalogInput, "setting_register">
  ): boolean {
    return isFlagSet(analogInput, Flags.USE_CALIBRATION_TABLE);
  }

  export function isUseResistance(
    analog_input: Pick<AnalogInput, "setting_register">
  ): boolean {
    return isFlagSet(analog_input, Flags.RESISTANCE_CTRL);
  }

  export function setUseResistance(ai: AnalogInput, use: boolean): AnalogInput {
    return setFlag(ai, Flags.RESISTANCE_CTRL, use);
  }

  export function isDamageWire(state: State): boolean {
    return statusFlagSet(state, StatusFlags.DAMAGED_WIRE_CTRL_FLAG);
  }

  export function setVoltageControl(
    analogInput: AnalogInput,
    text: string
  ): AnalogInput {
    return {
      ...analogInput,
      name: text,
      setting_register:
        (analogInput.setting_register & AnalogInput.Flags.EVENT_TO_SERVER) |
        Flags.NO_GUARD_CTRL_ENABLE,
    };
  }

  export const ThresholdMax: Record<SensorType, number> = {
    [SensorType.ANALOG_INPUT]: 35,
    [SensorType.PRESSURE_SENSOR_5]: 5,
    [SensorType.PRESSURE_SENSOR_12]: 12,
    [SensorType.PRESSURE_SENSOR_MLD_6]: 6,
    [SensorType.HUMIDITY_SENSOR]: 100,
    [SensorType.MAGNET]: 300,
    [SensorType.MOTION_CONTROLLED]: 300,
    [SensorType.SMOKE]: 300,
    [SensorType.LEAK]: 300,
    [SensorType.MOTION_UNCONTROLLED]: 300,
    [SensorType.THERMOSTAT]: 300,
    [SensorType.BOILER_FAILURE_PLUS]: 300,
    [SensorType.BOILER_FAILURE_MINUS]: 300,
    [SensorType.IGNITION]: 300,
    [SensorType.SPEED_SENSOR]: 300,
    [SensorType.RPM_SENSOR]: 300,
    [SensorType.DISCRETE]: 300,
    [SensorType.ALARM_BUTTON]: 300,
    [SensorType.FUEL_STAT_SENSOR]: 300,
  };

  export function getThresholdMax(
    analog_input: Pick<AnalogInput, "sensor_type" | "setting_register">
  ): number {
    const { sensor_type } = analog_input;
    return isUseResistance(analog_input) ? 500 : ThresholdMax[sensor_type];
  }

  interface AnalogInputUnit {
    readonly value: Units;
    readonly multiply: number;
    readonly value_title: string;
    readonly unit: string;
  }

  export const analog_input_units: AnalogInputUnit[] = [
    {
      value: Units.VOLTAGE,
      multiply: 10,
      value_title: "Напряжение",
      unit: "В",
    },
    {
      value: Units.RESISTANCE,
      multiply: 1000,
      value_title: "Сопротивление",
      unit: "кОм",
    },
    {
      value: Units.PRESSURE,
      multiply: 10,
      value_title: "Давление",
      unit: "бар",
    },
    { value: Units.SPEED, multiply: 1, value_title: "Скорость", unit: "км/ч" },
    { value: Units.RPM, multiply: 10, value_title: "Обороты", unit: "об/мин" },
    { value: Units.VOLUME, multiply: 1, value_title: "Объём", unit: "л" },
    {
      value: Units.FUEL_RATE,
      multiply: 10,
      value_title: "Расход",
      unit: "л/ч",
    },
    { value: Units.PERCENT, multiply: 1, value_title: "Проценты", unit: "%" },
    {
      value: Units.UNITLESS,
      multiply: 10,
      value_title: "Без единиц",
      unit: "",
    },
    { value: Units.AMPER, multiply: 10, value_title: "Сила тока", unit: "А" },
    {
      value: Units.FREQUENCY,
      multiply: 10,
      value_title: "Частота",
      unit: "Гц",
    },
    {
      value: Units.TEMPERATURE,
      multiply: 10,
      value_title: "Температура",
      unit: "°C",
    },
    { value: Units.STREAM, multiply: 10, value_title: "Поток", unit: "м³/ч" },
    {
      value: Units.PPM,
      multiply: 10,
      value_title: "Концентрация",
      unit: "ppm",
    },
    {
      value: Units.REACTIVE_POWER,
      multiply: 10,
      value_title: "Реактивная мощность",
      unit: "ВАР",
    },
    {
      value: Units.ACTIVE_POWER,
      multiply: 10,
      value_title: "Активная мощность",
      unit: "Вт",
    },
    {
      value: Units.FULL_POWER,
      multiply: 10,
      value_title: "Полная мощность",
      unit: "ВА",
    },
    {
      value: Units.ENERGY,
      multiply: 10,
      value_title: "Киловатт-час",
      unit: "кВт•ч",
    },
    {
      value: Units.PHASE_SHIFT,
      multiply: 10,
      value_title: "Сдвиг фазы",
      unit: "°",
    },
  ];

  export function getMultiplier(input: Pick<AnalogInput, "units">): number {
    return analog_input_units[input.units ?? 0]?.multiply ?? 10;
  }

  export function getValueTitle(input: Pick<AnalogInput, "units">): string {
    return analog_input_units[input.units ?? 0]?.value_title ?? "Напряжение";
  }

  export function getUnit(
    input: Pick<AnalogInput, "sensor_type" | "units">
  ): string {
    const type = getType(input);
    return type === SensorType.ANALOG_INPUT
      ? analog_input_units[input.units ?? 0]?.unit
      : analog_input_units[default_units[type]].unit;
  }

  export const default_units: Record<SensorType, Units> = {
    [SensorType.ANALOG_INPUT]: Units.VOLTAGE,
    [SensorType.PRESSURE_SENSOR_5]: Units.PRESSURE,
    [SensorType.PRESSURE_SENSOR_12]: Units.PRESSURE,
    [SensorType.PRESSURE_SENSOR_MLD_6]: Units.PRESSURE,
    [SensorType.HUMIDITY_SENSOR]: Units.PERCENT,
    [SensorType.MAGNET]: Units.VOLTAGE,
    [SensorType.MOTION_CONTROLLED]: Units.VOLTAGE,
    [SensorType.SMOKE]: Units.VOLTAGE,
    [SensorType.LEAK]: Units.VOLTAGE,
    [SensorType.MOTION_UNCONTROLLED]: Units.VOLTAGE,
    [SensorType.THERMOSTAT]: Units.VOLTAGE,
    [SensorType.BOILER_FAILURE_PLUS]: Units.VOLTAGE,
    [SensorType.BOILER_FAILURE_MINUS]: Units.VOLTAGE,
    [SensorType.IGNITION]: Units.VOLTAGE,
    [SensorType.SPEED_SENSOR]: Units.SPEED,
    [SensorType.RPM_SENSOR]: Units.RPM,
    [SensorType.DISCRETE]: Units.VOLTAGE,
    [SensorType.ALARM_BUTTON]: Units.VOLTAGE,
    [SensorType.FUEL_STAT_SENSOR]: Units.FUEL_RATE,
  };

  export function setUnit(analog_input: AnalogInput): AnalogInput {
    const type = getType(analog_input);
    return {
      ...analog_input,
      units:
        type === SensorType.ANALOG_INPUT
          ? analog_input.units
          : default_units[type],
    };
  }

  export function getType(
    sensor: Pick<AnalogInput, "sensor_type">
  ): SensorType {
    return sensor.sensor_type;
  }

  export function isAnalogInputType(
    sensor: Pick<AnalogInput, "sensor_type">
  ): boolean {
    return sensor.sensor_type == SensorType.ANALOG_INPUT;
  }

  export function isPressureInput(
    sensor: Pick<AnalogInput, "sensor_type">
  ): boolean {
    return pressureTypes.includes(sensor.sensor_type);
  }
}

export type WiredTempExtensionId = IOExtension.Id | ModBusSignal.Id | null;

export interface WiredTemperatureSensor
  extends Z3KObject<Z3KObjectId.WiredTemperatureSensor> {
  readonly serial: string;
  readonly name: string;
  //TODO: заменить на null, заменить в БД значения
  readonly upper_threshold: number | null;
  readonly lower_threshold: number | null;
  readonly hysteresis: number;
  readonly no_connection_timeout: number;
  readonly rol_connection_lost: readonly ReactionId[];
  readonly rol_temperature_upper_threshold: readonly ReactionId[];
  readonly rol_temperature_lower_threshold: readonly ReactionId[];
  readonly io_extension_id: WiredTempExtensionId;
  readonly recovery_list: readonly ReactionId[];
  readonly setting_register: number;
  readonly position: number;
  readonly calibration_shift: number;
}

export namespace WiredTemperatureSensor {
  export type Id = ObjectId<Z3KObjectId.WiredTemperatureSensor>;

  export interface State {
    readonly sensor_ok: boolean;
    readonly curr_temp: number | undefined;
    readonly prev_temp: number;
    readonly flag: number;
  }

  export enum Flags {
    IS_OUTSIDE = 1,
    MANUAL_COLOR = 1 << 1,
    COLOR_BIT_1 = 1 << 2,
    COLOR_BIT_2 = 1 << 3,
    COLOR_BIT_3 = 1 << 4,
    COLOR_BIT_4 = 1 << 5,
    COLOR_BIT_5 = 1 << 6,
    HW_SLOT_BIT_0 = 1 << 7,
    HW_SLOT_BIT_1 = 1 << 8,
    HW_SLOT_BIT_2 = 1 << 9,
    EVENT_TO_SERVER_FLAG_INVERTED = 1 << 10,
    USE_DIAG_BUS = 1 << 13,
    CONNECT_PLUS_WATER_SENSOR = 1 << 13,
  }

  export enum PressureType {
    BAR5 = 0,
    BAR12 = 1,
    BAR8 = 2,
  }

  export function isOutside(
    sensor: Pick<WiredTemperatureSensor, "setting_register">
  ): boolean {
    return isFlagSet(sensor, Flags.IS_OUTSIDE);
  }

  export function isEventToServer(
    sensor: Pick<WiredTemperatureSensor, "setting_register">
  ): boolean {
    return !isFlagSet(sensor, Flags.EVENT_TO_SERVER_FLAG_INVERTED);
  }
  export function setEventToServer<
    T extends Pick<WiredTemperatureSensor, "setting_register">
  >(sensor: T, eventToServer: boolean): T {
    return setFlag(
      sensor,
      Flags.EVENT_TO_SERVER_FLAG_INVERTED,
      !eventToServer
    ) as T;
  }

  export function isConnectPlusWaterSensor(
    sensor: WiredTemperatureSensor
  ): boolean {
    return isFlagSet(sensor, Flags.CONNECT_PLUS_WATER_SENSOR);
  }

  export function isManualColor<
    T extends Pick<WiredTemperatureSensor, "setting_register">
  >(wts: T): boolean {
    return isFlagSet(wts, Flags.MANUAL_COLOR);
  }

  export function getColor<
    T extends Pick<WiredTemperatureSensor, "setting_register">
  >(sensor: T): number {
    if (!isManualColor(sensor)) {
      return 0;
    }
    return (sensor.setting_register >> 1) & 0x1f;
  }

  export function setColor<
    T extends Pick<WiredTemperatureSensor, "setting_register">
  >(sensor: T, color: number): T {
    return {
      ...sensor,
      setting_register: (sensor.setting_register & ~(0x1f << 1)) | (color << 1),
    };
  }

  export const internet_temp = "FF00FF00FF00FF";

  export function isInternetTemp(sensor: WiredTemperatureSensor): boolean {
    return sensor.serial == internet_temp;
  }

  export function isRealSensor(sensor: WiredTemperatureSensor): boolean {
    return !isInternetTemp(sensor);
  }

  export function getSensors(
    config: Z3KConfig | undefined
  ): readonly WiredTemperatureSensor[] {
    return WiredTemperatureSensor.get.all(config).filter(isRealSensor);
  }

  export function getPressureType(
    sensor: Pick<WiredTemperatureSensor, "setting_register">
  ): PressureType {
    return ((sensor.setting_register >> 11) & 0x3) as PressureType;
  }

  export function setPressureType<
    T extends Pick<WiredTemperatureSensor, "setting_register">
  >(sensor: T, value: PressureType): T {
    return {
      ...sensor,
      setting_register:
        (sensor.setting_register & ~(0x3 << 11)) | (value << 11),
    };
  }

  export function getLimits(
    sensor: Pick<WiredTemperatureSensor, "upper_threshold" | "lower_threshold">,
    owa_m: number
  ): { high: number | null; low: number | null } {
    return {
      high:
        //@ts-ignore
        sensor.upper_threshold === "" || sensor.upper_threshold == null
          ? null
          : parseFloat(sensor.upper_threshold + "") * owa_m,
      low:
        //@ts-ignore
        sensor.lower_threshold === "" || sensor.lower_threshold == null
          ? null
          : parseFloat(sensor.lower_threshold + "") * owa_m,
    };
  }

  export const get = createAccessors(arrayGetSet("wired_temperature_sensors"), {
    name: "Цифровой датчик температуры",
    serial: "",
    upper_threshold: null,
    lower_threshold: null,
    hysteresis: 0,
    no_connection_timeout: 5,
    rol_connection_lost: [],
    rol_temperature_upper_threshold: [],
    rol_temperature_lower_threshold: [],
    recovery_list: [],
    setting_register: 0,
    io_extension_id: null,
    position: 0,
    calibration_shift: 0,
  });
}

export type GuardZoneSensorId =
  | AnalogInput.Id
  | RadioSensor.Id
  | RadioSensor433.Id;
export type BuzzerGuardIndicator = Buzzer.Id | GuardIndicator.Id;

export interface GuardZone extends Z3KObject<Z3KObjectId.GuardZone> {
  readonly name: string;
  readonly event_delay_time: number;
  readonly start_delay: number;
  readonly relative_sensor_list: readonly GuardZoneSensorId[];
  readonly relative_triggered_list: readonly ReactionId[];
  readonly relative_recovered_list: readonly ReactionId[];
  readonly relative_turned_on: readonly ReactionId[];
  readonly relative_turned_off: readonly ReactionId[];
  readonly buzzer_guard_indicator_list: readonly BuzzerGuardIndicator[];
  readonly position: number;
}

export namespace GuardZone {
  export type Id = ObjectId<Z3KObjectId.GuardZone>;
  export const get = createAccessors(arrayGetSet("guard_zones"), {
    name: "Охранная зона",
    event_delay_time: 0,
    start_delay: 0,
    relative_sensor_list: [],
    relative_triggered_list: [],
    relative_recovered_list: [],
    relative_turned_on: [],
    relative_turned_off: [],
    buzzer_guard_indicator_list: [],
    position: 0,
  });

  export enum StatusFlags {
    ON_GUARD = 1 << 0,
    TRIGGERED = 1 << 1,
    TURN_ON = 1 << 2,
    TURN_OFF = 1 << 3,
    ALARM = 1 << 4,
  }

  export interface State {
    readonly onguard: number;
  }

  // eslint-disable-next-line no-inner-declarations
  function statusFlagSet(state: State, flag: StatusFlags): boolean {
    return (state.onguard & flag) != 0;
  }

  export function isOnGuard(state: State): boolean {
    return statusFlagSet(state, StatusFlags.ON_GUARD);
  }

  export function isTriggered(state: State): boolean {
    return statusFlagSet(state, StatusFlags.TRIGGERED);
  }

  export function isTurnedOn(state: State): boolean {
    return statusFlagSet(state, StatusFlags.TURN_ON);
  }

  export function isTurnedOff(state: State): boolean {
    return statusFlagSet(state, StatusFlags.TURN_OFF);
  }

  export function isAlarm(state: State): boolean {
    return statusFlagSet(state, StatusFlags.ALARM);
  }
}

export interface Notification extends Z3KObject<Z3KObjectId.Notification> {
  readonly name: string;
  readonly sms_text: string;
  readonly voice_text: string;
  readonly recipient_list: readonly (User.Id | UserRole.Id)[];
  readonly setting_register: number;
}

export namespace Notification {
  export type Id = ObjectId<Z3KObjectId.Notification>;

  export enum Flags {
    SMS_NOTIFICATION_ENABLE = 1 << 0,
    VOICE_NOTIFICATION_ENABLE = 1 << 1,
    SMS_IF_CALL_FAILED = 1 << 2,
    PUSH_NOTIFICATION_ENABLE = 1 << 3,
    NOTIFICATION_TYPE_FIELD = 1 << 4, // SET - Alarm event, CLEAR - Info event
    SPEAKER_NOTIFICATION_ENABLE = 1 << 5,
  }

  export function isSmsEnabled(
    notification: Readonly<Pick<Notification, "setting_register">>
  ): boolean {
    return isFlagSet(notification, Flags.SMS_NOTIFICATION_ENABLE);
  }

  export function setSmsEnabled<
    T extends Pick<Notification, "setting_register">
  >(notification: T, enabled: boolean): T {
    return setFlag<T>(notification, Flags.SMS_NOTIFICATION_ENABLE, enabled);
  }

  export function isSmsIfCallFailed(
    notification: Readonly<Pick<Notification, "setting_register">>
  ): boolean {
    return isFlagSet(notification, Flags.SMS_IF_CALL_FAILED);
  }

  export function setSmsIfCallFailed<
    T extends Pick<Notification, "setting_register">
  >(notification: T, enabled: boolean): T {
    return setFlag<T>(notification, Flags.SMS_IF_CALL_FAILED, enabled);
  }

  export function isVoiceEnabled(
    notification: Readonly<Pick<Notification, "setting_register">>
  ): boolean {
    return isFlagSet(notification, Flags.VOICE_NOTIFICATION_ENABLE);
  }

  export function setVoiceEnabled<
    T extends Pick<Notification, "setting_register">
  >(notification: T, enabled: boolean): T {
    return setFlag<T>(notification, Flags.VOICE_NOTIFICATION_ENABLE, enabled);
  }

  export function isSpeakerNotificationEnabled(
    notification: Readonly<Pick<Notification, "setting_register">>
  ): boolean {
    return isFlagSet(notification, Flags.SPEAKER_NOTIFICATION_ENABLE);
  }

  export function setSpeakerNotificationEnabled<
    T extends Pick<Notification, "setting_register">
  >(notification: T, enabled: boolean): T {
    return setFlag<T>(notification, Flags.SPEAKER_NOTIFICATION_ENABLE, enabled);
  }

  export function isSpeakerEnabled(
    notification: Readonly<Pick<Notification, "setting_register">>
  ): boolean {
    // Напоминание, что регистры с 0-2 должны быть занулены при использование внешнего динамика
    return (
      isFlagSet(notification, Flags.SPEAKER_NOTIFICATION_ENABLE) &&
      !isFlagSet(notification, Flags.SMS_NOTIFICATION_ENABLE) &&
      !isFlagSet(notification, Flags.VOICE_NOTIFICATION_ENABLE) &&
      !isFlagSet(notification, Flags.SMS_IF_CALL_FAILED)
    );
  }

  export const get = createAccessors(arrayGetSet("notifications"), {
    name: "оповещение",
    setting_register: 1,
    sms_text: "",
    voice_text: "",
    recipient_list: [],
  });
}

export interface User extends Z3KObject<Z3KObjectId.User> {
  readonly name: string;
  readonly phone: string;
  readonly key_and_radiotag_list: readonly TMKey.Id[];
  readonly role_list: readonly UserRole.Id[];
  readonly password: string;
  readonly setting_register: number;
}

export namespace User {
  export type Id = ObjectId<Z3KObjectId.User>;

  export const enum Flags {
    DISABLE_NOTIFICATION_FLAG = 1 << 0,
    INFO_NOTIFICATION_FLAG = 1 << 1,
    ALARM_NOTIFICATION_FLAG = 1 << 2,
  }

  export function isNotificationsAllowed(user: User): boolean {
    return !isFlagSet(user, Flags.DISABLE_NOTIFICATION_FLAG);
  }
  export function setNotificationsAllowed(user: User, allowed: boolean): User {
    return setFlag(user, Flags.DISABLE_NOTIFICATION_FLAG, !allowed);
  }

  export function isInfoNotificationsEnabled(user: Readonly<User>): boolean {
    return isFlagSet(user, Flags.INFO_NOTIFICATION_FLAG);
  }
  export function setInfoNotificationsEnabled(
    user: Readonly<User>,
    enabled: boolean
  ): User {
    return setFlag(user, Flags.INFO_NOTIFICATION_FLAG, enabled);
  }

  export function isAlarmNotificationsEnabled(user: Readonly<User>): boolean {
    return isFlagSet(user, Flags.ALARM_NOTIFICATION_FLAG);
  }
  export function setAlarmNotificationsEnabled(
    user: Readonly<User>,
    enabled: boolean
  ): User {
    return setFlag(user, Flags.ALARM_NOTIFICATION_FLAG, enabled);
  }

  export const default_object: Omit<User, "id"> = {
    name: "Пользователь",
    phone: "",
    key_and_radiotag_list: [],
    role_list: [],
    password: "",
    setting_register: 0,
  };

  export const get = createAccessors(arrayGetSet("users"), default_object);
}
export interface TimeTableValue {
  readonly checked: boolean; // эфемерное поле, которого нет в конфиге, нужно для обнуления значений
  readonly weekday_register: number;
  readonly time: number;
}

export interface OutputAction extends Z3KObject<Z3KObjectId.OutputAction> {
  readonly name: string;
  readonly physical_output: number;
  readonly action: OutputAction.Action;
  readonly turn_on_delay: number;
  readonly blink_pulses_len: number;
  readonly lower_priority_actions_output_list: readonly OutputAction.Id[];
  readonly timetable: TimeTableValue;
  readonly blink_pulses_period: number;
  readonly analog_value?: number;
}

export namespace OutputAction {
  export type Id = ObjectId<Z3KObjectId.OutputAction>;

  export const enum ActionType {
    OFF = 0,
    ON = 1,
    ON_FOR_DURATION = 2,
    SET_ANALOG_VALUE = 3,
  }

  export interface Action {
    readonly type: OutputAction.ActionType;
    readonly duration: number;
  }

  export function isOnForDuration(oa: Pick<OutputAction, "action">): boolean {
    return oa.action.type === ActionType.ON_FOR_DURATION;
  }

  export const get = createAccessors(arrayGetSet("output_actions"), {
    name: "Действие с выходом",
    physical_output: -1,
    action: { type: ActionType.OFF, duration: 0.1 },
    turn_on_delay: 0,
    blink_pulses_len: 0,
    lower_priority_actions_output_list: [],
    timetable: {
      checked: false,
      weekday_register: 0,
      time: 0,
    },
    blink_pulses_period: 0,
    analog_value: 0,
  });
}

export interface BoilerAdapterSerial {
  readonly builtIn: boolean;
  readonly value: string;
}

export const boilerTypeToNumber = {
  baxi: 0,
  thermona: 1,
  buderus: 2,
  vaillant: 3,
  protherm: 4,
  fondital: 5,
  "bongioanni-multidea-evo": 6,
  "bongioanni-nebula-eco": 7,
  "bongioanni-raya-s": 8,
  "bongioanni-raya-a": 9,
  "bongioanni-raya-eco": 10,
  "dedietrich-ms-msl": 11,
  "dedietrich-vivadens": 12,
  "dedietrich-naneo": 13,
  "Viessmann-vitopend-100": 14,
  "Viessmann-vitodens-50": 15,
  "Viessmann-vitodens-100": 16,
  "Viessmann-vitodens-111": 17,
  "baxi-ampera": 18,
  "baxi-eco-4s": 19,
  "baxi-eco-four": 20,
  "baxi-eco-home": 21,
  "baxi-eco-nova": 22,
  "baxi-eco-classic": 23,
  "baxi-eco-5-compact": 24,
  "baxi-duo-tec-compact": 25,
  "baxi-slim": 26,
  "baxi-luna-3": 27,
  "baxi-luna-3-comfort": 28,
  "baxi-luna-duo-tec": 29,
  "baxi-luna-duo-tec-e": 30,
  "baxi-nuvola-3": 31,
  "baxi-nuvola-3-comfort": 32,
  "baxi-nuvola-duo-tec-plus": 33,
  "baxi-power-ht": 34,
  "baxi-main-5": 35,
  "zota-solid": 36,
  "zota-mks-plus": 37,
  "dedietrich-naneo-s": 38,

  "": 255,
};

export type BoilerType = keyof typeof boilerTypeToNumber;

export function boilerTypeFromNumber(index: number): string {
  const boiler_types = Object.fromEntries(
    Object.entries(boilerTypeToNumber).map(([name, index]) => [index, name])
  );
  return boiler_types[index];
}

export interface BoilerAdapterStateStatus {
  no_adapter_connection: boolean;
  no_boiler_connection: boolean;
  event_connection_lost: boolean;
  boiler_fail: boolean;
  event_boiler_fail: boolean;
  no_valid_params: boolean;
}

export interface BoilerAdapterStateMode {
  protocol: boolean;
  boiler_presence_emulation: boolean;
  gate: boolean;
  logging: boolean;
  ot_packet_identificator: boolean;
  no_connection_with_boiler_ebus: boolean;
}

export const enum BoilerAdapterType {
  OPENTHERM = 0,
  EBUS = 1,
  NAVIEN = 2,
  BSB = 3,
  AUTO = 4,
}

export interface BoilerAdapter extends Z3KObject<Z3KObjectId.BoilerAdapter> {
  readonly isManual: boolean;
  readonly serial: BoilerAdapterSerial;
  readonly name: string;
  readonly type: BoilerAdapterType;
  readonly max_modulation_level: number;
  readonly logged_parameter_register: number;
  readonly boiler_model: string;
  readonly rol_connection_lost: readonly ReactionId[];
  readonly rol_boiler_failure: readonly ReactionId[];
  readonly rol_connection_found: readonly ReactionId[];
  readonly rol_boiler_restore: readonly ReactionId[];
  readonly slot?: number;
  readonly position?: number;
}

export interface BoilerAdapterFlags {
  MODE_AUTO_BIT: boolean;
  MODE_OPENTHERM_GATEWAY_BIT: boolean;
}

export namespace BoilerAdapter {
  export type Id = ObjectId<Z3KObjectId.BoilerAdapter>;

  export interface State {
    readonly status: BoilerAdapterStateStatus;
    readonly ot: any;
    readonly mode: BoilerAdapterStateMode;
    readonly flags: BoilerAdapterFlags;
  }

  export const TypeOptions = [
    { text: "OpenTherm", value: BoilerAdapterType.OPENTHERM },
    { text: "E-Bus / Ariston", value: BoilerAdapterType.EBUS },
    { text: "Navien", value: BoilerAdapterType.NAVIEN },
    { text: "BSB", value: BoilerAdapterType.BSB },
    { text: "Автоопределение", value: BoilerAdapterType.AUTO },
  ];

  export enum Flags {
    WATER_TEMPERATURE_LOGGED = 1 << 0,
    DHW_TEMPERATURE_LOGGED = 1 << 1,
    RETURN_TEMPERATURE_LOGGED = 1 << 2,
    OUTSIDE_TEMPERATURE_LOGGED = 1 << 3,
    MODULATION_LEVEL_LOGGED = 1 << 4,
    WATER_PRESSURE_LOGGED = 1 << 5,
    DHW_FLOW_RATE_LOGGED = 1 << 6,

    OUTSIDE_SENSOR = 1 << 7,
    SECOND_CHANNEL = 1 << 8,
    EXTERNAL_PANEL = 1 << 9,
    IS_DISABLED = 1 << 10,
    IS_POWER_CTRL_FLAG = 1 << 11,
  }

  export const ALL_NAVIEN_PARAMS = [
    Flags.WATER_TEMPERATURE_LOGGED,
    Flags.DHW_TEMPERATURE_LOGGED,
  ];

  export const ALL_EBUS_PARAMS = [
    ...ALL_NAVIEN_PARAMS,
    Flags.RETURN_TEMPERATURE_LOGGED,
    Flags.OUTSIDE_TEMPERATURE_LOGGED,
    Flags.MODULATION_LEVEL_LOGGED,
    Flags.WATER_PRESSURE_LOGGED,
  ];

  export const ALL_OPENTHERM_PARAMS = [
    ...ALL_EBUS_PARAMS,
    Flags.DHW_FLOW_RATE_LOGGED,
  ];

  export const ALL_BSB_PARAMS = ALL_OPENTHERM_PARAMS;

  export const enum BuiltInSerial {
    zero = "0000",
    first = "0001",
    second = "0002",
  }

  export function allParamsMaskForType(
    adapter: Readonly<Pick<BoilerAdapter, "type" | "serial">>
  ): Flags[] {
    if (
      adapter.serial.builtIn &&
      adapter.serial.value === BuiltInSerial.second
    ) {
      return BoilerAdapter.ALL_EBUS_PARAMS;
    }
    switch (adapter.type) {
      case BoilerAdapterType.OPENTHERM:
        return ALL_OPENTHERM_PARAMS;
      case BoilerAdapterType.EBUS:
        return ALL_EBUS_PARAMS;
      case BoilerAdapterType.NAVIEN:
        return ALL_NAVIEN_PARAMS;
      case BoilerAdapterType.BSB:
        return ALL_BSB_PARAMS;
      default:
        return ALL_OPENTHERM_PARAMS;
    }
  }

  export function onChangeBuiltIn<T extends Pick<BoilerAdapter, "serial">>(
    ba: T,
    device_spec: Z3KDeviceFeaturesSpec,
    check: boolean
  ): T {
    if (!device_spec.heating.has_heating) {
      return ba;
    }
    return {
      ...ba,
      serial: {
        builtIn: check,
        value: ba.serial.builtIn ? ba.serial.value : BuiltInSerial.zero,
      },
    };
  }

  export function isExternalPanel(
    boilerAdapter: Readonly<BoilerAdapter>
  ): boolean {
    return (
      (boilerAdapter.logged_parameter_register & Flags.EXTERNAL_PANEL) != 0
    );
  }

  export function setExternalPanel(
    boilerAdapter: Readonly<BoilerAdapter>,
    externalPanel: boolean
  ): BoilerAdapter {
    return {
      ...boilerAdapter,
      logged_parameter_register:
        (boilerAdapter.logged_parameter_register & ~Flags.EXTERNAL_PANEL) |
        (externalPanel ? Flags.EXTERNAL_PANEL : 0),
    };
  }

  export function isEnabled(boilerAdapter: BoilerAdapter): boolean {
    return (boilerAdapter.logged_parameter_register & Flags.IS_DISABLED) == 0;
  }

  export function setEnabled(
    boilerAdapter: BoilerAdapter,
    enabled: boolean
  ): BoilerAdapter {
    return {
      ...boilerAdapter,
      logged_parameter_register:
        (boilerAdapter.logged_parameter_register & ~Flags.IS_DISABLED) |
        (enabled ? 0 : Flags.IS_DISABLED),
    };
  }

  export function isSecondChannel(
    boilerAdapter: Readonly<BoilerAdapter>
  ): boolean {
    return (
      (boilerAdapter.logged_parameter_register & Flags.SECOND_CHANNEL) != 0
    );
  }

  export function setSecondChannel(
    boilerAdapter: Readonly<BoilerAdapter>,
    isSecondChanel: boolean
  ): BoilerAdapter {
    return {
      ...boilerAdapter,
      logged_parameter_register:
        (boilerAdapter.logged_parameter_register & ~Flags.SECOND_CHANNEL) |
        (isSecondChanel ? Flags.SECOND_CHANNEL : 0),
    };
  }

  export function isOutside(boilerAdapter: Readonly<BoilerAdapter>): boolean {
    return (boilerAdapter.logged_parameter_register & Flags.OUTSIDE_SENSOR) > 0;
  }

  interface NetworkCapabilities {
    has_ethernet: boolean;
    has_wifi: boolean;
    has_gsm: boolean;
  }

  type BuiltinBoilerAdapter = {
    name: string;
    default_type: BoilerAdapterType;
};

  type HeatingCapabilities =
    | { has_heating: false }
    | {
        has_heating: true;

        show_heating_settings_for_users: boolean;

        has_extended_heating: {
          show_boiler_modes: boolean;
          show_boiler_groups: boolean;
          show_boiler_cascades: boolean;
          show_turn_off_delay: boolean;
          show_heat_request: boolean;
          show_winter_summer_switch: boolean;
          show_off_when_dhw: boolean;
          show_pza: boolean;
          show_cooling_circuits: boolean;
          //false only for Connect+; issue #1186
          show_heat_request_with_air: boolean;
        };

        has_modes: boolean;
        has_boiler_adapters: boolean;
        builtin_boiler_adapters: Readonly<
          Map<BuiltInSerial, BuiltinBoilerAdapter>
        >;
        ba_can_use_auto_detection: boolean;

        show_heating_circuit_worktime_graphs: boolean;

        has_external_thermostat: boolean;

        has_internet_weather: boolean;

        hide_turn_off_when_dhw_on_predefined_circuits: boolean;

        max_2_boiler_circuits: boolean;

        show_water_sensor_when_control_by_air: boolean;

        has_external_panel: boolean;
        //Отключили везде, кроме коннект+ и смарт-есп, из-за того, что один установщик в чате
        //поднял бучу
        has_turn_on_boiler_adapter: boolean;
        show_delete_boiler_adapter_button: boolean;
        show_serial_number_input: boolean;
      };

  export interface Input {
    value: number; //аппаратный выход с номером ...
    pin_number: number; //номер клеммы на прибор (уникальный или совмещенный)
    text: string; //название выхода
  }

  export interface RelayOutput {
    value: number;
    pin_number: number;
    text: string;
  }

  export interface OpenCollectorOutput {
    value: number;
    pin_number: number;
    text: string;
  }

  export enum IOExtensionType {
    ConnectESP = "ConnectESP",
    Smart2Pro = "Smart2Pro",
    H2000PlusPro1 = "H2000PlusPro1",
    H2000PlusPro2 = "H2000PlusPro2",
    H1000PlusPro = "H1000PlusPro",
    H700PlusPro = "H700PlusPro",
    H1V02ProEbus = "H1V02ProEbus",
  }

  interface IOCapabilities {
    has_modbus: boolean;
    has_radiosensors: boolean;
    has_radiosensors_433: boolean;

    has_1wire: boolean;

    has_open_collector_outputs: boolean;
    has_output_actions: boolean;
    has_relay_controls: boolean;
    has_exactly_one_relay_control: boolean;
    has_pumps: boolean;
    has_threeway_taps: boolean;
    has_buzzers: boolean;
    has_guard_indicators: boolean;
    has_web_elements: boolean;
    io_extensions_supported: boolean;
    has_output_dynamic: boolean;
    has_graph_panel_ml_753: boolean;
    has_graph_panel_climatic: boolean;
    show_graph_panels_in_service: boolean;
    hide_pull_up: boolean;

    show_managed_mechanisms_for_users: boolean;

    inputs: Input[];
    ntc_inputs: Input[];
    relay_outputs: RelayOutput[];
    open_collector_outputs: OpenCollectorOutput[];
    power_voltage_input: number | null;
    battery_voltage_input: number | null;
    builtin_io_extensions: Map<BuiltInSerial, IOExtensionType>;
  }

  type AutoscanCapabilities = {
    has_a300_stats: boolean;
    has_a300_diag: boolean;
    has_a300_inputs: boolean;
    has_duts: boolean;
  };

  interface Z3KDeviceFeaturesSpec {
    network: NetworkCapabilities;
    heating: HeatingCapabilities;
    io: IOCapabilities;

    has_service_mode: boolean;
    show_service_button: boolean;

    has_thermometers_on_state_tab: boolean;

    has_users: boolean;
    has_user_roles: boolean;
    show_simple_notification_tab: boolean;

    has_reserve_battery: boolean;
    has_scenarios: boolean;
    has_complex_scenarios: boolean;
    has_ui_groups: boolean;
    has_guard_zones: boolean;
    autoscan: AutoscanCapabilities;
    has_wizard_configured: boolean;
    has_notifications: boolean;
    has_email_notifications: boolean;
    show_commands_in_reactions: boolean;
    show_in_baxi_connect_app: boolean;
    show_builtin_boiler_adapter: boolean;
    //12.05.2022 В ПРО-серии нет голосового уведомления
    show_voice_notifications: boolean;
  }

  export function getTypeOptions(
    device_spec: Z3KDeviceFeaturesSpec
  ): { text: string; value: BoilerAdapterType }[] {
    const use_auto_detection =
      device_spec.heating.has_heating &&
      device_spec.heating.ba_can_use_auto_detection;

    if (use_auto_detection) {
      return TypeOptions;
    }

    return TypeOptions.filter(
      (option) =>
        option.value !== BoilerAdapterType.AUTO &&
        option.value !== BoilerAdapterType.BSB
    );
  }

  export function getModulationLevel(
    config: Z3KConfig | undefined,
    state: Z3KDeviceState,
    hc: Pick<HeatingCircuit, "control_devices">
  ): number | null {
    if (config != null) {
      for (const control_dev_id of hc.control_devices) {
        const boiler_adapter = BoilerAdapter.get.byId(config, control_dev_id);
        if (boiler_adapter != null) {
          const ba_state = get_z3k_object_state(state, boiler_adapter.id);
          if (ba_state != null) {
            return ba_state.ot.rml ?? null;
          }
        }
      }
    }
    return null;
  }

  export enum OTStatusFlag {
    f = 'f',
    ch = 'ch',
    dhw = 'dhw',
    fl = 'fl',
    cl = 'cl',
    ch2 = 'ch2',
    di = 'di',
}

export enum OT_VarName {
    s = 's',
    cs = 'cs',
    ff = 'ff',
    rbp = 'rbp',
    cs2 = 'cs2',
    odc = 'odc',
    sc = 'sc',
    mv = 'mv',
    sv = 'sv',
    rp = 'rp',
    rml = 'rml',
    wp = 'wp',
    fr = 'fr',
    rsp2 = 'rsp2',
    rt = 'rt',
    bt = 'bt',
    dt = 'dt',
    ot = 'ot',
    rwt = 'rwt',
    sst = 'sst',
    sct = 'sct',
    ft2 = 'ft2',
    dt2 = 'dt2',
    et = 'et',
    bs = 'bs',
    ps = 'ps',
    dps = 'dps',
    dbs = 'dbs',
    bh = 'bh',
    ph = 'ph',
    dph = 'dph',
    dbh = 'dbh',
    db = 'db',
    b = 'b',
    mrml = 'mrml',
    ds = 'ds',
    ms = 'ms',
    cc = 'cc',
    bcml = 'bcml',
    rors = 'rors',
    rof = 'rof',
}

  export function getWorkState(
    ba: Pick<BoilerAdapter, "id">,
    state: Z3KDeviceState | undefined
  ): readonly OTStatusFlag[] | null {
    if (state == null) {
      return null;
    }
    //Нахожу состояние этого адаптера
    const ba_state = get_z3k_object_state(state, ba.id);
    if (ba_state != null) {
      return ba_state.ot[OT_VarName.s] ?? null;
    }
    return null;
  }

  export enum OTFaultFlag {
    sr = 'sr',
    lr = 'lr',
    wp = 'wp',
    gf = 'gf',
    ap = 'ap',
    wot = 'wot',
}

  export function hasError(
    ba: Pick<BoilerAdapter, "id" | "boiler_model">,
    state: Z3KDeviceState | undefined
  ): boolean {
    const ba_state = get_z3k_object_state(state, ba.id);
    if (ba_state == null) {
      return true;
    }
    const { ot } = ba_state;

    if (ot == null) {
      return true;
    }

    if (ba.boiler_model == "dedietrich-naneo-s") {
      const err_in_s = (ot.s ?? []).includes(OTStatusFlag.f);
      const err_in_ff = (ot.ff?.f ?? []).includes(OTFaultFlag.sr);
      const err_in_rbp =
        ot.rbp != null &&
        !(ot.rbp[0] == 255 && ot.rbp[1] == 255) &&
        !(ot.rbp[0] == 0 && ot.rbp[1] == 0);
      return err_in_s || err_in_ff || err_in_rbp;
    }
    return (ot.s ?? []).includes(OTStatusFlag.f);
  }

  export function findBySlot(
    config: Z3KConfig | undefined,
    slot: number
  ): BoilerAdapter | undefined {
    return get.one(config, (adapter) => adapter.slot == slot);
  }

  export function shownToUser(device_spec: Z3KDeviceFeaturesSpec): boolean {
    return device_spec.show_builtin_boiler_adapter;
  }

  export const default_object = {
    isManual: true,
    serial: {
      builtIn: true,
      value: "",
    },
    name: "Адаптер котла",
    type: BoilerAdapterType.OPENTHERM,
    max_modulation_level: 100,
    logged_parameter_register: 127,
    boiler_model: "",
    rol_connection_lost: [],
    rol_connection_found: [],
    rol_boiler_failure: [],
    rol_boiler_restore: [],
  };

  export const get = createAccessors(
    arrayGetSet("boiler_adapters"),
    default_object
  );
}

export interface RadioModule extends Z3KObject<Z3KObjectId.RadioModule> {
  readonly serial: string;
  readonly name: string;
  readonly type: number;
  readonly notification_list: readonly ReactionId[];
  readonly connection_timeout: number;
}

export namespace RadioModule {
  export type Id = ObjectId<Z3KObjectId.RadioModule>;

  export enum StatusFlags {
    BASE_INIT_FLAG = 1 << 0,
    S_ANSWER_RECEIVED = 1 << 1,
    NO_CONNECTION_FLAG = 1 << 2,
    IS_ADD_ENABLE_FLAG = 1 << 3,
    NO_CONNECT_EVENT_FLAG = 1 << 4,
  }

  export interface State {
    readonly no_connection: boolean;
    readonly add_enable: boolean;
    readonly no_connect_event: boolean;
    readonly sensor_ids: readonly RadioSensor.Id[];
    readonly last_connect: number;
  }

  export function isBuiltinRadioModule433(module: RadioModule): boolean {
    return module.serial == "0001";
  }

  export const get = createAccessors(arrayGetSet("radiomodules"), {
    serial: "",
    name: "Радио-модуль",
    type: 0,
    notification_list: [],
    connection_timeout: 60,
  });
}

export interface RadioSensor extends Z3KObject<Z3KObjectId.RadioSensor> {
  readonly serial: string;
  readonly name: string;
  readonly type: RadioSensor.Type;
  //TODO: заменить на null, заменить в БД значения
  //убрал '' 15.02.2022
  readonly upper_threshold: number | null;
  readonly lower_threshold: number | null;
  readonly hysteresis: number;

  readonly upper_humidity_threshold: number;
  readonly lower_humidity_threshold: number;
  readonly humidity_hysteresis: number;

  readonly no_connection_timeout: number;
  readonly movement_leakage_trigger_reset_time: number;

  readonly rol_connection_lost: readonly ReactionId[];

  readonly rol_temperature_upper_threshold: readonly ReactionId[];
  readonly rol_temperature_lower_threshold: readonly ReactionId[];

  readonly rol_sensor_humidity_out_thresholds: readonly ReactionId[];
  readonly rol_sensor_humidity_lower_thresholds: readonly ReactionId[];

  readonly rol_movement_leakage_triggered: readonly (
    | ReactionId
    | GuardZone.Id
  )[];

  readonly related_radiomodule_id: RadioModule.Id;
  readonly setting_register: number;
  readonly position: number;
}

export namespace RadioSensor {
  export type Id = ObjectId<Z3KObjectId.RadioSensor>;

  export enum Type {
    RADIO_FOB_3_BUTTONS_TYPE = 2,
    RADIO_FOB_4_BUTTONS_TYPE = 3,
    TEMPERATURE_A = 5,
    TEMPERATURE_B = 15,
    TEMPERATURE_C = 16,
    LEAK = 10,
    MOTION = 11,
    HUMIDITY = 18,
    RADIO_RELAY = 255,
  }
  export interface State {
    readonly temperature: number;
    readonly humidity: number;
    readonly battery: number;
    readonly rssi: number;
    readonly state_time: number;
    readonly state_flags: number;
    readonly sensor_ok: boolean;
  }

  export enum StatusFlags {
    NO_CONNECT_FLAG = 1 << 0,
    IS_TRIGGERED_FLAG = 1 << 1,
    IS_UPPER_THRES_FLAG = 1 << 2,
    NO_CONNECT_EVENT_FLAG = 1 << 4,
    LEAK_FLAG = 1 << 5,
    MOTION_FLAG = 1 << 6,
    IS_TEMP_TRIGGERED_FLAG = 1 << 7,
    IS_HIMID_TRIGGERED_FLAG = 1 << 8,
    GUARD_FLAG = 1 << 9,
    IS_UPPER_THRES_HUMID_FLAG = 1 << 10,
    IS_FOB_GUARD_ON_BUTTON_PRESSED = 1 << 11,
    IS_FOB_GUARD_OFF_BUTTON_PRESSED = 1 << 12,
    IS_FOB_GUARD_USER_BUTTON_1_PRESSED = 1 << 13,
    IS_FOB_GUARD_USER_BUTTON_2_PRESSED = 1 << 14,
  }

  export enum Flags {
    NO_GUARD_CTRL_ENABLE = 1 << 0,
    OUTSIDE_SENSOR_FLAG = 1 << 1,
    MANUAL_COLOR = 1 << 2,
    COLOR_BIT_1 = 1 << 3,
    COLOR_BIT_2 = 1 << 4,
    COLOR_BIT_3 = 1 << 5,
    COLOR_BIT_4 = 1 << 6,
    RADIO_EVENT_TO_SERVER_FLAG_INVERTED = 1 << 7,
  }

  export function isManualColor<
    T extends Pick<RadioSensor, "setting_register">
  >(sensor: T): boolean {
    return isFlagSet(sensor, Flags.MANUAL_COLOR);
  }

  export function getColor<T extends Pick<RadioSensor, "setting_register">>(
    sensor: T
  ): number {
    if (!isManualColor(sensor)) {
      return 0;
    }
    return (sensor.setting_register >> 2) & 0x1f;
  }

  export function setColor<T extends Pick<RadioSensor, "setting_register">>(
    sensor: T,
    color: number
  ): T {
    return {
      ...sensor,
      setting_register: (sensor.setting_register & ~(0x1f << 2)) | (color << 2),
    };
  }

  export function isEventToServer(
    sensor: Pick<RadioSensor, "setting_register">
  ): boolean {
    return !isFlagSet(sensor, Flags.RADIO_EVENT_TO_SERVER_FLAG_INVERTED);
  }
  export function setEventToServer<
    T extends Pick<RadioSensor, "setting_register">
  >(sensor: T, eventToServer: boolean): T {
    return setFlag(
      sensor,
      Flags.RADIO_EVENT_TO_SERVER_FLAG_INVERTED,
      !eventToServer
    ) as T;
  }

  export function radioRelaysSelector(config: Z3KConfig): RadioSensor[] {
    return RadioSensor.get.where(
      config,
      ({ type }) => type === RadioSensor.Type.RADIO_RELAY
    );
  }

  export function statusFlagSet(
    state: Pick<State, "state_flags">,
    flag: StatusFlags
  ): boolean {
    return (state.state_flags & flag) !== 0;
  }

  export function isActive(state: Pick<State, "state_flags">): boolean {
    return statusFlagSet(state, StatusFlags.IS_TRIGGERED_FLAG);
  }

  export function isNoConnect(state: Pick<State, "state_flags">): boolean {
    return statusFlagSet(state, StatusFlags.NO_CONNECT_FLAG);
  }

  export function isLeakActive(state: Pick<State, "state_flags">): boolean {
    return statusFlagSet(state, StatusFlags.LEAK_FLAG);
  }

  export function isMotionActive(state: Pick<State, "state_flags">): boolean {
    return statusFlagSet(state, StatusFlags.MOTION_FLAG);
  }

  export function isTempTriggered(state: Pick<State, "state_flags">): boolean {
    return statusFlagSet(state, StatusFlags.IS_TEMP_TRIGGERED_FLAG);
  }

  export function isThermometer(sensor: Pick<RadioSensor, "type">): boolean {
    return [
      RadioSensor.Type.TEMPERATURE_A,
      RadioSensor.Type.TEMPERATURE_B,
      RadioSensor.Type.TEMPERATURE_C,
      RadioSensor.Type.MOTION,
      RadioSensor.Type.HUMIDITY,
    ].includes(sensor.type);
  }

  export function isFobButtons(sensor: Pick<RadioSensor, "type">): boolean {
    return [
      RadioSensor.Type.RADIO_FOB_3_BUTTONS_TYPE,
      RadioSensor.Type.RADIO_FOB_4_BUTTONS_TYPE,
    ].includes(sensor.type);
  }

  export function filterThermometers(
    sensors: readonly RadioSensor[]
  ): readonly RadioSensor[] {
    return sensors.filter(isThermometer);
  }

  export function getThermometers(
    config: Z3KConfig | undefined
  ): readonly RadioSensor[] {
    return RadioSensor.get.all(config).filter(isThermometer);
  }

  export function isRelaySensor(sensor: Pick<RadioSensor, "type">): boolean {
    return sensor.type == RadioSensor.Type.RADIO_RELAY;
  }

  export function isLeakSensor(sensor: Pick<RadioSensor, "type">): boolean {
    return sensor.type == RadioSensor.Type.LEAK;
  }

  export function isMotionSensor(sensor: Pick<RadioSensor, "type">): boolean {
    return sensor.type == RadioSensor.Type.MOTION;
  }

  export function isHumiditySensor(sensor: Pick<RadioSensor, "type">): boolean {
    return sensor.type == RadioSensor.Type.HUMIDITY;
  }

  export function isDisplayable(sensor: Pick<RadioSensor, "type">): boolean {
    return [
      RadioSensor.Type.LEAK,
      RadioSensor.Type.MOTION,
      RadioSensor.Type.HUMIDITY,
    ].includes(sensor.type);
  }

  export function isFobWithSecondAddButton(
    sensor: Pick<RadioSensor, "type">
  ): boolean {
    return sensor.type == RadioSensor.Type.RADIO_FOB_4_BUTTONS_TYPE;
  }

  export function filterDisplayable<T extends Pick<RadioSensor, "type">>(
    sensors: readonly T[]
  ): readonly T[] {
    return sensors.filter(isDisplayable);
  }

  export function isOutside(
    sensor: Pick<RadioSensor, "setting_register">
  ): boolean {
    return isFlagSet(sensor, Flags.OUTSIDE_SENSOR_FLAG);
  }

  export function getRSSI(rawRSSI: number): number {
    const rssi = rawRSSI;
    return rssi >= 128 ? (rssi - 256) / 2 - 73 : rssi / 2 - 73;
  }

  export function getLimits(
    sensor: Pick<RadioSensor, "upper_threshold" | "lower_threshold">
  ): { high: number | null; low: number | null } {
    return {
      high:
        sensor.upper_threshold == null
          ? null
          : parseInt(sensor.upper_threshold + "", 10),
      low:
        sensor.lower_threshold == null
          ? null
          : parseInt(sensor.lower_threshold + "", 10),
    };
  }

  export const get = createAccessors(arrayGetSet("radiosensors"), {
    serial: "",
    type: 0,
    name: "Радио",
    upper_threshold: 0,
    lower_threshold: 0,
    hysteresis: 1,
    upper_humidity_threshold: 80,
    lower_humidity_threshold: 30,
    humidity_hysteresis: 5,
    no_connection_timeout: 20,
    movement_leakage_trigger_reset_time: 1,
    rol_connection_lost: [],
    rol_temperature_upper_threshold: [],
    rol_sensor_humidity_out_thresholds: [],
    rol_movement_leakage_triggered: [],
    related_radiomodule_id: -1 as RadioModule.Id,
    setting_register: 1,
    rol_temperature_lower_threshold: [],
    rol_sensor_humidity_lower_thresholds: [],
    position: 0,
  });
}

export type CommandObjectId =
  | GuardZone.Id
  | GuardIndicator.Id
  | RadioModule.Id
  | HeatingMode.Id
  | Scenario.Id
  | WebElement.Id
  | SensorReadingObjectId;

export interface Command extends Z3KObject<Z3KObjectId.Command> {
  readonly name: string;
  readonly objectid: CommandObjectId;
  readonly cmd: string;
}

export namespace Command {
  export type Id = ObjectId<Z3KObjectId.Command>;
  export const get = createAccessors(arrayGetSet("commands"), {
    name: "Включить",
    objectid: -1 as CommandObjectId,
    cmd: "1",
  });

  export function findOrCreate(
    config: Z3KConfig,
    command: Omit<Command, "id">
  ): [Command.Id, Z3KConfig] {
    const find_command = config.commands?.find(
      (_command) =>
        _command.cmd === command.cmd && _command.objectid === command.objectid
    );
    if (find_command != null) {
      return [find_command.id, config];
    }
    return Command.get.add(config, command);
  }
}

export type WebElementActionId =
  | AnalogInput.Id
  | AnalogOutput.Id
  | ReactionId
  | null;

export interface WebElement extends Z3KObject<Z3KObjectId.WebElement> {
  readonly name: string;
  readonly type: WebElement.Type;

  readonly label1: string;
  readonly label2: string;

  readonly setting_register: number;

  readonly id_active: WebElementActionId;
  readonly id_passive: WebElementActionId;

  readonly position: number;
}

export namespace WebElement {
  export type Id = ObjectId<Z3KObjectId.WebElement>;

  export enum Type {
    STATUS = 0,
    SIMPLE = 1,
    COMPLEX = 2,
    ANALOG = 3,
  }

  export interface State {
    readonly state: number;
  }

  export enum Flags {
    IS_OUTPUT_STATE_FLAG = 1 << 0,
    SEND_STATE_TO_ML_FLAG = 1 << 1,
    SEND_STATE_TO_USB_FLAG = 1 << 2,
    FRAM_SAVED_STATE_FLAG = 1 << 3,
    HIDDEN_CARD_FLAG = 1 << 4,
  }

  export const get = createAccessors(arrayGetSet("web_elements"), {
    name: "Элемент управления",
    type: 0,
    label1: "",
    label2: "",
    setting_register: 0,
    id_active: null,
    id_passive: null,
    position: 0,
  });

  export function isStatusType(web_element: Pick<WebElement, "type">): boolean {
    return web_element.type === WebElement.Type.STATUS;
  }

  export function isSimpleType(web_element: Pick<WebElement, "type">): boolean {
    return web_element.type === WebElement.Type.SIMPLE;
  }

  export function isComplexType(
    web_element: Pick<WebElement, "type">
  ): boolean {
    return web_element.type === WebElement.Type.COMPLEX;
  }

  export function isAnalogType(web_element: Pick<WebElement, "type">): boolean {
    return web_element.type === WebElement.Type.ANALOG;
  }

  export function isSetOutputState(
    web_element: Pick<WebElement, "setting_register">
  ): boolean {
    return isFlagSet(web_element, Flags.IS_OUTPUT_STATE_FLAG);
  }

  export function setOutputState<
    T extends Pick<WebElement, "setting_register">
  >(web_element: T, enabled: boolean): T {
    return setFlag<T>(web_element, Flags.IS_OUTPUT_STATE_FLAG, enabled);
  }

  export function isCardHidden(web_element: WebElement): boolean {
    return isFlagSet(web_element, Flags.HIDDEN_CARD_FLAG);
  }

  export function setHiddenCardFlag(
    web_element: WebElement,
    enabled: boolean
  ): WebElement {
    return setFlag(web_element, Flags.HIDDEN_CARD_FLAG, enabled);
  }
}

export type ScenarioLinkId =
    | ReactionId
    | Pause.Id
    | ConditionalOperator.Id
    | Comparator.Id
    | LogicExpression.Id
    | SensorReading.Id
    | TimeComparator.Id
    | StopScenario.Id;

export interface TimeTableValue {
  readonly checked: boolean; // эфемерное поле, которого нет в конфиге, нужно для обнуления значений
  readonly weekday_register: number;
  readonly time: number;
}

export interface Scenario extends Z3KObject<Z3KObjectId.Scenario> {
  readonly name: string;
  readonly links: readonly ScenarioLinkId[];
  readonly timetable: TimeTableValue;
  readonly setting_register: number;
  readonly loop_time: number; // need if ScenarioType.LOOP
}

export namespace Scenario {
  export type Id = ObjectId<Z3KObjectId.Scenario>;

  export enum Flags {
    ACTIVE_INVERTED = 1 << 3,
  }

  export enum ScenarioType {
    LINEAR = 0,
    CONDITIONAL = 1,
    LOOP = 2,
  }

  export function isActive(scenario: Readonly<Scenario>): boolean {
    //поскольку фича появилась позже сценариев, инвертируем состояние,
    //чтобы у всех пользователей сценарии остались включены
    return !isFlagSet(scenario, Flags.ACTIVE_INVERTED);
  }

  export function setActive(
    scenario: Readonly<Scenario>,
    enabled: boolean
  ): Scenario {
    return setFlag(scenario, Flags.ACTIVE_INVERTED, !enabled);
  }

  export function getType(scenario: Readonly<Scenario>): ScenarioType {
    return scenario.setting_register & 0x3;
  }

  export function setType(
    scenario: Readonly<Scenario>,
    type: ScenarioType
  ): Scenario {
    return {
      ...scenario,
      setting_register: (scenario.setting_register & ~0x3) | type,
    };
  }

  export function changeScenarioType(
    scenario: Readonly<Scenario>,
    type: ScenarioType,
    changes: Partial<Scenario>
  ): Scenario {
    switch (type) {
      case Scenario.ScenarioType.LINEAR:
        return {
          ...Scenario.setType(scenario, ScenarioType.LINEAR),
          ...changes,
          loop_time: 0,
        };
      case Scenario.ScenarioType.CONDITIONAL:
        return {
          ...Scenario.setType(scenario, ScenarioType.CONDITIONAL),
          //Может прийти с расписанием, поэтому оставляю возможность перетереть
          ...changes,
          timetable: { checked: false, weekday_register: 0, time: 0 },
          loop_time: 0,
        };
      case Scenario.ScenarioType.LOOP:
        return {
          ...Scenario.setType(scenario, ScenarioType.LOOP),
          ...changes,
          timetable: { checked: false, weekday_register: 0, time: 0 },
        };
    }
  }

  export const get = createAccessors(arrayGetSet("scenarios"), {
    name: "Новый сценарий",
    links: [],
    timetable: {
      checked: false,
      weekday_register: 0,
      time: 0,
    },
    setting_register: 0,
    loop_time: 0,
  });
}

export interface Buzzer extends Z3KObject<Z3KObjectId.Buzzer> {
  readonly name: string;
  readonly physical_output: number;
  readonly work_time: number;
  readonly setting_register: number;
}

export namespace Buzzer {
  export type Id = ObjectId<Z3KObjectId.Buzzer>;

  export enum Flags {
    ON_GUARD_STATE_CHANGED = 1 << 0,
  }

  export const get = createAccessors(arrayGetSet("buzzers"), {
    name: "Сирена",
    physical_output: -1,
    work_time: 0,
    setting_register: 0,
  });
}

export interface GuardIndicator extends Z3KObject<Z3KObjectId.GuardIndicator> {
  readonly name: string;
  readonly physical_output: number;
}

export namespace GuardIndicator {
  export type Id = ObjectId<Z3KObjectId.GuardIndicator>;
  export const get = createAccessors(arrayGetSet("guard_indicators"), {
    name: "Индикатор охраны",
    physical_output: -1,
  });
}

export interface RelayControl extends Z3KObject<Z3KObjectId.RelayControl> {
  readonly name: string;
  readonly physical_output: number;
  readonly setting_register: number;
}

export namespace RelayControl {
  export type Id = ObjectId<Z3KObjectId.RelayControl>;

  export enum Flags {
    IS_INVERSE_MODE_FLAG = 1 << 0,
  }

  export interface State {
    readonly active: boolean;
    readonly set_failed: boolean;
    readonly test_mode: boolean;
    readonly test_pending: boolean;
  }

  export const get = createAccessors(arrayGetSet("relay_controls"), {
    name: "Реле",
    physical_output: -1,
    setting_register: 0,
  });
}

export interface ThreewayTap extends Z3KObject<Z3KObjectId.ThreewayTap> {
  readonly name: string;
  readonly physical_output1: PhysicalInputOutput;
  readonly physical_output2: PhysicalInputOutput;
  readonly step_time: number;
  readonly closing_time: number;
  readonly coefficient: number;
  readonly setting_register: number;
  readonly step_period: number;
}

export namespace ThreewayTap {
  export type Id = ObjectId<Z3KObjectId.ThreewayTap>;

  export enum Direction {
    idle = 0,
    open_run = 1,
    close_run = 2,
  }

  export interface State {
    readonly direction: Direction;
    readonly fully_open: boolean;
    readonly fully_closed: boolean;
    readonly full_turn: boolean;
    readonly open_direction: boolean;
    readonly period_ready: boolean;
    readonly sensor_fault: boolean;
    readonly set_output_fault: boolean;
    readonly set_failed: boolean;
    readonly test_mode: boolean;
    readonly test_calibration: boolean;
  }

  export enum Flags {
    TWO_WAY_TAP_FLAG = 1 << 0,
    INVERSE_MODE = 1 << 1,
    IS_IN_NON_STOP_MODE_FLAG = 1 << 2,
    CLOSE_IF_EMERGENCY = 1 << 3,
  }

  export const get = createAccessors(arrayGetSet("threeway_taps"), {
    name: "Кран",
    physical_output1: -1,
    physical_output2: -1,
    step_time: 0,
    closing_time: 0,
    coefficient: 0,
    setting_register: 0,
    step_period: 10,
  });

  export function isTwoWay(
    tap: Pick<ThreewayTap, "setting_register">
  ): boolean {
    return isFlagSet(tap, Flags.TWO_WAY_TAP_FLAG);
  }

  export function setTwoWayTap<T extends Pick<ThreewayTap, "setting_register">>(
    tap: T,
    is_two_way: boolean
  ): T {
    return setFlag<T>(tap, Flags.TWO_WAY_TAP_FLAG, is_two_way);
  }

  export function changeThreeWayTapType<
    T extends Pick<
      ThreewayTap,
      "setting_register" | "closing_time" | "physical_output1"
    >
  >(tap: T, is_two_way: boolean): T {
    return {
      ...setTwoWayTap(tap, is_two_way),
      closing_time: is_two_way ? 0 : tap.closing_time,
      physical_output1: is_two_way ? -1 : tap.physical_output1,
    };
  }
}

export interface AntilegOptions {
  readonly h: number;
  readonly m: number;
  readonly days: number;
}

export type ControlDeviceId =
  | RelayControl.Id
  | BoilerAdapter.Id
  | Pump.Id
  | ThreewayTap.Id;

export type HeatSourceId =
  | HeatingCircuit.Id
  | BoilerGroup.Id
  | BoilerCascade.Id;

export interface HeatingCircuit extends Z3KObject<Z3KObjectId.HeatingCircuit> {
  readonly name: string;
  readonly type: HeatingCircuit.Type;

  readonly water_min_temperature: string | number | null;
  readonly water_max_temperature: string | number | null;

  readonly air_temp_sensor: TemperatureSensorId | null;
  readonly air_temp_sensor_reserve: TemperatureSensorId | null;
  readonly dhw_temp_sensor: TemperatureSensorId | null;
  readonly dhw_temp_sensor_reserve: TemperatureSensorId | null;

  readonly water_temp_sensor: TemperatureSensorId | null;
  readonly water_temp_sensor_reserve: TemperatureSensorId | null;

  readonly hysteresis: number;
  readonly control_devices: readonly ControlDeviceId[];
  readonly setting_register: number;
  readonly turn_off_delay: number;
  readonly external_thermostat: AnalogInput.Id | null;
  readonly heat_request: number;
  readonly pza: number | null | Pza.Id;
  readonly heat_source: null | HeatSourceId;
  readonly antileg_mode_options: AntilegOptions;
  readonly summer_threshold: number | null;
  readonly winter_summer_switch: boolean;
  readonly position: number;
  readonly locker_id: HeatingCircuit.Id | number | null;
  readonly delta_temp: number;

  readonly air_alarm_temp?: number;
  readonly pid_prop_koef?: number;
  readonly pid_integral_koef?: number;
  readonly off_to_start_delay?: number;
  readonly start_to_off_delay?: number;

  is_new?: boolean; // client-only field for means of settings dialog
}

export namespace HeatingCircuit {
  export type Id = ObjectId<Z3KObjectId.HeatingCircuit>;

  export enum Type {
    BOILER = 0,
    DHW = 1,
    COOLING = 2,
    HEATING = 3,
  }

  export enum Flags {
    IS_BOILER_CASCADE_FLAG = 1 << 2, //not use legacy for boilet group
    TURN_OFF_WHEN_DHW_FLAG = 1 << 3,
    ANTILEGIONELLA_FLAG = 1 << 4,
    FLOW_DHW_TYPE = 1 << 5,
    CIRCUIT_DISABLE_FLAG = 1 << 6,
    PZA_REQUEST_ONLY_MODE = 1 << 7,
    IS_CIRCUIT_HIDDEN = 1 << 8,
    IS_ALWAYS_HEAT_REQUEST = 1 << 9,
    DONT_USE__SEND_STATE_TO_ML_FLAG = 1 << 10, //не используются
    DONT_USE__SEND_STATE_TO_USB_FLAG = 1 << 11, //не используются
    ANTIFREEZE_LOGIC_DISABLE = 1 << 12,
    EXT_THERMOSTAT_LOCK_MODE = 1 << 16,
  }

  export enum StatusFlags {
    CIRCUIT_RUN_FLAG = 1 << 0,
    CIRCUIT_LOCK_FLAG = 1 << 1,
    CIRCUIT_TURNED_OFF_FLAG = 1 << 2,
    CIRCUIT_SENSOR_FAULT_FLAG = 1 << 3,
    EXT_THERMOSTAT_IN_USE = 1 << 4,
    EXT_THERMOSTAT_REQUEST = 1 << 5,
    BOILER_RESERVE_FLAG = 1 << 6,
    CIRCUIT_IN_SUMMER_MODE = 1 << 7,
    LEGIONELLA_RUN_FLAG = 1 << 8,
    BOILER_SCHEDULE_TURNED_OFF = 1 << 9,
    BOILER_ALWAYS_WORK = 1 << 10,
    CONSUME_HEAT_REQUEST = 1 << 11,
    LEGIONELLA_TEMPERATURE_REACHED_FLAG = 1 << 12,
    BOILER_CASCADE_FLAG = 1 << 13,
  }

  export enum ConsumerMode {
    AIR = 0,
    AIR_PID = 1,
    WATER = 2,
  }

  export enum ControlMode {
    PZA = 1,
    AIR = 2,
    EXT_THERMOSTAT = 3,
    WATER = 4,
  }

  export type TargetSensorId = TemperatureSensorId | null;

  export interface State {
    readonly worktime: number;
    readonly status: number | null;
    readonly target_temp: number | null;
    readonly target_sensor_id: TargetSensorId;
    readonly mode_id: HeatingMode.Id | null;
    readonly setpoint_temp: number | null;
  }

  export const HEAT_REQUEST__NO_REQUEST = 0;
  export const HEAT_REQUEST__CONSTANT = 2730;
  export const HEAT_REQUEST__MAX_BOILER_TEMP = 0xffff; //65535
  export const TARGET_BOILER_TEMPERATURE_REQUEST = 0xff00; //65280

  export function byType(
    config: Z3KConfig | undefined,
    type: Type
  ): HeatingCircuit[] {
    return get.where(config, (hc) => hc.type === type);
  }

  export function statusFlagSet(
    state: Pick<State, "status">,
    flag: StatusFlags
  ): boolean {
    if (state.status == null) return false;
    return (state.status & flag) !== 0;
  }

  export function isUseExtThermostat(state: State): boolean {
    return statusFlagSet(state, StatusFlags.EXT_THERMOSTAT_IN_USE);
  }

  export function isRequestWarmFromExtThermostat(state: State): boolean {
    return statusFlagSet(state, StatusFlags.EXT_THERMOSTAT_REQUEST);
  }

  export function isSummerMode(state: State): boolean {
    return statusFlagSet(state, StatusFlags.CIRCUIT_IN_SUMMER_MODE);
  }

  export function isFail(state: State): boolean {
    return statusFlagSet(state, StatusFlags.CIRCUIT_SENSOR_FAULT_FLAG);
  }

  export function isWorking(
    state: Pick<State, "worktime" | "status">
  ): boolean {
    return (
      state.worktime > 0 || statusFlagSet(state, StatusFlags.CIRCUIT_RUN_FLAG)
    );
  }

  export function isTurnedOff(state: State): boolean {
    return statusFlagSet(state, StatusFlags.CIRCUIT_TURNED_OFF_FLAG);
  }

  export function isBoilerReserve(state: State): boolean {
    return statusFlagSet(state, StatusFlags.BOILER_RESERVE_FLAG);
  }

  export function getConsumerMode(
    hc: Pick<HeatingCircuit, "setting_register">
  ): ConsumerMode {
    return hc.setting_register & 0x03;
  }

  export function setConsumerMode(
    hc: Readonly<HeatingCircuit>,
    mode: ConsumerMode
  ): HeatingCircuit {
    return {
      ...hc,
      setting_register: (hc.setting_register & ~0x03) | mode,
    };
  }

  export function isAirConsumerMode(
    hc: Readonly<Pick<HeatingCircuit, "setting_register">>
  ): boolean {
    return getConsumerMode(hc) === ConsumerMode.AIR;
  }

  export function isAirPIDConsumerMode(
    hc: Readonly<Pick<HeatingCircuit, "setting_register">>
  ): boolean {
    return getConsumerMode(hc) === ConsumerMode.AIR_PID;
  }

  export function isPIDConsumerMode(
    circuit: Readonly<Pick<HeatingCircuit, "setting_register">>
  ): boolean {
    return getConsumerMode(circuit) === ConsumerMode.AIR_PID;
  }

  export function isWaterConsumerMode(
    circuit: Readonly<Pick<HeatingCircuit, "setting_register">>
  ): boolean {
    return (
      HeatingCircuit.getConsumerMode(circuit) ===
      HeatingCircuit.ConsumerMode.WATER
    );
  }

  export function isEnabled(
    hc: Readonly<Pick<HeatingCircuit, "setting_register">>
  ): boolean {
    return !isFlagSet(hc, Flags.CIRCUIT_DISABLE_FLAG);
  }

  export function isHidden(
    hc: Readonly<Pick<HeatingCircuit, "setting_register">>
  ): boolean {
    return isFlagSet(hc, Flags.IS_CIRCUIT_HIDDEN);
  }

  export function setEnabled<
    T extends Pick<HeatingCircuit, "setting_register">
  >(hc: Readonly<T>, enabled: boolean): T {
    return setFlag<T>(hc, Flags.CIRCUIT_DISABLE_FLAG, !enabled);
  }

  export function isBlockedWhileDHW(
    hc: Readonly<Pick<HeatingCircuit, "setting_register">>
  ): boolean {
    return isFlagSet(hc, Flags.TURN_OFF_WHEN_DHW_FLAG);
  }

  export function setBlockedWhileDHW<
    T extends Pick<HeatingCircuit, "setting_register">
  >(hc: Readonly<T>, block_enabled: boolean): T {
    return setFlag<T>(hc, Flags.TURN_OFF_WHEN_DHW_FLAG, block_enabled);
  }

  export function isAntilegEnabled(
    hc: Readonly<Pick<HeatingCircuit, "setting_register">>
  ): boolean {
    return isFlagSet(hc, Flags.ANTILEGIONELLA_FLAG);
  }

  export function setAntilegEnabled<
    T extends Pick<HeatingCircuit, "setting_register">
  >(hc: Readonly<T>, antileg_enabled: boolean): T {
    return setFlag<T>(hc, Flags.ANTILEGIONELLA_FLAG, antileg_enabled);
  }

  export function isFlowDHW(
    hc: Readonly<Pick<HeatingCircuit, "setting_register">>
  ): boolean {
    return isFlagSet(hc, Flags.FLOW_DHW_TYPE);
  }

  export function setFlowDHW<
    T extends Pick<HeatingCircuit, "setting_register">
  >(hc: Readonly<T>, is_flow_dhw: boolean): T {
    return setFlag<T>(hc, Flags.FLOW_DHW_TYPE, is_flow_dhw);
  }

  export function isAlwaysHeatRequest(
    hc: Readonly<Pick<HeatingCircuit, "setting_register">>
  ): boolean {
    return isFlagSet(hc, Flags.IS_ALWAYS_HEAT_REQUEST);
  }

  export function setAlwaysHeatRequest<
    T extends Pick<HeatingCircuit, "setting_register">
  >(hc: Readonly<T>, always: boolean): T {
    return setFlag<T>(hc, Flags.IS_ALWAYS_HEAT_REQUEST, always);
  }

  export function getControlMode(
    hc: Readonly<
      Pick<HeatingCircuit, "setting_register" | "external_thermostat" | "pza">
    >
  ): ControlMode {
    const consumer_mode = getConsumerMode(hc);

    if (hc.external_thermostat) {
      return ControlMode.EXT_THERMOSTAT;
    }

    if (consumer_mode === ConsumerMode.WATER) {
      if (hc.pza !== 0xff) {
        return ControlMode.PZA;
      } else {
        return ControlMode.WATER;
      }
    } else {
      if (consumer_mode === ConsumerMode.AIR_PID) {
        return ControlMode.AIR;
      } else {
        if (consumer_mode === ConsumerMode.AIR)
          // This should not be the case, but crashing because of it is a bad idea
          return ControlMode.AIR;
      }
    }

    throw "Unknown Heating Circuit Control Mode in heating_circuit_get_control_mode()";
  }

  export function isAntiFreezeDisabled(
    circuit: Readonly<Pick<HeatingCircuit, "setting_register">>
  ): boolean {
    return isFlagSet(circuit, Flags.ANTIFREEZE_LOGIC_DISABLE);
  }

  export function setAntiFreezeDisabled<
    T extends Readonly<Pick<HeatingCircuit, "setting_register">>
  >(circuit: T, enabled: boolean): T {
    return setFlag<T>(circuit, Flags.ANTIFREEZE_LOGIC_DISABLE, !enabled);
  }

  export function isControlByWater(
    hc: Pick<HeatingCircuit, "type" | "setting_register">
  ): boolean {
    return (
      HeatingCircuit.isBoiler(hc) ||
      (HeatingCircuit.isConsumer(hc) && HeatingCircuit.isWaterConsumerMode(hc))
    );
  }

  export function isBoiler(hc: Pick<HeatingCircuit, "type">): boolean {
    return hc.type === Type.BOILER;
  }

  export function isDHW(hc: Pick<HeatingCircuit, "type">): boolean {
    return hc.type === Type.DHW;
  }

  export function isConsumer(hc: Pick<HeatingCircuit, "type">): boolean {
    return hc.type === Type.HEATING;
  }

  export function isCooling(hc: Pick<HeatingCircuit, "type">): boolean {
    return hc.type === Type.COOLING;
  }

  export function isPZARequestOnlyMode(
    hc: Pick<HeatingCircuit, "setting_register">
  ): boolean {
    return isFlagSet(hc, Flags.PZA_REQUEST_ONLY_MODE);
  }
  export function setPZARequestOnlyMode<
    T extends Pick<HeatingCircuit, "setting_register">
  >(hc: T, requestOnlyMode: boolean): T {
    return setFlag<T>(hc, Flags.PZA_REQUEST_ONLY_MODE, requestOnlyMode);
  }

  export function isCircuitWithBoilerAdapter(
    boiler_adapters_ids: readonly ControlDeviceId[],
    hc: Readonly<Pick<HeatingCircuit, "type" | "control_devices">>
  ): boolean {
    return (
      isBoiler(hc) &&
      hc.control_devices.some((obj_id) => boiler_adapters_ids.includes(obj_id))
    );
  }

  export function isCircuitWithBoilerAdapterFromConfig(
    config: Z3KConfig | undefined,
    hc: Readonly<Pick<HeatingCircuit, "type" | "control_devices">>
  ): boolean {
    if (config == null) {
      return false;
    }
    //берём все адаптеры
    const boiler_adapters_ids: readonly ControlDeviceId[] = idExtractor([
      BoilerAdapter,
    ])(config);
    return isCircuitWithBoilerAdapter(boiler_adapters_ids, hc);
  }

  export function hasPZA(hc: Pick<HeatingCircuit, "pza">): boolean {
    return ![HeatingMode.OFF_MODE, HeatingMode.RESERVE_MODE, null].includes(
      hc.pza
    );
  }

  /**
   * @function
   * Контур потребителя типом с управления "по теплоносителю"
   * В нём назначена ПЗА-кривая
   * Не стоит галочка "ПЗА только для запроса тепла"
   * @param hc - кусочек контура, в котором есть setting_register и pza
   * @return boolean
   */
  export function isAirIndication(
    hc: Pick<HeatingCircuit, "setting_register" | "pza">
  ): boolean {
    return (
      getConsumerMode(hc) === ConsumerMode.WATER &&
      hasPZA(hc) &&
      !isPZARequestOnlyMode(hc)
    );
  }

  export function isCascade(
    hc: Pick<HeatingCircuit, "setting_register">
  ): boolean {
    return isFlagSet(hc, Flags.IS_BOILER_CASCADE_FLAG);
  }

  export function setCascadeFlag<
    T extends Pick<HeatingCircuit, "setting_register">
  >(hc: T, is_cascade: boolean): T {
    return setFlag<T>(hc, Flags.IS_BOILER_CASCADE_FLAG, is_cascade);
  }

  export enum OTStatusFlag {
    f = 'f',
    ch = 'ch',
    dhw = 'dhw',
    fl = 'fl',
    cl = 'cl',
    ch2 = 'ch2',
    di = 'di',
}

  /**
   * @function
   * Отображаем греет ли котёл этот контур
   * !!!!!!!!!!!!!!!!ДЛЯ Baxi CONNECT+ !!!!!!!!!!!!!!!!!!!!!!!!!!
   * 1. Определяем какого типа контур
   * 2. Запрашиваем состояние бойлера
   * 3. Если есть нужные флаги, то показываем
   * @param hc - контур
   * @param ba - адаптер котла
   * @param state - Z3k-состояние
   * @return boolean
   */
  export function showFlame(
    hc: Pick<HeatingCircuit, "id" | "type">,
    ba: Pick<BoilerAdapter, "id"> | undefined,
    state: Z3KDeviceState | undefined
  ): boolean {
    //Контуры охлаждения греть не можем
    if (isCooling(hc)) {
      return false;
    }

    //Если нет адаптера или это котловой контур
    if (isBoiler(hc) || ba == null) {
      const hc_state = get_z3k_object_state(state, hc.id);
      return hc_state != null ? isWorking(hc_state) : false;
    }

    const ba_work_state = BoilerAdapter.getWorkState(ba, state);

    if (ba_work_state != null) {
      //Если адаптер в ошибке
      if (ba_work_state.includes(OTStatusFlag.f)) {
        return false;
      }

      if (isConsumer(hc)) {
        return (
          ba_work_state.includes(OTStatusFlag.ch) &&
          ba_work_state.includes(OTStatusFlag.fl)
        );
      }
      if (isDHW(hc)) {
        return (
          ba_work_state.includes(OTStatusFlag.dhw) &&
          ba_work_state.includes(OTStatusFlag.fl)
        );
      }
    }

    return false;
  }

  export function isExtThermostatLockMode<
    T extends Pick<HeatingCircuit, "setting_register">
  >(hc: Readonly<T>): boolean {
    return isFlagSet(hc, Flags.EXT_THERMOSTAT_LOCK_MODE);
  }

  export function setExtThermostatLockMode<
    T extends Pick<HeatingCircuit, "setting_register">
  >(hc: Readonly<T>, checked: boolean): T {
    return setFlag(hc, Flags.EXT_THERMOSTAT_LOCK_MODE, checked);
  }
  export function changeExtThermostat<
    T extends Pick<HeatingCircuit, "setting_register" | "external_thermostat">
  >(hc: Readonly<T>, ext_therm_id: AnalogInput.Id | null): T {
    if (ext_therm_id == null) {
      return setFlag(hc, Flags.EXT_THERMOSTAT_LOCK_MODE, false);
    }
    return { ...hc, external_thermostat: ext_therm_id };
  }

  /**
   * @function
   * Обнуляем запрос тепла для проточного ГВС
   * @param hc - кусочек контура, в котором есть setting_register
   * @return HeatingCircuit
   */
  export function zeroHeatRequest<
    T extends Pick<HeatingCircuit, "setting_register">
  >(hc: Readonly<T>): T {
    if (isFlowDHW(hc)) {
      return {
        ...hc,
        heat_request: HEAT_REQUEST__NO_REQUEST,
        heat_source: null,
      };
    }
    return hc;
  }

  /**
   * @function
   * Обнуляем запрос тепла для проточного ГВС
   * @param boiler_adapters_ids - кусочек контура, в котором есть setting_register
   * @param hc - кусочек контура, в котором есть setting_register
   * @param type - новый тип контура
   * @return HeatingCircuit
   */
  export function changeHcType<
    T extends Pick<
      HeatingCircuit,
      "setting_register" | "type" | "control_devices"
    >
  >(
    boiler_adapters_ids: readonly ControlDeviceId[],
    hc: Readonly<T>,
    type: Type
  ): T {
    let new_hc: Readonly<T> = { ...hc, type };
    //Был не потребителем или стал котлом
    if (!isConsumer(hc) || isBoiler(new_hc)) {
      new_hc = {
        ...new_hc,
        air_temp_sensor: null,
        air_temp_sensor_reserve: null,
      };
    }
    //Стал ГВС
    if (isDHW(new_hc)) {
      new_hc = {
        ...new_hc,
        water_temp_sensor: null,
        water_temp_sensor_reserve: null,
        dhw_temp_sensor: null,
        dhw_temp_sensor_reserve: null,
        water_min_temperature: 20,
        water_max_temperature: 85,
      };

      if (!isCircuitWithBoilerAdapter(boiler_adapters_ids, hc)) {
        new_hc = setFlowDHW(new_hc, false);
      }
    }
    if (!isDHW(new_hc) && !isConsumer(new_hc)) {
      new_hc = {
        ...new_hc,
        heat_request: HEAT_REQUEST__NO_REQUEST,
        heat_source: null,
      };
    }
    if (!isDHW(new_hc)) {
      new_hc = setAntilegEnabled<T>(setFlowDHW(new_hc, false), false);
    }
    // для чего это? -> https://git.microline.ru/zont/server/-/issues/578
    if (!isConsumer(new_hc)) {
      new_hc = setAlwaysHeatRequest(new_hc, false);
    }
    // https://git.microline.ru/zont/server/-/issues/673
    if (!isBoiler(new_hc) && !isDHW(new_hc)) {
      new_hc = {
        ...new_hc,
        control_devices: new_hc.control_devices.filter(
          (id) => !boiler_adapters_ids.includes(id)
        ),
      };
    }
    return new_hc;
  }

  export const get = createAccessors(arrayGetSet("heating_circuits"), {
    name: "контур отопления",
    type: 0,
    water_min_temperature: 15,
    water_max_temperature: 30,
    air_temp_sensor: null,
    air_temp_sensor_reserve: null,
    water_temp_sensor: null,
    water_temp_sensor_reserve: null,
    hysteresis: 0.5,
    control_devices: [],
    setting_register: 0,
    turn_off_delay: 0,
    external_thermostat: null,
    heat_request: 0,
    heat_source: null,
    summer_threshold: 0,
    winter_summer_switch: false,
    pza: null,
    dhw_temp_sensor: null,
    dhw_temp_sensor_reserve: null,
    antileg_mode_options: {
      h: 0,
      m: 0,
      days: 0,
    },
    position: 0,
    locker_id: null,
    delta_temp: 0,
    is_new: true,
  });
}

export interface Pump extends Z3KObject<Z3KObjectId.Pump> {
  readonly name: string;
  readonly physical_output: number;
  readonly delay: number;
  readonly setting_register: number;
  readonly pressure_sensor: AnalogInput.Id | null;
  readonly pressure_threshold: number; // децибары
}

export namespace Pump {
  export type Id = ObjectId<Z3KObjectId.Pump>;

  export enum Mode {
    ALWAYS_WORK = 0,
    BY_HEAT_REQUEST = 1,
  }

  export enum Flags {
    SUMMER_ROTATION_FLAG = 1 << 2,
    IS_INVERSE_MODE_FLAG = 1 << 3,
  }

  export interface State {
    readonly run: boolean;
    readonly turn_on: boolean;
    readonly turn_off: boolean;
    readonly request: boolean;
    readonly lock: boolean;
    readonly state_switched: boolean;
    readonly summer_mode: boolean;
    readonly summer_turnover: boolean;
    readonly test_mode: boolean;
  }

  export const get = createAccessors(arrayGetSet("pumps"), {
    name: "Насос",
    physical_output: -1,
    delay: 0,
    setting_register: 0,
    pressure_sensor: null,
    pressure_threshold: 0,
  });

  export function getMode(pump: Pick<Pump, "setting_register">): Mode {
    return pump?.setting_register & 3;
  }

  export function setMode<T extends Pick<Pump, "setting_register">>(
    pump: T,
    mode: Mode
  ): T {
    return {
      ...pump,
      setting_register: (pump.setting_register & ~0x3) | mode,
    };
  }
}

export type TMKeyActionId = OutputAction.Id | Command.Id;

export interface TMKey extends Z3KObject<Z3KObjectId.TMKey> {
  readonly name: string;
  readonly serial: string;
  readonly touch_actions: readonly TMKeyActionId[];
}
export namespace TMKey {
  export type Id = ObjectId<Z3KObjectId.TMKey>;
  export const get = createAccessors(arrayGetSet("tm_keys"), {
    name: "Ключ",
    serial: "",
    touch_actions: [],
  });
}

export interface UserRole extends Z3KObject<Z3KObjectId.UserRole> {
  readonly name: string;
  readonly access_level_register: number;
  readonly managed_guard_zone_list: readonly GuardZone.Id[];
  readonly user_list: readonly User.Id[];
}

export namespace UserRole {
  export type Id = ObjectId<Z3KObjectId.UserRole>;

  export enum AccessLevel {
    SMS = 1 << 0,
    WEB = 1 << 1,
    VOICE_MENU = 1 << 2,
  }

  export const get = createAccessors(arrayGetSet("user_roles"), {
    name: "Роль",
    access_level_register: 0,
    managed_guard_zone_list: [],
    user_list: [],
  });
}

export interface HeatingMode extends Z3KObject<Z3KObjectId.HeatingMode> {
  readonly name: string;
  readonly heating_zones: readonly HeatingMode.Zone[];
  readonly setting_register: number;
  readonly water_sensor: null | TemperatureSensorId;
  readonly start_reserve_delay: number;
  readonly force_boiler_mode: boolean; //fake-flag for ui
  readonly hysteresis?: number;
  readonly position?: number;
}
export type TemperatureSettingId =
  | number
  | HeatingMode.Id
  | DayTimetable.Id
  | WeekTimetable.Id
  | IntervalTimetable.Id;

export namespace HeatingMode {
  export type Id = ObjectId<Z3KObjectId.HeatingMode>;

  export const enum Flags {
    MANUAL_COLOR = 1 << 0,
    COLOR_BIT_1 = 1 << 1,
    COLOR_BIT_2 = 1 << 2,
    COLOR_BIT_3 = 1 << 3,
    COLOR_BIT_4 = 1 << 4,
    IS_HIDDEN = 1 << 5,
  }

  export interface Zone {
    readonly heating_circuit: HeatingCircuit.Id | BoilerCascade.Id;
    readonly temperature_setting: TemperatureSettingId;
    readonly adjusting_sensor: null | TemperatureSensorId;
    readonly pza: null | number | Pza.Id;
  }

  export const OFF_MODE = 0;
  export const REQUEST_MODE = 1;
  export const ALWAYS_ON_MODE = 2;
  export const RESERVE_MODE = 255;

  export const special_modes = [
    OFF_MODE,
    REQUEST_MODE,
    ALWAYS_ON_MODE,
    RESERVE_MODE,
  ];
  export function getSpecialModeName(temp: number): string {
    switch (temp) {
      case OFF_MODE:
        return "Выкл";
      case REQUEST_MODE:
        return "Запрос";
      case ALWAYS_ON_MODE:
        return "Всегда";
      case RESERVE_MODE:
        return "Резерв";
      default:
        return "";
    }
  }

  export function getAuthor(id: AnyObjectId): Author {
    return id >> 12;
}

  export function seemsLikeObjectId(num: unknown): num is AnyObjectId {
    return typeof num == 'number' && getAuthor(num as AnyObjectId) > 0;
}

  export function getTargetTemperature(
    mode: HeatingMode,
    circuit_id: HeatingCircuit.Id
  ): number | null {
    const temperature_setting = mode.heating_zones.find(
      ({ heating_circuit }) =>
        // prettier-ignore
        heating_circuit === circuit_id
    )?.temperature_setting;
    if (temperature_setting == null || temperature_setting === OFF_MODE) {
      return null;
    }
    if (!seemsLikeObjectId(temperature_setting)) {
      return (temperature_setting - 2730) / 10;
    }
    return null;
  }

  export function makeTemperatureSetting(target_temp_C: number | null): number {
    if (target_temp_C == null) {
      return OFF_MODE;
    }
    return ~~(target_temp_C * 10 + 2730);
  }

  export function isHidden(
    mode: Readonly<Pick<HeatingMode, "setting_register">>
  ): boolean {
    return isFlagSet(mode, Flags.IS_HIDDEN);
  }

  export function changeHidden<T extends Pick<HeatingMode, "setting_register">>(
    mode: T,
    enabled: boolean
  ): T {
    return setFlag<T>(mode, Flags.IS_HIDDEN, enabled);
  }

  export function hasManualColor(
    mode: Pick<HeatingMode, "setting_register">
  ): boolean {
    return isFlagSet(mode, Flags.MANUAL_COLOR);
  }

  export function getManualColor(
    mode: Pick<HeatingMode, "setting_register">
  ): number {
    return (mode.setting_register >> 1) & 0x0f;
  }

  export function getColor(
    mode: Pick<HeatingMode, "setting_register">
  ): number {
    return mode.setting_register & 0x1f;
  }

  export function setColor<T extends Pick<HeatingMode, "setting_register">>(
    mode: T,
    color: number
  ): T {
    return {
      ...mode,
      setting_register: (mode.setting_register & ~0x1f) | color,
    };
  }

  export function getAutoColor(mode_index: number): number {
    return mode_index % 10;
  }

  export const enum MODE_TYPE {
    BOILER = "BOILER",
    CONSUMER = "CONSUMER",
    MIXED = "MIXED",
  }
  export function getModeTypePerZone(
    heating_mode: Pick<HeatingMode, "heating_zones">,
    heating_circuits: readonly Pick<HeatingCircuit, "id" | "type">[],
    boiler_cascades: readonly Pick<BoilerCascade, "id">[]
  ): Record<HeatingCircuit.Id | BoilerCascade.Id, MODE_TYPE> {
    const zones_heating_circuit_ids = removeNulls(
      (heating_mode.heating_zones || []).map((zone) => zone.heating_circuit)
    );

    //Посмотрим, кто используется в hc
    const used_hc = Object.fromEntries(
      removeNulls(
        (heating_circuits || []).map((hc) =>
          zones_heating_circuit_ids.includes(hc.id)
            ? HeatingCircuit.isBoiler(hc)
              ? [hc.id, MODE_TYPE.BOILER]
              : [hc.id, MODE_TYPE.CONSUMER]
            : null
        )
      )
    );

    const used_cascades = Object.fromEntries(
      removeNulls(
        (boiler_cascades || []).map(({ id }) =>
          zones_heating_circuit_ids.includes(id) ? [id, MODE_TYPE.BOILER] : null
        )
      )
    );
    return {
      ...used_hc,
      ...used_cascades,
    };
  }

  export function getModeType(
    heating_mode: Pick<HeatingMode, "heating_zones">,
    heating_circuits: readonly Pick<HeatingCircuit, "id" | "type">[],
    boiler_cascades: readonly Pick<BoilerCascade, "id">[]
  ): MODE_TYPE {
    const all_use = new Set(
      Object.values(
        getModeTypePerZone(heating_mode, heating_circuits, boiler_cascades)
      )
    );

    //Значит создали новый контур, который нигде не участвует
    if (all_use.size === 0) {
      return MODE_TYPE.CONSUMER;
    }
    return all_use.size > 1 ? MODE_TYPE.MIXED : all_use.values().next().value;
  }

  export function hasBoilerMode(
    heating_mode: Pick<HeatingMode, "heating_zones">,
    heating_circuits: readonly Pick<HeatingCircuit, "id" | "type">[],
    boiler_cascades: readonly Pick<BoilerCascade, "id">[]
  ): boolean {
    return [MODE_TYPE.MIXED, MODE_TYPE.BOILER].includes(
      getModeType(heating_mode, heating_circuits, boiler_cascades)
    );
  }

  export function hasConsumerMode(
    heating_mode: Pick<HeatingMode, "heating_zones">,
    heating_circuits: readonly Pick<HeatingCircuit, "id" | "type">[],
    boiler_cascades: readonly Pick<BoilerCascade, "id">[]
  ): boolean {
    return [MODE_TYPE.CONSUMER].includes(
      getModeType(heating_mode, heating_circuits, boiler_cascades)
    );
  }

  export function isOffHz(
    hz: Pick<HeatingMode.Zone, "temperature_setting">
  ): boolean {
    return hz.temperature_setting === 0;
  }

  export function isOffMode(hm: Pick<HeatingMode, "heating_zones">): boolean {
    return hm.heating_zones.every(HeatingMode.isOffHz);
  }

  export const get = createAccessors(arrayGetSet("heating_modes"), {
    name: "Режим отопления",
    heating_zones: [],
    setting_register: 0,
    water_sensor: null,
    start_reserve_delay: 10,
    force_boiler_mode: false,
  });
}
// prettier-ignore
export type DayHours = readonly [
    // 24 TemperatureSettingIds
    TemperatureSettingId, TemperatureSettingId, TemperatureSettingId, TemperatureSettingId,
    TemperatureSettingId, TemperatureSettingId, TemperatureSettingId, TemperatureSettingId,
    TemperatureSettingId, TemperatureSettingId, TemperatureSettingId, TemperatureSettingId,
    TemperatureSettingId, TemperatureSettingId, TemperatureSettingId, TemperatureSettingId,
    TemperatureSettingId, TemperatureSettingId, TemperatureSettingId, TemperatureSettingId,
    TemperatureSettingId, TemperatureSettingId, TemperatureSettingId, TemperatureSettingId
];

export interface DayTimetable extends Z3KObject<Z3KObjectId.DayTimetable> {
  readonly temp24: DayHours;
}

// prettier-ignore
export type WeekDayHours = readonly [
    DayTimetable.Id, DayTimetable.Id, DayTimetable.Id,
    DayTimetable.Id, DayTimetable.Id, DayTimetable.Id,
    DayTimetable.Id
];

export namespace DayTimetable {
  export type Id = ObjectId<Z3KObjectId.DayTimetable>;
  export const get = createAccessors(arrayGetSet("day_timetables"), {
    // prettier-ignore
    temp24: [
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
        ],
  });
}

export interface WeekTimetable extends Z3KObject<Z3KObjectId.WeekTimetable> {
  readonly temp7: WeekDayHours;
}

export namespace WeekTimetable {
  export type Id = ObjectId<Z3KObjectId.WeekTimetable>;
  export const get = createAccessors(arrayGetSet("week_timetables"), {
    temp7: [] as unknown as WeekDayHours,
  });

  export function createWithZeroes(
    config: Z3KConfig
  ): [WeekTimetable.Id, Z3KConfig] {
    const dayIds: readonly DayTimetable.Id[] = new Array(7).fill(0).map(() => {
      let dayId: DayTimetable.Id;
      [dayId, config] = DayTimetable.get.add(config, {
        // prettier-ignore
        temp24: [
                    0, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0, 0, 0, 0, 0,
                ],
      });
      return dayId;
    });
    let weekId: WeekTimetable.Id;
    [weekId, config] = WeekTimetable.get.add(config, {
      temp7: dayIds as WeekTimetable["temp7"],
    });
    return [weekId, config];
  }
}

export interface IOExtension extends Z3KObject<Z3KObjectId.IOExtension> {
  readonly serial: string;
  readonly name: string;
  readonly rol_connection_lost: readonly ReactionId[];
  readonly device_version: string;
  readonly bus_address?: number;
  readonly type?: IOExtension.Type;
  readonly related_list?: readonly AnyObjectId[];
  readonly setting_register: number;

  is_new?: boolean; // client-only field for means of settings dialog
}

export namespace IOExtension {
  export type Id = ObjectId<Z3KObjectId.IOExtension>;

  export enum Type {
    ZE66 = 0,
    CE_2 = 1,
    HUMIDITY_TEMP_SENSOR = 2,
    TEMP_SENSOR = 3,
    BUILTIN_BOARD = 4,
  }

  export enum Flags {
    K_LINE_VIA_RS485_GATEWAY_FLAG = 1 << 0,
    RS485_VIA_UDP_GATEWAY_FLAG = 1 << 1,
    K_LINE_VIA_UDP_GATEWAY_FLAG = 1 << 2,
  }

  const hiddenTypesFromUser: readonly Type[] = [
    Type.HUMIDITY_TEMP_SENSOR,
    Type.TEMP_SENSOR,
    Type.BUILTIN_BOARD,
  ];

  export function shownToUser(ioExt: IOExtension): boolean {
    return ioExt.type == null || !hiddenTypesFromUser.includes(ioExt.type);
  }

  const hiddenTypesFromChosen: readonly Type[] = [
    Type.HUMIDITY_TEMP_SENSOR,
    Type.TEMP_SENSOR,
  ];

 


  export function showInOptions(
    io_ext: IOExtension,
    device_spec: any
  ): boolean {
    return (
      device_spec.io.io_extensions_supported &&
      io_ext.type != null &&
      !hiddenTypesFromChosen.includes(io_ext.type)
    );
  }

  export function isCE2(io_ext: Pick<IOExtension, "type">): boolean {
    return io_ext.type === Type.CE_2;
  }

  export function isZE66(io_ext: Pick<IOExtension, "type">): boolean {
    return io_ext.type === Type.ZE66;
  }

  export const get = createAccessors(arrayGetSet("io_extensions"), {
    name: "Блок расширения",
    serial: "",
    rol_connection_lost: [],
    device_version: "v0.0",
    setting_register: 0,
    is_new: true,
    bus_address: 0,
  });
}

export interface Pza extends Z3KObject<Z3KObjectId.Pza> {
  readonly name: string;
  readonly x: readonly number[];
  readonly y: readonly number[];
}

export namespace Pza {
  export type Id = ObjectId<Z3KObjectId.Pza>;
  export const get = createAccessors(arrayGetSet("pzas"), {
    name: "Кривая ПЗА",
    x: [],
    y: [],
  });

  export function findLinksAndRemove(
    config: Z3KConfig,
    pza_id: Pza.Id
  ): Z3KConfig {
    if (
      !HeatingCircuit.get.some(config, (hc) => hc.pza === pza_id) ||
      !HeatingMode.get.some(config, ({ heating_zones }) =>
        heating_zones.some((hz) => hz.pza === pza_id)
      )
    ) {
      return Pza.get.removeById(config, pza_id);
    }
    return config;
  }
}

export interface BoilerGroup extends Z3KObject<Z3KObjectId.BoilerGroup> {
  // устаревшая
  readonly name: string;
  readonly lead_boiler_id: HeatingCircuit.Id | null;
  readonly rotation_period: number;
  readonly setting_register: number;
  readonly slave_boiler_switch_delay: number;
  readonly boiler_list: readonly HeatingCircuit.Id[];
  readonly timetables: readonly WeekTimetable.Id[];
}

export namespace BoilerGroup {
  export type Id = ObjectId<Z3KObjectId.BoilerGroup>;
  export const get = createAccessors(arrayGetSet("boiler_groups"), {
    name: "Группа котлов",
    lead_boiler_id: null,
    rotation_period: 1,
    setting_register: 0,
    slave_boiler_switch_delay: 10,
    boiler_list: [],
    timetables: [],
  });

  export enum BoilerGroupType {
    CASCADE = 0,
    RESERVE = 1,
    PARALLEL = 2,
    SCHEDULE = 3,
  }

  export function getType(group: BoilerGroup): BoilerGroupType {
    return (group.setting_register & 0x3) as BoilerGroupType;
  }
  export function setType(
    group: BoilerGroup,
    type: BoilerGroupType
  ): BoilerGroup {
    return {
      ...group,
      setting_register: (group.setting_register & ~0x3) | type,
    };
  }
}

export interface AnalogTemperatureSensor
  extends Z3KObject<Z3KObjectId.AnalogTemperatureSensor> {
  readonly physical_input_num: number;
  readonly name: string;
  readonly type: AnalogTemperatureSensor.Type;
  //TODO: заменить все значения в базе
  readonly upper_threshold: number | null;
  readonly lower_threshold: number | null;
  readonly hysteresis: number;
  readonly no_connection_timeout: number;
  readonly rol_connection_lost: readonly ReactionId[];
  readonly rol_temperature_upper_threshold: readonly ReactionId[];
  readonly rol_temperature_lower_threshold: readonly ReactionId[];
  readonly ntc: NTCTemperatureCurve.Id | null;
  readonly pull_up: number;
  readonly calibration_shift: number;
  readonly recovery_list: readonly ReactionId[];
  readonly setting_register: number;
  readonly position?: number;
}

export namespace AnalogTemperatureSensor {
  export type Id = ObjectId<Z3KObjectId.AnalogTemperatureSensor>;

  export enum Type {
    Pt100 = 0,
    Pt500 = 1,
    Pt1000 = 2,
    NTC1 = 3,
    NTC1_8 = 4,
    NTC2 = 5,
    NTC3 = 6,
    NTC5 = 7,
    NTC10 = 8,
    NTC20 = 9,
    NTC47 = 10,
    OTHER = 255,
  }

  export interface State {
    readonly sensor_ok: boolean;
    readonly curr_temp: number | undefined;
    readonly prev_temp: number;
    readonly flag: number;
  }

  export enum Flags {
    IS_OUTSIDE = 1 << 0,
    MANUAL_COLOR = 1 << 1,
    COLOR_BIT_1 = 1 << 2,
    COLOR_BIT_2 = 1 << 3,
    COLOR_BIT_3 = 1 << 4,
    COLOR_BIT_4 = 1 << 5,
    COLOR_BIT_5 = 1 << 6,
    EVENT_TO_SERVER_FLAG_INVERTED = 1 << 7,
  }

  export const get = createAccessors(
    arrayGetSet("analog_temperature_sensors"),
    {
      name: "Аналоговый датчик температуры",
      physical_input_num: -1,
      type: -1,
      upper_threshold: null,
      lower_threshold: null,
      hysteresis: 0,
      no_connection_timeout: 5,
      rol_connection_lost: [],
      rol_temperature_upper_threshold: [],
      rol_temperature_lower_threshold: [],
      recovery_list: [],
      setting_register: 0,
      ntc: null,
      pull_up: 0,
      calibration_shift: 0,
    }
  );

  export function isOutside(
    sensor: Pick<AnalogTemperatureSensor, "setting_register">
  ): boolean {
    return isFlagSet(sensor, Flags.IS_OUTSIDE);
  }

  export function isEventToServer(
    sensor: Pick<AnalogTemperatureSensor, "setting_register">
  ): boolean {
    return !isFlagSet(sensor, Flags.EVENT_TO_SERVER_FLAG_INVERTED);
  }

  export function setEventToServer<
    T extends Pick<AnalogTemperatureSensor, "setting_register">
  >(sensor: T, eventToServer: boolean): T {
    return setFlag(
      sensor,
      Flags.EVENT_TO_SERVER_FLAG_INVERTED,
      !eventToServer
    ) as T;
  }

  export function isManualColor<
    T extends Pick<AnalogTemperatureSensor, "setting_register">
  >(ats: T): boolean {
    return isFlagSet(ats, Flags.MANUAL_COLOR);
  }

  export function getColor<
    T extends Pick<AnalogTemperatureSensor, "setting_register">
  >(sensor: T): number {
    if (!isManualColor(sensor)) {
      return 0;
    }
    return (sensor.setting_register >> 1) & 0x1f;
  }

  export function setColor<
    T extends Pick<AnalogTemperatureSensor, "setting_register">
  >(sensor: T, color: number): T {
    return {
      ...sensor,
      setting_register: (sensor.setting_register & ~(0x1f << 1)) | (color << 1),
    };
  }

  export function getLimits(
    sensor: Pick<AnalogTemperatureSensor, "upper_threshold" | "lower_threshold">
  ): { high: number | null; low: number | null } {
    return {
      high:
        //@ts-ignore
        sensor.upper_threshold === "" || sensor.upper_threshold == null
          ? null
          : parseInt(sensor.upper_threshold + "", 10),
      low:
        //@ts-ignore
        sensor.lower_threshold === "" || sensor.lower_threshold == null
          ? null
          : parseInt(sensor.lower_threshold + "", 10),
    };
  }
}

export interface NTCTemperatureCurve
  extends Z3KObject<Z3KObjectId.NTCTemperatureCurve> {
  readonly x: readonly number[];
  readonly y: readonly number[];
}
export namespace NTCTemperatureCurve {
  export type Id = ObjectId<Z3KObjectId.NTCTemperatureCurve>;
  export const get = createAccessors(arrayGetSet("ntc_temperature_curves"), {
    x: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    y: NTCTemperatureCurve.ntcDefaultY,
  });

  // prettier-ignore
  export const ntcDefaultY = [-30, -20, -10, 0, 10, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
  // prettier-ignore
  export const ntcDefaultX: Record<
        Exclude<AnalogTemperatureSensor.Type, AnalogTemperatureSensor.Type.OTHER>,
        Readonly<number[]>
        > = {
        [AnalogTemperatureSensor.Type.Pt100]: [88, 92, 96, 100, 103, 107, 109, 111, 115, 119, 123, 127, 130, 134, 138, 142, 146],
        [AnalogTemperatureSensor.Type.Pt500]: [441, 460, 480, 500, 519, 538, 548, 558, 577, 597, 616, 635, 654, 673, 892, 711, 730],
        [AnalogTemperatureSensor.Type.Pt1000]: [882, 921, 960, 1000, 1039, 1077, 1097, 1116, 1155, 1194, 1232, 1270, 1308, 1347, 1385, 1422, 1460],
        [AnalogTemperatureSensor.Type.NTC1]: [10961, 6662, 4175, 2961, 1781, 1205, 1000, 834, 589, 424, 310, 231, 174, 133, 103, 81, 64],
        [AnalogTemperatureSensor.Type.NTC1_8]: [0, 0, 8400, 5200, 3330, 2200, 1800, 1480, 1040, 740, 540, 402, 306, 240, 187, 149, 118],
        [AnalogTemperatureSensor.Type.NTC2]: [24651, 14614, 8946, 5642, 3656, 2431, 2000, 1654, 1150, 816, 590, 433, 324, 245, 189, 147, 115],
        [AnalogTemperatureSensor.Type.NTC3]: [53005, 29092, 16589, 9795, 5971, 3748, 3000, 2416, 1597, 1080, 746, 525, 376, 274, 203, 153, 116],
        [AnalogTemperatureSensor.Type.NTC5]: [88342, 48487, 27649, 16325, 9951, 6246, 5000, 4028, 2662, 1800, 1243, 875, 628, 458, 339, 255, 194],
        [AnalogTemperatureSensor.Type.NTC10]: [176680, 96970, 55300, 32650, 19900, 12490, 10000, 8060, 5320, 3600, 2490, 1750, 1260, 920, 680, 510, 390],
        [AnalogTemperatureSensor.Type.NTC20]: [415480, 221300, 122470, 70200, 41560, 25350, 20000, 15890, 10210, 6720, 4520, 3100, 2120, 1540, 1120, 820, 610],
        [AnalogTemperatureSensor.Type.NTC47]: [843120, 463400, 264030, 155480, 94380, 58910, 47000, 37730, 24750, 16600, 11360, 7920, 5630, 4060, 2980, 2210, 1670],
    };
}

export interface Fob extends Z3KObject<Z3KObjectId.Fob> {
  readonly name: string;
}
export namespace Fob {
  export type Id = ObjectId<Z3KObjectId.Fob>;
  export const get = createAccessors(arrayGetSet("fobs"), {
    name: "Брелок",
  });
}

export interface FobButton extends Z3KObject<Z3KObjectId.FobButton> {
  readonly name: string;
  readonly unique_id: number;
  readonly commands: readonly (ReactionId | GuardZone.Id)[];
  readonly fob_id: Fob.Id;
}
export namespace FobButton {
  export type Id = ObjectId<Z3KObjectId.FobButton>;
  export const get = createAccessors(arrayGetSet("fob_buttons"), {
    name: "Кнопка",
    unique_id: 0,
    commands: [],
    fob_id: -1 as Fob.Id,
  });
}

export interface RadioSensor433 extends Z3KObject<Z3KObjectId.RadioSensor433> {
  readonly name: string;
  readonly unique_id: number;
  readonly type: number;
  readonly rol_triggered: readonly ReactionId[];
  readonly trigger_reset_time: number;
  readonly setting_register: number;
}

export namespace RadioSensor433 {
  export type Id = ObjectId<Z3KObjectId.RadioSensor433>;
  export interface State {
    readonly status: number;
  }

  export const enum SensorType {
    MAGNET = 0,
    MOTION = 1,
    SMOKE = 2,
    LEAK = 3,
  }

  export const TypeOptions = [
    { text: "Датчик открытия двери/окна", value: SensorType.MAGNET },
    { text: "Датчик движения", value: SensorType.MOTION },
    { text: "Датчик дыма", value: SensorType.SMOKE },
    { text: "Датчик протечки", value: SensorType.LEAK },
  ];

  export function getType(sensor: Pick<RadioSensor433, "type">): SensorType {
    return (sensor.type & 0x7f) as SensorType;
  }

  export function setType<T extends Pick<RadioSensor433, "type">>(
    sensor: T,
    new_type: SensorType
  ): T {
    return {
      ...sensor,
      type: (sensor.type & 128) | new_type,
    };
  }

  export enum StatusFlags {
    REVERSED = 1 << 0,
    IS_TRIGGERED_FLAG = 1 << 1,
    IS_GUARD_STATE = 1 << 7,
  }

  export function isTriggered(state: State): boolean {
    return (state.status & StatusFlags.IS_TRIGGERED_FLAG) > 0;
  }

  export enum Flags {
    EVENT_TO_SERVER_FLAG_INVERTED = 1 << 0,
  }

  export function isEventToServer(
    sensor: Pick<RadioSensor433, "setting_register">
  ): boolean {
    return !isFlagSet(sensor, Flags.EVENT_TO_SERVER_FLAG_INVERTED);
  }
  export function setEventToServer<
    T extends Pick<RadioSensor433, "setting_register">
  >(sensor: T, eventToServer: boolean): T {
    return setFlag(
      sensor,
      Flags.EVENT_TO_SERVER_FLAG_INVERTED,
      !eventToServer
    ) as T;
  }

  export const get = createAccessors(arrayGetSet("radiosensors433"), {
    name: "Датчик движения",
    unique_id: 1234567,
    type: SensorType.MAGNET,
    rol_triggered: [],
    trigger_reset_time: 1.0,
    setting_register: 0,
  });
}

export enum WeekDay {
  monday = 0,
  tuesday = 1,
  wednesday = 2,
  thursday = 3,
  friday = 4,
  saturday = 5,
  sunday = 6,
}

export const workdays = [
  { id: WeekDay.monday, name: "Пн" },
  { id: WeekDay.tuesday, name: "Вт" },
  { id: WeekDay.wednesday, name: "Ср" },
  { id: WeekDay.thursday, name: "Чт" },
  { id: WeekDay.friday, name: "Пт" },
];

export const weekends = [
  { id: WeekDay.saturday, name: "Сб" },
  { id: WeekDay.sunday, name: "Вс" },
];

export const days = [...workdays, ...weekends];

export interface TimeInterval extends Z3KObject<Z3KObjectId.TimeInterval> {
  readonly sh: number;
  readonly sm: number;
  readonly eh: number;
  readonly em: number;
  readonly temperature: TemperatureSettingId;
  //Дни, когда действует этот интервал
  readonly action_register: number;
}

export namespace TimeInterval {
  export type Id = ObjectId<Z3KObjectId.TimeInterval>;

  export function appliesToDay(
    day: WeekDay,
    interval: Pick<TimeInterval, "action_register">
  ): boolean {
    return (interval.action_register & (1 << day)) != 0;
  }

  export function setDay<T extends Pick<TimeInterval, "action_register">>(
    day: WeekDay,
    interval: T
  ): T {
    return {
      ...interval,
      action_register: interval.action_register ^ (1 << day),
    };
  }

  export function isEqualTimeIntervals<
    T extends Omit<TimeInterval, "id" | "action_register" | "rest">
  >(a: T, b: T): boolean {
    if (a.sh !== b.sh) {
      return false;
    }
    if (a.sm !== b.sm) {
      return false;
    }
    if (a.eh !== b.eh) {
      return false;
    }
    if (a.em !== b.em) {
      return false;
    }
    return a.temperature === b.temperature;
  }
  export const default_object = {
    sm: 0,
    sh: 0,
    em: 0,
    eh: 0,
    temperature: 2930,
    action_register: 0,
  };
  export const get = createAccessors(
    arrayGetSet("time_intervals"),
    default_object
  );
}

export interface IntervalTimetable
  extends Z3KObject<Z3KObjectId.IntervalTimetable> {
  readonly time_intervals: TimeInterval.Id[];
  readonly outside_default: number | HeatingMode.Id;
  readonly setting_register: number;
}

export namespace IntervalTimetable {
  export type Id = ObjectId<Z3KObjectId.IntervalTimetable>;
  export const default_object = {
    time_intervals: [],
    outside_default: 2930,
    setting_register: 0,
  };
  export const get = createAccessors(
    arrayGetSet("interval_timetables"),
    default_object
  );
}

export interface AnalogDut extends Z3KObject<Z3KObjectId.AnalogDut> {
  readonly physical_input: number;
  readonly name: string;
  readonly signal_normalization: number;
  readonly setting_register: number;
  readonly lower_threshold: number;
  readonly no_connection_timeout: number;
  readonly rol_connection_lost: readonly ReactionId[];
  readonly calibration: CalibrationTable.Id;
  readonly egts?: number;
}

export namespace AnalogDut {
  export type Id = ObjectId<Z3KObjectId.AnalogDut>;

  export interface State {
    readonly status: number;
    readonly fuel_level_ok: boolean;
    readonly fuel_level: number;
    readonly raw_acp: number;
    readonly raw_acp_ok: boolean;
  }

  export const get = createAccessors(arrayGetSet("analog_duts"), {
    physical_input: -1,
    name: "Аналоговый ДУТ",
    signal_normalization: 0,
    setting_register: 1,
    lower_threshold: 0,
    rol_connection_lost: [],
    no_connection_timeout: 1,
    calibration: -1 as CalibrationTable.Id,
    egts: 0,
  });
}

export interface CalibrationTableContentsItem {
  readonly value: number;
  readonly voltage: number;
}

export interface CalibrationTable
  extends Z3KObject<Z3KObjectId.CalibrationTable> {
  readonly table: CalibrationTableContentsItem[];
}

export namespace CalibrationTable {
  export type Id = ObjectId<Z3KObjectId.CalibrationTable>;
  export const get = createAccessors(arrayGetSet("calibration_tables"), {
    table: [],
  });
}

export interface DigitalDut extends Z3KObject<Z3KObjectId.DigitalDut> {
  readonly serial: string;
  readonly name: string;
  readonly type: DigitalDut.DutType;
  readonly setting_register: number;
  readonly rol_connection_lost: readonly ReactionId[];
  readonly no_connection_timeout: number;
  readonly calibration: CalibrationTable.Id;
  readonly egts?: number;
}
export namespace DigitalDut {
  export type Id = ObjectId<Z3KObjectId.DigitalDut>;

  export enum DutType {
    RS_485 = 1,
    K_LINE = 2,
  }

  export enum Flags {
    FROM_OBD = 1 << 4,
  }

  export interface State {
    readonly status: number;
    readonly fuel_level: number;
    readonly raw_acp: number;
  }

  export const TypeOptions = [
    { text: "RS-485", value: DutType.RS_485 },
    { text: "K-LINE", value: DutType.K_LINE },
  ];

  export function isFromOBD(
    dut: Pick<DigitalDut, "setting_register">
  ): boolean {
    return isFlagSet(dut, Flags.FROM_OBD);
  }

  export function isRS485(dut: Pick<DigitalDut, "type">): boolean {
    return dut.type === DutType.RS_485;
  }

  export const get = createAccessors(arrayGetSet("digital_duts"), {
    serial: "0",
    name: "Цифровой ДУТ",
    type: DutType.RS_485,
    setting_register: 1,
    rol_connection_lost: [],
    no_connection_timeout: 1,
    calibration: -1 as CalibrationTable.Id,
    egts: 0,
  });
}

export interface RadioDut extends Z3KObject<Z3KObjectId.RadioDut> {
  readonly serial: string;
  readonly type: number;
  readonly name: string;
  readonly setting_register: number;
  readonly no_connection_timeout: number;
  readonly rol_connection_lost: readonly ReactionId[];
  readonly related_radiomodule_id: RadioModule.Id;
  readonly calibration: CalibrationTable.Id;
  readonly egts?: number;
  readonly common_with?: RadioDut.Id[];
  //one id from dut_configs
  readonly config?: AnyObjectId;
}
export namespace RadioDut {
  export type Id = ObjectId<Z3KObjectId.RadioDut>;

  export enum Flags {
    NOT_TREATMENT = 1 << 0, //обработка ДУТ не производится
    ALWAYS = 1 << 1,
    IGNITION_ON = 1 << 2,
    ACCELEROMETER_ON = 1 << 3,
    // Пользовательские настройки
  }

  export function isNotTreatment(radio_dut: Readonly<RadioDut>): boolean {
    return isFlagSet(radio_dut, Flags.NOT_TREATMENT);
  }

  export function setNotTreatment(
    radio_dut: Readonly<RadioDut>,
    enabled: boolean
  ): RadioDut {
    return setFlag(radio_dut, Flags.NOT_TREATMENT, enabled);
  }

  export function isAlways(radio_dut: Readonly<RadioDut>): boolean {
    return isFlagSet(radio_dut, Flags.ALWAYS);
  }

  export function setAlways(
    radio_dut: Readonly<RadioDut>,
    enabled: boolean
  ): RadioDut {
    return setFlag(radio_dut, Flags.ALWAYS, enabled);
  }

  export function isIgnitionOn(radio_dut: Readonly<RadioDut>): boolean {
    return isFlagSet(radio_dut, Flags.IGNITION_ON);
  }

  export function setIgnitionOn(
    radio_dut: Readonly<RadioDut>,
    enabled: boolean
  ): RadioDut {
    return setFlag(radio_dut, Flags.IGNITION_ON, enabled);
  }

  export function isAccelerometerOn(radio_dut: Readonly<RadioDut>): boolean {
    return isFlagSet(radio_dut, Flags.ACCELEROMETER_ON);
  }

  export function setAccelerometerOn(
    radio_dut: Readonly<RadioDut>,
    enabled: boolean
  ): RadioDut {
    return setFlag(radio_dut, Flags.ACCELEROMETER_ON, enabled);
  }

  export const get = createAccessors(arrayGetSet("radio_duts"), {
    serial: "",
    type: 6,
    name: "РадиоДУТ",
    setting_register: 1,
    no_connection_timeout: 2.0,
    rol_connection_lost: [] as ReactionId[],
    related_radiomodule_id: -1 as RadioModule.Id,
    calibration: 0 as CalibrationTable.Id,
    egts: 0,
    common_with: [] as RadioDut.Id[],
    config: 0 as RadioDut.Id,
  });
}

export interface GraphPanel extends Z3KObject<Z3KObjectId.GraphPanel> {
  readonly serial: string;
  readonly name: string;
  readonly recipient_address: number; //адрес на шине
  readonly circuit_id_in_main_panel: HeatingCircuit.Id | null;
  readonly type: GraphPanel.Type | null;
}

export namespace GraphPanel {
  export type Id = ObjectId<Z3KObjectId.GraphPanel>;

  export enum Type {
    Climatic = 0,
    ML_753 = 1,
  }
  export const get = createAccessors(arrayGetSet("graph_panels"), {
    serial: "",
    name: "Панель",
    recipient_address: 1,
    circuit_id_in_main_panel: -1 as HeatingCircuit.Id,
    type: 0,
  });
}

export interface BoilerCascade extends Z3KObject<Z3KObjectId.BoilerCascade> {
  readonly name: string;
  readonly boiler_list: readonly HeatingCircuit.Id[];
  readonly rotation_period: number;
  readonly slave_boiler_start_delay: number;
  readonly slave_boiler_finish_delay: number;
  readonly water_sensor: TemperatureSensorId | null;
  readonly setting_register: number;
  readonly lead_boiler_switch_delay: number;
  readonly hysteresis: number;
}

export namespace BoilerCascade {
  export type Id = ObjectId<Z3KObjectId.BoilerCascade>;
  export const get = createAccessors(arrayGetSet("boiler_cascades"), {
    name: "Каскад котлов",
    rotation_period: 1,
    setting_register: 0,
    slave_boiler_start_delay: 10,
    slave_boiler_finish_delay: 10,
    lead_boiler_switch_delay: 10,
    boiler_list: [],
    water_sensor: null,
    hysteresis: 5,
  });
}

export type UIElementId =
  | UIGroup.Id
  | HeatingCircuit.Id
  | HeatingMode.Id
  | TemperatureSensorId
  | RadioSensor.Id
  | RadioSensor433.Id
  | AnalogInput.Id
  | GuardZone.Id
  | WebElement.Id;

export interface UIGroup extends Z3KObject<Z3KObjectId.UIGroup> {
  readonly name: string;
  readonly icon: number;
  readonly items: readonly UIElementId[];
  readonly position?: number;
}

export namespace UIGroup {
  export type Id = ObjectId<Z3KObjectId.UIGroup>;
  export const get = createAccessors(arrayGetSet("ui_groups"), {
    name: "Вкладка 1",
    icon: 0,
    items: [] as UIElementId[],
    position: 0,
  });
}

export interface ObjectArrays extends Z3KObject<Z3KObjectId.ObjectArrays> {
  readonly objects_links: readonly AnyObjectId[];
  readonly setting_register: number;
}

export namespace ObjectArrays {
  export type Id = ObjectId<Z3KObjectId.ObjectArrays>;
  export const get = createAccessors(arrayGetSet("object_arrays"), {
    objects_links: [],
    setting_register: 0,
  });
}

export interface GSMSettings {
  readonly ussd: string;
  readonly threshold: number;
  readonly notification?: Notification.Id | null;
}

export interface ServerSettings {
  readonly show_control_devices_state: boolean;
}

export type StockConfig =
  | { readonly id: null; readonly title?: null; readonly version?: null }
  | { readonly id: number; readonly title: string; readonly version: string }
  | {
      readonly id: undefined;
      readonly title: undefined;
      readonly version: undefined;
    };

export interface Pause extends Z3KObject<Z3KObjectId.Pause> {
  readonly time: number;
}

export namespace Pause {
  export type Id = ObjectId<Z3KObjectId.Pause>;

  export const get = createAccessors(arrayGetSet("pauses"), {
    time: 0,
  });
}
export type BooleanConditionId =
  | Comparator.Id
  | LogicExpression.Id
  | TimeComparator.Id
  | SensorReading.Id;

export interface ConditionalOperator
  extends Z3KObject<Z3KObjectId.ConditionalOperator> {
  readonly type: ConditionalOperator.Type;
  readonly comparator_id: BooleanConditionId;
  readonly statementThen: readonly ScenarioLinkId[];
  readonly statementElse: readonly ScenarioLinkId[];
}

export namespace ConditionalOperator {
  export type Id = ObjectId<Z3KObjectId.ConditionalOperator>;

  export enum Type {
    IF_THEN = 0,
    IF_THEN_ELSE = 1,
  }

  export const get = createAccessors(arrayGetSet("conditional_operators"), {
    type: 0,
    comparator_id: -1 as BooleanConditionId,
    statementThen: [],
    statementElse: [],
  });
}

export interface Comparator extends Z3KObject<Z3KObjectId.Comparator> {
  readonly type: Comparator.Type;
  readonly left_object_id: SensorReading.Id;
  readonly right_object_id: SensorReading.Id | null; //not null if right_const = 0
  readonly right_const: number; //not null if right_object_id = null
}

export namespace Comparator {
  export type Id = ObjectId<Z3KObjectId.Comparator>;

  export enum Type {
    LESS = 0, // <
    MORE = 1, // >
    EQUAL = 2, // ==
    LESS_OR_EQUAL = 3, // <=
    MORE_OR_EQUAL = 4, // >=
  }

  export const get = createAccessors(arrayGetSet("comparators"), {
    type: Comparator.Type.LESS,
    left_object_id: -1 as SensorReading.Id,
    right_object_id: null,
    right_const: 1,
  });
}

export interface LogicExpression
  extends Z3KObject<Z3KObjectId.LogicExpression> {
  readonly type: LogicExpression.Type;
  readonly conditions: readonly BooleanConditionId[];
}

export namespace LogicExpression {
  export type Id = ObjectId<Z3KObjectId.LogicExpression>;

  export enum Type {
    AND = 0,
    OR = 1,
    NOT = 2,
  }

  export const get = createAccessors(arrayGetSet("logic_expressions"), {
    type: LogicExpression.Type.AND,
    conditions: [],
  });
}

export type SensorObjectIds =
  | AnalogInput.Id
  | WiredTemperatureSensor.Id
  | RadioSensor.Id
  | AnalogTemperatureSensor.Id;

export type SensorReadingObjectId =
  | GuardZone.Id
  | HeatingCircuit.Id
  | RelayControl.Id
  | Pump.Id
  | ThreewayTap.Id
  | Buzzer.Id
  | SensorObjectIds;

export enum GuardZoneState {
  GUARD_OFF = 0,
  GUARD_ON = 1,
  ALARM = 2,
}

export enum RelayControlState {
  OFF = 0,
  ON = 1,
}

export enum PumpState {
  OFF = 0,
  ON = 1,
}

export enum ThreewayTapState {
  AT_REST = 0,
  OPENING = 1,
  CLOSING = 2,
  OPEN = 3,
  CLOSE = 4,
}

export enum BuzzerState {
  OFF = 0,
  ON = 1,
}

export enum SensorState {
  OFFLINE = 0,
  OUT_OF_UPPER_THRESHOLD = 1,
  OUT_OF_LOWER_THRESHOLD = 2,
  ACTUATION = 3,
  RECOVERY = 4,
  OUT_OF_UPPER_HUMIDITY_THRESHOLD = 5, //only for humidity radio_sensor
  OUT_OF_LOWER_HUMIDITY_THRESHOLD = 6, //only for humidity radio_sensor
}

export enum Sensor433State {
  OFFLINE = 0,
  TRIGGERED = 1,
}

export enum RadioSensorValue {
  TEMPERATURE = 0,
  HUMIDITY = 1,
  BATTERY_LEVEL = 2,
  RSSI = 3,
}

export type SensorReadingArgs =
  | Sensor433State //addRadioSensor433StateBlock
  | SensorState //addSensorBlockDefinition
  | GuardZoneState //addGuardStateBlock
  | BuzzerState //addSirenStateBlock
  | RelayControlState //addRelayStateBlock
  | ThreewayTapState // addTapStateBlock
  | PumpState //addPumpStateBlock
  | HeatingMode.Id //addHeatingModeForHeatingCircuitStateBlock
  | RadioSensorValue //addRadioSensorReadingBlock
  | 0;

export interface SensorReading extends Z3KObject<Z3KObjectId.SensorReading> {
  readonly obj_id: SensorReadingObjectId;
  readonly type: SensorReading.Type;
  readonly argument: SensorReadingArgs;
}
export namespace SensorReading {
  export type Id = ObjectId<Z3KObjectId.SensorReading>;

  export enum Type {
    VALUE = 0,
    STATE = 1,
  }
  export const get = createAccessors(arrayGetSet("sensor_readings"), {
    obj_id: -1 as SensorReadingObjectId,
    type: SensorReading.Type.VALUE,
    argument: 0,
  });
}

export interface TimeComparator extends Z3KObject<Z3KObjectId.TimeComparator> {
  readonly type: TimeComparator.Type;
  readonly comparator_type: Comparator.Type; // only for Type.TIME
  readonly time: number; // only for Type.TIME
  readonly daysOfTheWeek: number; // only for Type.WEEKDAYS
}

export namespace TimeComparator {
  export type Id = ObjectId<Z3KObjectId.TimeComparator>;

  export enum Type {
    TIME = 0,
    WEEKDAYS = 1,
  }

  export const get = createAccessors(arrayGetSet("time_comparators"), {
    type: TimeComparator.Type.TIME,
    comparator_type: Comparator.Type.LESS,
    time: 0,
    daysOfTheWeek: 0,
  });
}

export interface ModBusDevice extends Z3KObject<Z3KObjectId.ModBusDevice> {
  readonly address: number;
  readonly name: string;
  readonly period: number;
  readonly time_for_disconnect: number;
  readonly rol_connection_lost: readonly ReactionId[];
  readonly rol_reconnection: readonly ReactionId[];
  readonly setting_register: number;
  readonly signals: readonly ModBusSignal.Id[];
}

export namespace ModBusDevice {
  export type Id = ObjectId<Z3KObjectId.ModBusDevice>;
  export const get = createAccessors(arrayGetSet("modbus_devices"), {
    address: 1,
    name: "Устройство Modbus",
    period: 1000,
    time_for_disconnect: 300000,
    rol_connection_lost: [],
    rol_reconnection: [],
    setting_register: 0,
    signals: [],
  });
}

export interface ModBusSignal extends Z3KObject<Z3KObjectId.ModBusSignal> {
  readonly name: string;
  readonly address: number;
  readonly buffer_length: number;
  readonly buffer_offset: number;
  readonly var_count: number;
  readonly var_length: number;
  readonly var_period_repeat: number;
  readonly setting_register: number;
  readonly type: ModBusSignal.Types;
}

export namespace ModBusSignal {
  export type Id = ObjectId<Z3KObjectId.ModBusSignal>;
  export const get = createAccessors(arrayGetSet("modbus_signals"), {
    name: "Регистр №",
    address: 0,
    buffer_length: 0,
    buffer_offset: 0,
    var_count: 1,
    var_length: 8,
    var_period_repeat: 8,
    setting_register: 0,
    type: -1,
  });

  export function getSignalsByDevice<T extends Pick<ModBusSignal, "id">>(
    signals: readonly T[],
    device: Pick<ModBusDevice, "signals">
  ): readonly T[] {
    return signals.filter((signal) => device.signals.includes(signal.id));
  }

  export enum Types {
    RESISTANCE_THERMOMETER = 1,
    THERMOCOUPLE = 2,
    ONE_WIRE = 3,
    THERMAL_SENSOR_FLOAT = 4,
    THERMAL_SENSOR_DIETRICH = 5,
    UNIFIED_SIGNAL = 21,
    CONST_VOLTAGE_SIGNAL = 22,
    DRY_CONTACT = 23,
    VALVE_POSITION = 24,
    DISCRETE_INPUT = 25,
    RESISTIVE_SENSOR = 26,
    ANALOG_INPUT = 27,
    FLOAT32_PARAM = 28,
    INT16_PARAM = 29,
    INT32_PARAM = 30,
    FLOAT32_TYPE2_PARAM = 31,
    DISCRETE_OUTPUT = 41,
    ANALOG_OUTPUT_UINT16 = 42,
    ANALOG_OUTPUT_UINT32 = 43,
    ANALOG_OUTPUT_INT16 = 44,
    ANALOG_OUTPUT_INT32 = 45,
    ANALOG_OUTPUT_FLOAT = 46,
  }

  export const AnalogOutputTypes: Types[] = [
    Types.ANALOG_OUTPUT_UINT16,
    Types.ANALOG_OUTPUT_UINT32,
    Types.ANALOG_OUTPUT_INT16,
    Types.ANALOG_OUTPUT_INT32,
    Types.ANALOG_OUTPUT_FLOAT,
  ];

  export const AnalogInputTypes: Types[] = [
    Types.UNIFIED_SIGNAL,
    Types.CONST_VOLTAGE_SIGNAL,
    Types.DRY_CONTACT,
    Types.VALVE_POSITION,
    Types.DISCRETE_INPUT,
    Types.RESISTIVE_SENSOR,
    Types.ANALOG_INPUT,
    Types.FLOAT32_PARAM,
    Types.INT16_PARAM,
    Types.INT32_PARAM,
    Types.FLOAT32_TYPE2_PARAM,
  ];

  export const OutputActionTypes: Types[] = [Types.DISCRETE_OUTPUT];

  export const WiredTemperatureSensorTypes: Types[] = [
    Types.RESISTANCE_THERMOMETER,
    Types.THERMOCOUPLE,
    Types.ONE_WIRE,
    Types.THERMAL_SENSOR_FLOAT,
    Types.THERMAL_SENSOR_DIETRICH,
  ];

  export const translateModbusSignalType: Record<Types, string> = {
    [Types.RESISTANCE_THERMOMETER]: "Термометры сопротивления",
    [Types.THERMOCOUPLE]: "Термопары",
    [Types.ONE_WIRE]: "Термодатчики 1-wire",
    [Types.THERMAL_SENSOR_FLOAT]: "Термодатчик float",
    [Types.THERMAL_SENSOR_DIETRICH]: "Термодатчик Dietrich",
    [Types.UNIFIED_SIGNAL]: "Унифицированные сигналы",
    [Types.CONST_VOLTAGE_SIGNAL]: "Сигнал постоянного напряжения",
    [Types.DRY_CONTACT]: "Датчик типа «сухой контакт»",
    [Types.VALVE_POSITION]: "Датчики положения задвижек",
    [Types.DISCRETE_INPUT]: "Дискретный вход",
    [Types.RESISTIVE_SENSOR]: "Резистивный датчик",
    [Types.ANALOG_INPUT]: "Аналоговый вход",
    [Types.FLOAT32_PARAM]: "Параметр типа float32",
    [Types.INT16_PARAM]: "Параметр типа int16",
    [Types.INT32_PARAM]: "Параметр типа int32",
    [Types.FLOAT32_TYPE2_PARAM]: "Параметр типа float32 (2)",
    [Types.DISCRETE_OUTPUT]: "Дискретные выходы",
    [Types.ANALOG_OUTPUT_UINT16]: "Аналоговые выходы uint16",
    [Types.ANALOG_OUTPUT_UINT32]: "Аналоговые выходы uint32",
    [Types.ANALOG_OUTPUT_INT16]: "Аналоговые выходы int16",
    [Types.ANALOG_OUTPUT_INT32]: "Аналоговые выходы int32",
    [Types.ANALOG_OUTPUT_FLOAT]: "Аналоговые выходы float",
  };
}

export interface AnalogOutput extends Z3KObject<Z3KObjectId.AnalogOutput> {
  readonly name: string;
  readonly min_value: number;
  readonly max_value: number;
  readonly step: number;
  readonly unit: AnalogOutput.Unit;
  readonly mult: number;
  readonly setting_register: number;
  readonly physical_output: PhysicalInputOutput;
}

export namespace AnalogOutput {
  export type Id = ObjectId<Z3KObjectId.AnalogOutput>;

  export interface State {
    readonly value: number;
    readonly flags: number;
  }

  interface AnalogOutputUnit {
    readonly value: Unit;
    readonly value_title: string;
    readonly unit_abb: string;
  }

  export enum Unit {
    Voltage = 0,
    Frequency = 1,
    Temp = 2,
  }

  export const unit_select: AnalogOutputUnit[] = [
    { value: Unit.Voltage, value_title: "Напряжение", unit_abb: "В" },
    { value: Unit.Frequency, value_title: "Частота", unit_abb: "Гц" },
    { value: Unit.Temp, value_title: "Температура", unit_abb: "°C" },
  ];

  export function getUnitAbb(ao: Pick<AnalogOutput, "unit">): string {
    return unit_select.find((item) => item.value === ao.unit)?.unit_abb ?? "";
  }

  export function isModbusOutput(
    ao: Pick<AnalogOutput, "physical_output">,
    modbus_signal_ids: readonly ModBusSignal.Id[]
  ): boolean {
    const { block_id } = parsePhysicalIO(ao.physical_output);
    return (
      block_id != null &&
      modbus_signal_ids.includes(block_id as ModBusSignal.Id)
    ); //«as» need for TS
  }

  export const get = createAccessors(arrayGetSet("analog_outputs"), {
    name: "Новый аналоговый выход",
    min_value: 0,
    max_value: 100,
    step: 1,
    unit: Unit.Voltage,
    mult: 1,
    setting_register: 0,
    physical_output: -1,
  });
}

export interface StopScenario extends Z3KObject<Z3KObjectId.StopScenario> {
  readonly type: StopScenario.Type;
  readonly return_id: ScenarioLinkId | null; // only for Type.RETURN
}

export namespace StopScenario {
  export type Id = ObjectId<Z3KObjectId.StopScenario>;

  export enum Type {
    RETURN = 0,
    BREAK = 1,
    CONTINUE = 2,
  }

  export const get = createAccessors(arrayGetSet("stop_scenarios"), {
    type: StopScenario.Type.RETURN,
    return_id: null,
  });
}

export interface DeviceInfo {
  readonly name: string;
  readonly hardware: string;
  readonly firmware: string;
}

export interface WiFi {
  readonly is_enabled: boolean;
  readonly netname: string;
  readonly pass: string;
}

export namespace WiFi {
  export enum ConnectionState {
    CONNECTED = 8,
  }

  export interface State {
    readonly con_stat: ConnectionState;
    readonly rssi: number;
  }

  export function isConnectedViaWiFi(state: State): boolean {
    return state?.con_stat === ConnectionState.CONNECTED;
  }
}

export interface EthernetState {
  readonly is_connected: boolean;
  readonly mac: string;
  readonly ip: string;
  readonly gate: string;
  readonly mask: string;
}

export interface PortRS485 {
  readonly setting_register: number;
  readonly speed: number;
  readonly stop_byte_count: number;
  readonly parity_check: number;
}

export namespace PortRS485 {
  export enum Type {
    standard = 0,
    modbus = 1,
  }

  export const speeds = [
    2400, 4800, 9600, 14400, 19200, 28800, 38400, 57600, 115200,
  ];

  export const stopByteCounts = [1, 2];

  export const parityCheckDict = [
    { value: 0, text: "Отсутствует" },
    { value: 1, text: "Четность" },
    { value: 2, text: "Нечетность" },
  ];

  export const DEFAULT: PortRS485 = {
    setting_register: 0,
    speed: 9600,
    stop_byte_count: 1,
    parity_check: 0,
  };
}

export interface ServiceContact {
  readonly phone: string;
  readonly date: null | {
    readonly year: number;
    readonly month: number;
    readonly day: number;
  };
}


export interface CurrentStockConfig {
    id: number | null;
    title: string | null;
    version: string | null;
}

export interface Z3KConfig {
  //author_id: next_id
  readonly counters: Readonly<Record<number, number>>;
  readonly unknown?: string[];

  readonly login: string;
  readonly timezone: number;
  readonly usbpassword?: string;
  readonly use_reserve_battery?: boolean;
  readonly servers?: string;
  readonly port: number;
  readonly password?: string;
  readonly apn?: string;
  readonly a300_diag_interface?: number;
  readonly a300_diag_available_params?: number;

  readonly device: DeviceInfo;
  readonly gsm_settings?: GSMSettings;
  readonly service_contact?: ServiceContact;
  readonly wifi_settings?: WiFi;
  readonly port_rs485?: PortRS485;
  readonly server_settings?: ServerSettings;
  readonly stockconfig?: StockConfig | CurrentStockConfig;

  //0
  readonly analog_inputs?: readonly AnalogInput[];
  readonly wired_temperature_sensors?: readonly WiredTemperatureSensor[];
  readonly guard_zones?: readonly GuardZone[];
  readonly notifications?: readonly Notification[];
  readonly users?: readonly User[];
  //5
  readonly output_actions?: readonly OutputAction[];
  readonly boiler_adapters?: readonly BoilerAdapter[];
  readonly radiomodules?: readonly RadioModule[];
  readonly radiosensors?: readonly RadioSensor[];
  readonly commands?: readonly Command[];
  //10
  readonly web_elements?: readonly WebElement[];
  readonly scenarios?: readonly Scenario[];
  readonly buzzers?: readonly Buzzer[];
  readonly guard_indicators?: readonly GuardIndicator[];
  readonly relay_controls?: readonly RelayControl[];
  //15
  readonly threeway_taps?: readonly ThreewayTap[];
  readonly heating_circuits?: readonly HeatingCircuit[];
  readonly pumps?: readonly Pump[];
  readonly tm_keys?: readonly TMKey[];
  readonly user_roles?: readonly UserRole[];
  //20
  readonly heating_modes?: readonly HeatingMode[];
  readonly day_timetables?: readonly DayTimetable[];
  readonly week_timetables?: readonly WeekTimetable[];
  //readonly radio_tags
  readonly io_extensions?: readonly IOExtension[];
  //25
  readonly pzas?: readonly Pza[];
  readonly boiler_groups?: readonly BoilerGroup[];
  readonly analog_temperature_sensors?: readonly AnalogTemperatureSensor[];
  readonly ntc_temperature_curves?: readonly NTCTemperatureCurve[];
  readonly fobs?: readonly Fob[];
  //30
  readonly fob_buttons?: readonly FobButton[];
  readonly radiosensors433?: readonly RadioSensor433[];
  //readonly outer_panels
  readonly time_intervals?: readonly TimeInterval[];
  readonly interval_timetables?: readonly IntervalTimetable[];
  //35
  readonly analog_duts?: readonly AnalogDut[];
  readonly calibration_tables?: readonly CalibrationTable[];
  readonly digital_duts?: readonly DigitalDut[];
  readonly radio_duts?: readonly RadioDut[];
  readonly graph_panels?: readonly GraphPanel[];
  //40
  readonly boiler_cascades?: readonly BoilerCascade[];
  //readonly dut_settings
  readonly ui_groups?: readonly UIGroup[];
  readonly object_arrays?: readonly ObjectArrays[];
  //readonly accelerometers
  //45
  readonly pauses?: readonly Pause[];
  readonly conditional_operators?: readonly ConditionalOperator[];
  readonly comparators?: readonly Comparator[];
  readonly logic_expressions?: readonly LogicExpression[];
  readonly sensor_readings?: readonly SensorReading[];
  //50
  readonly time_comparators?: readonly TimeComparator[];
  readonly modbus_devices?: readonly ModBusDevice[];
  readonly modbus_signals?: readonly ModBusSignal[];
  readonly analog_outputs?: readonly AnalogOutput[];
  //readonly signals
  //55
  //readonly slots
  readonly stop_scenarios?: readonly StopScenario[];
}

export const minimalZ3KConfig: Z3KConfig = {
  counters: {},
  device: {
    name: "UNKNOWN",
    firmware: "0",
    hardware: "0",
  },
  login: "",
  timezone: 3,
  port: 52200,
};

export type Z3KDeviceState =
  | undefined
  | {
      readonly [object_id: number]: any;
    };

export type Z3KObjectStateById<ID extends AnyObjectId> =
  ID extends AnalogInput.Id
    ? AnalogInput.State
    : ID extends HeatingCircuit.Id
    ? HeatingCircuit.State
    : ID extends RelayControl.Id
    ? RelayControl.State
    : ID extends Pump.Id
    ? Pump.State
    : ID extends ThreewayTap.Id
    ? ThreewayTap.State
    : ID extends WiredTemperatureSensor.Id
    ? WiredTemperatureSensor.State
    : ID extends AnalogTemperatureSensor.Id
    ? AnalogTemperatureSensor.State
    : ID extends BoilerAdapter.Id
    ? BoilerAdapter.State
    : ID extends RadioModule.Id
    ? RadioModule.State
    : ID extends RadioSensor.Id
    ? RadioSensor.State
    : ID extends RadioSensor433.Id
    ? RadioSensor433.State
    : ID extends GuardZone.Id
    ? GuardZone.State
    : ID extends AnalogDut.Id
    ? AnalogDut.State
    : ID extends DigitalDut.Id
    ? DigitalDut.State
    : ID extends AnalogOutput.Id
    ? AnalogOutput.State
    : ID extends WebElement.Id
    ? WebElement.State
    : unknown;

export function get_z3k_object_state<ID extends AnyObjectId>(
  z3k_state: Z3KDeviceState,
  object_id: ID
): Z3KObjectStateById<ID> | undefined {
  return z3k_state?.[object_id] as Z3KObjectStateById<ID>;
}

export type TemperatureSensor =
  | WiredTemperatureSensor
  | AnalogTemperatureSensor
  | RadioSensor
  | BoilerAdapter;
export type TemperatureSensorId =
  | WiredTemperatureSensor.Id
  | AnalogTemperatureSensor.Id
  | RadioSensor.Id
  | BoilerAdapter.Id;
export type TemperatureSensorState =
  | WiredTemperatureSensor.State
  | AnalogTemperatureSensor.State
  | RadioSensor.State
  | BoilerAdapter.State;

export type ReactionId =
  | Notification.Id
  | OutputAction.Id
  | Command.Id
  | Scenario.Id;

export function get_temperature_sensor(
  z3k_config: Z3KConfig,
  id: TemperatureSensorId
): TemperatureSensor | undefined {
  return (
    WiredTemperatureSensor.get.byId(
      z3k_config,
      id as WiredTemperatureSensor.Id
    ) ??
    AnalogTemperatureSensor.get.byId(
      z3k_config,
      id as AnalogTemperatureSensor.Id
    ) ??
    RadioSensor.get.byId(z3k_config, id as RadioSensor.Id) ??
    BoilerAdapter.get.byId(z3k_config, id as BoilerAdapter.Id)
  );
}

export const enum OTTemperaturePreference {
  WATER = "WATER",
  DHW = "DHW",
}

export function assertNever(x: never, message?: string): never {
    throw new Error(message ?? 'Unexpected object: ' + x);
}

export function temperature_from_state(
  state: TemperatureSensorState | undefined,
  ot_preference: OTTemperaturePreference = OTTemperaturePreference.WATER
): number | undefined {
  if (state == null) {
    return undefined;
  }
  if ("curr_temp" in state) if (state.sensor_ok) return state.curr_temp;

  if ("temperature" in state) if (state.sensor_ok) return state.temperature;

  if ("ot" in state)
    switch (ot_preference) {
      case OTTemperaturePreference.WATER:
        return state.ot.bt;
      case OTTemperaturePreference.DHW:
        return state.ot.dt;
      default:
        return assertNever(ot_preference);
    }

  return undefined;
}

export function apply_setter_to_array<
  O extends AnyObjectId,
  T extends { id: O }
>(array: readonly T[], obj_id: O, setter: Partial<T>): T[] {
  return array.map((obj) => (obj.id === obj_id ? { ...obj, ...setter } : obj));
}


export function isNotOptimized(temp: WeekScheduleWithModes): boolean {
  let is_all_null = true;
  for (let i = 0; i < 24; ++i) {
    for (let j = 1; j < 7; ++j) {
      if (temp[j][i] !== temp[j - 1][i]) return false;
      if (temp[j][i] !== 0) is_all_null = false;
    }
  }
  return !is_all_null;
}
