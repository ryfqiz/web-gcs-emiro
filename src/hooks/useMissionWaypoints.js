import { useEffect, useState, useCallback, useRef } from "react";
import { useRos } from "../context/RosContext";
import ROSLIB from "roslib";

export default function useMissionWaypoints() {
  const { ros, isConnected } = useRos();
  const [waypoints, setWaypoints] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const waypointListenerRef = useRef(null);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    if (!ros || !isConnected) return;

    // Throttled waypoint update dengan filter lebih ketat
    const throttledSetWaypoints = (msg) => {
      const now = Date.now();
      if (now - lastUpdateRef.current < 1000) return;
      lastUpdateRef.current = now;

      try {
        if (msg.waypoints && Array.isArray(msg.waypoints) && msg.waypoints.length > 0) {
          // Filter waypoint yang valid (bukan home position)
          const parsed = msg.waypoints
            .filter(wp => {
              const lat = Number(wp.x_lat);
              const lon = Number(wp.y_long);
              const alt = Number(wp.z_alt);
              
              // Filter kriteria:
              // 1. Koordinat tidak 0,0
              // 2. Altitude > 2m (bukan home)
              // 3. Command adalah waypoint action (16, 19, 94)
              // 4. Bukan command HOME (0) atau RETURN_TO_LAUNCH (20)
              const validCommand = [16, 19, 94].includes(wp.command);
              const notHome = wp.command !== 0;
              const validCoords = lat !== 0 && lon !== 0;
              const validAlt = alt > 2;
              
              return validCommand && notHome && validCoords && validAlt;
            })
            .map((wp, idx) => ({
              id: idx,
              lat: wp.x_lat,
              lon: wp.y_long,
              alt: wp.z_alt,
              speed: 5,
              action:
                wp.command === 16 ? "WAYPOINT"
                : wp.command === 19 ? "LOITER"
                : "WAYPOINT"
            }));

          // Hanya set jika ada waypoint valid
          if (parsed.length > 0) {
            setWaypoints(parsed);
          } else {
            setWaypoints([]);
          }
        } else {
          setWaypoints([]);
        }
      } catch (error) {
        console.error('Waypoint parsing error:', error);
        setWaypoints([]);
      }
    };

    waypointListenerRef.current = new ROSLIB.Topic({
      ros,
      name: "/mavros/mission/waypoints",
      messageType: "mavros_msgs/WaypointList",
      throttle_rate: 1000
    });

    waypointListenerRef.current.subscribe(throttledSetWaypoints);

    // Auto-pull setelah koneksi
    const timer = setTimeout(() => {
      pullMissionFromAutopilot();
    }, 2000);

    return () => {
      clearTimeout(timer);
      if (waypointListenerRef.current) {
        try {
          waypointListenerRef.current.unsubscribe();
        } catch (e) {
          console.warn('Error unsubscribing waypoint listener:', e);
        }
        waypointListenerRef.current = null;
      }
    };
  }, [ros, isConnected]);

  const pullMissionFromAutopilot = useCallback(() => {
    if (!ros || !isConnected || isLoading) return;

    setIsLoading(true);
    console.log('🔄 Pulling mission from autopilot...');

    const pullService = new ROSLIB.Service({
      ros,
      name: "/mavros/mission/pull",
      serviceType: "mavros_msgs/WaypointPull"
    });

    const timeout = setTimeout(() => {
      setIsLoading(false);
      console.warn('⚠️ Pull mission timeout');
    }, 5000);

    pullService.callService(
      new ROSLIB.ServiceRequest({}),
      (result) => {
        clearTimeout(timeout);
        setIsLoading(false);
        console.log('✅ Mission pulled successfully:', result);
      },
      (error) => {
        clearTimeout(timeout);
        setIsLoading(false);
        console.error('❌ Pull mission error:', error);
      }
    );
  }, [ros, isConnected, isLoading]);

  // Fungsi refresh manual
  const refreshMission = useCallback(() => {
    console.log('🔄 Manual refresh mission...');
    // Clear waypoints terlebih dahulu
    setWaypoints([]);
    // Pull ulang dari autopilot
    pullMissionFromAutopilot();
  }, [pullMissionFromAutopilot]);

  const uploadMission = useCallback((waypointsToSend) => {
    if (!ros || !isConnected) {
      alert("❌ ROS not connected");
      return;
    }

    if (isLoading) {
      alert("⏳ Please wait for current operation to complete");
      return;
    }

    const filteredWaypoints = (waypointsToSend || []).filter(
      wp =>
        Number(wp.lat) !== 0 &&
        Number(wp.lon) !== 0 &&
        Number(wp.alt) > 2 &&
        !isNaN(Number(wp.lat)) &&
        !isNaN(Number(wp.lon)) &&
        !isNaN(Number(wp.alt))
    );
    
    if (!filteredWaypoints.length) {
      alert("No valid waypoints to upload");
      return;
    }

    setIsLoading(true);

    const clearService = new ROSLIB.Service({
      ros,
      name: "/mavros/mission/clear",
      serviceType: "mavros_msgs/WaypointClear"
    });

    const clearTimeout = setTimeout(() => {
      setIsLoading(false);
      alert("Clear mission timeout");
    }, 5000);

    clearService.callService(
      new ROSLIB.ServiceRequest({}),
      (clearResult) => {
        clearTimeout(clearTimeout);
        
        if (!clearResult || !clearResult.success) {
          setIsLoading(false);
          alert("Failed to clear existing mission");
          return;
        }

        const pushService = new ROSLIB.Service({
          ros,
          name: "/mavros/mission/push",
          serviceType: "mavros_msgs/WaypointPush"
        });

        const cmdMap = { "WAYPOINT": 16, "LOITER": 19 };

        const mavrosWaypoints = filteredWaypoints.map((wp, idx) => ({
          frame: 3,
          command: cmdMap[wp.action] || 16,
          is_current: idx === 0,
          autocontinue: true,
          param1: wp.action === "LOITER" ? Math.max(10.0, wp.param1 || 10.0) : 0.0,
          param2: 0.0,
          param3: 0.0,
          param4: 0.0,
          x_lat: Number(wp.lat),
          y_long: Number(wp.lon),
          z_alt: Math.max(3, Number(wp.alt))
        }));

        const pushTimeout = setTimeout(() => {
          setIsLoading(false);
          alert("Upload mission timeout");
        }, 10000);

        pushService.callService(
          new ROSLIB.ServiceRequest({
            start_index: 0,
            waypoints: mavrosWaypoints
          }),
          (pushResult) => {
            clearTimeout(pushTimeout);
            setIsLoading(false);
            
            if (pushResult && pushResult.success) {
              alert(`✅ Mission uploaded: ${pushResult.wp_transfered} waypoints`);
              setTimeout(() => pullMissionFromAutopilot(), 1000);
            } else {
              alert("❌ Mission upload failed");
            }
          },
          (error) => {
            clearTimeout(pushTimeout);
            setIsLoading(false);
            alert(`❌ Upload error: ${error}`);
          }
        );
      },
      (error) => {
        clearTimeout(clearTimeout);
        setIsLoading(false);
        alert(`❌ Error clearing mission: ${error}`);
      }
    );
  }, [ros, isConnected, isLoading, pullMissionFromAutopilot]);

  const clearMission = useCallback(() => {
    if (!ros || !isConnected) {
      alert("❌ ROS not connected");
      return;
    }

    if (isLoading) {
      alert("⏳ Please wait");
      return;
    }

    setIsLoading(true);
    const clearService = new ROSLIB.Service({
      ros,
      name: "/mavros/mission/clear",
      serviceType: "mavros_msgs/WaypointClear"
    });

    const timeout = setTimeout(() => {
      setIsLoading(false);
      alert("Clear timeout");
    }, 5000);

    clearService.callService(
      new ROSLIB.ServiceRequest({}),
      (result) => {
        clearTimeout(timeout);
        setIsLoading(false);
        
        if (result && result.success) {
          setWaypoints([]);
          alert("✅ Mission cleared");
        } else {
          alert("❌ Clear failed");
        }
      },
      (error) => {
        clearTimeout(timeout);
        setIsLoading(false);
        alert(`❌ Error: ${error}`);
      }
    );
  }, [ros, isConnected, isLoading]);

  return {
    waypoints,
    setWaypoints,
    uploadMission,
    clearMission,
    pullMissionFromAutopilot,
    refreshMission, // NEW: Fungsi refresh
    isLoading
  };
}
