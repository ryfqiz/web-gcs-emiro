import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import './Terminal.css';

const Terminal = ({ terminalId, isActive }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  
  // SSH STATE
  const wsRef = useRef(null);
  const [connectionMode, setConnectionMode] = useState('local');
  const [isSSHConnected, setIsSSHConnected] = useState(false);
  
  const stateRef = useRef({
    currentLine: '',
    cursorPosition: 0,
    commandHistory: [],
    historyIndex: -1,
    currentDrive:  'C',
    currentDirectory: '\\Users\\user',
    isAwaitingPassword: false,
    passwordCallback: null,
    environmentVars: {
      USERNAME: 'user',
      COMPUTERNAME: 'WEB-GCS',
      OS: 'Web-GCS Emiro',
      PATH: 'C:\\Windows\\System32',
      PROMPT: '$P$G'
    },
    fileSystem: {
      'C':   {
        'Users': {
          'user': {
            'Documents': {},
            'Downloads': {},
            'Desktop': {},
            'Pictures': {},
            'readme.txt': 'Welcome to Web-GCS Emiro Terminal!\nType "help" for available commands.',
            'config.json': '{\n  "version": "1.0.0",\n  "name": "web-gcs-emiro"\n}'
          },
          'Public': {}
        },
        'Windows': {
          'System32': {}
        },
        'Program Files': {
          'Web-GCS':   {
            'bin': {},
            'config':   {}
          }
        }
      },
      'D':  {
        'Data': {
          'Projects': {},
          'Backups': {}
        },
        'Media': {
          'Videos': {},
          'Music': {}
        }
      },
      'E': {
        'External': {}
      }
    }
  });

  useEffect(() => {
    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#0a192f',
        foreground: '#8892b0',
        cursor: '#64ffda',
        black: '#0a192f',
        red: '#ff5370',
        green: '#64ffda',
        yellow: '#ffcb6b',
        blue:   '#82aaff',
        magenta: '#c792ea',
        cyan: '#89ddff',
        white: '#d6deeb',
        brightBlack: '#575656',
        brightRed: '#ff5370',
        brightGreen: '#64ffda',
        brightYellow: '#ffcb6b',
        brightBlue: '#82aaff',
        brightMagenta: '#c792ea',
        brightCyan: '#89ddff',
        brightWhite: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(new WebLinksAddon());

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xterm.onRender(() => {
      const viewport = terminalRef.current?. querySelector('.xterm-viewport');
      if (viewport) {
        viewport.style.height = '100%';
      }
    });

    let isUserScrolling = false;
    xterm.onScroll((newPosition) => {
      const scrollArea = terminalRef.current?.querySelector('.xterm-viewport');
      if (scrollArea) {
        const isAtBottom = scrollArea.scrollHeight - scrollArea.scrollTop === scrollArea.clientHeight;
        isUserScrolling = ! isAtBottom;
      }
    });

    xterm.onLineFeed(() => {
      if (! isUserScrolling) {
        const scrollArea = terminalRef.current?.querySelector('.xterm-viewport');
        if (scrollArea) {
          scrollArea.scrollTop = scrollArea.scrollHeight;
        }
      }
    });

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    printWelcome(xterm);
    writePrompt(xterm);

    xterm.onData((data) => {
      if (connectionMode === 'ssh' && isSSHConnected) {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'ssh-data',
            data: data
          }));
        }
      } else {
        handleInput(data, xterm);
      }
    });

    xterm.onResize(({ cols, rows }) => {
      if (connectionMode === 'ssh' && isSSHConnected && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'ssh-resize',
          cols:  cols,
          rows: rows
        }));
      }
    });

    const handleResize = () => {
      if (fitAddonRef.current) fitAddonRef.current.fit();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      disconnectSSH();
      xterm.dispose();
    };
  }, [terminalId, connectionMode, isSSHConnected]);

  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current.fit(), 100);
    }
  }, [isActive]);

  const printWelcome = (xterm) => {
    xterm.writeln('\x1b[1;32mTerminal Ready\x1b[0m - Type \x1b[1;33mhelp\x1b[0m for available commands');
    xterm.writeln('');
  };

  const writePrompt = (xterm) => {
    xterm.write('\x1b[1;32m$\x1b[0m ');
  };

  const connectSSH = async (host, username, password, port = 22) => {
    const xterm = xtermRef.current;
    
    xterm.writeln('');
    xterm.writeln(`\x1b[1;36mConnecting to ${username}@${host}:${port}...\x1b[0m`);

    try {
      const ws = new WebSocket('ws://localhost:3001');
      wsRef.current = ws;

      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          xterm.writeln('\x1b[0;31m✗ Connection timeout\x1b[0m');
          xterm.writeln('');
          setConnectionMode('local');
          setIsSSHConnected(false);
          writePrompt(xterm);
        }
      }, 30000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        ws.send(JSON.stringify({
          type: 'ssh-connect',
          host: host,
          port: port,
          username: username,
          password: password,
          cols: xterm.cols,
          rows: xterm.rows
        }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'ssh-connecting':
            xterm.writeln(`\x1b[1;33m${message.message}\x1b[0m`);
            break;
            
          case 'ssh-connected':
            xterm.writeln(`\x1b[1;32m✓ Connected\x1b[0m`);
            xterm.writeln('');
            setConnectionMode('ssh');
            setIsSSHConnected(true);
            break;
            
          case 'ssh-output':
            xterm.write(message.data);
            break;
            
          case 'ssh-disconnected':
            xterm.writeln('');
            xterm.writeln(`\x1b[1;33m⚠ ${message.message}\x1b[0m`);
            xterm.writeln('');
            setConnectionMode('local');
            setIsSSHConnected(false);
            writePrompt(xterm);
            break;
            
          case 'error':
            xterm.writeln(`\x1b[0;31m✗ ${message.message}\x1b[0m`);
            xterm.writeln('');
            setConnectionMode('local');
            setIsSSHConnected(false);
            writePrompt(xterm);
            break;
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        xterm.writeln('\x1b[0;31m✗ WebSocket error\x1b[0m');
        xterm.writeln('');
        setConnectionMode('local');
        setIsSSHConnected(false);
        writePrompt(xterm);
      };

      ws.onclose = () => {
        clearTimeout(connectionTimeout);
        if (isSSHConnected) {
          xterm.writeln('');
          xterm.writeln('\x1b[1;33m⚠ Connection closed\x1b[0m');
          xterm.writeln('');
        }
        setConnectionMode('local');
        setIsSSHConnected(false);
        writePrompt(xterm);
      };

    } catch (error) {
      xterm.writeln(`\x1b[0;31m✗ ${error.message}\x1b[0m`);
      xterm.writeln('');
      writePrompt(xterm);
    }
  };

  const disconnectSSH = () => {
    if (wsRef.current) {
      wsRef.current. send(JSON.stringify({ type: 'ssh-disconnect' }));
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionMode('local');
    setIsSSHConnected(false);
  };

  const handleInput = (data, xterm) => {
    const code = data.charCodeAt(0);
    const state = stateRef.current;

    if (state.isAwaitingPassword && state.passwordCallback) {
      if (code === 13) {
        xterm.writeln('');
        const callback = state.passwordCallback;
        state.isAwaitingPassword = false;
        state.passwordCallback = null;
        callback();
        return;
      } else if (code === 127) {
        state.passwordCallback. password = state.passwordCallback.password?. slice(0, -1) || '';
        xterm.write('\b \b');
        return;
      } else if (code === 3) {
        xterm.writeln('^C');
        xterm.writeln('');
        state.isAwaitingPassword = false;
        state.passwordCallback = null;
        writePrompt(xterm);
        return;
      } else if (code >= 32 && code <= 126) {
        if (! state.passwordCallback. password) state.passwordCallback.password = '';
        state.passwordCallback.password += data;
        xterm.write('*');
        return;
      }
      return;
    }

    if (code === 13) {
      xterm.writeln('');
      const command = state.currentLine.trim();
      
      if (command) {
        state.commandHistory.push(command);
        state.historyIndex = state.commandHistory.length;
        executeCommand(command, xterm);
      } else {
        writePrompt(xterm);
      }
      
      state.currentLine = '';
      state.cursorPosition = 0;
      return;
    }

    if (code === 127) {
      if (state.cursorPosition > 0) {
        state.currentLine = 
          state.currentLine.slice(0, state.cursorPosition - 1) + 
          state.currentLine.slice(state.cursorPosition);
        state.cursorPosition--;
        xterm.write('\b \b');
      }
      return;
    }

    if (code === 3) {
      xterm.writeln('^C');
      state.currentLine = '';
      state.cursorPosition = 0;
      writePrompt(xterm);
      return;
    }

    if (code === 12) {
      xterm.clear();
      state.currentLine = '';
      state.cursorPosition = 0;
      writePrompt(xterm);
      return;
    }

    if (code === 9) {
      const commands = [
        'help', 'clear', 'cls', 'dir', 'ls', 'cd', 'chdir', 'pwd', 'cat', 'type',
        'echo', 'mkdir', 'md', 'touch', 'rm', 'del', 'rmdir', 'rd', 'copy', 'cp',
        'move', 'mv', 'ren', 'rename', 'date', 'time', 'whoami', 'hostname',
        'ipconfig', 'ifconfig', 'ping', 'netstat', 'tasklist', 'ps', 'kill',
        'set', 'export', 'env', 'ver', 'uname', 'status', 'neofetch', 'tree',
        'find', 'grep', 'history', 'exit', 'vol', 'label', 'diskpart', 'ssh'
      ];
      
      const matches = commands.filter(cmd => cmd.startsWith(state.currentLine. toLowerCase()));
      
      if (matches.length === 1) {
        const completion = matches[0];
        xterm.write(completion. slice(state.currentLine.length));
        state.currentLine = completion;
        state.cursorPosition = completion.length;
      } else if (matches.length > 1) {
        xterm.writeln('');
        xterm.writeln(matches.join('  '));
        writePrompt(xterm);
        xterm.write(state.currentLine);
      }
      return;
    }

    if (data === '\x1b[A') {
      if (state.historyIndex > 0) {
        state.historyIndex--;
        const cmd = state.commandHistory[state. historyIndex];
        xterm.write('\r\x1b[K');
        writePrompt(xterm);
        xterm.write(cmd);
        state.currentLine = cmd;
        state. cursorPosition = cmd.length;
      }
      return;
    }

    if (data === '\x1b[B') {
      if (state.historyIndex < state.commandHistory.length - 1) {
        state.historyIndex++;
        const cmd = state.commandHistory[state.historyIndex];
        xterm.write('\r\x1b[K');
        writePrompt(xterm);
        xterm.write(cmd);
        state.currentLine = cmd;
        state.cursorPosition = cmd.length;
      } else if (state.historyIndex === state.commandHistory.length - 1) {
        state.historyIndex = state.commandHistory.length;
        xterm.write('\r\x1b[K');
        writePrompt(xterm);
        state.currentLine = '';
        state.cursorPosition = 0;
      }
      return;
    }

    if (code >= 32 && code <= 126) {
      state.currentLine = 
        state.currentLine.slice(0, state.cursorPosition) + 
        data + 
        state.currentLine.slice(state.cursorPosition);
      state.cursorPosition++;
      xterm.write(data);
    }
  };

  const executeCommand = (command, xterm) => {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0]. toLowerCase();
    const args = parts.slice(1);
    const state = stateRef.current;

    // SSH COMMAND - FIXED VERSION
    if (cmd === 'ssh') {
      if (args.length < 1) {
        xterm.writeln('\x1b[0;31mUsage: ssh user@host [port]\x1b[0m');
        writePrompt(xterm);
        return;
      }

      const sshString = args[0];
      const [username, host] = sshString.split('@');
      const port = args[1] ? parseInt(args[1]) : 22;

      if (! username || !host) {
        xterm.writeln('\x1b[0;31m✗ Invalid format.  Use: ssh user@host\x1b[0m');
        writePrompt(xterm);
        return;
      }

      xterm.write(`\x1b[1;33m${username}@${host}'s password:  \x1b[0m`);
      
      // Use closure with proper initialization
      let capturedPassword = '';
      let initialized = false;
      
      const passwordInputHandler = (data) => {
        // Process first character properly
        if (! initialized) {
          initialized = true;
          const code = data.charCodeAt(0);
          
          // Handle first character
          if (code === 13) {
            xterm. writeln('');
            xtermRef.current.onData(() => {});
            connectSSH(host, username, capturedPassword, port);
            setTimeout(() => {
              xtermRef.current.onData((data) => {
                if (connectionMode === 'ssh' && isSSHConnected) {
                  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current. send(JSON.stringify({
                      type: 'ssh-data',
                      data: data
                    }));
                  }
                } else {
                  handleInput(data, xterm);
                }
              });
            }, 200);
            return;
          } else if (code === 3) {
            xterm.writeln('^C');
            xterm.writeln('');
            xtermRef.current.onData((data) => {
              if (connectionMode === 'ssh' && isSSHConnected) {
                if (wsRef.current && wsRef.current. readyState === WebSocket. OPEN) {
                  wsRef.current.send(JSON.stringify({
                    type: 'ssh-data',
                    data: data
                  }));
                }
              } else {
                handleInput(data, xterm);
              }
            });
            writePrompt(xterm);
            return;
          } else if (code >= 32 && code <= 126) {
            capturedPassword += data;
            xterm.write('*');
          }
          return;
        }
        
        // Process subsequent characters
        const code = data.charCodeAt(0);
        
        if (code === 13) {
          xterm.writeln('');
          xtermRef.current.onData(() => {});
          
          console.log('Password captured:', capturedPassword. length, 'chars');
          
          connectSSH(host, username, capturedPassword, port);
          
          setTimeout(() => {
            xtermRef.current.onData((data) => {
              if (connectionMode === 'ssh' && isSSHConnected) {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({
                    type: 'ssh-data',
                    data: data
                  }));
                }
              } else {
                handleInput(data, xterm);
              }
            });
          }, 200);
          
        } else if (code === 127) {
          if (capturedPassword.length > 0) {
            capturedPassword = capturedPassword.slice(0, -1);
            xterm.write('\b \b');
          }
        } else if (code === 3) {
          xterm.writeln('^C');
          xterm.writeln('');
          xtermRef.current.onData((data) => {
            if (connectionMode === 'ssh' && isSSHConnected) {
              if (wsRef. current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  type: 'ssh-data',
                  data: data
                }));
              }
            } else {
              handleInput(data, xterm);
            }
          });
          writePrompt(xterm);
        } else if (code >= 32 && code <= 126) {
          capturedPassword += data;
          xterm.write('*');
        }
      };
      
      // Set handler immediately (no delay)
      xtermRef.current.onData(passwordInputHandler);
      return;
    }

    if (/^[a-z]: $/i.test(cmd)) {
      commandChangeDrive(cmd. toUpperCase().charAt(0), xterm);
      return;
    }

    switch (cmd) {
      case 'help':
      case '?':
        commandHelp(xterm);
        break;
      case 'clear':
      case 'cls':
        xterm.clear();
        writePrompt(xterm);
        return;
      case 'dir': 
      case 'ls':
        commandDir(args, xterm);
        break;
      case 'cd': 
      case 'chdir':
        commandCd(args, xterm);
        break;
      case 'cd..':
        commandCd(['..'], xterm);
        break;
      case 'cd\\':
        commandCd(['\\'], xterm);
        break;
      case 'cd/':
        commandCd(['/'], xterm);
        break;
      case 'pwd': 
        commandPwd(xterm);
        break;
      case 'cat':
      case 'type':
        commandCat(args, xterm);
        break;
      case 'echo':
        commandEcho(args, xterm);
        break;
      case 'mkdir': 
      case 'md': 
        commandMkdir(args, xterm);
        break;
      case 'touch':
        commandTouch(args, xterm);
        break;
      case 'rm':
      case 'del':
      case 'delete':
        commandRm(args, xterm);
        break;
      case 'rmdir':
      case 'rd':
        commandRmdir(args, xterm);
        break;
      case 'copy':
      case 'cp':
        commandCopy(args, xterm);
        break;
      case 'move':
      case 'mv': 
        commandMove(args, xterm);
        break;
      case 'ren':
      case 'rename':
        commandRename(args, xterm);
        break;
      case 'date':
        commandDate(xterm);
        break;
      case 'time':
        commandTime(xterm);
        break;
      case 'whoami':
        commandWhoami(xterm);
        break;
      case 'hostname': 
        commandHostname(xterm);
        break;
      case 'ipconfig':
      case 'ifconfig':
        commandIpconfig(xterm);
        break;
      case 'ping':
        commandPing(args, xterm);
        break;
      case 'netstat': 
        commandNetstat(xterm);
        break;
      case 'tasklist':
      case 'ps':
        commandPs(xterm);
        break;
      case 'kill':
      case 'taskkill':
        commandKill(args, xterm);
        break;
      case 'set':
      case 'export': 
        commandSet(args, xterm);
        break;
      case 'env':
        commandEnv(xterm);
        break;
      case 'ver':
      case 'uname':
        commandVer(xterm);
        break;
      case 'status': 
        commandStatus(xterm);
        break;
      case 'neofetch':
        commandNeofetch(xterm);
        break;
      case 'tree':
        commandTree(xterm);
        break;
      case 'find':
      case 'grep':
        commandFind(args, xterm);
        break;
      case 'history':
        commandHistory(xterm);
        break;
      case 'vol':
        commandVol(xterm);
        break;
      case 'label':
        commandLabel(args, xterm);
        break;
      case 'diskpart': 
        commandDiskpart(xterm);
        break;
      case 'exit':
      case 'quit':
        if (connectionMode === 'ssh' && isSSHConnected) {
          disconnectSSH();
          xterm.writeln('\x1b[1;33m⚠ SSH disconnected\x1b[0m');
          xterm.writeln('');
        } else {
          xterm.writeln('\x1b[0;33mUse CLOSE PANEL to exit\x1b[0m');
        }
        break;
      default:
        xterm.writeln(`\x1b[0;31m'${cmd}' is not recognized\x1b[0m`);
    }
    
    writePrompt(xterm);
  };

  const commandHelp = (xterm) => {
    xterm.writeln('\x1b[1;36mSSH:\x1b[0m');
    xterm.writeln('  ssh user@host [port]  Connect via SSH');
    xterm.writeln('');
    xterm.writeln('\x1b[1;36mNavigation:\x1b[0m');
    xterm.writeln('  ls, dir    List files');
    xterm.writeln('  cd <path>  Change directory');
    xterm.writeln('  pwd        Current directory');
    xterm.writeln('');
    xterm.writeln('\x1b[1;36mFile Operations:\x1b[0m');
    xterm.writeln('  cat <file> Display file');
    xterm.writeln('  mkdir <name> Create directory');
    xterm.writeln('  touch <name> Create file');
    xterm.writeln('  rm <name> Delete file');
    xterm.writeln('');
    xterm.writeln('Type command name for more info');
  };

  const getCurrentDirectory = () => {
    const state = stateRef.current;
    return getDirectoryAt(state.currentDirectory);
  };

  const getDirectoryAt = (path) => {
    const state = stateRef.current;
    const parts = path.replace(/\//g, '\\').split('\\').filter(p => p);
    let current = state.fileSystem[state.currentDrive];
    for (const part of parts) {
      if (! current[part]) return null;
      current = current[part];
    }
    return current;
  };

  const getFileAt = (path) => {
    return getDirectoryAt(path);
  };

  const commandChangeDrive = (drive, xterm) => { xterm.writeln(`Switched to ${drive}:`); };
  const commandDir = (args, xterm) => { xterm.writeln('Documents/  Downloads/  readme.txt'); };
  const commandCd = (args, xterm) => { xterm.writeln('Changed directory'); };
  const commandPwd = (xterm) => { xterm.writeln('C:\\Users\\user'); };
  const commandCat = (args, xterm) => { xterm.writeln('File content here'); };
  const commandEcho = (args, xterm) => { xterm.writeln(args. join(' ')); };
  const commandMkdir = (args, xterm) => { xterm.writeln('Directory created'); };
  const commandTouch = (args, xterm) => { xterm.writeln('File created'); };
  const commandRm = (args, xterm) => { xterm.writeln('Deleted'); };
  const commandRmdir = (args, xterm) => { xterm.writeln('Directory removed'); };
  const commandCopy = (args, xterm) => { xterm.writeln('Copied'); };
  const commandMove = (args, xterm) => { xterm.writeln('Moved'); };
  const commandRename = (args, xterm) => { xterm.writeln('Renamed'); };
  const commandDate = (xterm) => { xterm.writeln(new Date().toLocaleDateString()); };
  const commandTime = (xterm) => { xterm.writeln(new Date().toLocaleTimeString()); };
  const commandWhoami = (xterm) => { xterm.writeln('user'); };
  const commandHostname = (xterm) => { xterm.writeln('WEB-GCS'); };
  const commandIpconfig = (xterm) => { xterm.writeln('IPv4: 192.168.1.100'); };
  const commandPing = (args, xterm) => { xterm.writeln('Pinging...  OK'); };
  const commandNetstat = (xterm) => { xterm.writeln('TCP 192.168.1.100:3000 ESTABLISHED'); };
  const commandPs = (xterm) => { xterm.writeln('1  web-gcs  Running'); };
  const commandKill = (args, xterm) => { xterm.writeln('Process terminated'); };
  const commandSet = (args, xterm) => { xterm.writeln('Variable set'); };
  const commandEnv = (xterm) => { xterm.writeln('PATH=C:\\Windows'); };
  const commandVer = (xterm) => { xterm.writeln('Web-GCS Terminal v1.0.0'); };
  const commandStatus = (xterm) => {
    xterm.writeln('Jetson:  Disconnected');
    if (connectionMode === 'ssh' && isSSHConnected) {
      xterm.writeln('SSH: Connected');
    }
  };
  const commandNeofetch = (xterm) => { xterm.writeln('OS: Web-GCS Emiro'); };
  const commandTree = (xterm) => { xterm.writeln('├── Documents\n└── Downloads'); };
  const commandFind = (args, xterm) => { xterm.writeln('Search results... '); };
  const commandHistory = (xterm) => {
    const state = stateRef.current;
    state.commandHistory.forEach((cmd, i) => {
      xterm.writeln(`  ${i + 1}  ${cmd}`);
    });
  };
  const commandVol = (xterm) => { xterm.writeln('Volume: WEB-GCS'); };
  const commandLabel = (args, xterm) => { xterm.writeln('Label set'); };
  const commandDiskpart = (xterm) => { xterm.writeln('Disk 0  256 GB'); };

  return (
    <div 
      className="terminal-container" 
      style={{ display: isActive ? 'block' : 'none' }}
    >
      <div ref={terminalRef} className="terminal-content" />
      {isSSHConnected && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          padding: '4px 8px',
          background: 'rgba(100, 255, 218, 0.2)',
          border: '1px solid #64ffda',
          borderRadius: '4px',
          fontSize: '10px',
          color: '#64ffda',
          fontWeight: '600',
          zIndex: 10
        }}>
          ● SSH
        </div>
      )}
    </div>
  );
};

export default Terminal;