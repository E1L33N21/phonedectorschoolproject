#include <Arduino.h>
#include "HX711.h"
#define DT 4
#define SCK 5
HX711 scale;

const long THRESHOLD = 500000;

bool objectDetected = false;

void setup() {
  Serial.begin(57600);

  scale.begin(DT, SCK);
}

void loop() {
  long value = scale.read();

  if (value > THRESHOLD) {
    objectDetected = true;
  } else {
    objectDetected = false;
  }

  if (objectDetected) {
    Serial.println("phone_in_box");
  } else {
    Serial.println("empty_box");
  }

   delay(500);
}

//for calibration
//void loop(){
//Serial.println(scale.read());
//delay(500);
//}