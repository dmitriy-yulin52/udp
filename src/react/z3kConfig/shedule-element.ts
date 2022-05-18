import {ComponentType} from 'react';

export type TempOrMode = number | `M${number}`;

// prettier-ignore
export type DaySchedule = readonly [
    // 24 hours
    number, number, number, number, number, number,
    number, number, number, number, number, number,
    number, number, number, number, number, number,
    number, number, number, number, number, number,
]

// prettier-ignore
export type DayScheduleWithModes = readonly [
    // 24 hours
    TempOrMode, TempOrMode, TempOrMode, TempOrMode, TempOrMode, TempOrMode,
    TempOrMode, TempOrMode, TempOrMode, TempOrMode, TempOrMode, TempOrMode,
    TempOrMode, TempOrMode, TempOrMode, TempOrMode, TempOrMode, TempOrMode,
    TempOrMode, TempOrMode, TempOrMode, TempOrMode, TempOrMode, TempOrMode,
]

// prettier-ignore
export type WeekSchedule = readonly [
    // 7 days
    DaySchedule, DaySchedule, DaySchedule, DaySchedule, DaySchedule, DaySchedule, DaySchedule
];

// prettier-ignore
export type WeekScheduleWithModes = readonly [
    // 7 days
    DayScheduleWithModes, DayScheduleWithModes, DayScheduleWithModes, DayScheduleWithModes,
    DayScheduleWithModes, DayScheduleWithModes, DayScheduleWithModes
];

interface ModeSpec {
    name: string;
    zone_temp?: (number | null)[];
}

interface ScheduleElementProps {
    modes?: Record<number, ModeSpec>;
    day?: boolean;

    show_temperature_selector: boolean;

    tempschedule: WeekScheduleWithModes | [DayScheduleWithModes];
    onScheduleChanged?: (newSchedule: WeekScheduleWithModes) => void;
}

declare const ScheduleElement: ComponentType<ScheduleElementProps>;
export default ScheduleElement;
