import { Action } from "redux";
import { Capability } from "../../react/capability/device-capability";
import { Z3KConfig } from "../../react/z3kConfig/z3kConfig";
import { ListenerState } from "./listener-state";
import { MessageTransport } from "./message-transport";
import { FileContent, TextMessage } from "./oldmessages";
import { ResponseHandler, SmartFileTransferManager } from "./response-handler";

export class DeviceProtocol {
    private readonly responseHandler: ResponseHandler;
    private smartFileTransferManager: SmartFileTransferManager | undefined;
    private listenerState: ListenerState | undefined;

    constructor(
        public readonly dispatch: (action: Action) => Action,
        public readonly counterId: number,
        public readonly serial: string,
        public readonly transport: MessageTransport,
        public config?: string
    ) {
        this.responseHandler = new ResponseHandler(this.transport);
        this.smartFileTransferManager = new SmartFileTransferManager(
            this.responseHandler,
            this.transport,
            this.dispatch
        );

        // this.config = await this.getConfig();
        // this.getConfig().then();
        // this.askVersion().then();
        // this.goToReducer().then();
        // this.getAllState().then();

        this.initialConfigAndState()
            .then()
            .catch((err) => console.log(err, 'initialConfigAndStateERR'));
    }

    private async goToReducer() {
        const devVersion = await this.askVersion();

        const match = /^#S7=([0-9A-Za-z+]*)\s([0-9]*)\s([0-9]*)/.exec(
            devVersion.message.trim()
        );
        console.log(match, 'devVersion');
        if (match) {
            const [_, model, hw, fw] = match;

            const dev: any = {
                id: this.counterId,
                serial: this.serial,
                device_type: {
                    code: model,
                    name: CodeToName[model] ?? model,
                },
                hardware_type: {
                    code: hw,
                    name: hw,
                },
                firmware_version: [+fw],
                z3k_config: this.config,
                z3k_state: this.listenerState && this.listenerState.state,
                capabilities: [
                    Capability.has_z3k_settings,
                    Capability.has_voltage_sensor,
                    Capability.has_wifi,
                ],
                online: true,
                user_id: null,
                sim_in_device: null,
                filetransfers: [],
                // ethernet_state: {} as Partial<EthernetState>,
                // filetransfers: [] as Partial<FileTransfer>[],
            };
        }
    }

    private async initialConfigAndState() {
        this.config = (await this.getConfig()) as string;
        this.listenerState = new ListenerState(
            this.dispatch,
            this.counterId,
            this.responseHandler,
            this.transport,
            this.config
        );
        await this.goToReducer();
    }

    
    public async getFile(): Promise<Uint8Array | null> {

        if(this.smartFileTransferManager){
            const responseHandler: Uint8Array = await this.smartFileTransferManager.readFile(
                'config.txt'
            );
            return responseHandler;
        }
        
        return null;
    }

    private async getConfig(): Promise<string | null> {
        try {
            const contentResponse = this.smartFileTransferManager && await this.smartFileTransferManager.readFile(
                'config.txt'
            );
            const content = contentResponse;
            const decoder = new TextDecoder('windows-1251', {fatal: true});
            const contentText = decoder.decode(content);
            return contentText;
        } catch (error:any) {
            throw Error('error')
        }
        return null;
    }

    public async sendTextWithResponse(text: string): Promise<TextMessage> {
        return await this.responseHandler.sendWithResponse(
            new TextMessage(text),
            TextMessage
        );
    }

    private async askVersion(): Promise<TextMessage> {
        const response = await this.responseHandler.sendWithResponse(
            new TextMessage('#S7?'),
            TextMessage
        );
        return response;
    }

    public async writeFile(fileName: string, data: Uint8Array): Promise<void> {
        try {
            const response = this.smartFileTransferManager && await this.smartFileTransferManager.writeFile(
                fileName,
                data
            );
            return response;
        } catch (error) {
            throw Error('error')
        }
    }
   
}

const CodeToName: Record<string, string | undefined> = {
  SX250: "Mega SX-LRW",
  SX170: "Mega SX-170",
  SX300: "Mega SX-300",
  SX350: "Mega SX-350",
  H1000: "ZONT H-1000",
  H2000: "ZONT H-2000",
  T100: "ZONT H-1",
  T102: "ZONT H-2",
  L1000: "ZONT L-1000",
  L1000S: "ZONT L-1000 Sim",
  tracker: "Tracker",
  "ZTC-100": "ZTC-100",
  "ZTC-110": "ZTC-110",
  "ZTC-100M": "ZTC-100M",
  "ZTC-110M": "ZTC-110M",
  "ZTC-500": "ZTC-500",
  "ZTC-700": "ZTC-700",
  "ZTC-700M": "ZTC-700M",
  "ZTC-700S": "ZTC-700S",
  "ZTC-701M": "ZTC-701M",
  "ZTC-710": "ZTC-710",
  "ZTC-720": "ZTC-720",
  "ZTC-800": "ZTC-800",
  "ZTC-111": "ZTC-111",
  "ZTC-120": "ZTC-120",
  "ZTC-200": "ZTC-200",
  "ZTA-110": "ZTA-110",
  "GTW-100": "ZONT EXPERT",
  "GTW-102": "GTW-102",
  "GLT-100": "GLT-100",
  "G-100": "G-100",
  "E-100": "E-100",
  "G-100M": "G-100M",
  "E-100M": "E-100M",
  A200: "A200",
  A200E: "A200E",
  A100: "A100",
  A110: "A110",
  A100M: "A100M",
  A110M: "A110M",
  H2001: "ZONT H-2001",
  "H1000+": "ZONT H1000+",
  "H2000+": "ZONT H2000+",
  "CLIMATIC+": "ZONT CLIMATIC+",
  VALTEC_1: "ZONT VALTEC 1",
  VALTEC_K300: "VALTEC K300",
  "C2000+": "ZONT C2000+",
  A300: "ZONT A300",
  A400: "ZONT A400",
  "SMART+": "ZONT SMART 2.0",
  CLIMATIC: "ZONT CLIMATIC",
  NAVTEL: "Навтелеком",
  EGTS: "ЕГТС",
  GALILEO: "Галилео",
  ARNAVI: "Arnavi",
  WIALONBIN: "Wialon",
  TELTONIK: "Teltonika",
  SATSOL: "Satellite Solutions",
  NEOMATIK: "Неоматика",
  A000: "Автоскан GPS",
  "ZTC-900": "ZTC-900",
  SMART_1_0: "SMART 1.0",
  H1V_PLUS: "ZONT H1V+",
  CONNECT_PLUS: "ZONT Connect+",
  GRANIT: "Гранит",
};
