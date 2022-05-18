import { Action } from "redux";
import { DeviceProtocol } from "./device-protocol";
import { MutableMessageTransport } from "./message-transport";
import { Message, TextMessage } from "./oldmessages";
import { DoubleSocketType } from "./udp-socket";
import { Z3KConfig } from "../../react/z3kConfig/z3kConfig";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const iconv = require("iconv-lite");

export type DeviceDetected = {
  ip: string;
  time: Date;
  model: string;
  transport: MutableMessageTransport;
  protocol: DeviceProtocol;
};

export type DetectionCollector = {
  [serial: string]: DeviceDetected;
};

export class DeviceServer {
  detectionState: DetectionCollector = {};
  counterId: number;
  timeInterval: NodeJS.Timeout | number;

  constructor(
    readonly DoubleSocket: DoubleSocketType,
    readonly dispatch: (action: Action) => Action
  ) {
    this.DoubleSocket.getSocket &&
      this.DoubleSocket.getSocket.onReceive(this.onMessage);
    this.sendDeviceDetection();
    // setInterval(this.sendDeviceDetection, 10e3);
    this.counterId = 0;
    this.timeInterval = setInterval(this.sendDeviceDetection, 10e3);
  }

  sendDeviceDetection = (): void => {
    if (this.DoubleSocket.sendSocket !== null) {
      this.DoubleSocket.sendSocket.send(new TextMessage("#F", 0, 0));
    }
  };

  onMessage = (msg: Message, addr: string): void => {
    if (msg instanceof TextMessage) {
      const match = /^#I([0-9A-Fa-f]{12}):(.*)/.exec(msg.message);
      // const matchS7 = /^#S7=([0-9A-Za-z+]*)\s([0-9]*)\s([0-9]*)/.exec(
      //     msg.message
      // );
      if (match) {
        const [_, serial, model] = match;
        const existing = this.detectionState
          ? this.detectionState[serial]
          : false;

        if (existing) {
          this.detectionState[serial] = {
            ...existing,
            ip: addr,
            time: new Date(),
            model: model,
          };
          // this.detectionState[serial].transport.ip = addr;
        } else {
          if (this.DoubleSocket.sendSocket) {
            const transport = new MutableMessageTransport(
              this.DoubleSocket.sendSocket,
              addr
            );
            this.detectionState[serial] = {
              ip: addr,
              time: new Date(),
              model: model,
              transport: transport,
              protocol: new DeviceProtocol(
                this.dispatch,
                ++this.counterId,
                serial,
                transport,
                {} as Z3KConfig
              ),
            };
          }
        }
        // console.log(this.detectionState[serial], 'serial');
        return;
      }
    }

    // this.lastDate = new Date(Date.now());
    // console.log(this.lastDate, 'this.date');

    Object.entries(this.detectionState)
      .filter(([serial, state]) => state.ip == addr)
      .forEach(([serial, state]) => {
        state.transport.onMessage(msg);
      });
  };
}
