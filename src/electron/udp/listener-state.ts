import { Action, Store } from "redux";
import { Z3KConfig } from "../../react/z3kConfig/z3kConfig";
import { parseState } from "../parser/parser-state";
import { MessageTransport } from "./message-transport";
import { Message, TextMessage } from "./oldmessages";
import { ResponseHandler } from "./response-handler";

export class ListenerState {
    state: any;
    constructor(
        readonly dispatch: (action:Action)=> Action,
        readonly counterId: number,
        readonly responseHandler: ResponseHandler,
        readonly messageTransport: MessageTransport,
        readonly config: Z3KConfig
    ) {
        this.state = {};
        this.messageTransport.onMessageReceived(this.onMessage);
        this.getState();
    }

    getState = (): void => {
        this.responseHandler.send(new TextMessage('GETALLSTATES?'));
    };

    onMessage = (msg: Message) => {
        if (msg instanceof TextMessage && msg.message.startsWith('#Y')) {
            console.log('STATE MESSAGE', msg.message);
            const oneState = parseState(this.config, msg.message);
            const match = /^#Y([0-9]*)/.exec(msg.message);
            // console.log('FOR STATE', match, oneState);
            if (match) {
                const [_, stateId] = match;
                this.state = {
                    ...this.state,
                    [stateId]: oneState,
                };
                //this.dispatch()
                // console.log('STORE', this.store.getState());
            }
        }
    };
}
