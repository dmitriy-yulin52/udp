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

  async downloadFileZ3kConfig(dev_serial: string): Promise<Uint8Array | null> {
    const found_device = Object.entries(this.detectionState).some(
        ([serial, state]) => serial.toUpperCase() == dev_serial.toUpperCase()
    );

    if (found_device) {
        const config = await this.detectionState[dev_serial].protocol.getFile();
        return config;
    }
    return null;
}

async saveZ3kConfigInDevice(
    dev_serial: string,
    z3kConfig: Z3KConfig
): Promise<void> {
    const found_device = Object.entries(this.detectionState).some(
        ([serial, state]) => serial.toUpperCase() == dev_serial.toUpperCase()
    );

    console.log(z3kConfig, 'saveZ3kConfig -device-server');
    const z3kConfig_str = config2Str(z3kConfig);
    const z3kConfig_uint8Array = iconv.encode(z3kConfig_str, 'win1251');

    if (found_device) {
        await this.detectionState[dev_serial].protocol.writeFile(
            'config.txt',
            z3kConfig_uint8Array
        );
    }
}

async send_z3k_command(
    dev_serial: string,
    command: Z3KCommand
): Promise<string[] | null> {
    const found_device = Object.entries(this.detectionState).some(
        ([serial, state]) => serial.toUpperCase() == dev_serial.toUpperCase()
    );

    const text_command = command2text(command);

    if (found_device) {
        const promises = text_command.map((el) =>
            this.detectionState[dev_serial].protocol.sendTextWithResponse(el)
        );
        const expected_promises = (await Promise.all(promises)).map(
            (msg) => msg.message
        );
        return expected_promises;
    } else {
        return null;
    }


}


