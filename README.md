# Web-GCS Emiro

Modern web-based Ground Control Station for drone quadcopter with ROS/MAVROS integration.

**Version:** 2.0.0  
**License:** MIT  
**Stack:** React 18, ROS Noetic, MAVROS

---

## Features

### Flight Control
- Real-time telemetry monitoring (GPS, altitude, speed, attitude, battery)
- ARM/DISARM control with safety checks
- Flight mode switching (STABILIZE, ALT_HOLD, AUTO, GUIDED, LOITER, RTL, LAND)
- Emergency stop system
- Servo/payload control (4 channels)

### Mapping & Navigation
- Interactive map with live drone tracking
- Custom pin markers for drone and home position
- Online/Offline map modes
- Downloadable offline maps with tile caching
- Persistent map storage (survives page refresh)
- Support for Street and Satellite views
- Zoom levels up to Z22

### Video & Monitoring
- Live MJPEG video streaming
- Connection status indicators
- GPS and RTK status monitoring
- Real-time data visualization

### User Interface
- Dark navy theme optimized for outdoor visibility
- Responsive design (desktop and tablet)
- Secure login system with multi-layer authentication
- Session management with auto-timeout
- Real-time WebSocket updates

---

## System Requirements

### Onboard Computer (Jetson Nano)
- Ubuntu 18.04/20.04 with ROS Noetic
- Jetson Nano 4GB RAM
- USB or CSI Camera
- WiFi/Ethernet connectivity
- Required packages: 
  - ROS Noetic
  - MAVROS
  - Rosbridge Server
  - MJPEG Streamer

### Ground Station (Laptop/PC)
- Windows 10/11, macOS, or Linux
- Modern web browser (Chrome 90+, Firefox 88+, Edge 90+)
- Network connection to Jetson
- For development: Node.js 18+

### Flight Controller
- Pixhawk or APM-compatible flight controller
- ArduCopter firmware
- MAVLink v2. 0 protocol support

---

## Quick Start

### 1. Setup Jetson Nano

#### Install ROS Noetic

```bash
sudo apt-get update && sudo apt-get upgrade -y

# Add ROS repository
sudo sh -c 'echo "deb http://packages.ros.org/ros/ubuntu $(lsb_release -sc) main" > /etc/apt/sources.list.d/ros-latest.list'
sudo apt-key adv --keyserver 'hkp://keyserver.ubuntu.com:80' --recv-key C1CF6E31E6BADE8868B172B4F42ED6FBAB17C654

# Install ROS
sudo apt-get update
sudo apt-get install ros-noetic-desktop-full -y

# Setup environment
echo "source /opt/ros/noetic/setup.bash" >> ~/.bashrc
source ~/.bashrc

# Initialize rosdep
sudo rosdep init
rosdep update
```

#### Install MAVROS

```bash
sudo apt-get install ros-noetic-mavros ros-noetic-mavros-extras -y

# Install GeographicLib datasets
wget https://raw.githubusercontent.com/mavlink/mavros/master/mavros/scripts/install_geographiclib_datasets.sh
sudo bash install_geographiclib_datasets.sh
```

#### Install Rosbridge

```bash
sudo apt-get install ros-noetic-rosbridge-suite -y
```

#### Install MJPEG Streamer

```bash
sudo apt-get install mjpg-streamer -y
```

#### Create Launch File

```bash
mkdir -p ~/catkin_ws/src/web_gcs/launch
cd ~/catkin_ws/src/web_gcs/launch

cat > web_gcs.launch << 'EOF'
<launch>
  <!-- MAVROS Connection -->
  <include file="$(find mavros)/launch/node.launch">
    <arg name="fcu_url" value="/dev/ttyACM0:57600" />
    <arg name="gcs_url" value="tcp-l://0.0.0.0:5770@" />
    <arg name="pluginlists_yaml" value="$(find mavros)/launch/apm_pluginlists.yaml" />
    <arg name="config_yaml" value="$(find mavros)/launch/apm_config.yaml" />
  </include>

  <!-- Rosbridge WebSocket -->
  <include file="$(find rosbridge_server)/launch/rosbridge_websocket.launch">
    <arg name="port" value="9090" />
  </include>
</launch>
EOF

cd ~/catkin_ws
catkin_make
source devel/setup. bash
```

