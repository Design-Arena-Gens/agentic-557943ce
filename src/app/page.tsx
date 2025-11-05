'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  AlertTriangle,
  BatteryCharging,
  Bell,
  BellOff,
  Bluetooth,
  Flashlight,
  Mic,
  MicOff,
  Navigation2,
  PhoneCall,
  Plane,
  SunMedium,
  Volume2,
  VolumeX,
  Wifi,
} from 'lucide-react';
import styles from './page.module.css';

type CommandSource = 'voice' | 'text';

type PhoneState = {
  wifi: boolean;
  bluetooth: boolean;
  flashlight: boolean;
  silent: boolean;
  doNotDisturb: boolean;
  airplaneMode: boolean;
  location: boolean;
  batterySaver: boolean;
  brightness: number;
  volume: number;
};

type ActionLogEntry = {
  id: string;
  command: string;
  timestamp: string;
  result: string;
  success: boolean;
  source: CommandSource;
};

type CommandResult = {
  nextState: PhoneState;
  response: string;
  success: boolean;
};

const initialPhoneState: PhoneState = {
  wifi: true,
  bluetooth: false,
  flashlight: false,
  silent: false,
  doNotDisturb: false,
  airplaneMode: false,
  location: true,
  batterySaver: false,
  brightness: 72,
  volume: 46,
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

const exampleCommands = [
  'Turn on Bluetooth',
  'Set brightness to 40 percent',
  'Enable airplane mode',
  'Call Alex',
  'Send a message to Taylor saying I’m on my way',
  'Mute the phone',
  'Turn off location services',
  'Increase the volume',
];

type ToggleKey = Exclude<keyof PhoneState, 'brightness' | 'volume'>;

const inferCommandResult = (prevState: PhoneState, rawCommand: string): CommandResult => {
  const command = rawCommand.trim().toLowerCase();
  if (!command) {
    return {
      nextState: prevState,
      response: 'I did not catch that command.',
      success: false,
    };
  }

  const nextState: PhoneState = { ...prevState };
  let response = '';
  let success = true;
  let matched = false;

  const ensureToggle = (key: ToggleKey, desired: boolean, label: string) => {
    matched = true;
    if (prevState[key] === desired) {
      success = false;
      response = `${label} is already ${desired ? 'on' : 'off'}.`;
      return;
    }
    nextState[key] = desired;
    response = desired ? `${label} is now on.` : `${label} is now off.`;

    if (key === 'airplaneMode') {
      if (desired) {
        nextState.wifi = false;
        nextState.bluetooth = false;
        response = 'Turning on airplane mode and disabling Wi‑Fi and Bluetooth.';
      } else {
        response = 'Airplane mode is off. Wi‑Fi and Bluetooth remain disabled.';
      }
    }

    if (key === 'silent' && desired) {
      nextState.volume = 0;
    }
  };

  const brightnessMatch = command.match(/brightness(?:\s+to)?\s+(\d{1,3})/);
  const volumeMatch = command.match(/volume(?:\s+to)?\s+(\d{1,3})/);
  const callMatch = command.match(/(?:call|dial)\s+([a-z\s]+)/);
  const messageMatch = command.match(
    /send\s+(?:a\s+)?message\s+to\s+([a-z\s]+?)(?:\s+saying\s+(.+))?$/i,
  );

  if (/(turn|switch)\s+on/.test(command) && /(wifi|wi-?fi)/.test(command)) {
    ensureToggle('wifi', true, 'Wi‑Fi');
  } else if (/(turn|switch)\s+off/.test(command) && /(wifi|wi-?fi)/.test(command)) {
    ensureToggle('wifi', false, 'Wi‑Fi');
  } else if (/(turn|switch)\s+on/.test(command) && /bluetooth/.test(command)) {
    ensureToggle('bluetooth', true, 'Bluetooth');
  } else if (/(turn|switch)\s+off/.test(command) && /bluetooth/.test(command)) {
    ensureToggle('bluetooth', false, 'Bluetooth');
  } else if (/(turn|switch)\s+on/.test(command) && /(flashlight|torch)/.test(command)) {
    ensureToggle('flashlight', true, 'Flashlight');
  } else if (/(turn|switch)\s+off/.test(command) && /(flashlight|torch)/.test(command)) {
    ensureToggle('flashlight', false, 'Flashlight');
  } else if (/(turn|switch)\s+on/.test(command) && /(location|gps|navigation)/.test(command)) {
    ensureToggle('location', true, 'Location');
  } else if (/(turn|switch)\s+off/.test(command) && /(location|gps|navigation)/.test(command)) {
    ensureToggle('location', false, 'Location');
  } else if (/(turn|switch)\s+on/.test(command) && /(battery\s+saver|low\s+power)/.test(command)) {
    ensureToggle('batterySaver', true, 'Battery saver');
  } else if (
    /(turn|switch)\s+off/.test(command) &&
    /(battery\s+saver|low\s+power)/.test(command)
  ) {
    ensureToggle('batterySaver', false, 'Battery saver');
  } else if (/(turn|switch)\s+on/.test(command) && /(airplane|flight)\s+mode/.test(command)) {
    ensureToggle('airplaneMode', true, 'Airplane mode');
  } else if (/(turn|switch)\s+off/.test(command) && /(airplane|flight)\s+mode/.test(command)) {
    ensureToggle('airplaneMode', false, 'Airplane mode');
  } else if (/(turn|switch)\s+on/.test(command) && /(silent|mute)/.test(command)) {
    ensureToggle('silent', true, 'Silent mode');
  } else if (/(turn|switch)\s+off/.test(command) && /(silent|mute)/.test(command)) {
    ensureToggle('silent', false, 'Silent mode');
    if (prevState.volume === 0) {
      nextState.volume = 35;
    }
  } else if (/(enable|activate)\s+do\s*not\s*disturb|dnd/.test(command)) {
    ensureToggle('doNotDisturb', true, 'Do not disturb');
  } else if (/(disable|deactivate)\s+do\s*not\s*disturb|dnd/.test(command)) {
    ensureToggle('doNotDisturb', false, 'Do not disturb');
  } else if (/(increase|raise)\s+(the\s+)?brightness/.test(command)) {
    matched = true;
    const next = clampPercent(prevState.brightness + 12);
    success = next !== prevState.brightness;
    nextState.brightness = next;
    response = `Brightness set to ${next}%`;
  } else if (/(decrease|lower)\s+(the\s+)?brightness/.test(command)) {
    matched = true;
    const next = clampPercent(prevState.brightness - 12);
    success = next !== prevState.brightness;
    nextState.brightness = next;
    response = `Brightness set to ${next}%`;
  } else if (brightnessMatch) {
    matched = true;
    const raw = Number(brightnessMatch[1]);
    const next = clampPercent(raw);
    nextState.brightness = next;
    success = true;
    response = `Brightness set to ${next}%`;
  } else if (/(increase|raise)\s+(the\s+)?volume/.test(command)) {
    matched = true;
    const next = clampPercent(prevState.volume + 12);
    success = next !== prevState.volume;
    nextState.volume = next;
    nextState.silent = next === 0 ? true : false;
    response = `Volume increased to ${next}%`;
  } else if (/(decrease|lower|reduce)\s+(the\s+)?volume/.test(command)) {
    matched = true;
    const next = clampPercent(prevState.volume - 12);
    success = next !== prevState.volume;
    nextState.volume = next;
    nextState.silent = next === 0;
    response = `Volume reduced to ${next}%`;
  } else if (/(mute|silence)\s+(phone|device|it)?/.test(command)) {
    matched = true;
    if (prevState.silent && prevState.volume === 0) {
      success = false;
      response = 'The phone is already muted.';
    } else {
      nextState.silent = true;
      nextState.volume = 0;
      response = 'Muting the phone.';
    }
  } else if (/(unmute|sound)\s+(phone|device|it)?/.test(command)) {
    matched = true;
    if (!prevState.silent && prevState.volume > 0) {
      success = false;
      response = 'The phone is already unmuted.';
    } else {
      nextState.silent = false;
      nextState.volume = prevState.volume === 0 ? 40 : prevState.volume;
      response = 'Restoring sound.';
    }
  } else if (volumeMatch) {
    matched = true;
    const raw = Number(volumeMatch[1]);
    const next = clampPercent(raw);
    nextState.volume = next;
    nextState.silent = next === 0;
    success = true;
    response = `Volume set to ${next}%`;
  } else if (callMatch) {
    matched = true;
    const name = callMatch[1]
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
      .trim();
    response = `Placing a call to ${name || 'your contact'}...`;
    success = true;
    nextState.silent = false;
    if (nextState.volume < 30) {
      nextState.volume = 50;
    }
  } else if (messageMatch) {
    matched = true;
    const [, targetRaw, bodyRaw] = messageMatch;
    const target = targetRaw
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
      .trim();
    const body = bodyRaw ? bodyRaw.trim() : undefined;
    response = body
      ? `Sending “${body}” to ${target || 'your contact'}.`
      : `What should I say to ${target || 'your contact'}?`;
    success = Boolean(body);
  } else if (/(open|launch)\s+(camera|maps|calendar|spotify|music)/.test(command)) {
    matched = true;
    const app = command.match(/(camera|maps|calendar|spotify|music)/)?.[1] ?? 'app';
    response = `Opening ${app}.`;
    success = true;
  } else if (/what(?:'s| is)\s+(?:the\s+)?battery/.test(command)) {
    matched = true;
    const estimate = prevState.batterySaver ? 'Battery saver is preserving power.' : 'Battery level is stable.';
    response = estimate;
    success = true;
  } else {
    matched = false;
  }

  if (!matched) {
    return {
      nextState: prevState,
      response: "I couldn't map that request to a phone control just yet.",
      success: false,
    };
  }

  return {
    nextState,
    response,
    success,
  };
};

export default function Home() {
  const [phoneState, setPhoneState] = useState<PhoneState>(initialPhoneState);
  const [assistantResponse, setAssistantResponse] = useState('Ready when you are.');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [manualCommand, setManualCommand] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);

  const recognitionRef = useRef<any | null>(null);
  const phoneStateRef = useRef(initialPhoneState);

  useEffect(() => {
    phoneStateRef.current = phoneState;
  }, [phoneState]);

  const handleCommand = useCallback(
    (rawCommand: string, source: CommandSource = 'voice') => {
      const command = rawCommand.trim();
      if (!command) {
        return;
      }

      const result = inferCommandResult(phoneStateRef.current, command);
      setPhoneState(result.nextState);
      setAssistantResponse(result.response);
      setLastCommand(command);

      setActionLog((prev) => {
        const entry: ActionLogEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          command,
          timestamp: new Date().toISOString(),
          result: result.response,
          success: result.success,
          source,
        };
        return [entry, ...prev].slice(0, 14);
      });
    },
    [],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i][0];
        if (event.results[i].isFinal) {
          handleCommand(result.transcript);
          setPartialTranscript('');
        } else {
          interim += result.transcript;
        }
      }
      setPartialTranscript(interim);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setSpeechSupported(true);

    return () => {
      recognition.stop();
    };
  }, [handleCommand]);

  const toggleListening = () => {
    if (!speechSupported) return;
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    try {
      recognition.start();
      setAssistantResponse('Listening...');
      setIsListening(true);
    } catch (error) {
      setSpeechSupported(false);
    }
  };

  const handleManualSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!manualCommand.trim()) return;
    handleCommand(manualCommand, 'text');
    setManualCommand('');
  };

  const statusBlocks = useMemo(
    () => [
      {
        label: 'Wi‑Fi',
        value: phoneState.wifi ? 'Connected' : 'Offline',
        icon: <Wifi size={18} />,
        meta: phoneState.wifi ? 'Network secured' : 'Tap to enable',
      },
      {
        label: 'Bluetooth',
        value: phoneState.bluetooth ? 'On' : 'Off',
        icon: <Bluetooth size={18} />,
        meta: phoneState.bluetooth ? 'Discoverable' : 'Connected devices paused',
      },
      {
        label: 'Location',
        value: phoneState.location ? 'Active' : 'Disabled',
        icon: <Navigation2 size={18} />,
        meta: phoneState.location ? 'Precise tracking' : 'Apps limited',
      },
      {
        label: 'Flashlight',
        value: phoneState.flashlight ? 'On' : 'Off',
        icon: <Flashlight size={18} />,
        meta: phoneState.flashlight ? 'Torch engaged' : 'Tap to toggle',
      },
      {
        label: 'Airplane Mode',
        value: phoneState.airplaneMode ? 'Enabled' : 'Disabled',
        icon: <Plane size={18} />,
        meta: phoneState.airplaneMode ? 'Radio signals paused' : 'All radios active',
      },
      {
        label: 'Battery Saver',
        value: phoneState.batterySaver ? 'On' : 'Off',
        icon: <BatteryCharging size={18} />,
        meta: phoneState.batterySaver ? 'Performance limited' : 'Full performance',
      },
      {
        label: phoneState.silent ? 'Silent' : 'Sound',
        value: phoneState.silent ? 'Muted' : `${phoneState.volume}%`,
        icon: phoneState.silent || phoneState.volume === 0 ? (
          <VolumeX size={18} />
        ) : (
          <Volume2 size={18} />
        ),
        meta: phoneState.silent ? 'Calls silenced' : 'Ringer audible',
      },
      {
        label: phoneState.doNotDisturb ? 'Focus' : 'Alerts',
        value: phoneState.doNotDisturb ? 'Do Not Disturb' : 'Standard',
        icon: phoneState.doNotDisturb ? <BellOff size={18} /> : <Bell size={18} />,
        meta: phoneState.doNotDisturb ? 'Priority only' : 'All notifications',
      },
    ],
    [phoneState],
  );

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.panel}>
          <div className={styles.panelContent}>
            <div>
              <h1 className={styles.heroTitle}>Astra Voice</h1>
              <p className={styles.subtitle}>
                Speak naturally and let Astra translate your voice into precise phone controls.
                Manage radios, focus modes, calls, and more without lifting a finger.
              </p>
            </div>

            <div className={styles.voiceControl}>
              <button
                type="button"
                className={clsx(styles.listenButton, isListening && styles.listenButtonActive)}
                onClick={toggleListening}
                disabled={!speechSupported}
              >
                <span className={styles.listenPulse} />
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                {isListening ? 'Tap to stop listening' : 'Tap to start listening'}
              </button>
              {!speechSupported && (
                <div className={styles.warningCard}>
                  <AlertTriangle size={16} /> Your browser does not support the Web Speech API. Use
                  the command field below instead.
                </div>
              )}

              <div className={styles.transcriptBox}>
                <span className={styles.transcriptLabel}>
                  {isListening ? 'Live transcript' : 'Last command'}
                </span>
                <span
                  className={clsx(
                    styles.transcriptText,
                    !lastCommand && !partialTranscript && styles.transcriptGhost,
                  )}
                >
                  {partialTranscript || lastCommand || 'Waiting for your command...'}
                </span>
              </div>

              <div className={styles.assistantResponse}>{assistantResponse}</div>

              <form className={styles.manualForm} onSubmit={handleManualSubmit}>
                <input
                  className={styles.manualInput}
                  placeholder="Type a command, e.g. “Turn on Bluetooth”"
                  value={manualCommand}
                  onChange={(event) => setManualCommand(event.target.value)}
                />
                <button className={styles.manualSubmit} type="submit">
                  Run
                </button>
              </form>

              <div>
                <p className={styles.gridTitle}>Need inspiration?</p>
                <div className={styles.examples}>
                  {exampleCommands.map((example) => (
                    <span className={styles.exampleChip} key={example}>
                      {example}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelContent}>
            <div>
              <p className={styles.gridTitle}>Device status</p>
            </div>
            <div className={styles.statusGrid}>
              {statusBlocks.map(({ label, value, icon, meta }) => (
                <div className={styles.statusCard} key={label}>
                  <div className={styles.statusHeader}>
                    {icon}
                    <span>{label}</span>
                  </div>
                  <span className={styles.statusValue}>{value}</span>
                  <span className={styles.statusMeta}>{meta}</span>
                </div>
              ))}
            </div>

            <div className={styles.statusCard}>
              <div className={styles.statusHeader}>
                <SunMedium size={18} />
                <span>Brightness</span>
              </div>
              <span className={styles.statusValue}>{phoneState.brightness}%</span>
              <input
                className={styles.slider}
                type="range"
                min={0}
                max={100}
                value={phoneState.brightness}
                onChange={(event) =>
                  setPhoneState((prev) => ({
                    ...prev,
                    brightness: Number(event.target.value),
                  }))
                }
              />
            </div>

            <div className={styles.statusCard}>
              <div className={styles.statusHeader}>
                {phoneState.silent || phoneState.volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                <span>Volume</span>
              </div>
              <span className={styles.statusValue}>{phoneState.volume}%</span>
              <input
                className={styles.slider}
                type="range"
                min={0}
                max={100}
                value={phoneState.volume}
                onChange={(event) =>
                  setPhoneState((prev) => ({
                    ...prev,
                    volume: Number(event.target.value),
                    silent: Number(event.target.value) === 0,
                  }))
                }
              />
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelContent}>
            <div>
              <p className={styles.gridTitle}>Activity feed</p>
            </div>
            <div className={styles.logList}>
              {actionLog.length === 0 && (
                <div className={styles.logItem}>
                  <span className={styles.logResult}>
                    Commands you run will appear here with outcomes and timestamps.
                  </span>
                </div>
              )}
              {actionLog.map((entry) => (
                <div className={styles.logItem} key={entry.id}>
                  <div className={styles.logCommand}>
                    <PhoneCall size={16} />
                    {entry.command}
                  </div>
                  <div className={styles.logResult}>{entry.result}</div>
                  <span
                    className={clsx(
                      styles.pill,
                      entry.success ? styles.pillPositive : styles.pillNegative,
                    )}
                  >
                    {entry.success ? 'Completed' : 'Attention'}
                    <span>•</span>
                    {formatTime(entry.timestamp)}
                    <span>•</span>
                    {entry.source === 'voice' ? 'Voice' : 'Text'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
