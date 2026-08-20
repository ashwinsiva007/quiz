import mqtt, { MqttClient } from 'mqtt';

const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
];

export interface CloudMessage {
  type: 'JOIN' | 'ANSWER' | 'STATE_UPDATE' | 'TIMER_TICK' | 'PING' | 'PONG' | 'KICK';
  pin: string;
  senderId: string;
  payload?: any;
  timestamp: number;
}

export type CloudMessageHandler = (msg: CloudMessage) => void;

class CloudBridge {
  private client: MqttClient | null = null;
  private currentPin: string = '';
  private currentBrokerIdx: number = 0;
  private messageHandlers: Set<CloudMessageHandler> = new Set();
  public isConnected: boolean = false;
  private clientId: string;
  private retryCount: number = 0;

  constructor() {
    this.clientId = 'asi_' + Math.random().toString(36).substring(2, 11);
  }

  public connect(pin: string) {
    const cleanPin = pin.trim();
    if (!cleanPin || cleanPin === '------') return;

    if (this.currentPin === cleanPin && this.client && this.isConnected) {
      return;
    }

    this.currentPin = cleanPin;
    if (this.client) {
      try {
        this.client.end(true);
      } catch (_) {}
      this.client = null;
    }

    this.initMqttClient();
  }

  private initMqttClient() {
    const brokerUrl = BROKERS[this.currentBrokerIdx % BROKERS.length];

    try {
      this.client = mqtt.connect(brokerUrl, {
        clientId: this.clientId,
        clean: true,
        connectTimeout: 6000,
        reconnectPeriod: 2000,
        keepalive: 20,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.retryCount = 0;
        if (this.currentPin) {
          const topic = `asi/quiz/${this.currentPin}/#`;
          this.client?.subscribe(topic, { qos: 0 }, (err) => {
            if (err) console.warn('[CloudBridge] Subscribe error:', err);
          });
          // Request state immediately on connect
          this.publish('PING');
        }
      });

      this.client.on('message', (_topic: string, messageBuffer: Buffer) => {
        try {
          const msgStr = messageBuffer.toString();
          const msg: CloudMessage = JSON.parse(msgStr);
          if (msg && msg.pin === this.currentPin && msg.senderId !== this.clientId) {
            this.messageHandlers.forEach((handler) => {
              try {
                handler(msg);
              } catch (e) {
                console.error('[CloudBridge] Handler error:', e);
              }
            });
          }
        } catch (err) {
          // ignore non-json messages
        }
      });

      this.client.on('error', (err) => {
        console.warn('[CloudBridge] MQTT Error:', err.message);
        this.retryCount++;
        if (this.retryCount > 2) {
          this.currentBrokerIdx++;
          this.retryCount = 0;
        }
      });

      this.client.on('offline', () => {
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });
    } catch (e) {
      console.warn('[CloudBridge] Connection init error:', e);
      this.currentBrokerIdx++;
      setTimeout(() => this.initMqttClient(), 2000);
    }
  }

  public publish(type: CloudMessage['type'], payload?: any) {
    if (!this.client || !this.currentPin || !this.isConnected) return;

    const topic = `asi/quiz/${this.currentPin}/${type.toLowerCase()}`;
    const message: CloudMessage = {
      type,
      pin: this.currentPin,
      senderId: this.clientId,
      payload,
      timestamp: Date.now(),
    };

    try {
      this.client.publish(topic, JSON.stringify(message), { qos: 0 });
    } catch (err) {
      console.warn('[CloudBridge] Publish error:', err);
    }
  }

  public onMessage(handler: CloudMessageHandler) {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  public getClientId() {
    return this.clientId;
  }
}

export const cloudBridge = new CloudBridge();
