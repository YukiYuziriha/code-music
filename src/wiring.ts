import { Terminal } from '@xterm/xterm';

const ESC = '\x1b';
const enterAlt = `${ESC}[?1049h`;
const leaveAlt = `${ESC}[?1049l`;
const clearAndHome = `${ESC}[2J${ESC}[H`;

const term = new Terminal({
  cols: 120,
  rows: 32,
  cursorBlink: true,
});

const container = document.getElementById('terminal');
if (!container) {
  throw new Error('where is terminal container bro?');
}

term.open(container);

term.write(enterAlt);
term.write(clearAndHome);

term.writeln('wavetable booted');
term.writeln('press q to exit app screen');

term.onData((input: string) => {
  if (input === 'q') {
    term.write(leaveAlt);
  }
});

window.addEventListener('beforeunload', () => {
  term.write(leaveAlt);
});
