const { shell } = require('electron');
const fs = require('fs');
const midi = require('midi');
const Midi = require('jsmidgen');
const path = require('path');

Midi.Event.SUSTAIN = 0xB0;

const BPM = 100;

const btnExportMidi30s = document.getElementById('btn-export-midi-30s');
const btnExportMidi60s = document.getElementById('btn-export-midi-60s');
const btnExportMidi120s = document.getElementById('btn-export-midi-120s');
const btnExportMidi300s = document.getElementById('btn-export-midi-300s');
const btnExportMidi = document.getElementById('btn-export-midi');
const btnClearMidi = document.getElementById('btn-clear-midi');
const spnNotesInCache = document.getElementById('notes-in-cache');

let notes = [];

const input = new midi.input();

function updateNoteCount() {
    spnNotesInCache.innerHTML = Math.round(notes.length / 2).toString();
}

function notesSinceSecondsAgo(seconds = null) {
    if (seconds === null) {
        return notes;
    }

    const hrTime = process.hrtime()
    const now = hrTime[0] * 1000000 + hrTime[1] / 1000;    
    const micro = seconds * 1000000;
    const time = now - micro;

    return notes.filter(note => note[3] > time);
}

function exportMidi(notes = []) {
    if (notes.length === 0) {
        console.log('no data to export');
        return;
    }

    console.log('exporting midi...');
 
    var file = new Midi.File();
    var track = new Midi.Track();
    file.addTrack(track);
    track.setTempo(100);

    const firstStart = notes[0][3];
    let previousNoteStart = notes[0][3];

    for (let note of notes) {
        const [ cmd, pitch, velocity, start ] = note;
        let event;

        const tick = (start - previousNoteStart) / 4600;

        if (cmd === Midi.Event.NOTE_ON) {
            track.noteOn(0, pitch, tick, velocity);
        } else if (cmd === Midi.Event.NOTE_OFF) {
            track.noteOff(0, pitch, tick, velocity);
        } else if (cmd === Midi.Event.SUSTAIN) {
            const event = new Midi.Event({
                type: Midi.Event.SUSTAIN,
                time: tick,
                channel: 0,
                param1: pitch,
                param2: velocity
            });
            track.addEvent(event);
        }

        previousNoteStart = start;
    }

    const { app } = require('electron').remote;

    // check if a previous midi file of the same name exists
    const filepath = app.getPath('downloads');
    const ext = 'mid';
    let filename = newFilename = 'midi-solved';
    let i = 0;

    while (fs.existsSync(`${filepath}${path.sep}${newFilename}.${ext}`)) {
        newFilename = `${filename} (${++i})`;
    }

    const data = file.toBytes();
    console.log('writing midi file');
    const finalPath = `${filepath}${path.sep}${newFilename}.${ext}`;
    require('fs').writeFileSync(finalPath, data, 'binary');
    console.log('finished writing to ' + finalPath);

    // finally show the file
    shell.showItemInFolder(finalPath);
}

// TODO build in device selection
input.getPortName(0);

input.on('message', function(deltaTime, message) {
    const hrTime = process.hrtime()
    const micro = hrTime[0] * 1000000 + hrTime[1] / 1000;

    // TODO save all midi, CC etc..
    // only save
    // note on
    // note off
    // sustain
    const cmd = message[0];
    if (cmd === Midi.Event.NOTE_ON || cmd === Midi.Event.NOTE_OFF || cmd === Midi.Event.SUSTAIN)
        notes.push([...message, micro]);

    updateNoteCount();

    console.log('m:' + message + ' us: ' + micro, ' delta: ' + deltaTime);
});

btnExportMidi30s.addEventListener('click', () => {
    exportMidi(notesSinceSecondsAgo(30));
});

btnExportMidi60s.addEventListener('click', () => {
    exportMidi(notesSinceSecondsAgo(60));
});

btnExportMidi120s.addEventListener('click', () => {
    exportMidi(notesSinceSecondsAgo(120));
});

btnExportMidi300s.addEventListener('click', () => {
    exportMidi(notesSinceSecondsAgo(300));
});

btnExportMidi.addEventListener('click', () => {
    exportMidi(notesSinceSecondsAgo());
});

btnClearMidi.addEventListener('click', () => {
    notes = [];
    updateNoteCount();
});

updateNoteCount();
input.openPort(0);