#### Configure Static IP (Optional but Recommended)

```bash
sudo nano /etc/netplan/01-network-manager-all.yaml
```

Add configuration: 

```yaml
network:
  version: 2
  wifis:
    wlan0:
      dhcp4: no
      addresses:  [192.168.1.100/24]
      gateway4: 192.168.1.1
      nameservers:
        addresses:  [8.8.8.8]
      access-points:
        "YOUR_WIFI_SSID": 
          password: "YOUR_PASSWORD"
```

Apply: 

```bash
sudo netplan apply
```

---

### 2. Setup Ground Station

#### Install Dependencies

```bash
# Clone repository
git clone https://github.com/grouckfly/web-gcs-emiro.git
cd web-gcs-emiro

# Install packages
npm install
```

#### Configure Connection

Create `.env` file:

```bash
VITE_ROSBRIDGE_URL=ws://192.168.1.100:9090
VITE_VIDEO_URL=http://192.168.1.100:8080/? action=stream
VITE_DEFAULT_LAT=-6.2088
VITE_DEFAULT_LON=106.8456
```

Or edit `src/context/RosContext.jsx`:

```javascript
const defaultUrl = 'ws://192.168.1.100:9090';
```

---

## Usage

### Start System

#### 1. Launch Jetson Services

```bash
ssh jetson@192.168.1.100
roslaunch web_gcs web_gcs.launch

# Start MJPEG streamer (in another terminal)
mjpg_streamer -i "input_uvc.so -d /dev/video0 -r 1280x720 -f 30" \
              -o "output_http.so -p 8080 -w /usr/local/share/mjpg-streamer/www"
```

#### 2. Start Ground Station

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
cd dist
python3 -m http.server 3000
```

#### 3. Login

Open browser:  `http://localhost:3000`

Default credentials:
- Username: `emiro`
- Password: `Em1r0-12/2026`

Note: Change credentials in `src/components/Login/Login.jsx` for production use.

#### 4. Connect to Drone

1. Click "Connect" in header
2. Enter Jetson IP:  `192.168.1.100`
3. Wait for connection
4. Verify telemetry data is updating

---

## Offline Map Feature

### Download Maps for Offline Use

1. Connect to internet
2. Navigate map to desired area
3. Click "DOWNLOAD" button
4. Select map type (Streets or Satellite)
5. Choose zoom levels (Z1-Z22)
6. Click "Start Download"
7. Wait for download to complete

### Using Offline Maps

1. Switch to "OFFLINE" mode in map controls
2. Map will use cached tiles from IndexedDB
3. No internet connection required
4. Cache persists across page refreshes

### Manage Cache

- View cached tiles count in download modal
- Clear cache to free storage
- Request persistent storage to prevent auto-deletion

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_ROSBRIDGE_URL` | Rosbridge WebSocket URL | `ws://192.168.1.100:9090` |
| `VITE_VIDEO_URL` | MJPEG stream URL | `http://192.168.1.100:8080/?action=stream` |
| `VITE_DEFAULT_LAT` | Map center latitude | `-6.2088` |
| `VITE_DEFAULT_LON` | Map center longitude | `106.8456` |

### Security Settings

Edit `src/components/Login/Login.jsx`:

```javascript
// Change credentials
const CREDENTIALS = {
  username: btoa('your_username'),
  password: btoa('your_password')
};

// Adjust session timeout (default:  8 hours)
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000;

// Adjust lock duration (default: 30 minutes)
const LOCK_DURATION = 30 * 60 * 1000;
```

