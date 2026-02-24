import { Terminal } from '@xterm/xterm';

const term = new Terminal();

let data = 'hey im terminal';

term.write(data);

term.open(document.getElementById('terminal'));
