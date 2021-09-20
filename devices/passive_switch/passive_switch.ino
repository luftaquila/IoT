#include <Arduino.h>

#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>

#include <ArduinoJson.h>

#include <WebSocketsClient.h>
#include <SocketIOclient.h>

#include <Hash.h>


String DEVICEID = "deviceid";

char WIFIAP[20] = "SSID";
char WIFIPW[20] = "PW";


ESP8266WiFiMulti WiFiMulti;
SocketIOclient socketIO;
bool isFirstConnect = true;

void socketIOEvent(socketIOmessageType_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case sIOtype_DISCONNECT:
      Serial.printf("[IOc] Disconnected!\n");
      break;

    case sIOtype_CONNECT:
      Serial.printf("[IOc] Connected to url: %s\n", payload);
      socketIO.send(sIOtype_CONNECT, "/"); // join default namespace (no auto join in Socket.IO V3)
      break;

    case sIOtype_EVENT: {
      Serial.printf("[IOc] get event: %s\n", payload);
      DynamicJsonDocument content(1024);
      DeserializationError contentError = deserializeJson(content, payload, length);
      if(contentError) return;

      String eventName = content[0];
      String data = content[1]["data"];

      if(eventName == String("relay")) digitalWrite(15, data.toInt());
      break;
    }

    case sIOtype_ACK:
      Serial.printf("[IOc] get ack: %u\n", length);
      hexdump(payload, length);
      break;

    case sIOtype_ERROR:
      Serial.printf("[IOc] get error: %u\n", length);
      hexdump(payload, length);
      break;

    case sIOtype_BINARY_EVENT:
      Serial.printf("[IOc] get binary: %u\n", length);
      hexdump(payload, length);
      break;

    case sIOtype_BINARY_ACK:
      Serial.printf("[IOc] get binary ack: %u\n", length);
      hexdump(payload, length);
      break;
  }
}

void setup() {
  pinMode(15, OUTPUT); // GPIO15 relay pin

  Serial.begin(74880);
  Serial.setDebugOutput(true);

  // disable AP
  if(WiFi.getMode() & WIFI_AP) WiFi.softAPdisconnect(true);

  WiFiMulti.addAP(WIFIAP, WIFIPW);

  //WiFi.disconnect();
  while(WiFiMulti.run() != WL_CONNECTED) delay(100);

  String ip = WiFi.localIP().toString();
  Serial.printf("[SETUP] WiFi Connected %s\n", ip.c_str());

  // server address, port and URL
  socketIO.begin("iot.luftaquila.io", 3150, "/socket.io/?EIO=4&device=" + DEVICEID + "&deviceType=passiveSwitch");

  // event handler
  socketIO.onEvent(socketIOEvent);
}

unsigned long messageTimestamp = 0;
void loop() {
  socketIO.loop();
}
