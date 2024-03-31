import * as React from 'react';
import { StyleSheet, SafeAreaView, Alert, Modal, Pressable, Text, View, Platform, Dimensions } from 'react-native';
import { recognize, ScanConfig, ScanRegion, DLRLineResult, DLRResult } from 'vision-camera-dynamsoft-label-recognizer';
// import * as DLR from 'vision-camera-dynamsoft-label-recognizer';
import { Camera, useCameraDevice, useCodeScanner, useFrameProcessor } from 'react-native-vision-camera';
import { Svg, Image, Rect, Circle } from 'react-native-svg';
// import Clipboard from '@react-native-community/clipboard';
import { Worklets, useSharedValue } from 'react-native-worklets-core';

const scanRegion: ScanRegion = {
  left: 5,
  top: 40,
  width: 90,
  height: 10
}
async function sendFrame(frame: any) {
  try {
    const response = await fetch(`http://0.0.0.0:5000/process_qr_code`, {
      method: 'POST',
      headers: {
        "Content-Type": 'application/json'
      },
      body: frame
    });
    const data = await response.json();
    console.log(data);
    return data
  } catch (error) {
    console.error(error);
    return false
  }
}

function App(): React.JSX.Element {
  const [isActive, setIsActive] = React.useState(true);
  const [modalVisible, setModalVisible] = React.useState(false);
  const modalVisibleShared = useSharedValue(false);
  const [hasPermission, setHasPermission] = React.useState(false);
  const [qrData, setQrData] = React.useState(null);
  const device = useCameraDevice("back");

  React.useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');

    })();
    return () => {
      console.log("unmounted");
      setIsActive(false);
    }
  }, []);

  const qrResult = React.useMemo(() => {
    const _qrData = qrData;
    return _qrData;
  }, [qrData])

  const setModalVisibleJS = Worklets.createRunInJsFn(setModalVisible);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (modalVisible) {
        return
      }

      if (codes) {
        setQrData(JSON.parse(codes[0].value))
        setModalVisibleJS(true)
      }
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      {device != null &&
        hasPermission && (
          <>
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={isActive}
              codeScanner={codeScanner}
            >
            </Camera>
          </>)}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          Alert.alert("Modal has been closed.");
          modalVisibleShared.value = !modalVisible;
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.centeredView}>
            <View style={{
              ...styles.modalView,
              width: getWindowWidth()
            }}>
              {
                Object.keys(qrResult ?? {})?.map((row, index) => (
                  <View key={index} style={{
                    backgroundColor: '#f0f0f0',
                    width: '100%',
                    height: 50,
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottomColor: '#d7d7d7',
                    borderBottomWidth: 1
                  }}>
                    <Text style={{
                      fontSize: 16,
                      color: '#bfbfbf'
                    }}>{row ? row.replace(/_/g, ' ') : ''}</Text>
                    <Text style={{
                      fontSize: 20,
                      color: '#8f8f8f'
                    }}>{qrResult[row] ?? ''}</Text>
                  </View>
                ))
              }
              <View style={styles.buttonView}>
                <Pressable
                  style={[styles.button, styles.buttonClose]}
                  onPress={() => {
                    setModalVisible(!modalVisible)
                  }}
                >
                  <Text style={styles.textStyle}>Scan Again</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const monospaceFontFamily = () => {
}

const getWindowWidth = () => {
  return Dimensions.get("window").width;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 100,
    marginVertical: 20,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    height: 500,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  itemView: {
    // borderBottomColor: '#F194FF',
    color: 'red',
    width: 900,
  },
  buttonView: {
    marginTop: 15,
    flexDirection: 'row',
  },
  button: {
    borderRadius: 20,
    padding: 10,
    margin: 5
  },
  buttonOpen: {
    backgroundColor: "#F194FF",
  },
  buttonClose: {
    backgroundColor: "#2196F3",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  modalText: {
    marginBottom: 10,
    textAlign: "left",
    fontSize: 12,
    fontFamily: monospaceFontFamily()
  },
  lowConfidenceText: {
    color: "red",
  },
  srcImage: {
    width: getWindowWidth() * 0.7,
    height: 60,
    resizeMode: "contain"
  },
});

export default App;
