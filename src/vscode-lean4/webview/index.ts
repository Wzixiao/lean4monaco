import type { EditorApi } from '@leanprover/infoview';
import { renderInfoview } from '@leanprover/infoview';
import { Rpc } from '../src/rpc';


const rpc = new Rpc((m: any) => { window.parent.postMessage(m) }); //
window.addEventListener('message', e => { rpc.messageReceived(e.data)})
const editorApi: EditorApi = rpc.getApi();

const div: HTMLElement | null = document.querySelector('#react_root');

const api = renderInfoview(editorApi, div);
rpc.register(api);