---

## Troubleshooting

### Cannot Connect to Rosbridge

```bash
# Check Rosbridge is running
rostopic list

# Check port is open
netstat -tuln | grep 9090

# Restart Rosbridge
rosnode kill /rosbridge_websocket
roslaunch rosbridge_server rosbridge_websocket.launch port:=9090

# Check firewall
sudo ufw allow 9090/tcp
```

### No Video Stream

```bash
# Check camera device
ls -l /dev/video0

# Test stream
curl -I http://192.168.1.100:8080/?action=stream

# Restart streamer
pkill mjpg_streamer
mjpg_streamer -i "input_uvc.so -d /dev/video0" -o "output_http.so -p 8080"
```

### No Telemetry Data

```bash
# Check MAVROS connection
rostopic echo /mavros/state

# Check Pixhawk connection
ls -l /dev/ttyACM*

# Verify baud rate
rosrun mavros checkid
```

### Map Tiles Not Loading

```bash
# Check internet connection
ping tile.openstreetmap.org

# Clear browser cache
# Or use offline mode if tiles are cached

# Check IndexedDB storage
# Browser DevTools > Application > IndexedDB > WebGCS_MapCache
```

---

## Development

### Project Structure

```
src/
├── components/
│   ├── Login/              # Authentication
│   ├── Header/             # Connection status
│   ├── LeftPanel/          # Telemetry display
│   ├── CenterPanel/        # Video & Map
│   ├── RightPanel/         # Flight controls
│   ├── Map/                # Map download modal
│   └── BottomPanel/        # Payload controls
├── context/
│   └── RosContext. jsx      # ROS connection
├── hooks/
│   └── useTelemetry.js     # Telemetry hook
├── services/
│   └── flightControlService.js
├── utils/
│   ├── OfflineMapManager.js  # Map cache system
│   ├── constants.js
│   └── formatters.js
└── assets/
    └── styles/
```

### Build Commands

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Adding Custom Features

Example: Add new telemetry item

```javascript
// 1. Update useTelemetry. js
const [customData, setCustomData] = useState(null);

useEffect(() => {
  if (! ros || !isConnected) return;
  
  const topic = new ROSLIB.Topic({
    ros: ros,
    name: '/mavros/custom_topic',
    messageType: 'std_msgs/Float32'
  });
  
  topic.subscribe((msg) => setCustomData(msg. data));
  
  return () => topic.unsubscribe();
}, [ros, isConnected]);

// 2. Display in component
<div className="telemetry-item">
  <span>Custom Data: </span>
  <strong>{customData || 'N/A'}</strong>
</div>
```

---

## Security Notes

### Production Deployment

1. Change default login credentials
2. Use HTTPS for WebSocket connections
3. Implement proper authentication backend
4. Set up firewall rules on Jetson
5. Use VPN for remote access
6. Enable ROS security features

### Session Management

- Sessions expire after 8 hours of inactivity
- Failed login attempts result in 30-minute lockout
- Lock persists across browser sessions
- Dev mode includes emergency reset shortcuts

---

## API Reference

### ROS Topics

#### Subscribed Topics

- `/mavros/state` - Flight controller state
- `/mavros/global_position/global` - GPS position
- `/mavros/global_position/rel_alt` - Relative altitude
- `/mavros/vfr_hud` - HUD data (speed, heading)
- `/mavros/battery` - Battery status
- `/mavros/imu/data` - IMU data
- `/mavros/rc/in` - RC input

#### Published Topics

- `/mavros/rc/override` - RC override commands
- `/mavros/setpoint_position/local` - Position setpoints

#### Services

- `/mavros/cmd/arming` - ARM/DISARM
- `/mavros/set_mode` - Flight mode change
- `/mavros/cmd/command` - Generic commands

---

## License

MIT License - Copyright 2025 Emiro

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. 

---

**Copyright 2025 Emiro**