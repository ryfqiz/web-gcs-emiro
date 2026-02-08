import { WebSocketServer } from 'ws';
import { Client as SSHClient } from 'ssh2';
import http from 'http';

const server = http.createServer();
const wss = new WebSocketServer({ server });

console.log('SSH WebSocket Server starting.. .');

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  let sshClient = null;
  let sshStream = null;
  let isConnected = false;

  function safeSend(data) {
    try {
      if (ws.readyState === 1) { // OPEN
        ws.send(JSON.stringify(data));
      }
    } catch (e) {
      console.error('Send error:', e. message);
    }
  }

  function cleanup() {
    isConnected = false;
    
    if (sshStream) {
      try { sshStream.end(); } catch (e) {}
      try { sshStream.destroy(); } catch (e) {}
      sshStream = null;
    }
    
    if (sshClient) {
      try { sshClient.end(); } catch (e) {}
      try { sshClient.destroy(); } catch (e) {}
      sshClient = null;
    }
  }

  ws.on('message', (message) => {
    try {
      const data = JSON. parse(message. toString());
      
      if (data.type === 'ssh-connect') {
        const { host, port, username, password } = data;
        
        if (isConnected || sshClient) {
          safeSend({ type: 'error', message: 'Already connected' });
          return;
        }
        
        console.log(`Connecting to ${username}@${host}:${port}...`);
        
        sshClient = new SSHClient();
        
        let timeout = setTimeout(() => {
          console.error('Connection timeout');
          safeSend({ type: 'error', message: 'Connection timeout' });
          cleanup();
        }, 30000);
        
        sshClient.on('ready', () => {
          clearTimeout(timeout);
          console. log('SSH ready');
          isConnected = true;
          
          safeSend({ type: 'ssh-connected', message: 'Connected' });
          
          // Use exec mode with bash login shell
          sshClient.exec('/bin/bash -l', {
            pty: {
              term: 'xterm-256color',
              cols: data.cols || 80,
              rows: data.rows || 24
            }
          }, (err, stream) => {
            if (err) {
              console.error('Exec error:', err. message);
              safeSend({ type: 'error', message:  'Shell failed:  ' + err.message });
              cleanup();
              return;
            }
            
            console.log('Shell created');
            sshStream = stream;
            
            stream.on('data', (d) => {
              safeSend({ type: 'ssh-output', data: d. toString() });
            });
            
            stream.on('close', () => {
              console. log('Stream closed');
              safeSend({ type: 'ssh-disconnected', message: 'Session closed' });
              cleanup();
            });
            
            stream. on('error', (e) => {
              console.error('Stream error:', e.message);
              cleanup();
            });
          });
        });
        
        sshClient.on('error', (err) => {
          clearTimeout(timeout);
          console. error('SSH error:', err.message);
          
          let msg = 'Connection failed';
          if (err. level === 'client-authentication') msg = 'Authentication failed';
          else if (err.code === 'ECONNREFUSED') msg = 'Connection refused';
          else if (err.code === 'ETIMEDOUT') msg = 'Timeout';
          else if (err.code === 'ENOTFOUND') msg = 'Host not found';
          
          safeSend({ type: 'error', message: msg });
          cleanup();
        });
        
        sshClient.on('close', () => {
          clearTimeout(timeout);
          console. log('SSH closed');
          if (isConnected) {
            safeSend({ type: 'ssh-disconnected', message: 'Connection closed' });
          }
          cleanup();
        });
        
        try {
          safeSend({ type: 'ssh-connecting', message: 'Connecting.. .' });
          sshClient. connect({
            host,
            port:  port || 22,
            username,
            password,
            readyTimeout: 20000,
            keepaliveInterval: 5000
          });
        } catch (e) {
          clearTimeout(timeout);
          console. error('Connect error:', e.message);
          safeSend({ type: 'error', message: e.message });
          cleanup();
        }
        
      } else if (data. type === 'ssh-data' && sshStream) {
        try {
          sshStream.write(data.data);
        } catch (e) {
          console.error('Write error:', e.message);
        }
        
      } else if (data.type === 'ssh-resize' && sshStream) {
        try {
          sshStream. setWindow(data.rows, data.cols);
        } catch (e) {
          console.error('Resize error:', e.message);
        }
        
      } else if (data. type === 'ssh-disconnect') {
        console.log('Disconnect requested');
        cleanup();
      }
      
    } catch (e) {
      console.error('Message error:', e.message);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket closed');
    cleanup();
  });
  
  ws.on('error', (e) => {
    console.error('WebSocket error:', e. message);
    cleanup();
  });
});

server.listen(3001, '0.0.0.0', () => {
  console.log('SSH Server running on port 3001');
});